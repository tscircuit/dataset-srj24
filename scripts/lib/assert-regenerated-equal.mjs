import assert from "node:assert/strict"

// Existing trigonometric pad geometry can differ by a few floating point bits
// between macOS ARM and Linux x64. Compare without rounding the saved geometry.
export const assertRegeneratedJsonEqual = (
  expected,
  actual,
  path = "sample",
) => {
  if (typeof expected === "number" && typeof actual === "number") {
    assert(
      Math.abs(expected - actual) <= 1e-12,
      `${path}: regenerated number changed`,
    )
    return
  }
  if (
    expected === null ||
    actual === null ||
    typeof expected !== "object" ||
    typeof actual !== "object"
  ) {
    assert.equal(actual, expected, `${path}: regenerated value changed`)
    return
  }
  assert.equal(
    Array.isArray(actual),
    Array.isArray(expected),
    `${path}: structure changed`,
  )
  assert.deepEqual(
    Object.keys(actual),
    Object.keys(expected),
    `${path}: keys changed`,
  )
  for (const key of Object.keys(expected))
    assertRegeneratedJsonEqual(expected[key], actual[key], `${path}.${key}`)
}

export const assertRegeneratedSvgEqual = (expected, actual) => {
  const number = /-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi
  // Keep all markup, text and ordering exact; tolerate only subpixel numeric
  // drift propagated from the same platform-level floating point differences.
  assert(
    expected.replace(number, "#") === actual.replace(number, "#"),
    "Regenerated SVG markup changed",
  )
  const before = expected.match(number) ?? [],
    after = actual.match(number) ?? []
  assert.equal(
    after.length,
    before.length,
    "Regenerated SVG numeric structure changed",
  )
  for (let i = 0; i < before.length; i++) {
    assert(
      Math.abs(Number(before[i]) - Number(after[i])) <= 1e-9,
      `Regenerated SVG number ${i} changed`,
    )
  }
}
