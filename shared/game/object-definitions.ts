import type { ObjectActionContext, ObjectDefinitions } from "./runtime";

const requiresKey = (keyId: string) => (context: ObjectActionContext) =>
  context.heldItem?.keyId === keyId;
const hasConfiguredItem = (context: ObjectActionContext) =>
  Boolean(context.heldItem?.configured);

export const objectDefinitions: ObjectDefinitions = {
  door: {
    interaction: {
      action: "open_door",
      requiredKey: "SLIDING_DOR_KEY",
      canUse: true,
    },
    reactions: [{ event: "quizz_admin_terminal_done", state: "opened" }],
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
    states: {
      onFloor: { model: "/models/map/door.json" },
      opened: { model: "/models/map/door-opened.json" },
    },
  },
  key: {
    defaultState: "onTable",
    interaction: { action: "none", canGrab: true },
    geometry: {
      isStatic: false,
      isSurface: true,
      surfaceHeight: 0.1,
      countsAsCounter: true,
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
        model: "/models/map/key-grabbed.json",
        scale: [0.45, 0.45, 0.45],
        rotation: [-0.392699, 0, 0],
      },
      onTable: { model: "/models/map/key.json", canHold: true },
      onFloor: { model: "/models/map/key.json", canHold: true },
      inserted: { model: "/models/map/key-inserted.json", canHold: true },
    },
  },
  wall: {
    geometry: { isBarrier: true, isStatic: true },
    editor: {
      label: "Partition wall",
      detail: "Static boundary",
      color: "#94a3b8",
      width: 1.5,
      depth: 1.2,
    },
    states: { onFloor: { model: "/models/map/wall.json" } },
  },
  config_desk: {
    interaction: {
      action: "config",
      canUse: true,
      requiredKey: "ADMIN_KEY",
      emitsEvent: "eventA",
    },
    geometry: {
      isStatic: true,
      isSurface: true,
      surfaceHeight: 1.3,
      countsAsCounter: true,
    },
    holdingSlots: [
      {
        id: "device-surface",
        label: "Device surface",
        accepts: "laptop",
        maxContents: 1,
      },
    ],
    actions: [
      {
        id: "admin-terminal-quiz",
        label: "Use admin terminal",
        blockedMessage: "Admin badge required",
        visibleWhen: (context) =>
          context.asset.useAction === "quiz" && context.state !== "completed",
        canExecute: requiresKey("ADMIN_KEY"),
        execute: (context) =>
          context.openQuiz({
            event: "quizz_admin_terminal_done",
            state: "completed",
            message: "Door opened",
            score: 100,
          }),
      },
      {
        id: "configure",
        label: "Configure device",
        visibleWhen: (context) => context.asset.useAction !== "quiz",
        canExecute: (context) =>
          context.heldItems.some(
            (item) =>
              item.type === context.asset.acceptsDrop && !item.configured,
          ),
        execute: (context) => context.configureContained(),
      },
    ],
    editor: {
      label: "Config station",
      detail: "Configure device",
      color: "#2563eb",
      width: 1.5,
      depth: 1.2,
    },
    states: {
      onFloor: { model: "/models/map/config-desk.json", acceptsDrop: "laptop" },
      inserted: {
        model: "/models/map/config-desk.json",
        acceptsDrop: "laptop",
      },
    },
  },
  office_desk: {
    geometry: {
      isStatic: true,
      isSurface: true,
      surfaceHeight: 1.3,
      countsAsCounter: true,
    },
    holdingSlots: [
      {
        id: "desk-surface",
        label: "Desk surface",
        accepts: "any",
        maxContents: 3,
      },
    ],
    editor: {
      label: "Office desk",
      detail: "Storage surface",
      color: "#64748b",
      width: 1.5,
      depth: 1.2,
    },
    states: {
      onFloor: { model: "/models/map/office-desk.json", acceptsDrop: "any" },
    },
  },
  server_rack: {
    interaction: { action: "config", canUse: true },
    geometry: {
      isStatic: true,
      isSurface: true,
      surfaceHeight: 1.3,
      countsAsCounter: true,
    },
    holdingSlots: [
      {
        id: "server-bay",
        label: "Server bay",
        accepts: "server",
        maxContents: 1,
      },
    ],
    actions: [
      {
        id: "configure",
        label: "Configure server",
        canExecute: (context) =>
          context.heldItems.some(
            (item) =>
              item.type === context.asset.acceptsDrop && !item.configured,
          ),
        execute: (context) => context.configureContained(),
      },
    ],
    editor: {
      label: "Server rack",
      detail: "Configure server",
      color: "#64748b",
      width: 1.5,
      depth: 1.2,
    },
    states: {
      onFloor: { model: "/models/map/server-rack.json", acceptsDrop: "server" },
      inserted: {
        model: "/models/map/server-rack.json",
        acceptsDrop: "server",
      },
    },
  },
  delivery: {
    interaction: { action: "deliver", canUse: true },
    geometry: {
      isStatic: true,
      isSurface: true,
      surfaceHeight: 1.3,
      countsAsCounter: true,
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
    states: {
      onFloor: {
        model: "/models/map/delivery.json",
        acceptsDrop: "configured",
      },
    },
  },
  trash: {
    interaction: { action: "trash", canUse: true },
    geometry: {
      isStatic: true,
      isSurface: true,
      surfaceHeight: 1.3,
      countsAsCounter: true,
    },
    actions: [
      {
        id: "discard",
        label: "Discard held item",
        canExecute: (context) => Boolean(context.heldItem),
        execute: (context) => context.discardHeld(),
      },
    ],
    editor: {
      label: "Recycle bin",
      detail: "Discard item",
      color: "#4b5563",
      width: 1.2,
      depth: 1.2,
    },
    states: {
      onFloor: { model: "/models/map/trash.json", acceptsDrop: "any" },
    },
  },
  riddle: {
    interaction: { action: "quiz", canUse: true },
    geometry: {
      isStatic: true,
      isSurface: true,
      surfaceHeight: 1.3,
      countsAsCounter: true,
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
    states: {
      onFloor: { model: "/models/map/riddle.json" },
      completed: { model: "/models/map/riddle.json" },
    },
  },
  floor: {
    geometry: { isStatic: true, isSurface: true, surfaceHeight: 0.1 },
    states: { onFloor: { model: "/models/map/floor.json" } },
  },
  box_laptop: {
    source: { itemType: "laptop" },
    geometry: {
      isStatic: false,
      canPush: true,
      isSurface: true,
      surfaceHeight: 0.86,
      countsAsCounter: true,
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
        model: "/models/map/box-laptop.json",
        canHold: true,
        canPush: true,
        acceptsDrop: "laptop",
      },
    },
  },
  box_server: {
    source: { itemType: "server" },
    geometry: {
      isStatic: false,
      canPush: true,
      isSurface: true,
      surfaceHeight: 0.86,
      countsAsCounter: true,
    },
    editor: {
      label: "Server box",
      detail: "Pickup source",
      color: "#facc15",
      width: 1.5,
      depth: 1.2,
    },
    states: {
      onFloor: {
        model: "/models/map/box-server.json",
        canHold: true,
        canPush: true,
        acceptsDrop: "server",
      },
    },
  },
  laptop: {
    dropObjectType: "box_laptop",
    configureSound: "type",
    editor: {
      label: "Laptop",
      detail: "Held device",
      color: "#334155",
      width: 1.2,
      depth: 1.2,
    },
    states: {
      grabbed: { model: "/models/laptop/grabbed.json", scale: [1, 1, 1] },
      onFloor: { model: "/models/laptop/on-floor.json", scale: [1, 1, 1] },
      onTable: { model: "/models/laptop/on-table.json", scale: [1, 1, 1] },
      configured: {
        configured: true,
        model: "/models/laptop/configured.json",
        scale: [1, 1, 1],
      },
    },
  },
  server: {
    dropObjectType: "box_server",
    heldOffset: [0, 0, 0.4],
    configureSound: "process",
    editor: {
      label: "Server",
      detail: "Held device",
      color: "#334155",
      width: 1.2,
      depth: 1.2,
    },
    states: {
      grabbed: { model: "/models/server/grabbed.json", scale: [1, 1, 1] },
      onFloor: { model: "/models/server/on-floor.json", scale: [1, 1, 1] },
      onTable: { model: "/models/server/on-table.json", scale: [1, 1, 1] },
      configured: {
        configured: true,
        model: "/models/server/configured.json",
        scale: [1, 1, 1],
      },
    },
  },
};
