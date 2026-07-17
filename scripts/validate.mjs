import { existsSync, readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const dataset = require("../index.js")
const expectedSampleCount = 10

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
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
const sourceFiles = JSON.parse(readFileSync("source-files.json", "utf8"))

assert(sampleFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} samples, found ${sampleFiles.length}`)
assert(circuitJsonFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} Circuit JSON files, found ${circuitJsonFiles.length}`)
assert(pcbFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} KiCad boards, found ${pcbFiles.length}`)
assert(sourceFiles.length === expectedSampleCount, `Expected ${expectedSampleCount} source entries, found ${sourceFiles.length}`)
assert(existsSync("index.d.ts"), "Missing index.d.ts")
assert(existsSync("LICENSE"), "Missing repository license")
assert(existsSync("LICENSES/Apache-2.0.txt"), "Missing Apache-2.0 license copy")
assert(existsSync("THIRD_PARTY_NOTICES.md"), "Missing third-party notices")

const repositoryLicense = readFileSync("LICENSE", "utf8")
assert(repositoryLicense.includes("MIT License"), "Repository license is missing MIT terms")
assert(repositoryLicense.includes("Apache License, Version 2.0"), "Repository license is missing the Apache-2.0 exception")

let hasVeryHighComplexityBoard = false

for (const [index, source] of sourceFiles.entries()) {
  const exportName = `sample${String(index + 1).padStart(3, "0")}`
  assert(source.sample === exportName, `Expected source entry ${exportName}, found ${source.sample}`)
  assert(dataset[exportName], `Missing export ${exportName}`)

  const sample = dataset[exportName]
  const circuitJsonPath = sample.sourceCircuitJson
  const kicadPcbPath = sample.sourceKicadPcb

  assert(sample.id === exportName, `${exportName} has mismatched id`)
  assert(sample.sourceName === source.board, `${exportName} has mismatched source name`)
  assert(sample.sourceRepository === source.repository, `${exportName} has mismatched repository`)
  assert(sample.sourceLicense === "Apache-2.0", `${exportName} has mismatched source license`)
  assert(Array.isArray(sample.obstacles) && sample.obstacles.length > 0, `${exportName} missing obstacles`)
  assert(Array.isArray(sample.connections) && sample.connections.length > 0, `${exportName} missing connections`)
  assert(sample.bounds, `${exportName} missing bounds`)
  assert(sample.layerCount >= 2, `${exportName} has invalid layer count`)

  assert(existsSync(circuitJsonPath), `${exportName} missing ${circuitJsonPath}`)
  assert(existsSync(kicadPcbPath), `${exportName} missing ${kicadPcbPath}`)
  assert(readFileSync(kicadPcbPath, "utf8").startsWith("(kicad_pcb"), `${exportName} is not a KiCad PCB`)

  assert(/^[0-9a-f]{40}$/.test(source.ref), `${exportName} source ref is not an immutable commit`)
  assert(source.sourceUrl.includes(source.ref), `${exportName} source URL is not pinned`)
  assert(source.rawUrl.includes(source.ref), `${exportName} raw URL is not pinned`)
  assert(source.license === "Apache-2.0", `${exportName} metadata has mismatched license`)
  assert(source.licenseUrl.includes(source.ref), `${exportName} license URL is not pinned`)
  assert(typeof source.description === "string" && source.description.length > 20, `${exportName} missing description`)
  assert(Array.isArray(source.properties) && source.properties.length >= 3, `${exportName} missing properties`)
  assert(Array.isArray(source.warnings) && source.warnings.length === 0, `${exportName} has converter warnings`)
  assert(Array.isArray(source.normalizations), `${exportName} missing normalizations array`)
  assert(Array.isArray(source.repairs), `${exportName} missing repairs array`)
  assert(source.stats.components > 0, `${exportName} has no components`)
  assert(source.stats.pads > 0, `${exportName} has no pads`)
  assert(source.stats.traces > 0, `${exportName} has no routed traces`)

  const circuitJson = JSON.parse(readFileSync(circuitJsonPath, "utf8"))
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
    assert(sample.connections.length >= 500, `${exportName} complex board has too few connections`)
    assert(sample.layerCount >= 6, `${exportName} complex board has too few copper layers`)
  }
}

assert(hasVeryHighComplexityBoard, "Dataset is missing a very-high-complexity board")
assert(Object.keys(dataset.dataset).length === expectedSampleCount, "Dataset export count is incorrect")

console.log(`Validated ${expectedSampleCount} SRJ samples with pinned sources, licensing, and connectivity checks`)
