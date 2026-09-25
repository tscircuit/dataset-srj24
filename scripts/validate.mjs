import { existsSync, readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const dataset = require("../index.js")
const expectedSampleCount = 26
const expectedKicadSampleCount = 20
const expectedAltiumSampleCount = 6
const expectedAltiumBoardThicknesses = new Map([
  ["sample021", 2.2284944],
  ["sample022", 1.56015944],
  ["sample023", 2.13195916],
  ["sample024", 2.27076],
  ["sample025", 0.93531944],
  ["sample026", 1.8073624],
])

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const nearlyEqual = (first, second) => Math.abs(first - second) < 0.00001

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
  if (
    [
      "circular_hole_with_rect_pad",
      "pill_hole_with_rect_pad",
      "rotated_pill_hole_with_rect_pad",
    ].includes(throughHole.shape)
  ) {
    const normalizedRotation =
      throughHole.shape === "rotated_pill_hole_with_rect_pad"
        ? ((throughHole.rect_ccw_rotation % 360) + 360) % 360
        : 0
    const isVertical =
      Math.abs(normalizedRotation - 90) < 0.01 ||
      Math.abs(normalizedRotation - 270) < 0.01
    return {
      center: { x: throughHole.x, y: throughHole.y },
      width: isVertical ? throughHole.rect_pad_height : throughHole.rect_pad_width,
      height: isVertical ? throughHole.rect_pad_width : throughHole.rect_pad_height,
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

  return throughHole.type === "pcb_plated_hole"
    ? obstacle.connectedTo.includes(throughHole.pcb_plated_hole_id)
    : obstacle.connectedTo.length === 0
}

const getAltiumPlatedHole = ({ circuitJson, designator, pinName }) => {
  const sourceComponent = circuitJson.find(
    (element) => element.type === "source_component" && element.name === designator,
  )
  assert(sourceComponent, `Missing Altium source component ${designator}`)
  const pcbComponentId = sourceComponent.source_component_id.replace(
    "source_component_",
    "pcb_component_",
  )
  const platedHole = circuitJson.find(
    (element) =>
      element.type === "pcb_plated_hole" &&
      element.pcb_component_id === pcbComponentId &&
      element.port_hints?.includes(pinName),
  )
  assert(platedHole, `Missing Altium plated hole ${designator} pin ${pinName}`)
  return platedHole
}

const validateRepresentativeAltiumPadStacks = ({ exportName, circuitJson }) => {
  if (exportName === "sample024") {
    const platedHole = getAltiumPlatedHole({ circuitJson, designator: "MP1", pinName: "1" })
    assert(platedHole.pad_stack.length === 8, "sample024 MP1 pin 1 must have eight pad layers")
    for (const [index, layerPad] of platedHole.pad_stack.entries()) {
      if (index === 0 || index === 7) {
        assert(layerPad.shape === "rect", `sample024 MP1 pin 1 ${layerPad.layer} must be rectangular`)
        assert(
          nearlyEqual(layerPad.width, 7) &&
            nearlyEqual(layerPad.height, 7) &&
            nearlyEqual(layerPad.corner_radius, 0.035),
          `sample024 MP1 pin 1 ${layerPad.layer} outer geometry changed`,
        )
      } else {
        assert(layerPad.shape === "circle", `sample024 MP1 pin 1 ${layerPad.layer} must be circular`)
        assert(
          nearlyEqual(layerPad.radius, 2.54),
          `sample024 MP1 pin 1 ${layerPad.layer} inner radius changed`,
        )
      }
    }
  }

  if (exportName === "sample026") {
    const platedHole = getAltiumPlatedHole({ circuitJson, designator: "J1", pinName: "1" })
    assert(platedHole.pad_stack.length === 4, "sample026 J1 pin 1 must have four pad layers")
    for (const [index, layerPad] of platedHole.pad_stack.entries()) {
      assert(layerPad.shape === "rect", `sample026 J1 pin 1 ${layerPad.layer} must be rectangular`)
      assert(
        nearlyEqual(layerPad.width, 1.65) && nearlyEqual(layerPad.height, 1.65),
        `sample026 J1 pin 1 ${layerPad.layer} dimensions changed`,
      )
      if (index === 0) {
        assert(
          nearlyEqual(layerPad.corner_radius, 0.0495),
          "sample026 J1 pin 1 top corner radius changed",
        )
      } else {
        assert(
          layerPad.corner_radius === undefined,
          `sample026 J1 pin 1 ${layerPad.layer} must have square corners`,
        )
      }
    }
  }
}

const validateAltiumConnectivity = ({ exportName, sample, source, circuitJson }) => {
  const sourcePorts = circuitJson.filter((element) => element.type === "source_port")
  const sourceNets = circuitJson.filter((element) => element.type === "source_net")
  const sourceTraces = circuitJson.filter((element) => element.type === "source_trace")
  const pcbPorts = circuitJson.filter((element) => element.type === "pcb_port")
  const padElements = circuitJson.filter(
    (element) => element.type === "pcb_smtpad" || element.type === "pcb_plated_hole",
  )
  const sourcePortById = new Map(sourcePorts.map((port) => [port.source_port_id, port]))
  const pcbPortById = new Map(pcbPorts.map((port) => [port.pcb_port_id, port]))
  const traceById = new Map(sourceTraces.map((trace) => [trace.source_trace_id, trace]))
  const padByPcbPortId = new Map(padElements.flatMap((pad) => (pad.pcb_port_id ? [[pad.pcb_port_id, pad]] : [])))
  const seenPcbPortIds = new Set()

  assert(source.redistributedSource === false, `${exportName} must not redistribute TI PcbDoc source`)
  assert(/^[0-9a-f]{64}$/.test(source.sourceSha256), `${exportName} source SHA-256 is invalid`)
  assert(/^[0-9a-f]{64}$/.test(source.archiveSha256), `${exportName} archive SHA-256 is invalid`)
  assert(source.connectivity.omittedNetPads === 0, `${exportName} omitted net-assigned pads`)
  assert(sourceNets.length === source.connectivity.sourceNets, `${exportName} source-net count changed`)
  assert(sourceTraces.length === source.connectivity.routableNets, `${exportName} routable-net count changed`)
  assert(sourcePorts.length === source.connectivity.connectedPads, `${exportName} connected-pad count changed`)
  assert(sample.connections.length === source.connectivity.routableNets, `${exportName} SRJ net count changed`)
  assert(sample.sourceBoardFormat === "Altium PcbDoc", `${exportName} source format is incorrect`)
  assert(sample.sourcePcbDocSha256 === source.sourceSha256, `${exportName} source hash is inconsistent`)
  assert(sample.snapshotComparison === source.snapshotComparison, `${exportName} snapshot path is inconsistent`)
  assert(existsSync(source.snapshotComparison), `${exportName} comparison SVG is missing`)

  const comparisonSvg = readFileSync(source.snapshotComparison, "utf8")
  assert(comparisonSvg.includes("Original Altium"), `${exportName} comparison SVG lacks original label`)
  assert(comparisonSvg.includes("Converted Circuit JSON"), `${exportName} comparison SVG lacks conversion label`)
  assert(comparisonSvg.includes("Simple Route JSON"), `${exportName} comparison SVG lacks SRJ label`)
  assert(comparisonSvg.includes("original Altium on left"), `${exportName} comparison SVG lacks accessible order`)
  assert(comparisonSvg.includes("converted Circuit JSON in the center"), `${exportName} comparison SVG lacks accessible conversion order`)

  for (const connection of sample.connections) {
    const sourceTrace = traceById.get(connection.source_trace_id)
    assert(sourceTrace, `${exportName} connection ${connection.name} has no source trace`)
    assert(
      sourceTrace.connected_source_net_ids.length === 1 &&
        sourceTrace.connected_source_net_ids[0] === connection.name,
      `${exportName} connection ${connection.name} does not match its native Altium net`,
    )
    assert(connection.pointsToConnect.length >= 2, `${exportName} connection ${connection.name} is not routable`)
    assert(connection.nominalTraceWidth > 0, `${exportName} connection ${connection.name} has invalid width`)

    const actualSourcePortIds = []
    for (const point of connection.pointsToConnect) {
      assert(point.pcb_port_id, `${exportName} connection ${connection.name} has an anonymous point`)
      assert(!seenPcbPortIds.has(point.pcb_port_id), `${exportName} PCB port ${point.pcb_port_id} belongs to multiple nets`)
      seenPcbPortIds.add(point.pcb_port_id)
      const pcbPort = pcbPortById.get(point.pcb_port_id)
      assert(pcbPort, `${exportName} is missing PCB port ${point.pcb_port_id}`)
      assert(sourcePortById.has(pcbPort.source_port_id), `${exportName} is missing source port ${pcbPort.source_port_id}`)
      assert(nearlyEqual(point.x, pcbPort.x) && nearlyEqual(point.y, pcbPort.y), `${exportName} moved PCB port ${point.pcb_port_id}`)
      assert(point.layer === pcbPort.layers[0], `${exportName} changed PCB port layer ${point.pcb_port_id}`)
      const pad = padByPcbPortId.get(point.pcb_port_id)
      assert(pad, `${exportName} PCB port ${point.pcb_port_id} has no physical pad`)
      assert(nearlyEqual(point.x, pad.x) && nearlyEqual(point.y, pad.y), `${exportName} point ${point.pcb_port_id} does not match its pad`)
      const padId = pad.pcb_smtpad_id ?? pad.pcb_plated_hole_id
      assert(
        sample.obstacles.some(
          (obstacle) => obstacle.connectedTo.includes(padId) && obstacle.connectedTo.includes(connection.name),
        ),
        `${exportName} pad ${padId} is not connected to SRJ net ${connection.name}`,
      )
      actualSourcePortIds.push(pcbPort.source_port_id)
    }

    assert(
      JSON.stringify(actualSourcePortIds.toSorted()) ===
        JSON.stringify(sourceTrace.connected_source_port_ids.toSorted()),
      `${exportName} connection ${connection.name} pad set differs from the Altium net`,
    )
  }
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
let altiumCopperArcCount = 0
let altiumNetCopperArcCount = 0
let altiumViaCount = 0
let altiumNetViaCount = 0
let altiumNetCopperAreaCount = 0
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
  assert(Array.isArray(sample.connections) && sample.connections.length > 0, `${exportName} missing connections`)
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
  }
  assert(typeof source.description === "string" && source.description.length > 20, `${exportName} missing description`)
  assert(Array.isArray(source.properties) && source.properties.length >= 3, `${exportName} missing properties`)
  assert(Array.isArray(source.warnings) && source.warnings.length === 0, `${exportName} has converter warnings`)
  assert(Array.isArray(source.normalizations), `${exportName} missing normalizations array`)
  assert(Array.isArray(source.repairs), `${exportName} missing repairs array`)
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
  if (sourceType === "altium") {
    assert(board.num_layers === source.connectivity.layerCount, `${exportName} differs from its Altium layer stack`)
    assert(
      nearlyEqual(board.thickness, expectedAltiumBoardThicknesses.get(exportName)),
      `${exportName} has incorrect physical board thickness ${board.thickness}`,
    )
    validateAltiumConnectivity({ exportName, sample, source, circuitJson })
    validateRepresentativeAltiumPadStacks({ exportName, circuitJson })
    const copperArcs = circuitJson
      .filter((element) => element.type === "pcb_trace")
      .filter((trace) => trace.pcb_trace_id.startsWith("pcb_trace_altium_arc_"))
    const vias = circuitJson.filter((element) => element.type === "pcb_via")
    altiumCopperArcCount += copperArcs.length
    altiumNetCopperArcCount += copperArcs.filter(
      (trace) => trace.source_trace_id !== undefined,
    ).length
    altiumViaCount += vias.length
    altiumNetViaCount += vias.filter(
      (via) => via.source_net_id !== undefined && via.source_trace_id !== undefined,
    ).length
    altiumNetCopperAreaCount += circuitJson.filter(
      (element) =>
        element.type === "pcb_copper_pour" && element.source_net_id !== undefined,
    ).length
  }
  const boardLayers = getBoardLayers(board.num_layers)
  const throughHoles = circuitJson.filter(
    (element) => element.type === "pcb_plated_hole" || element.type === "pcb_hole",
  )
  for (const throughHole of throughHoles) {
    const throughHoleId = throughHole.pcb_plated_hole_id ?? throughHole.pcb_hole_id
    const bounds = getThroughHoleObstacleBounds(throughHole)
    assert(bounds, `${exportName} cannot validate unsupported through-hole ${throughHoleId}`)
    if (sourceType === "altium" && throughHole.type === "pcb_plated_hole") {
      assert(
        throughHole.pad_stack?.length === board.num_layers,
        `${exportName} ${throughHoleId} does not preserve its full Altium pad stack`,
      )
    }
    const obstacle = sample.obstacles.find((candidate) =>
      obstacleMatchesThroughHole(candidate, throughHole, bounds),
    )
    assert(obstacle, `${exportName} is missing an SRJ obstacle for ${throughHoleId}`)
    const expectedLayers =
      throughHole.type === "pcb_plated_hole" && throughHole.layers?.length > 0
        ? throughHole.layers
        : boardLayers
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
    assert(sample.connections.length >= 400, `${exportName} complex board has too few connections`)
    assert(sample.layerCount >= 6, `${exportName} complex board has too few copper layers`)
  }
}

assert(hasVeryHighComplexityBoard, "Dataset is missing a very-high-complexity board")
assert(altiumCopperArcCount === 174, `Expected 174 Altium copper arcs, found ${altiumCopperArcCount}`)
assert(altiumNetCopperArcCount === 15, `Expected 15 net-owned Altium copper arcs, found ${altiumNetCopperArcCount}`)
assert(altiumViaCount === 2877, `Expected 2877 Altium vias, found ${altiumViaCount}`)
assert(altiumNetViaCount === 2877, `Expected 2877 net-owned Altium vias, found ${altiumNetViaCount}`)
assert(
  altiumNetCopperAreaCount === 536,
  `Expected 536 net-owned Altium copper areas, found ${altiumNetCopperAreaCount}`,
)
assert(hasTinyRoutingProblem, "Dataset is missing a compact low-complexity routing problem")
assert(
  [4, 6, 8].every((layerCount) => observedLayerCounts.has(layerCount)),
  "Dataset must contain 4-, 6-, and 8-layer routing problems",
)
assert(Object.keys(dataset.dataset).length === expectedSampleCount, "Dataset export count is incorrect")

console.log(
  `Validated ${expectedSampleCount} SRJ samples and ${validatedThroughHoleCount} through-hole obstacles with pinned sources, licensing, and connectivity checks`,
)
