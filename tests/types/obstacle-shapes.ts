import { sample001 } from "../../index"
import type { SimpleRouteObstacle } from "../../index"
import { getOvalObstacles, obstacleShapes } from "../../examples/obstacle-shapes"

const rect: SimpleRouteObstacle["type"] = "rect"
const oval: SimpleRouteObstacle["type"] = "oval"

// @ts-expect-error Unsupported obstacle shapes must still be rejected.
const triangle: SimpleRouteObstacle["type"] = "triangle"

// The real dataset already contains ovals. This comparison used to raise TS2367.
const realObstacleIsOval: boolean = sample001.obstacles[18].type === "oval"
const realOvals: SimpleRouteObstacle[] = getOvalObstacles(sample001)
const exampleOvals: SimpleRouteObstacle[] = getOvalObstacles(obstacleShapes)
