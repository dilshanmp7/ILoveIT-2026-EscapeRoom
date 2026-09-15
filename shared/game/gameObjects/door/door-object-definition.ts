import type { ObjectTypeDefinition } from "../../runtime";
import { requiresKey } from "../definition-helpers";
import DoorOpenedMesh from "./mesh/door-opened.json";
import DoorMesh from "./mesh/door.json";

export default {
  interaction: {
    action: "open_door",
    requiredKey: "SLIDING_DOR_KEY",
    canUse: true,
  },
  canHold: false,
  canPush: false,

  reactions: {
    quizz_admin_terminal_done: ({ emitter }) =>
      emitter.type === "config_desk" && emitter.id === "admin_comp"
        ? "opened"
        : undefined,
  },
  actions: [
    {
      id: "use-key",
      label: "Use held key",
      canExecute: requiresKey("SLIDING_DOR_KEY"),
      execute: (context) => context.emitEvent("eventA"),
    },
  ],
  geometry: { isBarrier: true, isStatic: true },
  editor: {
    label: "Secure door",
    detail: "Requires key",
    color: "#3b82f6",
    width: 2.5,
    depth: 0.4,
  },
  states: { onFloor: { mesh: DoorMesh }, opened: { mesh: DoorOpenedMesh } },
} as ObjectTypeDefinition;
