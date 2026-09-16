import type { ObjectTypeDefinition } from "../../types";
import LaptopConfiguredMesh from "./mesh/configured.json";
import LaptopGrabbedMesh from "./mesh/grabbed.json";
import LaptopOnFloorMesh from "./mesh/on-floor.json";
import LaptopOnTableMesh from "./mesh/on-table.json";

export default {
  dropObjectType: "box_laptop",
  configureSound: "type",
  editor: {
    label: "Laptop",
    detail: "Held device",
    color: "#334155",
    width: 1.2,
    depth: 1.2,
  },
  interactions: {
    canGrab: true,
  },
  visualStates: {
    grabbed: { mesh: LaptopGrabbedMesh, scale: [1, 1, 1] },
    onFloor: { mesh: LaptopOnFloorMesh, scale: [1, 1, 1] },
    onTable: { mesh: LaptopOnTableMesh, scale: [1, 1, 1] },
    configured: {
      mesh: LaptopConfiguredMesh,
      scale: [1, 1, 1],
    },
  },
} as ObjectTypeDefinition;
