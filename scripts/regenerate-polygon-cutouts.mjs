import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"
import { convertSrjToGraphicsObject } from "@tscircuit/capacity-autorouter"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { validatePolygonCutoutCoverage } from "./lib/polygon-cutout-coverage.mjs"

// Keep the original Altium and Circuit JSON panels byte-for-byte. Only replace
// the third (800 x 600) panel produced by generate-ti-altium-samples.mjs.
const replaceSrjPanel = (comparison, srjSvg) => {
  const marker =
    '  <g transform="translate(1648, 0) scale(1, 1) translate(0, 0)">'
  const start = comparison.indexOf(marker)
  if (start < 0) throw new Error("Expected the third SRJ comparison panel")
  const groups = /<g\b[^>]*>|<\/g>/g
  groups.lastIndex = start
  let depth = 0
  for (let match; (match = groups.exec(comparison)); ) {
    depth += match[0].startsWith("</") ? -1 : 1
    if (depth !== 0) continue
    const body = srjSvg.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "")
    return (
      comparison.slice(0, start) +
      `${marker}\n    ${body}\n  </g>` +
      comparison.slice(groups.lastIndex)
    )
  }
  throw new Error("Unclosed SRJ comparison panel")
}

for (const filename of readdirSync("samples")
  .filter((name) => /^sample\d+\.json$/.test(name))
  .sort()) {
  const samplePath = `samples/${filename}`
  const previous = JSON.parse(readFileSync(samplePath, "utf8"))
  const circuitJson = JSON.parse(
    readFileSync(previous.sourceCircuitJson, "utf8"),
  )
  if (
    !circuitJson.some(
      (element) => element.type === "pcb_cutout" && element.shape === "polygon",
    )
  )
    continue
  const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
    circuitJson,
    ignoreExistingTopLevelPcbRouteState: true,
  })
  // Metadata belongs to the dataset; all routing geometry comes from core.
  const metadata = Object.fromEntries(
    Object.entries(previous).filter(
      ([key]) =>
        key === "id" ||
        key.startsWith("source") ||
        key === "snapshotComparison",
    ),
  )
  const regenerated = { ...simpleRouteJson, ...metadata }
  validatePolygonCutoutCoverage(regenerated, circuitJson)
  const srjSvg = getSvgFromGraphicsObject(
    convertSrjToGraphicsObject(regenerated),
    {
      backgroundColor: "#11161b",
      svgWidth: 800,
      svgHeight: 600,
      hideInlineLabels: true,
    },
  )
  const comparison = readFileSync(previous.snapshotComparison, "utf8")
  const updatedComparison = replaceSrjPanel(comparison, srjSvg)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
  writeFileSync(samplePath, `${JSON.stringify(regenerated, null, 2)}\n`)
  writeFileSync(previous.snapshotComparison, updatedComparison)
  console.log(
    `${previous.id}: ${previous.obstacles.length} -> ${regenerated.obstacles.length} obstacles`,
  )
}
