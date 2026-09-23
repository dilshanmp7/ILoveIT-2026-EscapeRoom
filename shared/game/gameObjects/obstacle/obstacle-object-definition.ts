import type { ObjectTypeDefinition } from "../../types";

export default {
  geometry: {
    isBarrier: true,
    isStatic: true,
    canPush: false,
  },
  editor: {
    label: "Security Obstacle",
    detail: "Solid navigation barrier",
    color: "#f59e0b",
    width: 0.9,
    depth: 0.9,
  },
  visualStates: {
    onFloor: {
      canHold: false,
      canPush: false,
    },
  },
} as ObjectTypeDefinition;

