import type { ObjectTypeDefinition } from "../../runtime";
import { requiresKey } from "../definition-helpers";
import ConfigDeskMesh from "./mesh/config-desk.json";

export default {
  interaction: {
    action: "config",
    canUse: true,
    requiredKey: "ADMIN_KEY",
    emitsEvent: "eventA",
  },
  geometry: {
    isStatic: true,
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
      visibleWhen: (context) =>
        context.asset.useAction === "quiz" && context.state !== "completed",
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
      visibleWhen: (context) => context.asset.useAction !== "quiz",
      canExecute: (context) =>
        context.heldItem && context.heldItem.type === context.asset.acceptsDrop &&
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
  states: {
    onFloor: { mesh: ConfigDeskMesh, acceptsDrop: "laptop" },
    inserted: { mesh: ConfigDeskMesh, acceptsDrop: "laptop" },
  },
} as ObjectTypeDefinition;
