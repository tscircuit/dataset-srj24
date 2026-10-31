import assert from "node:assert/strict"
import { pcb_clearance_rule } from "circuit-json"
import { resolveCopperClearance } from "@tscircuit/checks"

export function validateScopedClearance(sample, circuitJson) {
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (sample.id !== "sample024" && !board?.clearance_rules?.length && !sample.clearanceRules?.length) return
  assert(board?.clearance_rules?.length, `${sample.id}: missing board clearance rules`)
  assert.deepEqual(sample.clearanceRules, board.clearance_rules, `${sample.id}: SRJ clearance rules differ from board`)
  const nets = circuitJson.filter((element) => element.type === "source_net")
  const netIds = new Set(nets.map((net) => net.source_net_id))
  const layers = ["top", ...Array.from({ length: sample.layerCount - 2 }, (_, i) => `inner${i + 1}`), "bottom"]
  const inspect = (scope) => {
    if (scope.type === "net") for (const id of scope.net_ids) assert(netIds.has(id), "Rule references a missing source net")
    if (scope.type === "layer") for (const layer of scope.layers) assert(layers.includes(layer), "Rule references a missing copper layer")
    if (scope.type === "and" || scope.type === "or") scope.scopes.forEach(inspect)
    if (scope.type === "not") inspect(scope.scope)
  }
  for (const rule of sample.clearanceRules) {
    pcb_clearance_rule.parse(rule)
    inspect(rule.scope1)
    inspect(rule.scope2)
  }
  for (const connection of sample.connections) {
    assert(Array.isArray(connection.sourceNetIds), "Connection lost source-net identity")
    for (const id of connection.sourceNetIds) assert(netIds.has(id), "Connection references a missing source net")
    if (sample.id === "sample024") assert.deepEqual(connection.sourceNetIds, [connection.name], "Sample024 connection belongs to the wrong source net")
  }
  if (sample.id !== "sample024") return

  // Independent witnesses from the SHA-pinned native PMP22650 rule table.
  // Comparing the two generated outputs alone would allow simultaneous loss.
  assert.equal(sample.clearanceRules.filter((rule) => rule.enabled).length, 10)
  const earth = nets.find((net) => net.name === "EARTH")?.source_net_id
  assert(earth, "Missing EARTH net")
  const hv = sample.clearanceRules.find((rule) => rule.name === "Clearance_HV_Inside")?.scope1
  const hvSw = sample.clearanceRules.find((rule) => rule.name === "Clearance_HV_SW_Inside")?.scope1
  assert.equal(hv?.type, "net")
  assert.equal(hvSw?.type, "net")
  assert.equal(hv.net_ids.length, 25) // Native class has one stale, deleted net.
  assert.equal(hvSw.net_ids.length, 81)
  const ordinary = nets.find((net) => net.source_net_id !== earth && !hv.net_ids.includes(net.source_net_id) && !hvSw.net_ids.includes(net.source_net_id))?.source_net_id
  assert(ordinary, "Missing ordinary-net witness")
  const copper = (id, layer) => ({ netIds: [id], layer, kind: "trace", isKeepout: false, inPolygon: false, isFree: true })
  for (const layer of layers) {
    const outside = layer === "top" || layer === "bottom"
    for (const [net, expected] of [[earth, outside ? 4.14 : 1.6], [hv.net_ids[0], outside ? 1.524 : 0.4064], [hvSw.net_ids[0], outside ? 1.524 : 0.4064]]) {
      for (const pair of [[net, ordinary], [ordinary, net]]) {
        const selected = resolveCopperClearance(sample.clearanceRules, copper(pair[0], layer), copper(pair[1], layer))
        assert(selected && Math.abs(selected.clearance - expected) < 0.000001, `Native clearance witness differs on ${layer}`)
      }
    }
  }
}
