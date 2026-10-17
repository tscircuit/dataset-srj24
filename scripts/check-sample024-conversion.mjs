import { readFileSync } from "node:fs"
import { isDeepStrictEqual } from "node:util"
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core"

const sample = JSON.parse(readFileSync(new URL("../samples/sample024.json", import.meta.url), "utf8"))
const circuitJson = JSON.parse(readFileSync(new URL(`../${sample.sourceCircuitJson}`, import.meta.url), "utf8"))
const { simpleRouteJson } = getSimpleRouteJsonFromCircuitJson({
  circuitJson,
  ignoreExistingTopLevelPcbRouteState: true,
})
for (const [key, value] of Object.entries(simpleRouteJson)) {
  if (!isDeepStrictEqual(JSON.parse(JSON.stringify(value ?? null)), sample[key] ?? null)) {
    throw new Error(`Sample024 cannot be reproduced by the pinned converter: ${key}`)
  }
}
if (sample.connections.some((connection) => connection.externallyConnectedPointIds?.length)) {
  throw new Error("A fresh-routing sample must not claim connectivity through discarded copper")
}
console.log("Sample024 is reproducible and contains no discarded-copper connectivity")
