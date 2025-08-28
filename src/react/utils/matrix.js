// Build SVG matrix [a,b,c,d,e,f] from translate, rotate (deg), scale

export function toMatrix({ x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1, pivot } = {}) {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  // Base transforms
  const T = (tx, ty) => [1, 0, 0, 1, tx, ty]
  const R = (a) => [cos, sin, -sin, cos, 0, 0]
  const S = (sx, sy) => [sx, 0, 0, sy, 0, 0]

  const multiply = (m1, m2) => {
    const [a1, b1, c1, d1, e1, f1] = m1
    const [a2, b2, c2, d2, e2, f2] = m2
    return [
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1,
    ]
  }

  let M = T(x, y)
  if (pivot && isFinite(pivot.cx) && isFinite(pivot.cy)) {
    // Translate to pivot, rotate, scale, translate back
    M = multiply(M, T(pivot.cx, pivot.cy))
    M = multiply(M, R(rad))
    M = multiply(M, S(scaleX, scaleY))
    M = multiply(M, T(-pivot.cx, -pivot.cy))
  } else {
    // No pivot center specified: rotate/scale around origin
    M = multiply(M, R(rad))
    M = multiply(M, S(scaleX, scaleY))
  }

  return M
}
