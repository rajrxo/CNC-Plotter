import React, { useEffect, useMemo, useRef } from 'react'
import useEditorStore from '../store/useEditorStore.js'

export default function Controls() {
  const fontsMap = useEditorStore(s => s.fontsMap)
  const layers = useEditorStore(s => s.layers)
  const selection = useEditorStore(s => s.selection)
  const onSourceFileChange = useEditorStore(s => s.onSourceFileChange)
  const typeText = useEditorStore(s => s.typeText)
  const setFontFieldForSelection = useEditorStore(s => s.setFontFieldForSelection)
  const setAlignmentPreserveCenterForSelection = useEditorStore(s => s.setAlignmentPreserveCenterForSelection)
  const setLayerOverlayField = useEditorStore(s => s.setLayerOverlayField)
  const loadFontIfNeededForLayer = useEditorStore(s => s.loadFontIfNeededForLayer)
  const setTransformForSelection = useEditorStore(s => s.setTransformForSelection)
  const addLayer = useEditorStore(s => s.addLayer)
  const pushHistory = useEditorStore(s => s.pushHistory)
  const xChangeStarted = useRef(false)
  const yChangeStarted = useRef(false)

  // Effective selected layer (use first selected for displaying values in multi-select)
  const primary = selection.length >= 1 ? layers.find(l => l.id === selection[0]) : null
  const isSingle = selection.length === 1

  const fontOptions = useMemo(() => Object.keys(fontsMap).sort(), [fontsMap])
  const selectedLayers = useMemo(() => selection.map(id => layers.find(l => l.id === id)).filter(Boolean), [selection, layers])
  const mixed = (getter) => selectedLayers.length > 1 && selectedLayers.some(l => getter(l) !== getter(selectedLayers[0]))
  const fontSizeMixed = mixed(l => l.font.sizePx)
  const charSpacingMixed = mixed(l => l.font.charSpacing)
  const lineHeightMixed = mixed(l => l.font.lineHeight)
  const rotationMixed = mixed(l => l.overlay.rotation)
  const fontMixed = mixed(l => l.font.selected)
  const alignmentMixed = mixed(l => l.font.alignment)
  const colorMixed = mixed(l => !!l.font.colorInvert)
  const xMixed = mixed(l => l.overlay.x)
  const yMixed = mixed(l => l.overlay.y)
  const colorRef = useRef(null)
  useEffect(() => {
    if (colorRef.current) colorRef.current.indeterminate = !!colorMixed
  }, [colorMixed, selection.length])

  const onFontChange = (e) => {
    const value = e.target.value
    pushHistory()
    setFontFieldForSelection('selected', value)
    selection.forEach(id => loadFontIfNeededForLayer(id))
  }
  const onSizeChange = (e) => {
    const v = Number(e.target.value)
    setFontFieldForSelection('sizePx', v)
    selection.forEach(id => loadFontIfNeededForLayer(id))
  }
  const onAlignmentChange = (e) => {
    setAlignmentPreserveCenterForSelection(e.target.value)
  }
  const onLineHeightChange = (e) => {
    setFontFieldForSelection('lineHeight', Number(e.target.value))
    selection.forEach(id => useEditorStore.getState().generatePathsForLayer(id))
  }
  const onCharSpacingChange = (e) => {
    setFontFieldForSelection('charSpacing', Number(e.target.value))
    selection.forEach(id => useEditorStore.getState().generatePathsForLayer(id))
  }
  const onRotationChange = (e) => {
    setTransformForSelection({ rotation: Number(e.target.value) })
  }
  const onColorToggle = (e) => {
    pushHistory()
    setFontFieldForSelection('colorInvert', e.target.checked)
  }
  const onXChange = (e) => {
    if (!xChangeStarted.current) { pushHistory(); xChangeStarted.current = true }
    const v = Number(e.target.value)
    if (!Number.isNaN(v)) setTransformForSelection({ x: v })
  }
  const onYChange = (e) => {
    if (!yChangeStarted.current) { pushHistory(); yChangeStarted.current = true }
    const v = Number(e.target.value)
    if (!Number.isNaN(v)) setTransformForSelection({ y: v })
  }

  return (
    <div>
      <div className="sidebar-control">
        <div className="control-header">
          <div />
          <div className="control-label">Upload File</div>
          <div />
        </div>
        <div className="custom-file">
          <input type="file" accept="image/svg+xml" className="custom-file-input" id="sourcefile-react" onChange={(e) => {
            const files = e.target.files || e.dataTransfer.files
            if (!files || !files.length) return
            onSourceFileChange(files[0])
          }} />
          <label className="custom-file-label" htmlFor="sourcefile-react">Choose file</label>
        </div>
      </div>

      <LayersPanel />

      <div className="sidebar-control">
        <div className="control-header">
          <div />
          <div className="control-label">Input Text</div>
          <div />
        </div>
        <textarea
          className="form-control"
          rows={4}
          value={primary ? primary.text : ''}
          placeholder={selection.length !== 1 ? 'Select one layer to edit text' : ''}
          onChange={(e) => { typeText(e.target.value) }}
          disabled={!isSingle}
        />
      </div>

      <div className="sidebar-control">
        <div className="control-header">
          <div />
          <div className="control-label">Position{(xMixed || yMixed) ? ' · Mixed' : ''}</div>
          <div />
        </div>
        <div className="d-flex align-items-center">
          <label className="mr-2 mb-0">x:</label>
          <input type="number" className="form-control form-control-sm mr-2" style={{ maxWidth: 100 }} value={primary ? (xMixed && !isSingle ? '' : primary.overlay.x) : ''} placeholder={(!isSingle && xMixed) ? 'Mixed' : undefined} title={(!isSingle && xMixed) ? 'Multiple values selected' : undefined} onChange={onXChange} onBlur={() => { xChangeStarted.current = false }} disabled={selection.length === 0} />
          <label className="mr-2 mb-0">y:</label>
          <input type="number" className="form-control form-control-sm" style={{ maxWidth: 100 }} value={primary ? (yMixed && !isSingle ? '' : primary.overlay.y) : ''} placeholder={(!isSingle && yMixed) ? 'Mixed' : undefined} title={(!isSingle && yMixed) ? 'Multiple values selected' : undefined} onChange={onYChange} onBlur={() => { yChangeStarted.current = false }} disabled={selection.length === 0} />
        </div>
      </div>

      <div className="sidebar-control">
        <div className="control-header">
          <div />
          <div className="control-label">Font{fontMixed ? ' · Mixed' : ''}</div>
          <div />
        </div>
        <select className="custom-select custom-select-sm custom-select-input" value={primary ? primary.font.selected : ''} onChange={onFontChange} disabled={selection.length === 0} title={fontMixed ? 'Multiple values selected' : undefined}>
          {fontOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {primary?.font.originalURL && (
          <div className="control-footer"><a href={primary.font.originalURL} target="_blank" rel="noreferrer">About this font</a></div>
        )}
      </div>

      <div className="sidebar-control">
        <div className="control-header">
          <div />
          <div className="control-label">Alignment{alignmentMixed ? ' · Mixed' : ''}</div>
          <div />
        </div>
        <select className="custom-select custom-select-sm custom-select-input" value={primary ? primary.font.alignment : ''} onChange={onAlignmentChange} disabled={selection.length === 0} title={alignmentMixed ? 'Multiple values selected' : undefined}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <LabeledSlider label="Font Size" min={10} max={150} step={1} value={primary ? primary.font.sizePx : 24} onStart={pushHistory} onChange={onSizeChange} disabled={selection.length === 0} mixed={fontSizeMixed} />
      <LabeledSlider label="Character Spacing" min={0} max={10} step={0.1} value={primary ? primary.font.charSpacing : 0} onStart={pushHistory} onChange={onCharSpacingChange} disabled={selection.length === 0} mixed={charSpacingMixed} />
      <LabeledSlider label="Line Height" min={0.5} max={3} step={0.1} value={primary ? primary.font.lineHeight : 1} onStart={pushHistory} onChange={onLineHeightChange} disabled={selection.length === 0} mixed={lineHeightMixed} />
      <LabeledSlider label="Rotation" min={0} max={360} step={1} value={primary ? primary.overlay.rotation : 0} onStart={pushHistory} onChange={onRotationChange} disabled={selection.length === 0} mixed={rotationMixed} />

      <div className="custom-control custom-switch" style={{ margin: '10px 0' }}>
        <input ref={colorRef} type="checkbox" className="custom-control-input" id="colorToggle" checked={!!primary?.font.colorInvert} onChange={onColorToggle} disabled={selection.length === 0} title={colorMixed ? 'Multiple values selected' : undefined} />
        <label className="custom-control-label" htmlFor="colorToggle">Black / White{colorMixed ? ' · Mixed' : ''}</label>
      </div>
    </div>
  )
}

function LabeledSlider({ label, min, max, step, value, onChange, onStart, disabled, mixed }) {
  const displayVal = mixed ? 'Mixed' : (label.toLowerCase().includes('rotation') ? Number(value).toFixed(2) : value)
  const startedRef = React.useRef(false)
  const inputStartedRef = React.useRef(false)
  const handleRangeStart = () => { if (!startedRef.current) { startedRef.current = true; onStart && onStart() } }
  const endRange = () => { startedRef.current = false }
  const handleNumberChange = (e) => {
    if (!inputStartedRef.current) { inputStartedRef.current = true; onStart && onStart() }
    onChange(e)
  }
  const endNumber = () => { inputStartedRef.current = false }
  return (
    <div className="sidebar-control">
      <div className="control-header">
        <div />
        <div className="control-label">{label}{mixed ? ' · Mixed' : ''}</div>
        <div />
      </div>
      <div className="d-flex align-items-center">
        <input
          type="range"
          className="custom-range"
          min={min}
          max={max}
          step={step}
          value={value}
          onMouseDown={handleRangeStart}
          onTouchStart={handleRangeStart}
          onMouseUp={endRange}
          onTouchEnd={endRange}
          onTouchCancel={endRange}
          onChange={onChange}
          disabled={disabled}
          title={mixed ? 'Multiple values selected' : undefined}
          style={{ flex: 1 }}
        />
        
      </div>
      <div className="d-flex justify-content-between">
        <span>{min}</span>
        <span><input
          type="number"
          className="form-control form-control-sm ml-2"
          style={{ width: 90, maxWidth: 120 }}
          min={min}
          max={max}
          step={step}
          value={mixed ? '' : (label.toLowerCase().includes('rotation') ? Number(value).toFixed(2) : value)}
          placeholder={mixed ? 'Mixed' : undefined}
          title={mixed ? 'Multiple values selected' : undefined}
          onChange={handleNumberChange}
          onBlur={endNumber}
          disabled={disabled}
        /></span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function LayersPanel() {
  const layers = useEditorStore(s => s.layers)
  const selection = useEditorStore(s => s.selection)
  const addLayer = useEditorStore(s => s.addLayer)
  const selectOne = useEditorStore(s => s.selectOne)
  const toggleSelection = useEditorStore(s => s.toggleSelection)
  const removeLayer = useEditorStore(s => s.removeLayer)

  return (
    <div className="sidebar-control">
      <div className="control-header">
        <div />
        <div className="control-label">Layers</div>
        <div />
      </div>
      <button className="btn btn-sm btn-secondary mb-2" onClick={addLayer}>Add Text Layer</button>
      <div>
        {layers.length === 0 && (
          <div className="text-muted" style={{ fontSize: 12 }}>No layers yet. Click "Add Text Layer".</div>
        )}
        {layers.map(l => {
          const isSelected = selection.includes(l.id)
          const preview = (l.text || '').split('\n')[0]
          return (
            <div
              key={l.id}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (e.shiftKey) toggleSelection(l.id); else selectOne(l.id) }}
              className="d-flex align-items-center"
              style={{
                cursor: 'pointer',
                padding: '6px 8px',
                border: '1px solid #444',
                background: isSelected ? '#4A90E233' : '#2f2f2f',
                color: '#fff',
                marginBottom: 6,
                userSelect: 'none',
              }}
              title={preview}
            >
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.name} - { l.font.selected }
                <div style={{ fontSize: 11, opacity: 0.8 }}>{preview || 'Empty'}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-danger ml-2"
                title="Delete layer"
                aria-label="Delete layer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeLayer(l.id) }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
