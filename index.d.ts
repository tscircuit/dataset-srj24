export interface SimpleRouteConnectionPointBase {
  x: number
  y: number
  pointId?: string
  pcb_port_id?: string
}

export type SimpleRouteConnectionPoint =
  | (SimpleRouteConnectionPointBase & { layer: string })
  | (SimpleRouteConnectionPointBase & { layers: string[] })

export interface SimpleRouteConnection {
  name: string
  source_trace_id?: string
  rootConnectionName?: string
  mergedConnectionNames?: string[]
  isOffBoard?: boolean
  netConnectionName?: string
  nominalTraceWidth?: number
  width?: number
  pointsToConnect: SimpleRouteConnectionPoint[]
  externallyConnectedPointIds?: string[][]
}

export interface SimpleRouteObstacle {
  obstacleId?: string
  componentId?: string
  type: "rect"
  layers: string[]
  zLayers?: number[]
  center: { x: number; y: number }
  width: number
  height: number
  ccwRotationDegrees?: number
  connectedTo: string[]
  isCopperPour?: boolean
  netIsAssignable?: boolean
  offBoardConnectsTo?: string[]
}

export interface SimpleRouteJson {
  id?: string
  sourceCircuitJson?: string
  sourceKicadPcb?: string
  sourceName?: string
  sourceUrl?: string
  sourceRepository?: string
  sourceLicense?: string
  layerCount: number
  minTraceWidth: number
  nominalTraceWidth?: number
  minViaDiameter?: number
  minViaHoleDiameter?: number
  minViaPadDiameter?: number
  defaultObstacleMargin?: number
  obstacles: SimpleRouteObstacle[]
  connections: SimpleRouteConnection[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  outline?: Array<{ x: number; y: number }>
  traces?: unknown[]
  jumpers?: unknown[]
}

export const sample001: SimpleRouteJson
export const sample002: SimpleRouteJson
export const sample003: SimpleRouteJson
export const sample004: SimpleRouteJson
export const sample005: SimpleRouteJson
export const sample006: SimpleRouteJson
export const sample007: SimpleRouteJson
export const sample008: SimpleRouteJson
export const sample009: SimpleRouteJson
export const sample010: SimpleRouteJson

export const dataset: Record<string, SimpleRouteJson>
declare const defaultDataset: Record<string, SimpleRouteJson>
export default defaultDataset
