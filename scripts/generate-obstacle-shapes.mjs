import assert from "node:assert/strict"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { obstacleShapes, getOvalObstacles } from "../examples/obstacle-shapes.ts"

const check = process.argv.includes("--check")
const { bounds } = obstacleShapes
const scale = 17
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
})[char])
const x = (value) => 26 + (value - bounds.minX) * scale
const y = (value) => 102 + (bounds.maxY - value) * scale

// This standalone consumer illustrates the type distinction. The existing
// capacity-autorouter viewer uses rectangular bounds for both obstacle types.
const renderPanel = (rectOnly, offset) => {
  const shapes = obstacleShapes.obstacles.map((obstacle) => {
    const width = obstacle.width * scale
    const height = obstacle.height * scale
    const cx = x(obstacle.center.x)
    const cy = y(obstacle.center.y)
    const oval = !rectOnly && obstacle.type === "oval"
    const color = oval ? "#56dcc2" : "#f4a261"
    const shape = oval
      ? `<ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" />`
      : `<rect x="${cx - width / 2}" y="${cy - height / 2}" width="${width}" height="${height}" />`
    const label = obstacle.connectedTo.length ? obstacle.obstacleId : `${obstacle.type} ${obstacle.width} × ${obstacle.height}`
    return `    <g fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"><title>${escapeXml(obstacle.obstacleId)}</title>${shape}</g>
    <text x="${cx}" y="${cy + height / 2 + 20}" text-anchor="middle" fill="#dbe5ed" font-size="13">${escapeXml(label)}</text>`
  }).join("\n")
  const [start, end] = obstacleShapes.connections[0].pointsToConnect
  return `  <g transform="translate(${offset}, 106)">
    <rect width="528" height="404" rx="14" fill="#151e29" stroke="#344254" />
    <text x="24" y="34" fill="#f1f5f9" font-size="20" font-weight="700">${rectOnly ? "Rectangular bounds" : "Shape-aware TypeScript consumer"}</text>
    <text x="24" y="60" fill="#a6b7c9" font-size="14">${rectOnly ? "All obstacles shown as bounding rectangles" : 'Branches on type: "rect" | "oval"'}</text>
    <rect x="${x(bounds.minX)}" y="${y(bounds.maxY)}" width="${(bounds.maxX - bounds.minX) * scale}" height="${(bounds.maxY - bounds.minY) * scale}" fill="#101722" stroke="#435165" stroke-dasharray="4 5" />
    <line x1="${x(start.x)}" y1="${y(start.y)}" x2="${x(end.x)}" y2="${y(end.y)}" stroke="#9aadc4" stroke-width="1.5" stroke-dasharray="5 5" />
${shapes}
  </g>`
}

const ovalCount = getOvalObstacles(obstacleShapes).length
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="622" viewBox="0 0 1152 622" role="img" aria-labelledby="title description">
  <title id="title">Rectangle and oval obstacle sample</title>
  <desc id="description">The same synthetic routing sample shown as rectangular bounds on the left and with oval types rendered as ellipses on the right. This illustrates a consumer of the corrected declarations, not a change to the dataset viewer.</desc>
  <rect width="1152" height="622" rx="18" fill="#0c121c" />
  <g font-family="Arial, sans-serif">
    <text x="36" y="43" fill="#f1f5f9" font-size="26" font-weight="700">Rectangle and oval obstacles</text>
    <text x="36" y="74" fill="#a6b7c9" font-size="16">Synthetic SRJ example · ${obstacleShapes.obstacles.length} obstacles · ${ovalCount} ovals · 2 layers · dimensions in mm</text>
${renderPanel(true, 36)}
${renderPanel(false, 588)}
    <rect x="40" y="533" width="13" height="13" fill="#f4a261" />
    <text x="63" y="545" fill="#dbe5ed" font-size="14">Rectangle / bounding box</text>
    <ellipse cx="310" cy="540" rx="9" ry="6" fill="#56dcc2" />
    <text x="329" y="545" fill="#dbe5ed" font-size="14">Oval</text>
    <line x1="405" y1="540" x2="439" y2="540" stroke="#9aadc4" stroke-dasharray="5 5" />
    <text x="449" y="545" fill="#dbe5ed" font-size="14">Unrouted connection</text>
    <text x="36" y="582" fill="#a6b7c9" font-size="14">The declaration fix enables typed consumers; existing board data and the dataset viewer are unchanged.</text>
  </g>
</svg>
`

const artifacts = [
  [new URL("../examples/obstacle-shapes.json", import.meta.url), `${JSON.stringify(obstacleShapes, null, 2)}\n`],
  [new URL("../snapshots/examples/obstacle-shapes.svg", import.meta.url), svg],
]

for (const [url, contents] of artifacts) {
  const path = fileURLToPath(url)
  if (check) {
    assert.equal(readFileSync(path, "utf8"), contents, `${relative(process.cwd(), path)} is stale; run bun run generate:example`)
  } else {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }
  console.log(`${check ? "Checked" : "Generated"} ${relative(process.cwd(), path)}`)
}
