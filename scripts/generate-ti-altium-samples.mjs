import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"
import { convertSrjToGraphicsObject } from "@tscircuit/capacity-autorouter"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import {
  AltiumPadRecord,
  AltiumTrackRecord,
  AltiumViaRecord,
  getPcbLayerStack,
  parseAltiumBinaryPcbDoc,
  serializeAltiumPcbToSvg,
} from "altiumts"
import { any_circuit_element } from "circuit-json"
import { unzipSync } from "fflate"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { stackSvgsHorizontally } from "stack-svgs"

const MILS_TO_MILLIMETERS = 0.0254
const samplesDir = "samples"
const circuitJsonDir = "circuit-json"
const snapshotsDir = "snapshots"
const sourceFilesPath = "source-files.json"

const archives = {
  SLVMEP2: {
    url: "https://www.ti.com/lit/zip/SLVMEP2",
    sha256: "73a47918b97d87275e6365ebde58fefc874f80eb2d473e28ee95a8d13b8751d5",
  },
  SLVMF61: {
    url: "https://www.ti.com/lit/zip/SLVMF61",
    sha256: "f2d4383b8c3713a8e3c68bb46568227075076f55f6f36977fbbef83e7e86bf9e",
  },
  TIDM925: {
    url: "https://www.ti.com/lit/zip/TIDM925",
    sha256: "4b3ae2e343346c36ffdc60402dcfe330ae07b7c7fd543c8bd2aee413fd1ea5d4",
  },
}

const boards = [
  {
    sample: "sample021",
    id: "pmp23595",
    name: "PMP23595 Four-Phase GaN Buck Converter",
    design: "PMP23595",
    resourceId: "SLVMEP2A",
    archive: "SLVMEP2",
    archivePath: "PMP23595.PcbDoc",
    localPath: "boards/pmp23595/altium/PMP23595.PcbDoc",
    sourceSha256: "18913410812b0993e4c8c3a00a489335d0fa58d27b79ec02e1294a8a6471e0f6",
    description:
      "960 W four-phase GaN buck converter reference design converting a nominal 48 V input to 12 V.",
    properties: [
      "48 V nominal input",
      "12 V output at up to 80 A",
      "4 interleaved GaN buck phases",
      "6-layer PCB",
    ],
    complexity: "high",
  },
  {
    sample: "sample022",
    id: "pmp23653-main",
    name: "PMP23653 25 W Isolated USB-C Supply",
    design: "PMP23653",
    resourceId: "SLVMF61",
    archive: "SLVMF61",
    archivePath: "PMP23653B Main CAD/PMP23653B.PcbDoc",
    localPath: "boards/pmp23653-main/altium/PMP23653B.PcbDoc",
    sourceSha256: "18a785d61c6fbe381c504f416bb25fa50f16475710b9ce00f36b13b58d57c544",
    description:
      "Main PCB for a 25 W isolated USB-C power supply reference design using a planar transformer.",
    properties: [
      "25 W isolated USB-C output",
      "planar-transformer power stage",
      "USB-C control and feedback circuitry",
      "4-layer PCB",
    ],
    complexity: "medium",
  },
  {
    sample: "sample023",
    id: "pmp23653-planar-transformer",
    name: "PMP23653 Planar Transformer",
    design: "PMP23653",
    resourceId: "SLVMF61",
    archive: "SLVMF61",
    archivePath: "PMP23653-Planar-Transformer CAD/PMP23653-Planar-Transformer.PcbDoc",
    localPath:
      "boards/pmp23653-planar-transformer/altium/PMP23653-Planar-Transformer.PcbDoc",
    sourceSha256: "e291efae1b3d42c8a90d3a01295a3a3129e6721d14163fc7c81045ffa2e29a5c",
    description:
      "Six-layer PCB implementation of the planar transformer used by the PMP23653 isolated supply.",
    properties: [
      "PCB-winding planar transformer",
      "6 copper layers",
      "2 electrical winding nets",
      "integrated plated-hole interconnects",
    ],
    complexity: "low",
  },
  {
    sample: "sample024",
    id: "pmp22650-main",
    name: "PMP22650 6.6 kW Bidirectional GaN Onboard Charger",
    design: "PMP22650",
    resourceId: "TIDM925",
    archive: "TIDM925",
    nestedArchivePath: "PMP22650 - E2 Altium.zip",
    nestedArchiveSha256:
      "b5c33aec2738246f813de7896023dd2d8ff0053c2e3e67d5782f45295bf9a01f",
    archivePath: "PMP22650 PCB.PcbDoc",
    localPath: "boards/pmp22650-main/altium/PMP22650 PCB.PcbDoc",
    sourceSha256: "bc20338d29b9323b5af9182f91041c14b192aa363cf2d7a323441a7f28210002",
    description:
      "Main water-cooled PCB for a 6.6 kW bidirectional GaN automotive onboard charger reference design.",
    properties: [
      "6.6 kW bidirectional power conversion",
      "GaN power stages",
      "water-cooled mechanical design",
      "8-layer PCB",
    ],
    complexity: "very high",
  },
  {
    sample: "sample025",
    id: "pmp22712",
    name: "PMP22712 Auxiliary Power Board",
    design: "PMP22712",
    resourceId: "TIDM925",
    archive: "TIDM925",
    nestedArchivePath: "PMP22712 - E2 Altium.zip",
    nestedArchiveSha256:
      "6c75258db0633e06ed5b117652534e74b53fbb5b69a81417b8068f00ad7f542d",
    archivePath: "PMP22712_PCB.PcbDoc",
    localPath: "boards/pmp22712/altium/PMP22712_PCB.PcbDoc",
    sourceSha256: "3343b2cb765db52243ccfa584cdded44588d3ad85067e89192f09931b9a309c1",
    description:
      "Auxiliary power PCB shipped in the PMP22650 onboard-charger design package.",
    properties: [
      "PMP22650 auxiliary design",
      "isolated auxiliary power conversion",
      "power and feedback connections",
      "4-layer PCB",
    ],
    complexity: "low",
  },
  {
    sample: "sample026",
    id: "pmp22773",
    name: "PMP22773 Sensing Auxiliary Board",
    design: "PMP22773",
    resourceId: "TIDM925",
    archive: "TIDM925",
    nestedArchivePath: "PMP22773 - E3 Altium.zip",
    nestedArchiveSha256:
      "1c2e563678a71c32e8459506430395ddfad17ca42cbe27abc75e594f5b3d6f0c",
    archivePath: "PMP22773 Rev E3 PCB.PcbDoc",
    localPath: "boards/pmp22773/altium/PMP22773 Rev E3 PCB.PcbDoc",
    sourceSha256: "a84ae2b3f463084053987c1bac0ce6c51c1b38b16bf53097d769366cd0eb59f7",
    description:
      "Voltage- and current-sensing auxiliary PCB shipped in the PMP22650 onboard-charger package.",
    properties: [
      "PMP22650 auxiliary design",
      "differential voltage sensing",
      "isolated signal interfaces",
      "4-layer PCB",
    ],
    complexity: "low",
  },
]

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")

const assertHash = (bytes, expected, label) => {
  const actual = sha256(bytes)
  if (actual !== expected) {
    throw new Error(`${label} SHA-256 mismatch: expected ${expected}, received ${actual}`)
  }
}

const normalizeArchivePath = (path) => path.replaceAll("\\", "/").replace(/^\.\//, "")

const readZipEntry = (archiveBytes, requestedPath) => {
  const entries = unzipSync(archiveBytes)
  const normalizedRequestedPath = normalizeArchivePath(requestedPath)
  const entry = Object.entries(entries).find(
    ([path]) => normalizeArchivePath(path) === normalizedRequestedPath,
  )
  if (!entry) {
    throw new Error(`Archive entry not found: ${requestedPath}`)
  }
  return entry[1]
}

const fetchArchive = async (archiveId, cacheDir) => {
  const archive = archives[archiveId]
  const cachePath = join(cacheDir, `${archiveId}.zip`)
  const response = await fetch(archive.url, {
    headers: { "user-agent": "dataset-srj24-generator" },
  })
  if (!response.ok) {
    throw new Error(`Failed to download ${archive.url}: ${response.status} ${response.statusText}`)
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  assertHash(bytes, archive.sha256, `${archiveId} archive`)
  writeFileSync(cachePath, bytes)
  return bytes
}

const sourceRootFlagIndex = process.argv.indexOf("--source-root")
const sourceRoot =
  sourceRootFlagIndex >= 0
    ? resolve(process.argv[sourceRootFlagIndex + 1] ?? "")
    : process.env.TI_ALTIUM_SOURCE_ROOT
      ? resolve(process.env.TI_ALTIUM_SOURCE_ROOT)
      : null
const archiveCache = new Map()
const temporaryDirectory = mkdtempSync(join(tmpdir(), "dataset-srj24-ti-"))

const getBoardBytes = async (board) => {
  if (sourceRoot) {
    const bytes = new Uint8Array(readFileSync(join(sourceRoot, board.localPath)))
    assertHash(bytes, board.sourceSha256, `${board.design} source`)
    return bytes
  }

  let archiveBytes = archiveCache.get(board.archive)
  if (!archiveBytes) {
    archiveBytes = await fetchArchive(board.archive, temporaryDirectory)
    archiveCache.set(board.archive, archiveBytes)
  }

  if (board.nestedArchivePath) {
    const nestedBytes = readZipEntry(archiveBytes, board.nestedArchivePath)
    assertHash(nestedBytes, board.nestedArchiveSha256, board.nestedArchivePath)
    archiveBytes = nestedBytes
  }

  const bytes = readZipEntry(archiveBytes, board.archivePath)
  assertHash(bytes, board.sourceSha256, `${board.design} source`)
  return bytes
}

const isCopperStackEntry = (entry) => {
  const id = Number(entry.layerId)
  return id === 16777217 || id === 16842751 || (id >= 16777218 && id <= 16777248)
}

const getBoardLayers = (layerCount) => [
  "top",
  ...Array.from({ length: Math.max(0, layerCount - 2) }, (_, index) => `inner${index + 1}`),
  "bottom",
]

const getConvertedPadId = (record, recordIndex) => {
  const holeDiameterMils = record.holeSizeMils ?? 0
  if (record.plated === false && holeDiameterMils > 0) return `pcb_hole_altium_${recordIndex}`
  if (record.behavior === "through-hole" || holeDiameterMils > 0) {
    return `pcb_plated_hole_altium_${recordIndex}`
  }
  return `pcb_smtpad_altium_${recordIndex}`
}

const getElementId = (element) =>
  element.pcb_smtpad_id ??
  element.pcb_plated_hole_id ??
  element.pcb_hole_id ??
  element.pcb_trace_id ??
  element.pcb_via_id

const uniqueName = (value, fallback) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

const mode = (values, fallback) => {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let bestValue = fallback
  let bestCount = -1
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value < bestValue)) {
      bestValue = value
      bestCount = count
    }
  }
  return bestValue
}

const roundJson = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1_000_000) / 1_000_000
  }
  if (Array.isArray(value)) return value.map(roundJson)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, roundJson(nested)]))
  }
  return value
}

const enrichCircuitJsonConnectivity = (document, rawCircuitJson) => {
  const circuitJson = structuredClone(rawCircuitJson)
  const elementById = new Map(
    circuitJson.flatMap((element) => {
      const id = getElementId(element)
      return id ? [[id, element]] : []
    }),
  )
  const componentIndexByRecord = new Map(document.components.map((component, index) => [component, index]))
  const netIndexByRecord = new Map(document.nets.map((net, index) => [net, index]))
  const copperLayerCount = getPcbLayerStack(document.board).entries.filter(isCopperStackEntry).length
  const layerCount = Math.max(copperLayerCount, 2)
  const boardLayers = getBoardLayers(layerCount)
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (!board) throw new Error("Converted Circuit JSON has no pcb_board")
  board.num_layers = layerCount

  const sourceComponents = document.components.map((component, index) => ({
    type: "source_component",
    source_component_id: `source_component_altium_${index}`,
    name: uniqueName(component.designator, `component_${index}`),
    ftype: "simple_chip",
  }))
  const sourceNets = document.nets.map((net, index) => ({
    type: "source_net",
    source_net_id: `source_net_altium_${index}`,
    name: uniqueName(net.name, `net_${index}`),
    member_source_group_ids: [],
  }))
  const sourcePorts = []
  const pcbPorts = []
  const sourcePortIdsByNet = new Map()
  const padElementsByNet = new Map()
  let unconnectedPads = 0
  let omittedNetPads = 0

  for (const [recordIndex, record] of document.records.entries()) {
    if (!(record instanceof AltiumPadRecord)) continue
    const padId = getConvertedPadId(record, recordIndex)
    const padElement = elementById.get(padId)
    const component = document.getComponentForRecord(record)
    const componentIndex = component ? componentIndexByRecord.get(component) : undefined
    const net = document.getNetForRecord(record)
    const netIndex = net ? netIndexByRecord.get(net) : undefined
    const pinName = uniqueName(record.name, String(recordIndex))
    const pinNumber = /^\d+$/.test(pinName) ? Number(pinName) : recordIndex

    if (padElement && componentIndex !== undefined) {
      padElement.pcb_component_id = `pcb_component_altium_${componentIndex}`
      padElement.port_hints = [pinName]
      if (padElement.type === "pcb_plated_hole") padElement.layers = [...boardLayers]
    }

    if (!net || netIndex === undefined) {
      unconnectedPads += 1
      continue
    }
    if (!padElement || padElement.type === "pcb_hole" || componentIndex === undefined) {
      omittedNetPads += 1
      continue
    }

    const sourcePortId = `source_port_altium_${recordIndex}`
    const pcbPortId = `pcb_port_altium_${recordIndex}`
    const sourceComponentId = `source_component_altium_${componentIndex}`
    const pcbComponentId = `pcb_component_altium_${componentIndex}`
    const layers =
      padElement.type === "pcb_smtpad" ? [padElement.layer] : [...boardLayers]

    padElement.pcb_port_id = pcbPortId
    sourcePorts.push({
      type: "source_port",
      source_port_id: sourcePortId,
      source_component_id: sourceComponentId,
      name: `pin${pinName}`,
      pin_number: pinNumber,
    })
    pcbPorts.push({
      type: "pcb_port",
      pcb_port_id: pcbPortId,
      pcb_component_id: pcbComponentId,
      source_port_id: sourcePortId,
      x: padElement.x,
      y: padElement.y,
      layers,
    })

    const sourcePortIds = sourcePortIdsByNet.get(netIndex) ?? []
    sourcePortIds.push(sourcePortId)
    sourcePortIdsByNet.set(netIndex, sourcePortIds)
    const padElements = padElementsByNet.get(netIndex) ?? []
    padElements.push({ padElement, pcbPortId, sourcePortId, layers })
    padElementsByNet.set(netIndex, padElements)
  }

  const trackWidthsByNet = new Map()
  for (const [recordIndex, record] of document.records.entries()) {
    if (!(record instanceof AltiumTrackRecord)) continue
    const net = document.getNetForRecord(record)
    const netIndex = net ? netIndexByRecord.get(net) : undefined
    if (netIndex === undefined) continue
    const trace = elementById.get(`pcb_trace_altium_${recordIndex}`)
    if (trace?.type === "pcb_trace") trace.source_trace_id = `source_trace_altium_${netIndex}`
    if (trace?.type !== "pcb_trace" || !record.widthMils) continue
    const widths = trackWidthsByNet.get(netIndex) ?? []
    widths.push(Math.round(record.widthMils * MILS_TO_MILLIMETERS * 1_000_000) / 1_000_000)
    trackWidthsByNet.set(netIndex, widths)
  }

  const sourceTraces = []
  const connections = []
  const obstacleConnectionIdsByElementId = new Map()
  let singletonNets = 0
  let emptyNets = 0
  for (const [netIndex, net] of document.nets.entries()) {
    const sourcePortIds = sourcePortIdsByNet.get(netIndex) ?? []
    const padElements = padElementsByNet.get(netIndex) ?? []
    if (sourcePortIds.length === 0) {
      emptyNets += 1
      continue
    }
    if (sourcePortIds.length === 1) {
      singletonNets += 1
      continue
    }
    const sourceNetId = `source_net_altium_${netIndex}`
    const sourceTraceId = `source_trace_altium_${netIndex}`
    const nominalTraceWidth = mode(trackWidthsByNet.get(netIndex) ?? [], 0.254)
    sourceTraces.push({
      type: "source_trace",
      source_trace_id: sourceTraceId,
      connected_source_port_ids: sourcePortIds,
      connected_source_net_ids: [sourceNetId],
      display_name: uniqueName(net.name, `net_${netIndex}`),
      min_trace_thickness: nominalTraceWidth,
    })
    connections.push({
      name: sourceNetId,
      source_trace_id: sourceTraceId,
      netConnectionName: uniqueName(net.name, `net_${netIndex}`),
      nominalTraceWidth,
      width: nominalTraceWidth,
      pointsToConnect: padElements.map(({ padElement, pcbPortId }) => ({
        x: padElement.x,
        y: padElement.y,
        layer: padElement.type === "pcb_smtpad" ? padElement.layer : "top",
        pointId: pcbPortId,
        pcb_port_id: pcbPortId,
      })),
    })
    for (const { padElement, pcbPortId, sourcePortId } of padElements) {
      obstacleConnectionIdsByElementId.set(getElementId(padElement), [
        getElementId(padElement),
        pcbPortId,
        sourcePortId,
        sourceNetId,
        sourceTraceId,
      ])
    }
  }

  circuitJson.unshift(...sourceComponents, ...sourcePorts, ...sourceNets, ...sourceTraces, ...pcbPorts)

  return {
    circuitJson,
    connections,
    obstacleConnectionIdsByElementId,
    stats: {
      layerCount,
      sourceNets: document.nets.length,
      routableNets: connections.length,
      singletonNets,
      emptyNets,
      connectedPads: sourcePorts.length,
      unconnectedPads,
      omittedNetPads,
    },
  }
}

const countCircuitElements = (circuitJson) => {
  const count = (type) => circuitJson.filter((element) => element.type === type).length
  return {
    pads: count("pcb_smtpad") + count("pcb_plated_hole"),
    components: count("pcb_component"),
    traces: count("pcb_trace"),
    vias: count("pcb_via"),
    copper_pours: count("pcb_copper_pour"),
  }
}

const makeComparisonSvg = ({ document, simpleRouteJson, boardName }) => {
  const outlineBounds = document.boardGeometry.outline.bounds
  const padding = outlineBounds
    ? Math.max(outlineBounds.maxX - outlineBounds.minX, outlineBounds.maxY - outlineBounds.minY) * 0.05
    : 0
  const altiumSvg = serializeAltiumPcbToSvg(document, {
    width: 800,
    height: 600,
    title: `${boardName} original Altium rendering`,
    viewBox: outlineBounds
      ? {
          x: outlineBounds.minX - padding,
          y: outlineBounds.minY - padding,
          width: outlineBounds.maxX - outlineBounds.minX + 2 * padding,
          height: outlineBounds.maxY - outlineBounds.minY + 2 * padding,
        }
      : undefined,
  })
  const srjSvg = getSvgFromGraphicsObject(convertSrjToGraphicsObject(simpleRouteJson), {
    backgroundColor: "#11161b",
    svgWidth: 800,
    svgHeight: 600,
    hideInlineLabels: true,
  })
  const comparison = stackSvgsHorizontally([altiumSvg, srjSvg], {
    gap: 24,
    normalizeSize: true,
    targetSize: 800,
    rootAttributes: {
      "aria-label": `${boardName}: original Altium on left, Simple Route JSON on right`,
      role: "img",
    },
  })
  return comparison
    .replace(
      /<\/svg>\s*$/,
      '  <g font-family="Inter,Arial,sans-serif" font-size="18" font-weight="700" fill="#e7edf2" text-anchor="middle"><text x="400" y="22">Original Altium</text><text x="1224" y="22">Simple Route JSON</text></g>\n</svg>',
    )
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
}

const writeIndexFiles = () => {
  const sampleFiles = readdirSync(samplesDir).filter((file) => /^sample\d+\.json$/.test(file)).sort()
  const exportNames = sampleFiles.map((file) => file.replace(/\.json$/, ""))
  const indexJs = [
    '"use strict"',
    "",
    ...exportNames.map((name) => `exports.${name} = require("./samples/${name}.json")`),
    "",
    "exports.dataset = {",
    ...exportNames.map((name) => `  ${name}: exports.${name},`),
    "}",
    "",
    "exports.default = exports.dataset",
    "",
  ].join("\n")
  writeFileSync("index.js", indexJs)

  const indexDtsWithoutSampleExports = readFileSync("index.d.ts", "utf8")
    .split("\n")
    .filter((line) => !/^export const sample\d+: SimpleRouteJson$/.test(line))
    .join("\n")
  const sampleExports = exportNames.map((name) => `export const ${name}: SimpleRouteJson`).join("\n")
  const indexDts = indexDtsWithoutSampleExports.replace(
    "export const dataset: Record<string, SimpleRouteJson>",
    `${sampleExports}\n\nexport const dataset: Record<string, SimpleRouteJson>`,
  )
  writeFileSync("index.d.ts", indexDts)
}

mkdirSync(samplesDir, { recursive: true })
mkdirSync(circuitJsonDir, { recursive: true })
mkdirSync(snapshotsDir, { recursive: true })

const existingSourceFiles = JSON.parse(readFileSync(sourceFilesPath, "utf8")).filter(
  (source) => !boards.some((board) => board.sample === source.sample),
)
const generatedSourceFiles = []

for (const board of boards) {
  const sourceBytes = await getBoardBytes(board)
  const document = parseAltiumBinaryPcbDoc(sourceBytes)
  const converted = convertAltiumPcbDocToCircuitJson(document)
  const {
    circuitJson,
    connections,
    obstacleConnectionIdsByElementId,
    stats: connectivity,
  } = enrichCircuitJsonConnectivity(document, converted)

  for (const [index, element] of circuitJson.entries()) {
    const result = any_circuit_element.safeParse(element)
    if (!result.success) {
      throw new Error(
        `${board.sample} generated invalid Circuit JSON at element ${index}: ${result.error.message}`,
      )
    }
  }

  const baseSrjResult = getSimpleRouteJsonFromCircuitJson({
    circuitJson,
    ignoreExistingTopLevelPcbRouteState: true,
  })
  const baseSimpleRouteJson = baseSrjResult.simpleRouteJson ?? baseSrjResult
  const obstacles = baseSimpleRouteJson.obstacles.map((obstacle) => {
    const compactConnectedTo = obstacle.connectedTo
      .map((id) => obstacleConnectionIdsByElementId.get(id))
      .find(Boolean)
    return {
      ...obstacle,
      connectedTo: compactConnectedTo ?? obstacle.connectedTo,
    }
  })
  const simpleRouteJson = roundJson({
    ...baseSimpleRouteJson,
    obstacles,
    connections,
    id: board.sample,
    sourceCircuitJson: `circuit-json/${board.sample}-${board.id}.json`,
    sourceName: board.name,
    sourceUrl: `https://www.ti.com/tool/${board.design}`,
    sourceRepository: `Texas Instruments ${board.design}`,
    sourceLicense: "TI Terms of Use",
    sourceBoardFormat: "Altium PcbDoc",
    sourcePcbDocSha256: board.sourceSha256,
    snapshotComparison: `snapshots/${board.sample}-${board.id}-comparison.svg`,
  })

  const pointIds = new Set()
  for (const connection of simpleRouteJson.connections) {
    if (connection.pointsToConnect.length < 2) {
      throw new Error(`${board.sample} connection ${connection.name} has fewer than two points`)
    }
    for (const point of connection.pointsToConnect) {
      if (!point.pcb_port_id) throw new Error(`${board.sample} connection point is missing pcb_port_id`)
      if (pointIds.has(point.pcb_port_id)) {
        throw new Error(`${board.sample} PCB port appears in more than one net: ${point.pcb_port_id}`)
      }
      pointIds.add(point.pcb_port_id)
    }
  }

  const circuitJsonPath = join(circuitJsonDir, `${board.sample}-${board.id}.json`)
  const samplePath = join(samplesDir, `${board.sample}.json`)
  const snapshotPath = join(snapshotsDir, `${board.sample}-${board.id}-comparison.svg`)
  writeFileSync(circuitJsonPath, `${JSON.stringify(roundJson(circuitJson), null, 2)}\n`)
  writeFileSync(samplePath, `${JSON.stringify(simpleRouteJson, null, 2)}\n`)
  writeFileSync(snapshotPath, `${makeComparisonSvg({ document, simpleRouteJson, boardName: board.name })}\n`)

  generatedSourceFiles.push({
    sample: board.sample,
    board: board.name,
    repository: `Texas Instruments ${board.design}`,
    sourceType: "altium",
    sourceFormat: "Altium PcbDoc",
    ref: board.resourceId,
    pcbDoc: basename(board.archivePath),
    sourceUrl: `https://www.ti.com/tool/${board.design}`,
    rawUrl: archives[board.archive].url,
    archiveSha256: archives[board.archive].sha256,
    sourceSha256: board.sourceSha256,
    license: "TI Terms of Use",
    licenseUrl: "https://www.ti.com/legal/terms-conditions/terms-of-use.html",
    redistributedSource: false,
    snapshotComparison: `snapshots/${board.sample}-${board.id}-comparison.svg`,
    description: board.description,
    properties: board.properties,
    complexity: board.complexity,
    normalizations: [
      `Corrected copper layer count from the Altium layer-stack IDs (${connectivity.layerCount} layers)`,
      "Added source-net, source-port, PCB-port, and trace associations from native Altium net assignments",
    ],
    repairs: [],
    warnings: [],
    stats: countCircuitElements(circuitJson),
    connectivity,
  })

  console.log(
    `${board.sample}: ${board.name} (${connections.length} routable nets, ${connectivity.connectedPads} connected pads)`,
  )
}

writeFileSync(
  sourceFilesPath,
  `${JSON.stringify([...existingSourceFiles, ...generatedSourceFiles], null, 2)}\n`,
)
writeIndexFiles()
