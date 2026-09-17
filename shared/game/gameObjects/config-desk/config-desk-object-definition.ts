import type { ObjectTypeDefinition } from "../../types";
import { requiresKey } from "../definition-helpers";
import ConfigDeskMesh from "./mesh/config-desk.json";

export default {
  interaction: {
    action: "config",
    canUse: true,
    requiredKey: "ADMIN_KEY",
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
      id: "admin-terminal-quiz",
      label: "Use admin terminal",
      blockedMessage: "Admin badge required",
      isVisible: (context) =>
        context.asset.actionIds?.includes("admin-terminal-quiz") === true &&
        context.state !== "completed",
      canExecute: requiresKey("ADMIN_KEY"),
      execute: (context) =>
        context.openQuiz({
          event: "quizz_admin_terminal_done",
          state: "completed",
          message: "Door opened",
          score: 100,
        }),
    },
    {
      id: "configure",
      label: "Configure device",
      isVisible: (context) =>
        context.asset.actionIds?.includes("configure") === true,
      canExecute: (context) =>
        context.heldItem &&
        context.heldItem.type === "laptop" &&
        !context.heldItem.configured,
      execute: async (context) => {
        await context.configureContained();
      },
    },
  ],
  editor: {
    label: "Config station",
    detail: "Configure device",
    color: "#2563eb",
    width: 1.5,
    depth: 1.2,
  },
  visualStates: {
    onFloor: { mesh: ConfigDeskMesh },
    inserted: { mesh: ConfigDeskMesh },
  },
} as ObjectTypeDefinition;
