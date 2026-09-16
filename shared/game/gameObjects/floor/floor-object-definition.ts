import type { ObjectTypeDefinition } from "../../types";
import FloorMesh from "./mesh/floor.json";

export default {
  geometry: { isSurface: true, surfaceHeight: 0.1 },
  visualStates: { onFloor: { mesh: FloorMesh } },
} as ObjectTypeDefinition;
