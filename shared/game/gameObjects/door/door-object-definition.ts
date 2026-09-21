import type { ObjectTypeDefinition } from "../../types";
import DoorOpenedMesh from "./mesh/door-opened.json";
import DoorMesh from "./mesh/door.json";

export default {
  interaction: {
    action: "inspect-door",
    canUse: true,
  },
  canHold: true,
  holdingSlots: [
    {
      id: "badge_reader",
      label: "Badge Reader Slot",
      accepts: "key",
      consumeOnDrop: true,
      insertedState: "opened",
    },
  ],
  canPush: false,

  reactions: {
    level1_cleared: () => "opened",
    level2_cleared: () => "opened",
    quizz_admin_terminal_done: () => "opened",
  },
  actions: [
    {
      id: "swipe-key",
      label: "Swipe Security Key to Unlock Gate",
      isVisible: (context) => context.state !== "opened" && context.heldItem?.type === "key",
      execute: async (context) => {
        await context.acceptHeldItem();
      },
    },
    {
      id: "inspect-door",
      label: "Inspect Security Gate",
      execute: (context) => {
        if (context.state === "opened") {
          context.showMessage("Security Gate is OPEN. You may proceed to the next sector.");
        } else if (context.heldItem?.type === "key") {
          context.showMessage("Security Key detected! Press Space or Action button to swipe and unlock the gate.");
        } else {
          context.showMessage("Gate is LOCKED. Complete all sector terminal challenges to decrypt the clearance key, then swipe it here.");
        }
      },
    },
  ],
  geometry: { isBarrier: true, isStatic: true },
  editor: {
    label: "Sector Security Gate",
    detail: "Opens when sector is cleared",
    color: "#3b82f6",
    width: 2.5,
    depth: 0.4,
  },
  visualStates: {
    onFloor: { mesh: DoorMesh },
    opened: { mesh: DoorOpenedMesh },
  },
} as ObjectTypeDefinition;
