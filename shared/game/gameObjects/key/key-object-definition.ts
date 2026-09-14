import type { ObjectTypeDefinition } from "../../runtime";
import KeyGrabbedMesh from "./mesh/key-grabbed.json";
import KeyInsertedMesh from "./mesh/key-inserted.json";
import KeyOnTableMesh from "./mesh/key.json";

export default {
  defaultState: "onTable",
  interaction: { action: "none", canGrab: true },
  geometry: {
    isStatic: false,
    isSurface: true,
    surfaceHeight: 0.1,
  },
  source: { itemType: "key" },
  dropObjectType: "key",
  editor: {
    label: "ID badge",
    detail: "Pickup key",
    color: "#0ea5e9",
    width: 0.8,
    depth: 0.8,
  },
  states: {
    grabbed: {
      mesh: KeyGrabbedMesh,
      scale: [0.45, 0.45, 0.45] as [number, number, number],
      rotation: [-0.392699, 0, 0] as [number, number, number],
    },
    onTable: { mesh: KeyOnTableMesh, canHold: true },
    onFloor: { mesh: KeyOnTableMesh, canHold: true },
    inserted: { mesh: KeyInsertedMesh, canHold: true },
  },
} as ObjectTypeDefinition;
