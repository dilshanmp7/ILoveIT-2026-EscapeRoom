import type { ObjectTypeDefinition } from "../../types";
import OfficeDeskMesh from "./mesh/office-desk.json";

export default {
  geometry: {
    isSurface: true,
    surfaceHeight: 1.3,
  },
  holdingSlots: [
    {
      id: "desk-surface",
      label: "Desk surface",
      accepts: "any",
      maxContents: 3,
    },
  ],
  editor: {
    label: "Office desk",
    detail: "Storage surface",
    color: "#64748b",
    width: 1.5,
    depth: 1.2,
  },
  visualStates: { onFloor: { mesh: OfficeDeskMesh, acceptsDrop: "any" } },
} as ObjectTypeDefinition;
