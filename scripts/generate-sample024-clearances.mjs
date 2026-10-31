import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { convertAltiumToCircuitJson } from "altium-to-circuit-json"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"
import { validateScopedClearance } from "./validate-scoped-clearance.mjs"

// Regenerate clearance metadata only; existing saved copper geometry is retained.
// Native TI sources are supplied locally and must never be committed here.
const args = process.argv.slice(2)
const pcbdocIndex = args.indexOf("--pcbdoc")
assert(pcbdocIndex >= 0 && args[pcbdocIndex + 1], "Usage: bun scripts/generate-sample024-clearances.mjs --pcbdoc /path/to/PMP22650.PcbDoc [--check]")
const bytes = readFileSync(args[pcbdocIndex + 1])
const sources = JSON.parse(readFileSync("source-files.json", "utf8"))
const source = sources.find((entry) => entry.sample === "sample024")
assert.equal(createHash("sha256").update(bytes).digest("hex"), source.sourceSha256, "Native source checksum mismatch")
const samplePath = "samples/sample024.json"
const sample = JSON.parse(readFileSync(samplePath, "utf8"))
assert.equal(sample.sourcePcbDocSha256, source.sourceSha256)
const circuitJson = JSON.parse(readFileSync(sample.sourceCircuitJson, "utf8"))
const nativeCircuitJson = convertAltiumToCircuitJson(bytes, { sourceType: "pcb" })
// Net IDs are positional in the importer. Never overlay rules if the table moved.
const netTable = (elements) => elements.filter((element) => element.type === "source_net").map(({ source_net_id, name }) => [source_net_id, name])
assert.deepEqual(netTable(nativeCircuitJson), netTable(circuitJson), "Importer changed source-net identity; full regeneration is required")
const board = circuitJson.find((element) => element.type === "pcb_board")
board.clearance_rules = nativeCircuitJson.find((element) => element.type === "pcb_board").clearance_rules
const { simpleRouteJson: generated } = getSimpleRouteJsonFromCircuitJson({ circuitJson, ignoreExistingTopLevelPcbRouteState: true })
sample.clearanceRules = generated.clearanceRules
const generatedByName = new Map(generated.connections.map((connection) => [connection.name, connection]))
assert.equal(generatedByName.size, sample.connections.length, "Connection grouping changed; full regeneration is required")
for (const connection of sample.connections) {
  assert(generatedByName.has(connection.name), "Existing connection was lost during regeneration")
  connection.sourceNetIds = generatedByName.get(connection.name).sourceNetIds
}
validateScopedClearance(sample, circuitJson)
for (const [path, value] of [[sample.sourceCircuitJson, circuitJson], [samplePath, sample]]) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`
  if (args.includes("--check")) assert.equal(readFileSync(path, "utf8"), serialized, `${path} is not reproducible`)
  else writeFileSync(path, serialized)
}
console.log(`sample024: ${sample.clearanceRules.length} clearance rules and ${sample.connections.length} source-net identities ${args.includes("--check") ? "verified" : "regenerated"}`)
