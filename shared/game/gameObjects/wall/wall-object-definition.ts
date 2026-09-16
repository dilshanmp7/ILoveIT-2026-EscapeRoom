import type { ObjectTypeDefinition } from "../../types";
import WallMesh from "./mesh/wall.json";

export default {
  geometry: { isBarrier: true, isStatic: true },
  editor: {
    label: "Partition wall",
    detail: "Static boundary",
    color: "#94a3b8",
    width: 1.5,
    depth: 1.2,
  },
  visualStates: { onFloor: { mesh: WallMesh } },
} as ObjectTypeDefinition;
