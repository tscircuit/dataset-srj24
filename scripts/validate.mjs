import { existsSync, readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const dataset = require("../index.js")
const expectedSampleCount = 26
const expectedKicadSampleCount = 20
const expectedAltiumSampleCount = 6

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const nearlyEqual = (first, second) => Math.abs(first - second) < 0.000001

const getBoardLayers = (layerCount) => [
  "top",
  ...Array.from({ length: layerCount - 2 }, (_, index) => `inner${index + 1}`),
  "bottom",
]

const getThroughHoleObstacleBounds = (throughHole) => {
  if (throughHole.type === "pcb_hole") {
    if (["oval", "pill", "rotated_pill", "rect"].includes(throughHole.hole_shape)) {
      return {
        center: { x: throughHole.x, y: throughHole.y },
        width: throughHole.hole_width,
        height: throughHole.hole_height,
      }
    }
    if (["square", "round", "circle"].includes(throughHole.hole_shape)) {
      return {
        center: { x: throughHole.x, y: throughHole.y },
        width: throughHole.hole_diameter,
        height: throughHole.hole_diameter,
      }
    }
    return null
  }

  if (throughHole.shape === "circle") {
    return {
      center: { x: throughHole.x, y: throughHole.y },
      width: throughHole.outer_diameter,
      height: throughHole.outer_diameter,
    }
  }
  if (["oval", "pill"].includes(throughHole.shape)) {
    return {
      center: { x: throughHole.x, y: throughHole.y },
      width: throughHole.outer_width,
      height: throughHole.outer_height,
    }
  }
  if (["circular_hole_with_rect_pad", "pill_hole_with_rect_pad"].includes(throughHole.shape)) {
    return {
      center: { x: throughHole.x, y: throughHole.y },
      width: throughHole.rect_pad_width,
      height: throughHole.rect_pad_height,
    }
  }
  if (throughHole.shape === "rotated_pill_hole_with_rect_pad") {
    const normalizedRotation = ((throughHole.rect_ccw_rotation % 360) + 360) % 360
    const isQuarterTurn = nearlyEqual(normalizedRotation, 90) || nearlyEqual(normalizedRotation, 270)
    return {
      center: { x: throughHole.x, y: throughHole.y },
      width: isQuarterTurn ? throughHole.rect_pad_height : throughHole.rect_pad_width,
      height: isQuarterTurn ? throughHole.rect_pad_width : throughHole.rect_pad_height,
    }
  }
  if (throughHole.shape === "hole_with_polygon_pad" && throughHole.pad_outline?.length > 0) {
    const xs = throughHole.pad_outline.map((point) => throughHole.x + point.x)
    const ys = throughHole.pad_outline.map((point) => throughHole.y + point.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return {
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      width: maxX - minX,
      height: maxY - minY,
    }
  }
  return null
}

const obstacleMatchesThroughHole = (obstacle, throughHole, bounds) => {
  if (
    !nearlyEqual(obstacle.center.x, bounds.center.x) ||
    !nearlyEqual(obstacle.center.y, bounds.center.y) ||
    !nearlyEqual(obstacle.width, bounds.width) ||
    !nearlyEqual(obstacle.height, bounds.height)
  ) {
    return false
  }

  if (throughHole.type !== "pcb_plated_hole") return obstacle.connectedTo.length === 0
  const metadataId = obstacle.circuitJsonMetadata?.pcb_plated_hole_id
  return metadataId === undefined
    ? obstacle.connectedTo.includes(throughHole.pcb_plated_hole_id)
    : metadataId === throughHole.pcb_plated_hole_id
}

const sampleFiles = readdirSync("samples")
  .filter((file) => file.endsWith(".json"))
  .sort()
const circuitJsonFiles = readdirSync("circuit-json")
  .filter((file) => file.endsWith(".json"))
  .sort()
const pcbFiles = readdirSync("kicad_pcb")
  .filter((file) => file.endsWith(".kicad_pcb"))
  .sort()
const snapshotFiles = readdirSync("snapshots")
  .filter((file) => file.endsWith(".svg"))
  .sort()
const sourceFiles = JSON.parse(readFileSync("source-files.json", "utf8"))

assert(sampleFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} samples, found ${sampleFiles.length}`)
assert(circuitJsonFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} Circuit JSON files, found ${circuitJsonFiles.length}`)
assert(pcbFiles.length === expectedKicadSampleCount, `Expected ${expectedKicadSampleCount} KiCad boards, found ${pcbFiles.length}`)
assert(snapshotFiles.length === expectedAltiumSampleCount, `Expected ${expectedAltiumSampleCount} Altium comparisons, found ${snapshotFiles.length}`)
assert(sourceFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} source entries, found ${sourceFiles.length}`)
assert(existsSync("index.d.ts"), "Missing index.d.ts")
assert(existsSync("LICENSE"), "Missing repository license")
assert(existsSync("LICENSES/Apache-2.0.txt"), "Missing Apache-2.0 license copy")
assert(existsSync("THIRD_PARTY_NOTICES.md"), "Missing third-party notices")

const repositoryLicense = readFileSync("LICENSE", "utf8")
assert(repositoryLicense.includes("MIT License"), "Repository license is missing MIT terms")
assert(repositoryLicense.includes("Apache License, Version 2.0"), "Repository license is missing the Apache-2.0 exception")

let hasVeryHighComplexityBoard = false
let hasTinyRoutingProblem = false
let validatedThroughHoleCount = 0
const observedLayerCounts = new Set()

for (const [index, source] of sourceFiles.entries()) {
  const exportName = `sample${String(index + 1).padStart(3, "0")}`
  assert(source.sample === exportName, `Expected source entry ${exportName}, found ${source.sample}`)
  assert(dataset[exportName], `Missing export ${exportName}`)

  const sample = dataset[exportName]
  const circuitJsonPath = sample.sourceCircuitJson
  const kicadPcbPath = sample.sourceKicadPcb
  const sourceType = source.sourceType ?? "kicad"

  assert(sample.id === exportName, `${exportName} has mismatched id`)
  assert(sample.sourceName === source.board, `${exportName} has mismatched source name`)
  assert(sample.sourceRepository === source.repository, `${exportName} has mismatched repository`)
  assert(sample.sourceLicense === source.license, `${exportName} has mismatched source license`)
  assert(Array.isArray(sample.obstacles) && sample.obstacles.length > 0, `${exportName} missing obstacles`)
  assert(Array.isArray(sample.connections), `${exportName} has invalid connections`)
  assert(sample.connections.length > 0, `${exportName} missing connections`)
  assert(sample.bounds, `${exportName} missing bounds`)
  assert(sample.layerCount >= 2, `${exportName} has invalid layer count`)
  observedLayerCounts.add(sample.layerCount)

  if (source.stats.components <= 20 && sample.connections.length <= 20) {
    hasTinyRoutingProblem = true
  }

  assert(existsSync(circuitJsonPath), `${exportName} missing ${circuitJsonPath}`)
  if (sourceType === "kicad") {
    assert(existsSync(kicadPcbPath), `${exportName} missing ${kicadPcbPath}`)
    assert(readFileSync(kicadPcbPath, "utf8").startsWith("(kicad_pcb"), `${exportName} is not a KiCad PCB`)
    assert(/^[0-9a-f]{40}$/.test(source.ref), `${exportName} source ref is not an immutable commit`)
    assert(source.sourceUrl.includes(source.ref), `${exportName} source URL is not pinned`)
    assert(source.rawUrl.includes(source.ref), `${exportName} raw URL is not pinned`)
    assert(source.license === "Apache-2.0", `${exportName} metadata has mismatched license`)
    assert(source.licenseUrl.includes(source.ref), `${exportName} license URL is not pinned`)
  } else {
    assert(sourceType === "altium", `${exportName} has unsupported source type ${sourceType}`)
    assert(!kicadPcbPath, `${exportName} must not claim a local KiCad source`)
    assert(source.license === "TI Terms of Use", `${exportName} has incorrect TI licensing metadata`)
    assert(source.sourceFormat === "Altium PcbDoc", `${exportName} has incorrect Altium source format`)
    assert(source.redistributedSource === false, `${exportName} must not redistribute TI PcbDoc source`)
    assert(/^[0-9a-f]{64}$/.test(source.sourceSha256), `${exportName} source SHA-256 is invalid`)
    assert(/^[0-9a-f]{64}$/.test(source.archiveSha256), `${exportName} archive SHA-256 is invalid`)
    assert(sample.sourceBoardFormat === "Altium PcbDoc", `${exportName} source format is incorrect`)
    assert(sample.sourcePcbDocSha256 === source.sourceSha256, `${exportName} source hash is inconsistent`)
    assert(sample.snapshotComparison === source.snapshotComparison, `${exportName} snapshot path is inconsistent`)
    assert(existsSync(source.snapshotComparison), `${exportName} comparison SVG is missing`)

    const comparisonSvg = readFileSync(source.snapshotComparison, "utf8")
    assert(comparisonSvg.includes("Original Altium"), `${exportName} comparison SVG lacks original label`)
    assert(comparisonSvg.includes("Circuit JSON"), `${exportName} comparison SVG lacks Circuit JSON label`)
    assert(comparisonSvg.includes("Simple Route JSON"), `${exportName} comparison SVG lacks SRJ label`)
    assert(
      comparisonSvg.includes("original Altium on left, Circuit JSON in center, Simple Route JSON on right"),
      `${exportName} comparison SVG lacks accessible panel order`,
    )
  }
  assert(typeof source.description === "string" && source.description.length > 20, `${exportName} missing description`)
  assert(Array.isArray(source.properties) && source.properties.length >= 3, `${exportName} missing properties`)
  assert(Array.isArray(source.warnings) && source.warnings.length === 0, `${exportName} has converter warnings`)
  assert(Array.isArray(source.normalizations), `${exportName} missing normalizations array`)
  assert(Array.isArray(source.repairs), `${exportName} missing repairs array`)
  if (sourceType === "altium") {
    assert(source.normalizations.length === 0, `${exportName} must not normalize converter output`)
    assert(source.repairs.length === 0, `${exportName} must not repair converter output`)
  }
  assert(source.stats.components > 0, `${exportName} has no components`)
  assert(source.stats.pads > 0, `${exportName} has no pads`)
  if (source.stats.traces === 0) {
    assert(
      sourceType === "altium" && source.stats.copper_pours > 0,
      `${exportName} has neither routed traces nor copper pours`,
    )
  }

  const circuitJson = JSON.parse(readFileSync(circuitJsonPath, "utf8"))
  const board = circuitJson.find((element) => element.type === "pcb_board")
  assert(board, `${exportName} Circuit JSON is missing a PCB board`)
  assert(board.num_layers === sample.layerCount, `${exportName} has inconsistent board layer counts`)
  const boardLayers = getBoardLayers(board.num_layers)
  const throughHoles = circuitJson.filter(
    (element) => element.type === "pcb_plated_hole" || element.type === "pcb_hole",
  )
  for (const throughHole of throughHoles) {
    const throughHoleId = throughHole.pcb_plated_hole_id ?? throughHole.pcb_hole_id
    const bounds = getThroughHoleObstacleBounds(throughHole)
    assert(bounds, `${exportName} cannot validate unsupported through-hole ${throughHoleId}`)
    const obstacle = sample.obstacles.find((candidate) =>
      obstacleMatchesThroughHole(candidate, throughHole, bounds),
    )
    assert(obstacle, `${exportName} is missing an SRJ obstacle for ${throughHoleId}`)
    // The drill barrel crosses the full board stack even when the plated
    // annulus is declared only on the outer copper layers.
    const expectedLayers = boardLayers
    assert(
      JSON.stringify(obstacle.layers) === JSON.stringify(expectedLayers),
      `${exportName} ${throughHoleId} obstacle layers ${JSON.stringify(obstacle.layers)} do not match ${JSON.stringify(expectedLayers)}`,
    )
    validatedThroughHoleCount += 1
  }
  for (const repair of source.repairs) {
    const repairedPcbPort = circuitJson.find(
      (element) => element.type === "pcb_port" && element.pcb_port_id === repair.pcbPortId,
    )
    assert(repairedPcbPort, `${exportName} missing repaired PCB port ${repair.pcbPortId}`)
    assert(
      sample.connections.some((connection) =>
        connection.pointsToConnect.some((point) => point.pcb_port_id === repair.pcbPortId),
      ),
      `${exportName} repaired PCB port ${repair.pcbPortId} is absent from SRJ connections`,
    )
  }

  if (source.complexity === "very high") {
    hasVeryHighComplexityBoard = true
    assert(source.stats.components >= 300, `${exportName} complex board has too few components`)
    if (sourceType === "kicad") {
      assert(sample.connections.length >= 500, `${exportName} complex board has too few connections`)
      assert(sample.layerCount >= 6, `${exportName} complex board has too few copper layers`)
    }
  }
}

assert(hasVeryHighComplexityBoard, "Dataset is missing a very-high-complexity board")
assert(hasTinyRoutingProblem, "Dataset is missing a compact low-complexity routing problem")
assert(
  [4, 6, 8].every((layerCount) => observedLayerCounts.has(layerCount)),
  "Dataset must contain 4-, 6-, and 8-layer routing problems",
)
assert(Object.keys(dataset.dataset).length === expectedSampleCount, "Dataset export count is incorrect")

console.log(
  `Validated ${expectedSampleCount} SRJ samples and ${validatedThroughHoleCount} through-hole obstacles with pinned sources, licensing, and conversion checks`,
)
