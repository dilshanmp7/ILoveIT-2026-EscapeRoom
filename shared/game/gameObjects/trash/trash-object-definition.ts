import type { ObjectTypeDefinition } from "../../types";
import TrashMesh from "./mesh/trash.json";

export default {
  geometry: {
    isSurface: true,
    surfaceHeight: 1.3,
  },
  actions: [
    {
      id: "discard",
      label: "Discard held item",
      canExecute: (context) => Boolean(context.heldItem),
      execute: (context) => context.discardHeld(),
    },
  ],
  editor: {
    label: "Recycle bin",
    detail: "Discard item",
    color: "#4b5563",
    width: 1.2,
    depth: 1.2,
  },
  holdingSlots: [{ id: "trash", label: "Trash", accepts: "any" }],
  visualStates: { onFloor: { mesh: TrashMesh } },
} as ObjectTypeDefinition;
