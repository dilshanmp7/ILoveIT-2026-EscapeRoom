import type { ObjectTypeDefinition } from "../../runtime";
import FloorMesh from "./mesh/floor.json";

export default {
  geometry: { isStatic: true, isSurface: true, surfaceHeight: 0.1 },
  states: { onFloor: { mesh: FloorMesh } },
} as ObjectTypeDefinition;
