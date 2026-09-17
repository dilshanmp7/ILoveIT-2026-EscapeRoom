import type { ObjectTypeDefinition } from "../../types";
import ServerConfiguredMesh from "./mesh/configured.json";
import ServerGrabbedMesh from "./mesh/grabbed.json";
import ServerOnFloorMesh from "./mesh/on-floor.json";
import ServerOnTableMesh from "./mesh/on-table.json";

export default {
  dropObjectType: "box_server",
  configureSound: "process",
  editor: {
    label: "Server",
    detail: "Held device",
    color: "#334155",
    width: 1.2,
    depth: 1.2,
  },
  visualStates: {
    grabbed: {
      mesh: ServerGrabbedMesh,
      scale: [1, 1, 1],
      heldOffset: [0, 0, 0.4],
    },
    onFloor: { mesh: ServerOnFloorMesh, scale: [1, 1, 1] },
    onTable: { mesh: ServerOnTableMesh, scale: [1, 1, 1] },
    configured: {
      mesh: ServerConfiguredMesh,
      scale: [1, 1, 1],
    },
  },
} as ObjectTypeDefinition;
