import type { ObjectTypeDefinition } from "../../runtime";
import OfficeDeskMesh from "./mesh/office-desk.json";

export default {
  geometry: {
    isStatic: true,
    isSurface: true,
    surfaceHeight: 1.3,
    countsAsCounter: true,
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
  states: { onFloor: { mesh: OfficeDeskMesh, acceptsDrop: "any" } },
} as ObjectTypeDefinition;
