const svgDoctype = '<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'

function triggerDownload(content, fileName) {
  const blob = new Blob([svgDoctype + content], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.svg`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

export function downloadSVG(element, svgContent, fileName) {
  const serializer = new XMLSerializer()
  let svgString = serializer.serializeToString(element)
  svgString = svgString.replace('</svg>', `\n${svgContent}\n</svg>`)
  triggerDownload(svgString, fileName)
}

export function downloadSVGFromString(svgString, svgContent, fileName) {
  const content = svgString.replace('</svg>', `\n${svgContent}\n</svg>`)
  triggerDownload(content, fileName)
}
