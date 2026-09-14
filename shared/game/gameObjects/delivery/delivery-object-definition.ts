import type { ObjectTypeDefinition } from "../../runtime";
import { hasConfiguredItem } from "../definition-helpers";
import DeliveryMesh from "./mesh/delivery.json";

export default {
  interaction: { action: "deliver", canUse: true },
  geometry: {
    isStatic: true,
    isSurface: true,
    surfaceHeight: 1.3,
  },
  actions: [
    {
      id: "deliver",
      label: "Deliver configured device",
      canExecute: hasConfiguredItem,
      execute: (context) => context.deliverHeld(),
    },
  ],
  editor: {
    label: "Dispatch hatch",
    detail: "Score delivery",
    color: "#d40511",
    width: 2.5,
    depth: 1.5,
  },
  states: { onFloor: { mesh: DeliveryMesh, acceptsDrop: "configured" } },
} as ObjectTypeDefinition;
