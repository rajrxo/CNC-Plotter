import React, { useEffect, useMemo, useRef, useState } from 'react'
import Moveable from 'react-moveable'
import SvgPath from 'svgpath'
import useEditorStore from '../store/useEditorStore.js'

export default function TextOverlay() {
  const { width, height } = useEditorStore(s => s.background)
  const layers = useEditorStore(s => s.layers)
  const selection = useEditorStore(s => s.selection)
  const selectOne = useEditorStore(s => s.selectOne)
  const toggleSelection = useEditorStore(s => s.toggleSelection)

  const targetsRef = useRef({})
  const handlersRef = useRef({})

  const selectedLayer = useMemo(() => selection.length === 1 ? layers.find(l => l.id === selection[0]) : null, [selection, layers])
  const moveableRef = useRef(null)
  // Nudge Moveable to recompute its rect after DOM/transform updates
  useEffect(() => {
    if (!selectedLayer) return
    const m = moveableRef.current
    if (!m) return
    // Defer to next frame to ensure DOM updated
    const id = requestAnimationFrame(() => { try { m.updateRect() } catch (_) {} })
    return () => cancelAnimationFrame(id)
  }, [selectedLayer?.id, selectedLayer?.overlay?.x, selectedLayer?.overlay?.y, selectedLayer?.overlay?.rotation, selectedLayer?.overlay?.scaleX, selectedLayer?.overlay?.scaleY, selectedLayer?.overlay?.paths?.length, width, height])

  return (
    <>
      <svg className="canvas" width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        {layers.map(layer => (
          <SingleTextLayer
            key={layer.id}
            layer={layer}
            selected={selection.includes(layer.id)}
            registerRef={(id, el) => {
              if (el) targetsRef.current[id] = el; else delete targetsRef.current[id]
            }}
            registerHandlers={(id, h) => {
              if (h) handlersRef.current[id] = h; else delete handlersRef.current[id]
            }}
            onSelect={(e) => {
              e.stopPropagation()
              if (e.shiftKey) toggleSelection(layer.id); else selectOne(layer.id)
            }}
          />
        ))}
      </svg>
      {(() => {
        const selId = selection.length === 1 ? selection[0] : null
        const t = selId ? targetsRef.current[selId] : null
        return t && t.isConnected ? (
          <Moveable
            key={selId}
            target={t}
            ref={moveableRef}
            origin={false}
            draggable
            rotatable
            keepRatio={true}
            scalable
            {...(handlersRef.current[selId] || {})}
          />
        ) : null
      })()}
    </>
  )
}

function SingleTextLayer({ layer, selected, onSelect, registerRef, registerHandlers }) {
  const setLayerOverlayField = useEditorStore(s => s.setLayerOverlayField)
  const setLayerFontField = useEditorStore(s => s.setLayerFontField)
  const loadFontIfNeededForLayer = useEditorStore(s => s.loadFontIfNeededForLayer)
  const viewBoxStr = useEditorStore(s => s.background.viewBox)

  const groupRef = useRef(null)
  const contentRef = useRef(null)
  const [hitRect, setHitRect] = useState(null)
  const [hovered, setHovered] = useState(false)
  const startSizeRef = useRef({ sizePx: layer.font.sizePx })
  const lastWorldPivotRef = useRef(null)
  const interactionStartedRef = useRef(false)
  const prevPathsKeyRef = useRef(null)
  // no persistent drag baseline; Moveable provides absolute values via `set` + beforeTranslate/beforeRotate

  const pathsKey = useMemo(() => (layer.overlay.paths || []).map(p => p.d).join('|'), [layer.overlay.paths])

  useEffect(() => {
    if (groupRef.current) registerRef(layer.id, groupRef.current)
    return () => { registerRef(layer.id, null); registerHandlers(layer.id, null) }
  }, [registerRef, registerHandlers, layer.id])

  const transformAttr = useMemo(() => {
    const cx = hitRect ? (hitRect.x + hitRect.width / 2) : 0
    const cy = hitRect ? (hitRect.y + hitRect.height / 2) : 0
    const t = []
    t.push(`translate(${layer.overlay.x} ${layer.overlay.y})`)
    t.push(`translate(${cx} ${cy})`)
    if (layer.overlay.rotation) t.push(`rotate(${layer.overlay.rotation})`)
    if (layer.overlay.scaleX !== 1 || layer.overlay.scaleY !== 1) t.push(`scale(${layer.overlay.scaleX} ${layer.overlay.scaleY})`)
    t.push(`translate(${-cx} ${-cy})`)
    return t.join(' ')
  }, [layer.overlay.x, layer.overlay.y, layer.overlay.rotation, layer.overlay.scaleX, layer.overlay.scaleY, hitRect])

  const strokeColor = layer.font.colorInvert ? '#FFFFFF' : '#000000'

  useEffect(() => {
    if (!contentRef.current) return
    try {
      const bbox = contentRef.current.getBBox()
      const cx = bbox.x + bbox.width / 2
      const cy = bbox.y + bbox.height / 2
      setHitRect({ x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height })

      // If this layer was flagged to auto-center (e.g. first layer), do it once
      if (layer.overlay.needsCenter && viewBoxStr) {
        // Wait until geometry is available to avoid centering at (0,0)
        if (bbox.width <= 0 || bbox.height <= 0) return
        const parts = String(viewBoxStr).split(/[ ,]/).filter(Boolean).map(parseFloat)
        const centerX = (parts[0] || 0) + (parts[2] || 0) / 2
        const centerY = (parts[1] || 0) + (parts[3] || 0) / 2
        const dx0 = centerX - (layer.overlay.x + cx)
        const dy0 = centerY - (layer.overlay.y + cy)
        if (Math.abs(dx0) > 0.0001 || Math.abs(dy0) > 0.0001) {
          setLayerOverlayField(layer.id, 'x', layer.overlay.x + dx0)
          setLayerOverlayField(layer.id, 'y', layer.overlay.y + dy0)
        }
        setLayerOverlayField(layer.id, 'needsCenter', false)
        lastWorldPivotRef.current = { wx: centerX, wy: centerY }
        prevPathsKeyRef.current = pathsKey
        // also set pivot
        setLayerOverlayField(layer.id, 'pivot', { cx, cy })
        return
      }

      // Update persistent pivot from latest geometry
      setLayerOverlayField(layer.id, 'pivot', { cx, cy })

      // Only preserve world pivot when the geometry (paths) changed.
      if (prevPathsKeyRef.current && prevPathsKeyRef.current !== pathsKey) {
        const currentWorld = { wx: layer.overlay.x + cx, wy: layer.overlay.y + cy }
        const desired = lastWorldPivotRef.current || currentWorld
        const dx = desired.wx - currentWorld.wx
        const dy = desired.wy - currentWorld.wy
        if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
          setLayerOverlayField(layer.id, 'x', layer.overlay.x + dx)
          setLayerOverlayField(layer.id, 'y', layer.overlay.y + dy)
        }
        lastWorldPivotRef.current = desired
      }
      // Record the current geometry key
      prevPathsKeyRef.current = pathsKey
    } catch (_) {}
  }, [layer.id, pathsKey, setLayerOverlayField, layer.overlay.needsCenter, viewBoxStr])

  // Register handlers so Moveable can be rendered outside SVG and still work on this group
  useEffect(() => {
    const ensureHistoryPushed = () => {
      if (!interactionStartedRef.current) {
        try { useEditorStore.getState().pushHistory() } catch (_) {}
        interactionStartedRef.current = true
      }
    }
    const handlers = {
      onDragStart: ({ set }) => {
        ensureHistoryPushed()
        set([layer.overlay.x, layer.overlay.y])
      },
      onDrag: ({ beforeTranslate: [tx, ty] }) => {
        ensureHistoryPushed()
        setLayerOverlayField(layer.id, 'x', tx)
        setLayerOverlayField(layer.id, 'y', ty)
        if (hitRect) {
          const cx = hitRect.x + hitRect.width / 2
          const cy = hitRect.y + hitRect.height / 2
          lastWorldPivotRef.current = { wx: tx + cx, wy: ty + cy }
        }
      },
      onDragEnd: () => {
        interactionStartedRef.current = false
      },
      onRotateStart: ({ set }) => {
        ensureHistoryPushed()
        set(layer.overlay.rotation)
      },
      onRotate: ({ beforeRotate }) => {
        ensureHistoryPushed()
        setLayerOverlayField(layer.id, 'rotation', beforeRotate)
        if (hitRect) {
          const cx = hitRect.x + hitRect.width / 2
          const cy = hitRect.y + hitRect.height / 2
          lastWorldPivotRef.current = { wx: layer.overlay.x + cx, wy: layer.overlay.y + cy }
        }
      },
      onRotateEnd: () => {
        interactionStartedRef.current = false
      },
      onScaleStart: ({ set }) => {
        ensureHistoryPushed()
        startSizeRef.current = { sizePx: layer.font.sizePx }
        set([layer.overlay.scaleX, layer.overlay.scaleY])
      },
      onScale: ({ scale: [sx, sy] }) => {
        ensureHistoryPushed()
        setLayerOverlayField(layer.id, 'scaleX', sx)
        setLayerOverlayField(layer.id, 'scaleY', sy)
      },
      onScaleEnd: ({ lastEvent }) => {
        interactionStartedRef.current = false
        if (!lastEvent) return
        const [sx] = lastEvent.scale
        const base = startSizeRef.current.sizePx || layer.font.sizePx
        const newSize = Math.max(1, Math.round(base * sx))
        const cx = hitRect ? (hitRect.x + hitRect.width / 2) : 0
        const cy = hitRect ? (hitRect.y + hitRect.height / 2) : 0
        const scaledPaths = layer.overlay.paths.map(p => ({ d: new SvgPath(p.d).translate(-cx, -cy).scale(sx, sx).translate(cx, cy).toString() }))
        setLayerOverlayField(layer.id, 'scaleX', 1)
        setLayerOverlayField(layer.id, 'scaleY', 1)
        setLayerOverlayField(layer.id, 'paths', scaledPaths)
        setLayerFontField(layer.id, 'sizePx', newSize)
        loadFontIfNeededForLayer(layer.id)
      },
    }
    registerHandlers(layer.id, handlers)
  }, [layer.id, layer.overlay.x, layer.overlay.y, layer.overlay.rotation, layer.overlay.scaleX, layer.overlay.scaleY, layer.font.sizePx, hitRect, setLayerOverlayField, setLayerFontField, loadFontIfNeededForLayer, registerHandlers])

  return (
    <g
      ref={groupRef}
      transform={transformAttr}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={onSelect}
    >
      {hitRect && (
        <rect
          x={hitRect.x}
          y={hitRect.y}
          width={hitRect.width}
          height={hitRect.height}
          fill={(selected || hovered) ? 'rgba(74,144,226,0.06)' : 'transparent'}
          stroke={(selected || hovered) ? '#4A90E2' : 'transparent'}
          strokeWidth={(selected || hovered) ? 1 : 0}
          pointerEvents="all"
        />
      )}
      <g ref={contentRef}>
        {layer.overlay.paths.map((p, idx) => (
          <path key={idx} d={p.d} fill="none" stroke={strokeColor} strokeWidth={layer.font.strokeWidth} strokeLinecap="round" />
        ))}
      </g>
    </g>
  )
}
