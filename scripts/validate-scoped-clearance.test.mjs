import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { checkScopedCopperClearance } from "@tscircuit/checks"
import { validateScopedClearance } from "./validate-scoped-clearance.mjs"

const load = () => {
  const sample = JSON.parse(readFileSync("samples/sample024.json", "utf8"))
  return { sample, circuitJson: JSON.parse(readFileSync(sample.sourceCircuitJson, "utf8")) }
}

test("native witnesses reject lost rules, altered layer scopes and lost net identities", () => {
  const clean = load()
  expect(() => validateScopedClearance(clean.sample, clean.circuitJson)).not.toThrow()
  for (const mutate of [
    ({ sample, board }) => { delete sample.clearanceRules; delete board.clearance_rules },
    ({ sample }) => { sample.clearanceRules[0].clearance = 0.1397 },
    ({ sample }) => { sample.clearanceRules[0].scope1 = { type: "net", net_ids: ["missing"] } },
    ({ sample }) => { sample.clearanceRules[0].scope1 = { type: "all" } },
    ({ sample }) => { delete sample.connections[0].sourceNetIds },
    ({ sample }) => { sample.connections[0].sourceNetIds = [] },
  ]) {
    const { sample, circuitJson } = load()
    const board = circuitJson.find((element) => element.type === "pcb_board")
    // Give both generated outputs the same mutation: source witnesses must fail.
    board.clearance_rules = sample.clearanceRules
    mutate({ sample, board })
    expect(() => validateScopedClearance(sample, circuitJson)).toThrow()
  }
})

test("restored native rules reject a 2 mm EARTH outer gap while accepting inner copper", () => {
  const { sample, circuitJson } = load()
  const earth = circuitJson.find((element) => element.type === "source_net" && element.name === "EARTH")
  for (const layer of ["top", "inner1", "inner6", "bottom"]) {
    const fixture = [
      { ...circuitJson.find((element) => element.type === "pcb_board"), clearance_rules: sample.clearanceRules },
      earth,
      ...[earth.source_net_id, "witness_signal"].flatMap((net, i) => [
        { type: "source_trace", source_trace_id: `source_trace_${i}`, connected_source_net_ids: [net], connected_source_port_ids: [] },
        { type: "pcb_trace", pcb_trace_id: `pcb_trace_${i}`, source_trace_id: `source_trace_${i}`, route: [0, 10].map((x) => ({ route_type: "wire", x, y: i * 2.2, width: 0.2, layer })) },
      ]),
    ]
    const errors = checkScopedCopperClearance(fixture)
    expect(errors).toHaveLength(layer === "top" || layer === "bottom" ? 1 : 0)
    if (errors.length) expect(errors[0].minimum_clearance).toBeCloseTo(4.14, 5)
  }
})
