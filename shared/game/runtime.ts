import * as THREE from "three";
import { objectDefinitions } from "./object-definitions";
import type { GameObjectInstance, HoldingSlot } from "./types";

export type ObjectVisualState =
  | "grabbed"
  | "onFloor"
  | "onTable"
  | "configured"
  | "inserted"
  | "opened"
  | "completed";

export interface ObjectDefinition {
  configured?: boolean;
  color?: string;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  mesh?: object;
  canHold?: boolean;
  canPush?: boolean;
  acceptsDrop?: string;
}

export interface ObjectReaction {
  event: string;
  state: ObjectVisualState;
}

export interface ObjectQuizSuccess {
  event?: string;
  state?: ObjectVisualState;
  message?: string;
  score?: number;
}

export interface ObjectActionContext {
  asset: GameObjectInstance;
  state: ObjectVisualState;
  heldItem: { type: string; keyId?: string; configured?: boolean } | null;
  emitEvent: (event: string) => void;
  setState: (state: ObjectVisualState) => Promise<void>;
  configureContained: () => Promise<boolean>;
  openQuiz: (success?: ObjectQuizSuccess) => void;
  showMessage: (message: string) => void;
  discardHeld: () => void;
  deliverHeld: () => void;
  addScore: (amount: number) => void;
}

export interface ObjectActionDefinition {
  id: string;
  label: string;
  blockedMessage?: string;
  visibleWhen?: (context: ObjectActionContext) => boolean;
  canExecute?: (context: ObjectActionContext) => boolean;
  execute: (context: ObjectActionContext) => void | Promise<void>;
}

export type ObjectAction =
  | "none"
  | "config"
  | "quiz"
  | "deliver"
  | "trash"
  | "open_door";

export interface ObjectTypeDefinition {
  states: Partial<Record<ObjectVisualState, ObjectDefinition>>;
  defaultState?: ObjectVisualState;
  holdingSlots?: HoldingSlot[];
  interaction?: {
    action?: ObjectAction;
    requiredKey?: string;
    canGrab?: boolean;
    canUse?: boolean;
    emitsEvent?: string;
  };
  reactions?: ObjectReaction[];
  actions?: ObjectActionDefinition[];
  geometry?: {
    isBarrier?: boolean;
    isStatic?: boolean;
    canPush?: boolean;
    isSurface?: boolean;
    surfaceHeight?: number;
  };
  source?: { itemType: string };
  dropObjectType?: string;
  heldOffset?: [number, number, number];
  configureSound?: "type" | "process";
  editor?: {
    label: string;
    detail: string;
    color: string;
    width: number;
    depth: number;
    enabled?: boolean;
  };
}

export type ObjectDefinitions = Record<string, ObjectTypeDefinition>;

const objectModelCache = new Map<string, THREE.Object3D>();
const objectModelLoader = new THREE.ObjectLoader();
const objectActionRegistry = new Map<string, ObjectActionDefinition>();

export async function loadObjectDefinitions() {
  return objectDefinitions;
}

export function getObjectDefinitions() {
  return objectDefinitions;
}

export async function loadObjectModel(type: string, state: ObjectVisualState) {
  const definition = getObjectDefinition(type, state);
  if (!definition?.mesh) return null;
  const model = objectModelLoader.parse(
    definition.mesh as Parameters<typeof objectModelLoader.parse>[0],
  );
  return model.clone(true);
}

export function getObjectTypeDefinition(type: string) {
  return objectDefinitions[type];
}

export function getObjectDefinition(
  type: string,
  state: ObjectVisualState,
): ObjectDefinition | undefined {
  return (
    objectDefinitions[type]?.states[state] ||
    objectDefinitions[type]?.states.grabbed
  );
}

export function getObjectInteraction(type: string) {
  return objectDefinitions[type]?.interaction;
}

export function registerObjectAction(action: ObjectActionDefinition) {
  objectActionRegistry.set(action.id, action);
}

export function getObjectActions(type: string, actionIds?: string[]) {
  const actions = objectDefinitions[type]?.actions || [];
  if (!actionIds) return actions;
  return actionIds.flatMap(
    (id) =>
      actions.find((action) => action.id === id) ||
      objectActionRegistry.get(id) ||
      [],
  );
}

export function getObjectGeometry(type: string) {
  return objectDefinitions[type]?.geometry;
}

export class SoundFX {
  private context: AudioContext | null = null;

  private init() {
    if (typeof window === "undefined" || this.context) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) this.context = new AudioContextClass();
  }

  private playTone(
    frequency: number,
    type: OscillatorType,
    duration: number,
    volume = 0.1,
  ) {
    if (!this.context) return;
    try {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration);
    } catch {
      /* Audio is optional. */
    }
  }

  play(
    effect:
      | "type"
      | "process"
      | "pickup"
      | "drop"
      | "unlock"
      | "deliver"
      | "riddle_success"
      | "dash",
  ) {
    this.init();
    if (effect === "type") {
      this.playTone(800, "square", 0.05, 0.05);
      setTimeout(() => this.playTone(850, "square", 0.05, 0.05), 50);
    } else if (effect === "process") {
      this.playTone(150, "sawtooth", 0.1, 0.08);
      setTimeout(() => this.playTone(200, "sawtooth", 0.1, 0.08), 100);
    } else if (effect === "pickup") this.playTone(600, "sine", 0.1, 0.15);
    else if (effect === "drop") this.playTone(300, "triangle", 0.1, 0.15);
    else if (effect === "unlock") {
      this.playTone(800, "sine", 0.1, 0.1);
      setTimeout(() => this.playTone(1200, "sine", 0.15, 0.15), 100);
    } else if (effect === "deliver") {
      this.playTone(523.25, "sine", 0.1, 0.2);
      setTimeout(() => this.playTone(659.25, "sine", 0.1, 0.2), 100);
      setTimeout(() => this.playTone(783.99, "sine", 0.2, 0.2), 200);
    } else if (effect === "riddle_success") {
      this.playTone(440, "triangle", 0.1, 0.2);
      setTimeout(() => this.playTone(880, "sine", 0.25, 0.2), 120);
    } else this.playTone(200, "sawtooth", 0.1, 0.12);
  }
}

export class PhysicalBody {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  isStatic: boolean;
  canPush: boolean;
  assetId: string | null;
  mesh: THREE.Object3D | null;

  constructor(params: {
    x?: number;
    y?: number;
    z?: number;
    width?: number;
    depth?: number;
    isStatic?: boolean;
    canPush?: boolean;
    assetId?: string;
    mesh?: THREE.Object3D | null;
  }) {
    this.x = params.x || 0;
    this.y = params.y || 0;
    this.z = params.z || 0;
    this.width = params.width || 1;
    this.depth = params.depth || 1;
    this.isStatic = params.isStatic || false;
    this.canPush = params.canPush || false;
    this.assetId = params.assetId || null;
    this.mesh = params.mesh || null;
  }

  getAABB() {
    return {
      minX: this.x - this.width / 2,
      maxX: this.x + this.width / 2,
      minZ: this.z - this.depth / 2,
      maxZ: this.z + this.depth / 2,
    };
  }
}

export class PhysicsWorld {
  readonly bodies: PhysicalBody[] = [];

  addBody(body: PhysicalBody) {
    this.bodies.push(body);
    return body;
  }

  checkAABBCollision(first: PhysicalBody, second: PhysicalBody) {
    const a = first.getAABB();
    const b = second.getAABB();
    return (
      a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
    );
  }

  moveBodyWithSlide(body: PhysicalBody, deltaX: number, deltaZ: number) {
    if (body.isStatic) return false;
    const horizontal = this.moveBodyAlongAxis(body, deltaX, "x");
    const vertical = this.moveBodyAlongAxis(body, deltaZ, "z");
    return horizontal.pushed || vertical.pushed;
  }

  private moveBodyAlongAxis(
    body: PhysicalBody,
    delta: number,
    axis: "x" | "z",
    moving = new Set<PhysicalBody>(),
  ): { moved: boolean; pushed: boolean } {
    if (!delta || body.isStatic || moving.has(body))
      return { moved: false, pushed: false };
    moving.add(body);
    const start = body[axis];
    body[axis] += delta;
    const collisions = this.bodies.filter(
      (other) =>
        other !== body &&
        !moving.has(other) &&
        this.checkAABBCollision(body, other),
    );
    let pushedBody = false;
    let blocked = false;
    for (const other of collisions) {
      if (other.canPush && !other.isStatic) {
        const otherStart = other[axis];
        const result = this.moveBodyAlongAxis(other, delta, axis, moving);
        pushedBody = result.moved || pushedBody;
        if (!result.moved || Math.abs(other[axis] - otherStart - delta) > 0.001)
          blocked = true;
      } else {
        blocked = true;
      }
    }
    if (blocked) {
      for (const other of collisions) {
        const extent = axis === "x" ? other.width : other.depth;
        const bodyExtent = axis === "x" ? body.width : body.depth;
        body[axis] =
          delta > 0
            ? other[axis] - extent / 2 - bodyExtent / 2 - 0.001
            : other[axis] + extent / 2 + bodyExtent / 2 + 0.001;
      }
    }
    moving.delete(body);
    if (body.mesh) body.mesh.position[axis] = body[axis];
    return { moved: Math.abs(body[axis] - start) > 0.001, pushed: pushedBody };
  }
}

export class GameItem {
  isConfigured = false;
  mesh: THREE.Group = new THREE.Group();

  constructor(public readonly type: string) {
    void this.createMeshFromAsset();
  }

  async createMeshFromAsset(
    state: ObjectVisualState = this.isConfigured ? "configured" : "grabbed",
  ) {
    const model = await loadObjectModel(this.type, state);
    const group = new THREE.Group();
    if (model) group.add(model);
    const definition = getObjectDefinition(this.type, state);
    if (definition?.scale) group.scale.fromArray(definition.scale);
    if (definition?.rotation) group.rotation.fromArray(definition.rotation);
    this.mesh = group;
    return group;
  }
}

export function createCourierAvatarMesh(shirtColorHex: number) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xfde047 });
  const clothes = new THREE.MeshStandardMaterial({
    color: shirtColorHex,
    roughness: 0.4,
  });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x111827 });

  for (const [name, x, side] of [
    ["leftLeg", -0.16, -1],
    ["rightLeg", 0.16, 1],
  ] as const) {
    const leg = new THREE.Group();
    leg.name = name;
    leg.position.set(x, 0.3, 0);
    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.35, 12),
      pants,
    );
    legMesh.position.y = -0.175;
    leg.add(legMesh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), shoes);
    shoe.position.set(0, -0.35, 0.05);
    leg.add(shoe);
    group.add(leg);
    void side;
  }

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.35, 0.55, 16),
    clothes,
  );
  body.position.y = 0.65;
  group.add(body);
  for (const [name, x] of [
    ["leftArm", -0.42],
    ["rightArm", 0.42],
  ] as const) {
    const arm = new THREE.Group();
    arm.name = name;
    arm.position.set(x, 0.85, 0);
    const armMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.07, 0.4, 10),
      clothes,
    );
    armMesh.position.y = -0.2;
    arm.add(armMesh);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), skin);
    hand.position.y = -0.42;
    arm.add(hand);
    group.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16), skin);
  head.position.y = 1.12;
  group.add(head);
  const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (const sign of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      eyeWhite,
    );
    eye.position.set(sign * 0.11, 1.16, 0.29);
    group.add(eye);
    const eyePupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      pupil,
    );
    eyePupil.position.set(sign * 0.11, 1.16, 0.34);
    group.add(eyePupil);
  }
  const capColor = shirtColorHex === 0xffcc00 ? 0xd40511 : 0xffcc00;
  const cap = new THREE.MeshStandardMaterial({ color: capColor });
  const capBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.15, 16),
    cap,
  );
  capBase.position.y = 1.4;
  group.add(capBase);
  const capTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    cap,
  );
  capTop.position.y = 1.47;
  group.add(capTop);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), cap);
  brim.position.set(0, 1.35, 0.25);
  group.add(brim);
  const holdingSlot = new THREE.Group();
  holdingSlot.name = "holdingSlot";
  holdingSlot.position.set(0, 0.9, 0.5);
  group.add(holdingSlot);
  return group;
}

export function updatePlayerAnimation(
  player: THREE.Group | null,
  isMoving: boolean,
  isHolding: boolean,
  walkCycle: { value: number },
) {
  if (!player) return;
  const leftLeg = player.getObjectByName("leftLeg");
  const rightLeg = player.getObjectByName("rightLeg");
  const leftArm = player.getObjectByName("leftArm");
  const rightArm = player.getObjectByName("rightArm");
  if (isMoving) {
    walkCycle.value += 0.25;
    const swing = Math.sin(walkCycle.value) * 0.55;
    if (leftLeg) leftLeg.rotation.x = swing;
    if (rightLeg) rightLeg.rotation.x = -swing;
    if (!isHolding) {
      if (leftArm) leftArm.rotation.x = -swing * 0.7;
      if (rightArm) rightArm.rotation.x = swing * 0.7;
    }
  } else {
    walkCycle.value = 0;
    if (leftLeg)
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.2);
    if (rightLeg)
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.2);
  }
  if (isHolding) {
    if (leftArm) {
      leftArm.rotation.x = THREE.MathUtils.lerp(
        leftArm.rotation.x,
        -Math.PI / 2.2,
        0.2,
      );
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.15, 0.2);
    }
    if (rightArm) {
      rightArm.rotation.x = THREE.MathUtils.lerp(
        rightArm.rotation.x,
        -Math.PI / 2.2,
        0.2,
      );
      rightArm.rotation.z = THREE.MathUtils.lerp(
        rightArm.rotation.z,
        -0.15,
        0.2,
      );
    }
  } else if (!isMoving) {
    if (leftArm) {
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.2);
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, 0.2);
    }
    if (rightArm) {
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.2);
      rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0, 0.2);
    }
  }
}

export function getRotatedAABBSize(
  width: number,
  depth: number,
  rotation: number,
) {
  const angle = THREE.MathUtils.degToRad(rotation);
  const cosine = Math.abs(Math.cos(angle));
  const sine = Math.abs(Math.sin(angle));
  return {
    width: width * cosine + depth * sine,
    depth: width * sine + depth * cosine,
  };
}

export function initPlayers(
  scene: THREE.Scene,
  physics: PhysicsWorld,
  spawn = { x: 0, z: 2 },
) {
  const player = createCourierAvatarMesh(0xffcc00);
  player.position.set(spawn.x, 0, spawn.z);
  scene.add(player);
  const body = physics.addBody(
    new PhysicalBody({
      x: spawn.x,
      y: 0,
      z: spawn.z,
      width: 0.8,
      depth: 0.8,
      mesh: player,
    }),
  );
  return { player, playerBody: body };
}

export async function loadMapObjectModel(
  asset: GameObjectInstance,
  state?: ObjectVisualState,
): Promise<THREE.Group | null> {
  const visualState =
    state || getObjectTypeDefinition(asset.type)?.defaultState || "onFloor";
  const definition = getObjectDefinition(asset.type, visualState);
  if (!definition?.mesh) return null;
  const model = objectModelLoader.parse(
    definition.mesh as Parameters<typeof objectModelLoader.parse>[0],
  );
  model.scale.set(asset.w, 1, asset.d);
  model.userData.canGrab = Boolean(asset.allowGrab);
  model.userData.dropRule = asset.dropRule || asset.acceptsDrop || "none";
  model.userData.assetType = asset.type;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      if ("color" in material) material.color.set(asset.color);
      material.needsUpdate = true;
    });
  });
  if (!(model instanceof THREE.Group))
    throw new Error(`Map asset ${asset.type} must have a Group root`);
  return model;
}
