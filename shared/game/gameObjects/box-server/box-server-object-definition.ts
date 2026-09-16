import type { ObjectTypeDefinition } from "../../types";
import BoxServerMesh from "./mesh/box-server.json";

export default {
  source: { itemType: "server" },
  geometry: {
    canPush: true,
    isSurface: true,
    surfaceHeight: 0.86,
  },
  editor: {
    label: "Server box",
    detail: "Pickup source",
    color: "#facc15",
    width: 1.5,
    depth: 1.2,
  },
  visualStates: {
    onFloor: {
      mesh: BoxServerMesh,
      canHold: false,
      canPush: true,
      acceptsDrop: "server",
    },
  },
} as ObjectTypeDefinition;
