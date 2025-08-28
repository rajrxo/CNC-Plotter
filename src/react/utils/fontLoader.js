import SvgPath from 'svgpath'

export function parseFont(element, size = 24) {
  const result = []

  const svgFont = element.getElementsByTagName('font')[0]
  const svgFontface = element.getElementsByTagName('font-face')[0]
  const svgGlyphs = element.getElementsByTagName('glyph')

  const fontHorizAdvX = svgFont.getAttribute('horiz-adv-x')
  const fontAscent = svgFontface.getAttribute('ascent')
  const fontUnitsPerEm = svgFontface.getAttribute('units-per-em') || 1000

  const EM = size
  const scale = EM / fontUnitsPerEm

  for (let i = 0; i < svgGlyphs.length; i++) {
    const svgGlyph = svgGlyphs[i]
    const d = svgGlyph.getAttribute('d')
    const unicode = svgGlyph.getAttribute('unicode')
    const name = svgGlyph.getAttribute('glyph-name') || ('glyph' + unicode)
    const width = svgGlyph.getAttribute('horiz-adv-x') || fontHorizAdvX

    result[`${unicode}`] = {
      d: d ? new SvgPath(d)
        .translate(0, -fontAscent)
        .scale(scale, -scale)
        .abs()
        .rel()
        .toString() : null,
      unicode,
      name,
      width: parseFloat(width * scale),
      height: EM,
    }
  }
  return result
}

