import assert from "node:assert/strict"
import polygonClipping from "polygon-clipping"

// Board world points: millimetres, +X right, +Y up. Quantize to a 1 nm grid
// and expand rectangle bounds by 1 nm to absorb floating point corner error.
// Boolean subtraction checks the whole interior, including between scanlines.
export const uncoveredPolygonArea = (points, obstacles) => {
  const scale = 1e6
  const polygon = [
    points.map(({ x, y }) => [Math.round(x * scale), Math.round(y * scale)]),
  ]
  const rectangles = obstacles.map(({ center, width, height }) => {
    const minX = Math.floor((center.x - width / 2) * scale) - 1
    const maxX = Math.ceil((center.x + width / 2) * scale) + 1
    const minY = Math.floor((center.y - height / 2) * scale) - 1
    const maxY = Math.ceil((center.y + height / 2) * scale) + 1
    return [
      [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ],
    ]
  })
  const difference = rectangles.length
    ? polygonClipping.difference(polygon, ...rectangles)
    : [polygon]
  return difference.reduce(
    (area, rings) =>
      area +
      rings.reduce((sum, ring, ringIndex) => {
        const [originX, originY] = ring[0]
        let twiceArea = 0
        for (let i = 0; i + 1 < ring.length; i++) {
          const a = ring[i],
            b = ring[i + 1]
          twiceArea +=
            (a[0] - originX) * (b[1] - originY) -
            (b[0] - originX) * (a[1] - originY)
        }
        return (
          sum +
          ((ringIndex === 0 ? 1 : -1) * Math.abs(twiceArea)) / 2 / scale ** 2
        )
      }, 0),
    0,
  )
}

export const validatePolygonCutoutCoverage = (sample, circuitJson) => {
  const board = circuitJson.find((element) => element.type === "pcb_board")
  const layers = [
    "top",
    ...Array.from({ length: board.num_layers - 2 }, (_, i) => `inner${i + 1}`),
    "bottom",
  ]
  const cutouts = circuitJson.filter(
    (element) => element.type === "pcb_cutout" && element.shape === "polygon",
  )
  for (const cutout of cutouts) {
    const label = `${sample.id} ${cutout.pcb_cutout_id}`
    const obstacles = sample.obstacles.filter((obstacle) =>
      obstacle.obstacleId?.startsWith(`${cutout.pcb_cutout_id}_rect_`),
    )
    assert(obstacles.length > 0, `${label}: missing cutout obstacles`)
    for (const obstacle of obstacles) {
      assert(
        obstacle.type === "rect" && !obstacle.ccwRotation,
        `${label}: expected axis-aligned rectangles`,
      )
      assert(
        [
          obstacle.center.x,
          obstacle.center.y,
          obstacle.width,
          obstacle.height,
        ].every(Number.isFinite),
        `${label}: invalid geometry`,
      )
      assert(
        obstacle.width > 0 && obstacle.height > 0,
        `${label}: empty rectangle`,
      )
      assert.deepEqual(
        obstacle.connectedTo,
        [],
        `${label}: cutouts must not connect to a net`,
      )
      assert.deepEqual(
        [...obstacle.layers].sort(),
        [...layers].sort(),
        `${label}: incorrect board layers`,
      )
    }
    for (const layer of layers) {
      const missingArea = uncoveredPolygonArea(
        cutout.points,
        obstacles.filter((obstacle) => obstacle.layers.includes(layer)),
      )
      assert(
        missingArea < 1e-6,
        `${label} on ${layer}: ${missingArea} mm² uncovered`,
      )
    }
  }
  return cutouts.length
}
