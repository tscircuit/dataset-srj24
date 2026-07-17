import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"

const boards = [
  {
    id: "jetson-nano-baseboard",
    name: "Jetson Nano Baseboard",
    owner: "antmicro",
    repo: "jetson-nano-baseboard",
    ref: "d8d0b2d71ab4cc4bcdb204a09f78be40d4c8cda3",
    path: "jetson-nano-baseboard.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Production-capable carrier for Jetson Nano, Xavier NX, and TX2 NX modules with camera, PCIe, display, USB, and networking interfaces.",
    properties: [
      "Jetson SO-DIMM module connector",
      "Gigabit Ethernet",
      "USB-C host and Micro USB debug",
      "Micro HDMI and Mini DisplayPort",
      "M.2 Key M PCIe x4",
      "dual 50-pin MIPI CSI-2 FFC connectors",
      "6-36 VDC input",
    ],
    complexity: "very high",
  },
  {
    id: "hdmi-mipi-bridge",
    name: "HDMI to MIPI CSI-2 Bridge",
    owner: "antmicro",
    repo: "hdmi-mipi-bridge",
    ref: "6c683289a3191ee6c92cf4f9065ca9b6cb2c0784",
    path: "antmicro-hdmi-mipi-bridge-hw.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Dual-channel video bridge that converts two HDMI streams to independent four-lane MIPI CSI-2 outputs.",
    properties: [
      "2 HDMI inputs",
      "2 four-lane MIPI CSI-2 outputs",
      "Toshiba TC358743XBG bridge ICs",
      "50-pin FFC host interface",
    ],
    complexity: "high",
  },
  {
    id: "sdi-mipi-bridge",
    name: "SDI to MIPI CSI-2 Bridge",
    owner: "antmicro",
    repo: "sdi-mipi-bridge-hw",
    ref: "0d08a865eba70ac02bfe16601bbf6d719d5c9d41",
    path: "sdi-mipi-bridge.kicad_pcb",
    license: "Apache-2.0",
    description:
      "3G-SDI video bridge with SDI loopback, FPGA-based conversion, dual MIPI CSI-2 outputs, and audio extraction.",
    properties: [
      "3G-SDI input and loopback output",
      "2 four-lane MIPI CSI-2 outputs",
      "Semtech GS2971A deserializer",
      "Lattice CrossLink FPGA",
      "8-channel I2S audio output",
    ],
    complexity: "high",
  },
  {
    id: "thunderbolt-pcie-adapter",
    name: "Thunderbolt to PCIe Adapter",
    owner: "antmicro",
    repo: "thunderbolt-pcie-adapter",
    ref: "0ae5bbe967dff2b973bcf84522a081cee28a156c",
    path: "thunderbolt-pcie-adapter.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Thunderbolt 3 adapter that exposes a PCIe Gen3 x4 expansion slot and supplies the 12 V rail required by add-in cards.",
    properties: [
      "Intel JHL6340 Thunderbolt 3 controller",
      "PCIe Gen3 x4 slot",
      "on-board 12 V step-up converter",
    ],
    complexity: "high",
  },
  {
    id: "m2-pcie-adapter",
    name: "M.2 to PCIe x4 Adapter",
    owner: "antmicro",
    repo: "m2-pcie-adapter",
    ref: "11844f18ce14393043affde9e7aa8d51c0cd3ba7",
    path: "m2-pcie-adapter.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Passive adapter that routes an M.2 Key M PCIe x4 interface to a standard PCIe x4 card socket.",
    properties: [
      "M.2 Key M edge connector",
      "PCIe x4 card socket",
      "external power connector",
      "0.8 mm target PCB thickness",
    ],
    complexity: "medium",
  },
  {
    id: "cm4-lvds-adapter",
    name: "CM4 Baseboard LVDS Adapter",
    owner: "antmicro",
    repo: "cm4-baseboard-lvds-adapter",
    ref: "4af945ed558e58e4b8aea6fe909fc33d78b63f6f",
    path: "cm4-lvds-adapter.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Display adapter that converts MIPI DSI from an Antmicro CM4 baseboard to LVDS and powers an LCD and backlight.",
    properties: [
      "TI SN65DSI84 MIPI DSI-to-LVDS bridge",
      "I2C touchscreen interface",
      "18 V, 9.6 V, 3.9 V, and 3.3 V display rails",
      "integrated backlight driver",
    ],
    complexity: "high",
  },
  {
    id: "pmod-i3c-sensor-board",
    name: "PMOD I3C Sensor Board",
    owner: "antmicro",
    repo: "pmod-i3c-sensor-board",
    ref: "5ee5d34ff918422fe7af59f7ffdc9d4bdabf18a7",
    path: "pmod-i3c-sensor-board.kicad_pcb",
    license: "Apache-2.0",
    description:
      "PMOD-compatible sensor module combining temperature, magnetic, and acceleration sensing on a shared I3C bus.",
    properties: [
      "P3T1755 temperature sensor",
      "MMC5603NJ 3-axis magnetometer",
      "BMA580 3-axis accelerometer",
      "I2C and I3C support",
      "2 configurable push-pull or open-drain output stages",
    ],
    complexity: "medium",
  },
  {
    id: "d1600e-psu-breakout",
    name: "D1600E PSU Breakout Board",
    owner: "antmicro",
    repo: "d1600e-psu-breakout",
    ref: "3802831dcd6c9c6e278216771e92ca7fe3f9ae41",
    path: "d1600e-psu-breakout-board.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Managed breakout for a Dell D1600E-S0 supply with five independently measured and switched 12 V outputs.",
    properties: [
      "5 independently controlled 12 V outputs",
      "up to 220 W per output",
      "Hall-effect current sensing with 12-bit ADC",
      "I2C GPIO power switching",
      "opto-isolated FT4232H USB control",
    ],
    complexity: "high",
  },
  {
    id: "m2-oculink-adapter",
    name: "M.2 to OCuLink Adapter",
    owner: "antmicro",
    repo: "m2-oculink-adapter",
    ref: "067f60727046cd0c0db1d39c51c9396f89f48b65",
    path: "antmicro-m2-oculink-adapter-hw.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Passive adapter that carries four PCIe lanes from an M.2 Key M socket to an OCuLink cable interface.",
    properties: [
      "M.2 Key M edge connector",
      "OCuLink PCIe x4 connector",
      "2280, 2260, and 2242 mechanical formats",
      "Jetson Orin Baseboard compatibility",
    ],
    complexity: "low",
  },
  {
    id: "dual-ipex-csi-interposer",
    name: "Dual I-PEX CSI Interposer",
    owner: "antmicro",
    repo: "dual-ipex-csi-interposer",
    ref: "6b6bd0af5aafe13c02377d534a23a6373922f350",
    path: "dual-ipex-csi-interposer.kicad_pcb",
    license: "Apache-2.0",
    description:
      "Two-to-one camera interposer joining a pair of four-lane I-PEX MIPI CSI-2 links to Antmicro's 50-pin FFC host interface.",
    properties: [
      "2 30-pin I-PEX camera connectors",
      "4 MIPI CSI-2 lanes per camera",
      "single 50-pin host FFC connector",
      "I2C and camera power pass-through",
    ],
    complexity: "low",
  },
]

const samplesDir = "samples"
const pcbDir = "kicad_pcb"
const circuitJsonDir = "circuit-json"

const rawGithubUrl = ({ owner, repo, ref, path }) =>
  `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`

const githubBlobUrl = ({ owner, repo, ref, path }) =>
  `https://github.com/${owner}/${repo}/blob/${encodeURIComponent(ref)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`

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

const normalizeForKicadts = (pcbText) => {
  let cursor = 0
  let output = ""
  let removedGraphicPolygonTstamps = 0
  let removedGroupIds = 0
  let removedLegacyHostFields = 0
  let removedLegacyGeneralCounts = 0
  let removedLegacyPageFields = 0
  let removedViaZoneLayerConnections = 0
  let removedTentingFields = 0

  while (cursor < pcbText.length) {
    const start = pcbText.indexOf("(gr_poly", cursor)
    if (start === -1) {
      output += pcbText.slice(cursor)
      break
    }

    output += pcbText.slice(cursor, start)

    let depth = 0
    let inString = false
    let escaped = false
    let end = start

    for (; end < pcbText.length; end += 1) {
      const character = pcbText[end]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (character === "\\") {
          escaped = true
        } else if (character === '"') {
          inString = false
        }
        continue
      }

      if (character === '"') {
        inString = true
      } else if (character === "(") {
        depth += 1
      } else if (character === ")") {
        depth -= 1
        if (depth === 0) {
          end += 1
          break
        }
      }
    }

    const polygon = pcbText.slice(start, end)
    const normalizedPolygon = polygon.replace(/\s+\(tstamp\s+[^()\s]+\)/g, (match) => {
      removedGraphicPolygonTstamps += 1
      return ""
    })

    output += normalizedPolygon
    cursor = end
  }

  output = output.replace(/(\(group(?:\s+"(?:[^"\\]|\\.)*")?)\s+\(id\s+[^()\s]+\)/g, (_match, groupStart) => {
    removedGroupIds += 1
    return groupStart
  })
  output = output.replace(
    /(\(kicad_pcb\s+\(version\s+[^()]+\))\s+\(host\s+[^()]+\)/,
    (_match, boardStart) => {
      removedLegacyHostFields += 1
      return boardStart
    },
  )
  output = output.replace(/\s+\((drawings|tracks|zones|modules|nets)\s+\d+\)/g, () => {
    removedLegacyGeneralCounts += 1
    return ""
  })
  output = output.replace(/\s+\(page\s+[^()]+\)/g, () => {
    removedLegacyPageFields += 1
    return ""
  })
  output = output.replace(/\s+\(zone_layer_connections(?:\s+"[^"]+")*\)/g, () => {
    removedViaZoneLayerConnections += 1
    return ""
  })
  output = output.replace(/\s+\(tenting\s+[^()]+\)/g, () => {
    removedTentingFields += 1
    return ""
  })

  const normalizations = []
  if (removedGraphicPolygonTstamps > 0) {
    normalizations.push(
      `Removed ${removedGraphicPolygonTstamps} gr_poly tstamp field(s) for kicadts compatibility`,
    )
  }
  if (removedGroupIds > 0) {
    normalizations.push(`Removed ${removedGroupIds} group id field(s) for kicadts compatibility`)
  }
  if (removedLegacyHostFields > 0) {
    normalizations.push(
      `Removed ${removedLegacyHostFields} legacy host field(s) for kicadts compatibility`,
    )
  }
  if (removedLegacyGeneralCounts > 0) {
    normalizations.push(
      `Removed ${removedLegacyGeneralCounts} legacy general count field(s) for kicadts compatibility`,
    )
  }
  if (removedLegacyPageFields > 0) {
    normalizations.push(
      `Removed ${removedLegacyPageFields} legacy page field(s) for kicadts compatibility`,
    )
  }
  if (removedViaZoneLayerConnections > 0) {
    normalizations.push(
      `Removed ${removedViaZoneLayerConnections} via zone_layer_connections field(s) because existing routing is excluded from SRJ generation`,
    )
  }
  if (removedTentingFields > 0) {
    normalizations.push(
      `Removed ${removedTentingFields} tenting field(s) because existing routing is excluded from SRJ generation`,
    )
  }
  return { pcbText: output, normalizations }
}

const repairMissingPcbPorts = (circuitJson) => {
  const repairs = []
  const existingPcbPortIds = new Set(
    circuitJson.filter((element) => element.type === "pcb_port").map((element) => element.pcb_port_id),
  )
  const mappedSourcePortIds = new Set(
    circuitJson
      .filter((element) => element.type === "pcb_port")
      .map((element) => element.source_port_id),
  )
  const connectedSourcePortIds = new Set(
    circuitJson
      .filter((element) => element.type === "source_trace")
      .flatMap((element) => element.connected_source_port_ids ?? []),
  )
  const pcbComponentBySourceComponent = new Map(
    circuitJson
      .filter((element) => element.type === "pcb_component")
      .map((element) => [element.source_component_id, element]),
  )
  const portGeometries = circuitJson.filter(
    (element) => element.type === "pcb_smtpad" || element.type === "pcb_plated_hole",
  )

  for (const sourcePort of circuitJson.filter((element) => element.type === "source_port")) {
    if (
      !connectedSourcePortIds.has(sourcePort.source_port_id) ||
      mappedSourcePortIds.has(sourcePort.source_port_id)
    ) {
      continue
    }

    const pcbComponent = pcbComponentBySourceComponent.get(sourcePort.source_component_id)
    if (!pcbComponent) continue

    const pinNumber = String(sourcePort.pin_number)
    const candidates = portGeometries.filter(
      (geometry) =>
        geometry.pcb_component_id === pcbComponent.pcb_component_id &&
        geometry.port_hints?.some((hint) => String(hint) === pinNumber),
    )

    if (candidates.length !== 1) continue

    const geometry = candidates[0]
    const layers = geometry.layers ?? (geometry.layer ? [geometry.layer] : [])
    if (typeof geometry.x !== "number" || typeof geometry.y !== "number" || layers.length === 0) continue

    let repairIndex = repairs.length
    let pcbPortId = `pcb_port_repaired_${repairIndex}`
    while (existingPcbPortIds.has(pcbPortId)) {
      repairIndex += 1
      pcbPortId = `pcb_port_repaired_${repairIndex}`
    }

    circuitJson.push({
      type: "pcb_port",
      pcb_port_id: pcbPortId,
      pcb_component_id: pcbComponent.pcb_component_id,
      source_port_id: sourcePort.source_port_id,
      x: geometry.x,
      y: geometry.y,
      layers,
    })
    existingPcbPortIds.add(pcbPortId)
    mappedSourcePortIds.add(sourcePort.source_port_id)
    repairs.push({
      type: "missing_pcb_port",
      sourcePortId: sourcePort.source_port_id,
      pcbPortId,
      geometryId: geometry.pcb_smtpad_id ?? geometry.pcb_plated_hole_id,
    })
  }

  return repairs
}

const fetchText = async (url) => {
  const response = await fetch(url, { headers: { "user-agent": "dataset-srj24-generator" } })
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  return response.text()
}

const writeIndexFiles = () => {
  const sampleFiles = readdirSync(samplesDir).filter((file) => /^sample\d+\.json$/.test(file)).sort()
  const exportNames = sampleFiles.map((file) => file.replace(/\.json$/, ""))

  const indexJs = [
    "\"use strict\"",
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

  const indexDts = [
    "export interface SimpleRouteConnectionPointBase {",
    "  x: number",
    "  y: number",
    "  pointId?: string",
    "  pcb_port_id?: string",
    "}",
    "",
    "export type SimpleRouteConnectionPoint =",
    "  | (SimpleRouteConnectionPointBase & { layer: string })",
    "  | (SimpleRouteConnectionPointBase & { layers: string[] })",
    "",
    "export interface SimpleRouteConnection {",
    "  name: string",
    "  source_trace_id?: string",
    "  rootConnectionName?: string",
    "  mergedConnectionNames?: string[]",
    "  isOffBoard?: boolean",
    "  netConnectionName?: string",
    "  nominalTraceWidth?: number",
    "  width?: number",
    "  pointsToConnect: SimpleRouteConnectionPoint[]",
    "  externallyConnectedPointIds?: string[][]",
    "}",
    "",
    "export interface SimpleRouteObstacle {",
    "  obstacleId?: string",
    "  componentId?: string",
    "  type: \"rect\"",
    "  layers: string[]",
    "  zLayers?: number[]",
    "  center: { x: number; y: number }",
    "  width: number",
    "  height: number",
    "  ccwRotationDegrees?: number",
    "  connectedTo: string[]",
    "  isCopperPour?: boolean",
    "  netIsAssignable?: boolean",
    "  offBoardConnectsTo?: string[]",
    "}",
    "",
    "export interface SimpleRouteJson {",
    "  id?: string",
    "  sourceCircuitJson?: string",
    "  sourceKicadPcb?: string",
    "  sourceName?: string",
    "  sourceUrl?: string",
    "  sourceRepository?: string",
    "  sourceLicense?: string",
    "  layerCount: number",
    "  minTraceWidth: number",
    "  nominalTraceWidth?: number",
    "  minViaDiameter?: number",
    "  minViaHoleDiameter?: number",
    "  minViaPadDiameter?: number",
    "  defaultObstacleMargin?: number",
    "  obstacles: SimpleRouteObstacle[]",
    "  connections: SimpleRouteConnection[]",
    "  bounds: { minX: number; maxX: number; minY: number; maxY: number }",
    "  outline?: Array<{ x: number; y: number }>",
    "  traces?: unknown[]",
    "  jumpers?: unknown[]",
    "}",
    "",
    ...exportNames.map((name) => `export const ${name}: SimpleRouteJson`),
    "",
    "export const dataset: Record<string, SimpleRouteJson>",
    "declare const defaultDataset: Record<string, SimpleRouteJson>",
    "export default defaultDataset",
    "",
  ].join("\n")

  writeFileSync("index.js", indexJs)
  writeFileSync("index.d.ts", indexDts)
}

rmSync(samplesDir, { recursive: true, force: true })
rmSync(pcbDir, { recursive: true, force: true })
rmSync(circuitJsonDir, { recursive: true, force: true })
mkdirSync(samplesDir, { recursive: true })
mkdirSync(pcbDir, { recursive: true })
mkdirSync(circuitJsonDir, { recursive: true })

const sourceFiles = []
const failures = []

for (const [index, board] of boards.entries()) {
  const sampleName = `sample${String(index + 1).padStart(3, "0")}`
  const rawUrl = rawGithubUrl(board)
  const sourceUrl = githubBlobUrl(board)
  const fileName = board.path.split("/").at(-1)

  try {
    const pcbText = await fetchText(rawUrl)
    const pcbFileName = `${sampleName}-${board.id}.kicad_pcb`
    writeFileSync(join(pcbDir, pcbFileName), pcbText)

    const normalized = normalizeForKicadts(pcbText)
    const converter = new KicadToCircuitJsonConverter()
    converter.addFile(fileName, normalized.pcbText)
    converter.runUntilFinished()

    const circuitJson = converter.getOutput()
    const repairs = repairMissingPcbPorts(circuitJson)

    writeFileSync(join(circuitJsonDir, `${sampleName}-${board.id}.json`), `${JSON.stringify(circuitJson, null, 2)}\n`)

    const simpleRouteResult = getSimpleRouteJsonFromCircuitJson({ circuitJson, ignoreExistingTopLevelPcbRouteState: true })
    const simpleRouteJson = roundJson(simpleRouteResult.simpleRouteJson ?? simpleRouteResult)
    simpleRouteJson.id = sampleName
    simpleRouteJson.sourceCircuitJson = `circuit-json/${sampleName}-${board.id}.json`
    simpleRouteJson.sourceKicadPcb = `kicad_pcb/${pcbFileName}`
    simpleRouteJson.sourceName = board.name
    simpleRouteJson.sourceUrl = sourceUrl
    simpleRouteJson.sourceRepository = `${board.owner}/${board.repo}`
    simpleRouteJson.sourceLicense = board.license

    writeFileSync(join(samplesDir, `${sampleName}.json`), `${JSON.stringify(simpleRouteJson, null, 2)}\n`)

    sourceFiles.push({
      sample: sampleName,
      board: board.name,
      repository: `${board.owner}/${board.repo}`,
      ref: board.ref,
      kicadPcb: board.path,
      sourceUrl,
      rawUrl,
      license: board.license,
      licenseUrl: `https://github.com/${board.owner}/${board.repo}/blob/${encodeURIComponent(board.ref)}/LICENSE`,
      description: board.description,
      properties: board.properties,
      complexity: board.complexity,
      normalizations: normalized.normalizations,
      repairs,
      warnings: converter.getWarnings(),
      stats: converter.getStats(),
    })

    console.log(`${sampleName}: ${board.name}`)
  } catch (error) {
    failures.push({ sampleName, board: board.name, error })
    console.error(`${sampleName}: ${board.name} failed: ${error instanceof Error ? error.message : error}`)
  }
}

if (failures.length > 0) {
  throw new AggregateError(
    failures.map(({ error }) => error),
    `Failed to generate ${failures.length} of ${boards.length} boards`,
  )
}

writeFileSync("source-files.json", `${JSON.stringify(sourceFiles, null, 2)}\n`)
writeIndexFiles()
