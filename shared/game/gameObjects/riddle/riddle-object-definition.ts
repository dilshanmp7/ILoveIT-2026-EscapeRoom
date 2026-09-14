import type { ObjectTypeDefinition } from "../../runtime";
import RiddleMesh from "./mesh/riddle.json";

export default {
  interaction: { action: "quiz", canUse: true },
  geometry: {
    isStatic: true,
    isSurface: true,
    surfaceHeight: 1.3,
  },
  actions: [
    {
      id: "quiz",
      label: "Open security quiz",
      visibleWhen: (context) => context.state !== "completed",
      execute: (context) => context.openQuiz(),
    },
  ],
  editor: {
    label: "Security terminal",
    detail: "Open quiz",
    color: "#7e22ce",
    width: 1.4,
    depth: 1.4,
  },
  states: { onFloor: { mesh: RiddleMesh }, completed: { mesh: RiddleMesh } },
} as ObjectTypeDefinition;
