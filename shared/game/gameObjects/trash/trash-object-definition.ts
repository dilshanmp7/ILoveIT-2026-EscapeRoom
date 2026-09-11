import type { ObjectTypeDefinition } from "../../runtime";
import TrashMesh from "./mesh/trash.json";

export default {
  interaction: { action: "trash", canUse: true },
  geometry: {
    isStatic: true,
    isSurface: true,
    surfaceHeight: 1.3,
    countsAsCounter: true,
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
  states: { onFloor: { mesh: TrashMesh, acceptsDrop: "any" } },
} as ObjectTypeDefinition;
