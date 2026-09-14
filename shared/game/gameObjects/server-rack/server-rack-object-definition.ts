import type { ObjectTypeDefinition } from "../../runtime";
import ServerRackMesh from "./mesh/server-rack.json";

export default {
  interaction: { action: "config", canUse: true },
  geometry: {
    isStatic: true,
    isSurface: true,
    surfaceHeight: 1.3,
  },
  holdingSlots: [
    {
      id: "server-bay",
      label: "Server bay",
      accepts: "server",
      maxContents: 1,
    },
  ],
  actions: [
    {
      id: "configure",
      label: "Configure server",
      canExecute: (context) =>
        context.heldItem !== null && context.heldItem.type === context.asset.acceptsDrop &&
        !context.heldItem.configured,
      execute: async (context) => {
        await context.configureContained();
      },
    },
  ],
  editor: {
    label: "Server rack",
    detail: "Configure server",
    color: "#64748b",
    width: 1.5,
    depth: 1.2,
  },
  states: {
    onFloor: { mesh: ServerRackMesh, acceptsDrop: "server" },
    inserted: { mesh: ServerRackMesh, acceptsDrop: "server" },
  },
} as ObjectTypeDefinition;
