import type { ObjectTypeDefinition } from "../../types";
import RiddleMesh from "./mesh/riddle.json";

export default {
  interaction: { action: "quiz", canUse: true },
  geometry: {
    isSurface: true,
    surfaceHeight: 1.3,
  },
  actions: [
    {
      id: "quiz",
      label: "Access IT Terminal",
      execute: (context) => context.openQuiz(),
    },
  ],
  editor: {
    label: "IT Terminal Console",
    detail: "Open challenge quiz",
    color: "#7e22ce",
    width: 1.4,
    depth: 1.4,
  },
  visualStates: {
    onFloor: { mesh: RiddleMesh },
    completed: { mesh: RiddleMesh },
  },
} as ObjectTypeDefinition;
