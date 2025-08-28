import React, { useEffect } from 'react'

export default function AboutModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const overlayStyle = {
    position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 3000,
    padding: 16,
    textAlign: 'left'
  }
  const modalStyle = {
    background: '#fff', color: '#222',
    width: '100%', maxWidth: 900,
    maxHeight: '85vh', overflow: 'auto',
    borderRadius: 6,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
  }
  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #e5e5e5',
    position: 'sticky', top: 0, background: '#fff', zIndex: 1,
  }
  const bodyStyle = { padding: '16px 18px 22px 18px', lineHeight: 1.55 }
  const closeBtnStyle = {
    border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 20, lineHeight: 1, padding: 4
  }
  const linkStyle = { color: '#0b5ed7' }

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <strong>CNC Single‑Line Text Tool</strong>
          </div>
          <button aria-label="Close" style={closeBtnStyle} onClick={onClose}>×</button>
        </div>
        <div style={bodyStyle}>
          <p>
            Design clean, single‑stroke text for pen plotters, laser engravers, and CNC machines — right in your browser.
            Everything runs locally; no sign‑ups or installs.
          </p>

          <p>
            Live tool: {' '}
            <a href="https://msurguy.github.io/cnc-text-tool/" target="_blank" rel="noreferrer" style={linkStyle}>
              msurguy.github.io/cnc-text-tool
            </a>
          </p>

          <h3 style={{ marginTop: 18 }}>Highlights</h3>
          <ul>
            <li>Single‑line fonts for plotting, engraving, and V‑carving</li>
            <li>Multiple text layers with easy selection and management</li>
            <li>Precise controls: size, line height, character spacing, alignment, rotation, color inversion</li>
            <li>Upload an SVG background to position text exactly</li>
            <li>Drag to move; rotate/scale with handles; arrow keys to nudge</li>
            <li>Clean export: flattened, stroke‑only SVG with round caps</li>
            <li>Private by design: runs entirely in your browser</li>
          </ul>

          <h3 style={{ marginTop: 18 }}>Quick Start</h3>
          <ol>
            <li>Open the live tool.</li>
            <li>(Optional) Upload your SVG canvas via “Upload File”.</li>
            <li>Add a text layer and type your text.</li>
            <li>Choose a single‑line font and adjust size, spacing, line height, alignment, rotation.</li>
            <li>Position precisely by dragging or by entering X/Y.</li>
            <li>Download the SVG (toggle “text only” to exclude the background).</li>
          </ol>

          <h3 style={{ marginTop: 18 }}>Keyboard Shortcuts</h3>
          <ul>
            <li>Esc: Deselect</li>
            <li>Arrow keys: Nudge (hold Shift for 10×)</li>
            <li>Cmd/Ctrl+Z: Undo</li>
            <li>Shift+Cmd/Ctrl+Z or Cmd/Ctrl+Y: Redo</li>
            <li>R: Reset rotation</li>
            <li>+ / −: Increase / decrease font size (Shift for larger steps)</li>
          </ul>

          <h3 style={{ marginTop: 18 }}>Exporting</h3>
          <ul>
            <li>Exports stroke‑only SVG paths scaled to your document units with round line caps.</li>
            <li>Use “text only” to export just the text layer(s) without the background.</li>
            <li>Need DXF/other formats? Import the SVG into Inkscape/Illustrator or convert via your preferred tools.</li>
          </ul>

          <h3 style={{ marginTop: 18 }}>Fonts & Licensing</h3>
          <p>Bundled fonts are sourced from:</p>
          <ul>
            <li><a href="https://gitlab.com/oskay/svg-fonts" target="_blank" rel="noreferrer" style={linkStyle}>gitlab.com/oskay/svg-fonts</a></li>
            <li><a href="https://github.com/isdat-type/Relief-SingleLine" target="_blank" rel="noreferrer" style={linkStyle}>github.com/isdat-type/Relief-SingleLine</a></li>
            <li><a href="http://cutlings.wasbo.net/products-fonts/" target="_blank" rel="noreferrer" style={linkStyle}>cutlings.wasbo.net/products-fonts/</a></li>
            <li><a href="https://github.com/Shriinivas/inkscapestrokefont" target="_blank" rel="noreferrer" style={linkStyle}>github.com/Shriinivas/inkscapestrokefont</a></li>
          </ul>
          <p>
            Please consult the original repositories for licensing terms before redistributing fonts.
            The app’s code is MIT‑licensed; fonts retain their respective licenses.
          </p>

          <h3 style={{ marginTop: 18 }}>Credits</h3>
          <p>
            Built by Maks Surguy — <a href="https://drawingbots.net/" target="_blank" rel="noreferrer" style={linkStyle}>drawingbots.net</a>
            {' '}·{' '}
            <a href="https://plotterfiles.com/" target="_blank" rel="noreferrer" style={linkStyle}>plotterfiles.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}

