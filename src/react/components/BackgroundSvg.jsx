import React, { useEffect, useMemo, useRef } from 'react'
import useEditorStore from '../store/useEditorStore.js'

export default function BackgroundSvg() {
  const bg = useEditorStore(s => s.background)
  const setBackgroundElement = useEditorStore(s => s.setBackgroundElement)

  const svgRef = useRef(null)

  const svgMarkup = useMemo(() => ({ __html: bg.svgString }), [bg.svgString])

  return (
    <>
      <div id="background-container">
        {/* Render the parsed background SVG */}
        <div dangerouslySetInnerHTML={svgMarkup} />
      </div>
      {/* Attach ref to actual SVG element via query once mounted */}
      <SvgRefBinder svgRef={svgRef} setBackgroundElement={setBackgroundElement} />
    </>
  )
}

function SvgRefBinder({ svgRef, setBackgroundElement }) {
  useEffect(() => {
    const el = document.querySelector('#background-container svg')
    if (el) {
      svgRef.current = el
      setBackgroundElement(el)
    }
  }, [setBackgroundElement])
  return null
}
