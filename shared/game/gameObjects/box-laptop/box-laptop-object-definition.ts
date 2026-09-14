import type { ObjectTypeDefinition } from "../../runtime";
import BoxLaptopMesh from "./mesh/box-laptop.json";

export default {
  source: { itemType: "laptop" },
  geometry: {
    isStatic: false,
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
  states: {
    onFloor: {
      mesh: BoxLaptopMesh,
      canHold: true,
      canPush: true,
      acceptsDrop: "laptop",
    },
  },
} as ObjectTypeDefinition;
