import { expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import {
  uncoveredPolygonArea,
  validatePolygonCutoutCoverage,
} from "../scripts/lib/polygon-cutout-coverage.mjs"

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

test("every source polygon cutout remains blocked on every board layer", () => {
  let cutoutCount = 0
  for (const filename of readdirSync("samples").filter((name) =>
    /^sample\d+\.json$/.test(name),
  )) {
    const sample = readJson(`samples/${filename}`)
    cutoutCount += validatePolygonCutoutCoverage(
      sample,
      readJson(sample.sourceCircuitJson),
    )
  }
  expect(cutoutCount).toBe(27)
})

test("PMP22650's previously uncovered point is blocked on inner6", () => {
  const sample = readJson("samples/sample024.json")
  const witness = { x: 200.08379856, y: 78.98260016 }
  expect(
    sample.obstacles.some(
      (obstacle) =>
        obstacle.obstacleId?.startsWith("pcb_cutout_altium_22_rect_") &&
        obstacle.layers.includes("inner6") &&
        Math.abs(obstacle.center.x - witness.x) <= obstacle.width / 2 &&
        Math.abs(obstacle.center.y - witness.y) <= obstacle.height / 2,
    ),
  ).toBe(true)
})

test("coverage validation rejects missing geometry, layers and electrical ownership", () => {
  const sample = readJson("samples/sample024.json")
  const circuitJson = readJson(sample.sourceCircuitJson)
  const prefix = "pcb_cutout_altium_22_rect_"
  for (const mutate of [
    (obstacle) => {
      obstacle.center.x += 1000
    },
    (obstacle) => {
      obstacle.layers = obstacle.layers.filter((layer) => layer !== "inner6")
    },
    (obstacle) => {
      obstacle.connectedTo = ["signal"]
    },
  ]) {
    const broken = structuredClone(sample)
    for (const obstacle of broken.obstacles.filter((obstacle) =>
      obstacle.obstacleId?.startsWith(prefix),
    ))
      mutate(obstacle)
    expect(() => validatePolygonCutoutCoverage(broken, circuitJson)).toThrow()
  }
  const cutout = circuitJson.find(
    (element) => element.pcb_cutout_id === "pcb_cutout_altium_22",
  )
  expect(uncoveredPolygonArea(cutout.points, [])).toBeGreaterThan(1)
})
