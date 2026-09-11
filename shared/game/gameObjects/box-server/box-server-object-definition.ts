import type { ObjectTypeDefinition } from "../../runtime";
import BoxServerMesh from "./mesh/box-server.json";

export default {
  source: { itemType: "server" },
  geometry: {
    isStatic: false,
    canPush: true,
    isSurface: true,
    surfaceHeight: 0.86,
    countsAsCounter: true,
  },
  editor: {
    label: "Server box",
    detail: "Pickup source",
    color: "#facc15",
    width: 1.5,
    depth: 1.2,
  },
  states: {
    onFloor: {
      mesh: BoxServerMesh,
      canHold: true,
      canPush: true,
      acceptsDrop: "server",
    },
  },
} as ObjectTypeDefinition;
