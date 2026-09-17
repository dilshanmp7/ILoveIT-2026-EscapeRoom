import type { ObjectTypeDefinition } from "../../types";
import BoxLaptopMesh from "./mesh/box-laptop.json";

export default {
  source: { itemType: "laptop" },
  geometry: {
    canPush: true,
    isSurface: true,
    surfaceHeight: 0.86,
  },
  editor: {
    label: "Laptop box",
    detail: "Pickup source",
    color: "#facc15",
    width: 1.5,
    depth: 1.2,
  },
  visualStates: {
    onFloor: {
      mesh: BoxLaptopMesh,
      canHold: false,
      canPush: true,
    },
  },
  canBePushed: () => true,
  canBeDragged: () => true,
  canBeGrabbed: () => false,
} as ObjectTypeDefinition;
