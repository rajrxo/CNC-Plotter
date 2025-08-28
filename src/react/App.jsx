import React, { useEffect, useState } from 'react'
import BackgroundSvg from './components/BackgroundSvg.jsx'
import TextOverlay from './components/TextOverlay.jsx'
import Controls from './components/Controls.jsx'
import AboutModal from './components/AboutModal.jsx'
import useEditorStore from './store/useEditorStore.js'

export default function App() {
  const initDefault = useEditorStore(s => s.initDefault)
  const clearSelection = useEditorStore(s => s.clearSelection)
  const selection = useEditorStore(s => s.selection)
  const pushHistory = useEditorStore(s => s.pushHistory)
  const undo = useEditorStore(s => s.undo)
  const redo = useEditorStore(s => s.redo)
  const adjustFontSizeForSelection = useEditorStore(s => s.adjustFontSizeForSelection)
  const nudgeSelectionBy = useEditorStore(s => s.nudgeSelectionBy)
  const setTransformForSelection = useEditorStore(s => s.setTransformForSelection)
  const exportTextOnly = useEditorStore(s => s.exportTextOnly)
  const setExportTextOnly = useEditorStore(s => s.setExportTextOnly)

  useEffect(() => {
    initDefault()
  }, [initDefault])

  // Keyboard shortcuts: Esc to deselect, Arrow keys to nudge (Shift for 10x),
  // Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z or Cmd/Ctrl+Y redo, R reset rotation, +/- change size
  useEffect(() => {
    const isEditable = (el) => {
      if (!el) return false
      const tag = el.tagName
      const editableTags = ['INPUT', 'TEXTAREA', 'SELECT']
      if (editableTags.includes(tag)) return true
      if (el.isContentEditable) return true
      return false
    }

    const onKeyDown = (e) => {
      if (isEditable(e.target)) return
      const isMod = e.metaKey || e.ctrlKey
      const key = e.key

      // Undo / Redo
      if (isMod && (key === 'z' || key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if (isMod && (key === 'y' || key === 'Y')) {
        e.preventDefault(); redo(); return
      }

      // Deselect on Esc
      if (key === 'Escape') {
        clearSelection()
        return
      }
      // Nudge with arrows when selection present
      if (!selection.length) return
      const step = e.shiftKey ? 10 : 1
      let dx = 0, dy = 0
      switch (key) {
        case 'ArrowUp':
          dy = -step
          break
        case 'ArrowDown':
          dy = step
          break
        case 'ArrowLeft':
          dx = -step
          break
        case 'ArrowRight':
          dx = step
          break
        case 'r':
        case 'R':
          e.preventDefault()
          pushHistory()
          setTransformForSelection({ rotation: 0 })
          return
        case '+':
        case '=': // shift + '=' produces '+' on many layouts
          e.preventDefault()
          pushHistory()
          adjustFontSizeForSelection(e.shiftKey ? 10 : 1)
          return
        case '-':
        case '_':
          e.preventDefault()
          pushHistory()
          adjustFontSizeForSelection(-(e.shiftKey ? 10 : 1))
          return
        default:
          break
      }
      if (dx !== 0 || dy !== 0) {
        e.preventDefault()
        if (!e.repeat) pushHistory()
        nudgeSelectionBy(dx, dy)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selection.length, pushHistory, undo, redo, adjustFontSizeForSelection, nudgeSelectionBy, setTransformForSelection])

  return (
    <div id="app">
      <div className="page">
        <div className="sidebar">
          <div className="controls-wrapper">
            <div className="controls">
              <p className="mt-3 lead text-center text-white"> Source </p>
              <Controls />
            </div>
          </div>
          <div className="button">
            <div className="reveal"></div>
            <div className="d-flex align-items-center justify-content-center px-3 py-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', position: 'relative', zIndex: 1 }}>
              <DownloadButton />
              <div className="custom-control custom-switch ml-3 mb-0">
                <input type="checkbox" className="custom-control-input" id="exportTextOnly" checked={!!exportTextOnly} onChange={(e) => setExportTextOnly(e.target.checked)} />
                <label className="custom-control-label" htmlFor="exportTextOnly" style={{ fontSize: 10 }}>text only</label>
              </div>
            </div>
          </div>
        </div>
        <div className="paper">
          <div className="ad">
            <a href="https://store.bantamtools.com/collections/bantam-tools-nextdraw" target="_blank" style={{ color: 'inherit' }}>
              Get 5% off NextDraw and accessories with coupon "<b>DRAWINGBOT2025</b>"
            </a>
          </div>
          <div id="sketch" className="sketch">
            <div
              id="svg-wrapper"
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseDown={() => clearSelection()}
            >
              <BackgroundSvg />
              <TextOverlay />
            </div>
          </div>
        </div>
        <div className="footer-wrapper">
          <div className="footer">
            <h3>CNC Text Editor</h3>
            <FooterWithAbout />
          </div>
        </div>
      </div>
    </div>
  )
}

function DownloadButton() {
  const download = useEditorStore(s => s.download)
  return (
    <button className="btn btn-primary" style={{ minWidth: 180 }} onClick={download}>Download SVG</button>
  )
}

function FooterWithAbout() {
  const [aboutOpen, setAboutOpen] = useState(false)
  return (
    <>
      <p>
        Project by{' '}
        <a target="_blank" rel="noreferrer" href="http://twitter.com/msurguy">@msurguy</a>
        {' '}(
        <a target="_blank" rel="noreferrer" href="http://github.com/msurguy/cnc-text-tool">Source</a>
        {')'}
        {' '}
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          title="About this tool"
          style={{ background: 'none', border: 'none', color: '#0b5ed7', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginLeft: 8 }}
        >
          About
        </button>
      </p>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}
