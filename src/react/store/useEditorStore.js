import { create } from 'zustand'
import SvgPath from 'svgpath'
import { parseFont } from '../utils/fontLoader.js'
import { createTextPaths, measureLineWidths } from '../utils/textLayout.js'
import { downloadSVGFromString } from '../utils/download.js'
import { toMatrix } from '../utils/matrix.js'
import { FONTS, DEFAULT_TEXT } from '../constants/fonts.js'
import convertUnits from '../../lib/unitConverter.js'

// Simple id generator
let _idCounter = 1
const genId = () => String(_idCounter++)

// Typing/session timers for the active text edit (single selection only)
let _typingActive = false
let _typingTimer = null
let _genTimer = null

const DEFAULT_VIEWBOX = '0 0 612 792'

const roundInt = (v) => (v == null ? v : Math.round(Number(v)))
const roundRot = (v) => (v == null ? v : Number(Number(v).toFixed(2)))

function defaultFont() {
  return {
    selected: 'EMSReadabilityItalic',
    sizePx: 24,
    alignment: 'left',
    charSpacing: 0,
    lineHeight: 1,
    colorInvert: false,
    strokeWidth: 1,
    originalURL: null,
  }
}

function defaultOverlay() {
  return {
    paths: [],
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    pivot: { cx: 0, cy: 0 },
    needsCenter: false,
  }
}

const useEditorStore = create((set, get) => ({
  // Background SVG
  background: {
    svgString: '',
    width: 0,
    height: 0,
    viewBox: DEFAULT_VIEWBOX,
    unit: 'px',
    element: null,
  },

  // Multi-layer state
  layers: [], // { id, name, text, font, overlay }
  selection: [], // array of layer ids
  exportTextOnly: false,

  // Fonts and cache
  fontsMap: FONTS,
  // Cache by `${fontKey}@@${sizePx}` -> parsed font data
  fontCache: {},

  // History
  history: { past: [], future: [] },

  // History helpers
  _snapshot() {
    const { layers, selection } = get()
    // Deep-ish copy of layers (paths are arrays of strings)
    const snapshotLayers = layers.map(l => ({
      id: l.id,
      name: l.name,
      text: l.text,
      font: { ...l.font },
      overlay: { ...l.overlay, pivot: { ...l.overlay.pivot }, paths: l.overlay.paths.slice() },
    }))
    return { layers: snapshotLayers, selection: selection.slice() }
  },
  pushHistory: () => {
    const snap = get()._snapshot()
    set(state => ({ history: { past: [...state.history.past, snap].slice(-200), future: [] } }))
  },
  undo: () => {
    const { history } = get()
    if (!history.past.length) return
    const current = get()._snapshot()
    const past = history.past.slice()
    const prev = past.pop()
    set({ layers: prev.layers, selection: prev.selection, history: { past, future: [current, ...history.future].slice(0, 200) } })
  },
  redo: () => {
    const { history } = get()
    if (!history.future.length) return
    const current = get()._snapshot()
    const [next, ...rest] = history.future
    set({ layers: next.layers, selection: next.selection, history: { past: [...history.past, current].slice(-200), future: rest } })
  },

  // Actions
  initDefault: () => {
    const defaultSVG = `<svg id=\"react-background-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"${DEFAULT_VIEWBOX}\"><title>CNC Fill Text</title></svg>`
    get().setBackgroundFromString(defaultSVG)
  },

  setBackgroundElement: (el) => set(state => ({ background: { ...state.background, element: el } })),

  setBackgroundFromString: (fileContents) => {
    const parser = new DOMParser()
    const svg = parser.parseFromString(fileContents, 'image/svg+xml').documentElement
    svg.classList.remove('canvas')
    const viewBox = svg.hasAttribute('viewBox') ? svg.getAttribute('viewBox') : DEFAULT_VIEWBOX
    let width = svg.hasAttribute('width') ? svg.getAttribute('width') : 0
    let height = svg.hasAttribute('height') ? svg.getAttribute('height') : 0
    if (!width || !height) {
      const parts = viewBox.split(/[ ,]/).filter(Boolean).map(parseFloat)
      if (!width) width = parts[2]
      if (!height) height = parts[3]
      svg.setAttribute('width', width)
      svg.setAttribute('height', height)
    }
    const unitMatch = (typeof width === 'number') ? null : String(width).match(/[a-zA-Z]+/g)
    const unit = unitMatch ? unitMatch[0] : 'px'
    set({ background: { svgString: new XMLSerializer().serializeToString(svg), width, height, viewBox, unit, element: null } })
  },

  // Layer operations
  addLayer: () => {
    const { background, layers, pushHistory } = get()
    pushHistory()
    const id = genId()
    const vb = String(background.viewBox || DEFAULT_VIEWBOX).split(/[ ,]/).filter(Boolean).map(parseFloat)
    const [vx, vy] = [vb[0] || 0, vb[1] || 0]
    const layer = {
      id,
      name: `Layer ${layers.length + 1}`,
      text: DEFAULT_TEXT,
      font: defaultFont(),
      overlay: { ...defaultOverlay(), x: vx, y: vy, needsCenter: layers.length === 0 },
    }
    set({ layers: [...layers, layer], selection: [id] })
    // ensure font available and paths generated
    get().loadFontIfNeededForLayer(id)
  },
  removeLayer: (id) => {
    const { layers, selection, pushHistory } = get()
    pushHistory()
    const newLayers = layers.filter(l => l.id !== id)
    const newSelection = selection.filter(s => s !== id)
    set({ layers: newLayers, selection: newSelection })
  },
  setExportTextOnly: (val) => set({ exportTextOnly: !!val }),

  setSelection: (ids) => set({ selection: ids.slice() }),
  clearSelection: () => set({ selection: [] }),
  selectOne: (id) => set({ selection: [id] }),
  toggleSelection: (id) => set(state => ({ selection: state.selection.includes(id) ? state.selection.filter(s => s !== id) : [...state.selection, id] })),

  // Text editing for single selection
  typeText: (nextText) => {
    const { selection, setLayerText, generatePathsForLayer, pushHistory } = get()
    if (selection.length !== 1) return
    const id = selection[0]
    if (!_typingActive) {
      pushHistory()
      _typingActive = true
    }
    setLayerText(id, nextText)
    if (_genTimer) clearTimeout(_genTimer)
    _genTimer = setTimeout(() => { generatePathsForLayer(id) }, 150)
    if (_typingTimer) clearTimeout(_typingTimer)
    _typingTimer = setTimeout(() => { _typingActive = false }, 800)
  },

  // Mutators for fields
  setLayerText: (id, text) => set(state => ({ layers: state.layers.map(l => l.id === id ? { ...l, text } : l) })),
  // Low-level single-layer font setter (used by interactive handlers). History is handled by caller.
  setLayerFontField: (id, key, value) => set(state => ({ layers: state.layers.map(l => l.id === id ? { ...l, font: { ...l.font, [key]: value } } : l) })),
  setLayerOverlayField: (id, key, value) => set(state => ({ layers: state.layers.map(l => {
    if (l.id !== id) return l
    let v = value
    if (key === 'x' || key === 'y') v = roundInt(value)
    if (key === 'rotation') v = roundRot(value)
    return { ...l, overlay: { ...l.overlay, [key]: v } }
  }) })),

  // Apply to selection helpers
  setFontFieldForSelection: (key, value) => {
    const { selection, layers } = get()
    const ids = new Set(selection)
    set({ layers: layers.map(l => ids.has(l.id) ? { ...l, font: { ...l.font, [key]: value } } : l) })
  },
  setTransformForSelection: ({ x, y, rotation, scaleX, scaleY }) => {
    set(state => {
      const ids2 = new Set(state.selection)
      return {
        layers: state.layers.map(l => ids2.has(l.id) ? {
          ...l,
          overlay: {
            ...l.overlay,
            x: x == null ? l.overlay.x : roundInt(x),
            y: y == null ? l.overlay.y : roundInt(y),
            rotation: rotation == null ? l.overlay.rotation : roundRot(rotation),
            scaleX: scaleX ?? l.overlay.scaleX,
            scaleY: scaleY ?? l.overlay.scaleY,
          }
        } : l)
      }
    })
  },
  nudgeSelectionBy: (dx, dy) => {
    const { selection } = get()
    if (!selection.length) return
    set(state => {
      const ids2 = new Set(state.selection)
      return {
        layers: state.layers.map(l => ids2.has(l.id) ? { ...l, overlay: { ...l.overlay, x: roundInt(l.overlay.x + dx), y: roundInt(l.overlay.y + dy) } } : l)
      }
    })
  },
  adjustFontSizeForSelection: (delta) => {
    const { selection } = get()
    const ids = new Set(selection)
    if (!delta || !selection.length) return
    set(state => ({
      layers: state.layers.map(l => ids.has(l.id) ? { ...l, font: { ...l.font, sizePx: Math.max(1, (l.font.sizePx || 1) + delta) } } : l)
    }))
    // ensure fonts and paths regenerate for each selected layer
    get().selection.forEach(id => get().loadFontIfNeededForLayer(id))
  },

  // Font loading and path generation per layer
  _cacheKeyFor: (fontKey, sizePx) => `${fontKey}@@${sizePx}`,
  loadFontIfNeededForLayer: async (id) => {
    const { fontsMap, fontCache } = get()
    const layer = get().layers.find(l => l.id === id)
    if (!layer) return
    const meta = fontsMap[layer.font.selected]
    if (!meta) return
    const cacheKey = get()._cacheKeyFor(layer.font.selected, layer.font.sizePx)
    if (fontCache[cacheKey]) {
      get().generatePathsForLayer(id)
      return
    }
    const url = `${import.meta.env.BASE_URL}fonts/${meta.filename}.svg`
    const res = await fetch(url)
    const raw = await res.text()
    const start = Math.max(raw.indexOf('<svg'), raw.indexOf('<SVG'))
    const svgString = raw.substring(start)
    const data = parseFont(new DOMParser().parseFromString(svgString, 'image/svg+xml'), layer.font.sizePx)
    set(state => ({ fontCache: { ...state.fontCache, [cacheKey]: data }, layers: state.layers.map(l => l.id === id ? { ...l, font: { ...l.font, originalURL: meta.originalURL } } : l) }))
    get().generatePathsForLayer(id)
  },
  generatePathsForLayer: (id) => {
    const layer = get().layers.find(l => l.id === id)
    if (!layer) return
    const cacheKey = get()._cacheKeyFor(layer.font.selected, layer.font.sizePx)
    const data = get().fontCache[cacheKey]
    if (!data) return
    const paths = createTextPaths(layer.text, data, {
      alignment: layer.font.alignment,
      charSpacing: layer.font.charSpacing,
      lineHeight: layer.font.lineHeight,
    })
    set(state => ({ layers: state.layers.map(l => l.id === id ? { ...l, overlay: { ...l.overlay, paths } } : l) }))
  },
  setAlignmentPreserveCenterForSelection: (newAlignment) => {
    const { selection, pushHistory } = get()
    if (!selection.length) return
    pushHistory()
    selection.forEach(id => {
      const layer = get().layers.find(l => l.id === id)
      if (!layer) return
      const cacheKey = get()._cacheKeyFor(layer.font.selected, layer.font.sizePx)
      const data = get().fontCache[cacheKey]
      if (!data) return
      const { maxLineWidth } = measureLineWidths(layer.text, data, layer.font.charSpacing)
      const centerFor = (al) => {
        if (al === 'left') return maxLineWidth / 2
        if (al === 'center') return 0
        if (al === 'right') return -maxLineWidth / 2
        return 0
      }
      const oldCenterX = centerFor(layer.font.alignment)
      const newCenterX = centerFor(newAlignment)
      const deltaLocalX = oldCenterX - newCenterX
      const theta = (layer.overlay.rotation * Math.PI) / 180
      const dx = deltaLocalX * Math.cos(theta)
      const dy = deltaLocalX * Math.sin(theta)
      set(state => ({ layers: state.layers.map(l => l.id === id ? { ...l, overlay: { ...l.overlay, x: l.overlay.x + dx, y: l.overlay.y + dy }, font: { ...l.font, alignment: newAlignment } } : l) }))
      get().generatePathsForLayer(id)
    })
  },

  // File upload handler
  onSourceFileChange: async (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      let fileContents = e.target.result
      let idx = fileContents.indexOf('<svg')
      if (idx === -1) idx = fileContents.indexOf('<SVG')
      fileContents = fileContents.substring(idx)
      get().setBackgroundFromString(fileContents)
    }
    reader.readAsText(file)
  },

  // Download all layers with flattened transforms
  download: () => {
    const { background, layers, exportTextOnly } = get()
    const baseSvgString = exportTextOnly
      ? `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"${background.viewBox}\" width=\"${background.width}\" height=\"${background.height}\"></svg>`
      : background.svgString
    if (!baseSvgString) return
    // Compute px per user unit (from viewBox to rendered size)
    const [ , , vbw, vbh ] = String(background.viewBox || DEFAULT_VIEWBOX).split(/[ ,]/).filter(Boolean).map(parseFloat)
    const widthVal = parseFloat(background.width)
    const heightVal = parseFloat(background.height)
    const unit = background.unit || 'px'
    const widthPx = isNaN(widthVal) ? 0 : (unit === 'px' ? widthVal : convertUnits(widthVal, unit, 'px', { roundPixel: false }))
    const heightPx = isNaN(heightVal) ? 0 : (unit === 'px' ? heightVal : convertUnits(heightVal, unit, 'px', { roundPixel: false }))
    const pxPerUnitX = vbw ? (widthPx / vbw) : 1
    const pxPerUnitY = vbh ? (heightPx / vbh) : 1
    const unitScaleX = pxPerUnitX ? (1 / pxPerUnitX) : 1
    const unitScaleY = pxPerUnitY ? (1 / pxPerUnitY) : 1
    let flattenedPaths = ''
    layers.forEach(layer => {
      const m = toMatrix({
        x: layer.overlay.x,
        y: layer.overlay.y,
        rotation: layer.overlay.rotation,
        scaleX: layer.overlay.scaleX,
        scaleY: layer.overlay.scaleY,
        pivot: layer.overlay.pivot,
      })
      layer.overlay.paths.forEach(({ d }) => {
        const newD = new SvgPath(d)
          .matrix(m)
          // convert from preview px to document user units
          .scale(unitScaleX, unitScaleY)
          .toString()
        const strokeUser = (layer.font.strokeWidth || 1) * unitScaleX
        flattenedPaths += `<path d=\"${newD}\" fill=\"none\" stroke=\"${layer.font.colorInvert ? '#FFFFFF' : '#000000'}\" stroke-width=\"${strokeUser}\" stroke-linecap=\"round\"/>`
      })
    })
    const flattenedGroup = `<g>${flattenedPaths}</g>`
    downloadSVGFromString(baseSvgString, flattenedGroup, `line-text-${Date.now()}`)
  },
}))

export default useEditorStore
