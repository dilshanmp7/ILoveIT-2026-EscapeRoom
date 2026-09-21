import type { ObjectTypeDefinition } from "../../types";
import DeliveryMesh from "./mesh/delivery.json";

export default {
  interaction: { action: "escape", canUse: true },
  geometry: {
    isSurface: true,
    surfaceHeight: 1.3,
  },
  canHold: true,
  holdingSlots: [
    {
      id: "master_key_slot",
      label: "Master Override Key Reader",
      accepts: "key",
      consumeOnDrop: true,
      insertedState: "opened",
    },
  ],
  actions: [
    {
      id: "swipe-master-key",
      label: "Swipe Master Cryptokey to Depressurize Hatch",
      isVisible: (context) => context.heldItem?.type === "key",
      execute: async (context) => {
        await context.acceptHeldItem();
        context.emitEvent("escape_hatch_triggered");
      },
    },
    {
      id: "escape",
      label: "Activate Emergency Escape Hatch",
      execute: (context) => {
        context.emitEvent("escape_hatch_triggered");
      },
    },
  ],
  editor: {
    label: "Master Dispatch Hatch",
    detail: "Emergency Escape Route",
    color: "#d40511",
    width: 2.5,
    depth: 1.5,
  },
  visualStates: { onFloor: { mesh: DeliveryMesh } },
} as ObjectTypeDefinition;
