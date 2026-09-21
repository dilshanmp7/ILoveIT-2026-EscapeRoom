import type { ObjectTypeDefinition } from "../../types";
import ConfigDeskMesh from "./mesh/config-desk.json";

export default {
  interaction: {
    action: "access-station",
    canUse: true,
  },
  geometry: {
    isSurface: true,
    surfaceHeight: 1.0,
  },
  holdingSlots: [
    {
      id: "device-surface",
      label: "Device surface",
      accepts: "laptop",
      maxContents: 1,
    },
  ],
  actions: [
    {
      id: "access-station",
      label: "Access Workstation",
      execute: (context) => context.openQuiz(),
    },
  ],
  editor: {
    label: "Config station",
    detail: "Access terminal",
    color: "#2563eb",
    width: 1.5,
    depth: 1.2,
  },
  visualStates: {
    onFloor: { mesh: ConfigDeskMesh },
    inserted: { mesh: ConfigDeskMesh },
  },
} as ObjectTypeDefinition;
