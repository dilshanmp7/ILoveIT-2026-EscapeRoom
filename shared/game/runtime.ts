import * as THREE from "three";
import { objectDefinitions } from "./object-definitions";
import type {
  GameObjectInstance,
  GameObjectRecord,
  GameObjectVisualStateDefinition,
  ObjectActionContext,
  ObjectActionDefinition,
  ObjectEventContext,
  ObjectReaction,
  ObjectTypeDefinition,
  ObjectVisualStateType,
  Player,
  SoundEffect,
} from "./types";

const objectModelLoader = new THREE.ObjectLoader();

export function createMaterial(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
}

export async function loadObjectDefinitions() {
  return objectDefinitions;
}

export function getObjectDefinitions() {
  return objectDefinitions;
}

export async function loadObjectModel(
  type: string,
  state: ObjectVisualStateType,
) {
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
  state: ObjectVisualStateType,
): GameObjectVisualStateDefinition | undefined {
  return (
    objectDefinitions[type]?.visualStates[state] ||
    objectDefinitions[type]?.visualStates.grabbed
  );
}

export class GameObject implements GameObjectInstance {
  readonly id: string;
  readonly type: string;
  position: GameObjectRecord["position"];
  w: number;
  d: number;
  color?: number;
  label: string;
  canPush?: boolean;
  allowGrab?: boolean;
  canHold?: boolean;
  keyId?: string;
  requiredKeyIds?: string[];
  isOpen?: boolean;
  useRequiredKey?: string;
  actionIds?: string[];
  holdingSlots: NonNullable<ObjectTypeDefinition["holdingSlots"]>;
  reactions: Record<string, ObjectReaction>;
  actions: Record<string, ObjectActionDefinition>;
  state: ObjectVisualStateType;
  mesh: THREE.Group | null = null;
  heldItem: GameObjectInstance | null = null;
  configured?: boolean;
  dragAssetId?: string;
  private readonly definition: ObjectTypeDefinition;

  constructor(
    record: GameObjectRecord,
    definition = getObjectTypeDefinition(record.type),
  ) {
    if (!definition)
      throw new Error(`Unknown game object type: ${record.type}`);
    this.definition = definition;
    this.id = record.id;
    this.type = record.type;
    this.position = { ...record.position };
    this.w = record.w;
    this.d = record.d;
    this.color = record.color;
    this.label = record.label;
    this.canHold = record.canHold;
    this.canPush = record.canPush;
    this.allowGrab = record.allowGrab;
    this.keyId = record.keyId;
    this.requiredKeyIds = record.requiredKeyIds
      ? [...record.requiredKeyIds]
      : undefined;
    this.isOpen = record.isOpen;
    this.useRequiredKey = record.useRequiredKey;
    this.actionIds = record.actionIds ? [...record.actionIds] : undefined;
    this.holdingSlots = (
      record.holdingSlots ||
      definition.holdingSlots ||
      []
    ).map((slot) => ({ ...slot }));
    this.reactions = { ...(definition.reactions || {}) };
    this.actions = Object.fromEntries(
      (definition.actions || []).map((action) => [action.id, action]),
    );
    this.state = record.isOpen ? "opened" : "onFloor";
  }

  canBePushed() {
    return (
      this.canPush ??
      this.definition.canBePushed?.() ??
      Boolean(this.definition.geometry?.canPush)
    );
  }

  canBeDragged() {
    return (
      this.definition.canBeDragged?.() ??
      Boolean(this.definition.geometry?.canDrag)
    );
  }

  canBeGrabbed() {
    return (
      this.allowGrab ??
      Boolean(
        this.definition.interaction?.canGrab ||
        this.definition.interactions?.canGrab,
      )
    );
  }

  hasInteraction() {
    return Boolean(
      this.definition.interaction ||
      this.definition.interactions ||
      this.definition.source?.itemType ||
      this.canHold ||
      this.canBeGrabbed(),
    );
  }

  isBarrier() {
    return Boolean(this.definition.geometry?.isBarrier);
  }

  getSurfaceHeight() {
    return this.definition.geometry?.surfaceHeight ?? 0.1;
  }

  getSourceType() {
    return this.definition.source?.itemType;
  }

  getHeldOffset() {
    return this.visualState.heldOffset || [0, 0, 0];
  }

  getAvailableActions(context: ObjectActionContext) {
    const configuredActions = this.actionIds
      ? Object.values(this.actions).filter((action) =>
          this.actionIds?.includes(action.id),
        )
      : Object.values(this.actions);
    const actions = configuredActions.filter(
      (action) => !action.isVisible || action.isVisible(context),
    );
    if (context.heldItem && this.canAccept(context.heldItem)) {
      actions.push({
        id: "drop",
        label: "Place held item",
        canExecute: (actionContext) => this.canAccept(actionContext.heldItem!),
        execute: async (actionContext) => {
          await actionContext.acceptHeldItem();
        },
        configureSound: "drop",
      });
    }
    return actions;
  }

  react(context: ObjectEventContext) {
    return this.reactions[context.event]?.(context);
  }

  canAccept(item: GameObjectInstance) {
    return this.getHoldingSlot(item) !== undefined;
  }

  getHoldingSlot(item: GameObjectInstance) {
    const contents = this.heldItem ? [this.heldItem] : [];
    return this.holdingSlots.find((slot) => {
      if (slot.maxContents !== undefined && contents.length >= slot.maxContents)
        return false;
      if (slot.accepts === "any") return true;
      if (slot.accepts === "configured") return item.configured === true;
      return slot.accepts === item.type;
    });
  }

  async loadMesh(state: ObjectVisualStateType = this.state) {
    const model = await loadObjectModel(this.type, state);
    const group = new THREE.Group();
    if (model) group.add(model);
    const definition = getObjectDefinition(this.type, state);
    if (definition?.scale) group.scale.fromArray(definition.scale);
    if (definition?.rotation) group.rotation.fromArray(definition.rotation);
    this.mesh = group;
    return group;
  }

  get visualState() {
    return (
      this.definition.visualStates[this.state] ||
      this.definition.visualStates.onFloor ||
      {}
    );
  }

  toRecord(): GameObjectRecord {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      w: this.w,
      d: this.d,
      color: this.color,
      label: this.label,
      canHold: this.canHold,
      canPush: this.canPush,
      allowGrab: this.allowGrab,
      keyId: this.keyId,
      requiredKeyIds: this.requiredKeyIds
        ? [...this.requiredKeyIds]
        : undefined,
      isOpen: this.state === "opened" ? true : this.isOpen,
      useRequiredKey: this.useRequiredKey,
      actionIds: this.actionIds ? [...this.actionIds] : undefined,
      holdingSlots: this.holdingSlots.map((slot) => ({ ...slot })),
    };
  }
}

export function hydrateGameObject(record: GameObjectRecord) {
  return new GameObject(record);
}

export function serializeGameObject(
  instance: GameObjectInstance,
): GameObjectRecord {
  return instance instanceof GameObject
    ? instance.toRecord()
    : {
        id: instance.id,
        type: instance.type,
        position: { ...instance.position },
        w: instance.w,
        d: instance.d,
        color: instance.color,
        label: instance.label,
        canHold: instance.canHold,
        canPush: instance.canPush,
        allowGrab: instance.allowGrab,
        keyId: instance.keyId,
        requiredKeyIds: instance.requiredKeyIds,
        isOpen: instance.state === "opened" || instance.isOpen,
        useRequiredKey: instance.useRequiredKey,
        actionIds: instance.actionIds,
        holdingSlots: instance.holdingSlots,
      };
}

export function getObjectActions(type: string, actionIds?: string[]) {
  const actions = getObjectTypeDefinition(type)?.actions || [];
  return actionIds
    ? actions.filter((action) => actionIds.includes(action.id))
    : actions;
}

export function getObjectGeometry(type: string) {
  return getObjectTypeDefinition(type)?.geometry;
}

export function getObjectInteraction(type: string) {
  const definition = getObjectTypeDefinition(type);
  return definition?.interaction || definition?.interactions;
}

export class SoundFX {
  private context: AudioContext | null = null;

  private init() {
    if (typeof window === "undefined" || this.context) return;
    this.context = new AudioContext();
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
      // Audio is optional.
    }
  }

  play(effect: SoundEffect) {
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
    } else if (effect === "bump") {
      this.playTone(160, "sawtooth", 0.08, 0.12);
      setTimeout(() => this.playTone(100, "triangle", 0.08, 0.1), 30);
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

export class GamePhysics {
  readonly bodies: PhysicalBody[] = [];

  constructor(public readonly world = new PhysicsWorld()) {}

  addObjectBody(params: ConstructorParameters<typeof PhysicalBody>[0]) {
    const body = this.world.addBody(new PhysicalBody(params));
    this.bodies.push(body);
    return body;
  }

  removeObjectBody(assetId: string) {
    const index = this.bodies.findIndex((body) => body.assetId === assetId);
    if (index === -1) return;
    const body = this.bodies[index]!;
    const worldIndex = this.world.bodies.indexOf(body);
    if (worldIndex !== -1) this.world.bodies.splice(worldIndex, 1);
    this.bodies.splice(index, 1);
  }

  syncObjectPositions(layout: GameObjectRecord[]) {
    for (const body of this.bodies) {
      if (!body.assetId) continue;
      const asset = layout.find((item) => item.id === body.assetId);
      if (!asset) continue;
      asset.position.x = body.x;
      asset.position.z = body.z;
    }
  }

  dragBodyToPlayer(body: PhysicalBody, player: Player) {
    body.x = player.mesh.position.x;
    body.z = player.mesh.position.z;
    if (body.mesh) body.mesh.position.set(body.x, body.mesh.position.y, body.z);
  }

  movePlayer(player: Player, x: number, z: number, speed: number) {
    const length = Math.hypot(x, z);
    if (!length) return false;
    return this.world.moveBodyWithSlide(
      player.body,
      (x / length) * speed,
      (z / length) * speed,
    );
  }

  movePlayerWithInput(player: Player, x: number, z: number, speed: number) {
    if (!x && !z) return false;
    const moved = this.movePlayer(player, x, z, speed);
    this.facePlayer(player, x, z);
    return moved;
  }

  dash(player: Player, distance: number) {
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      player.mesh.rotation.y,
    );
    return this.world.moveBodyWithSlide(
      player.body,
      direction.x * distance,
      direction.z * distance,
    );
  }

  facePlayer(player: Player, x: number, z: number) {
    player.mesh.rotation.y = Math.atan2(x, z);
  }

  findNearby(
    player: Player,
    objects: Iterable<GameObjectInstance>,
    distance = 2.2,
  ) {
    let closest: GameObjectInstance | null = null;
    for (const object of objects) {
      if (!object.mesh || !object.hasInteraction()) continue;
      const nextDistance = Math.hypot(
        player.mesh.position.x - object.position.x,
        player.mesh.position.z - object.position.z,
      );
      if (nextDistance < distance) {
        distance = nextDistance;
        closest = object;
      }
    }
    return closest;
  }
}

export class GameItem {
  isConfigured = false;
  mesh: THREE.Group = new THREE.Group();

  constructor(public readonly type: string) {
    void this.createMeshFromAsset();
  }

  async createMeshFromAsset(
    state: ObjectVisualStateType = this.isConfigured ? "configured" : "grabbed",
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

let cachedDhlLogoTexture: THREE.CanvasTexture | null = null;

export function getDhlLogoTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (cachedDhlLogoTexture) return cachedDhlLogoTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Official DHL Brand Yellow background
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const red = "#d40511";

  // Red border frame with rounded corners
  ctx.lineWidth = 14;
  ctx.strokeStyle = red;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 24);
  } else {
    ctx.rect(10, 10, canvas.width - 20, canvas.height - 20);
  }
  ctx.stroke();

  // Draw slanted DHL elements (forward lean)
  ctx.save();
  ctx.translate(256, 128);
  ctx.transform(1, 0, -0.26, 1, 0, 0);

  // Red horizontal speed lines flanking DHL
  ctx.fillStyle = red;
  const stripeH = 15;
  const stripeYs = [-38, 0, 38];
  for (const sy of stripeYs) {
    // Left speed bars
    ctx.fillRect(-205, sy - stripeH / 2, 60, stripeH);
    // Right speed bars
    ctx.fillRect(145, sy - stripeH / 2, 60, stripeH);
  }

  // Bold DHL Lettering
  ctx.font = "900 125px 'Arial Black', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = red;
  ctx.fillText("DHL", 0, 2);

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  cachedDhlLogoTexture = texture;
  return texture;
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

  // Official DHL Chest Logo Badge
  const logoTexture = getDhlLogoTexture();
  if (logoTexture) {
    const logoMaterial = new THREE.MeshStandardMaterial({
      map: logoTexture,
      roughness: 0.35,
      metalness: 0.05,
    });
    // Curved cylinder patch hugging the front upper torso
    const chestGeo = new THREE.CylinderGeometry(
      0.328,
      0.342,
      0.13,
      16,
      1,
      true,
      -0.42,
      0.84,
    );
    const chestLogo = new THREE.Mesh(chestGeo, logoMaterial);
    chestLogo.name = "dhlChestLogo";
    chestLogo.position.set(0, 0.72, 0);
    group.add(chestLogo);
  }
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
  player: Player | null,
  isMoving: boolean,
  isHolding: boolean,
  walkCycle: { value: number },
) {
  if (!player) return;
  const leftLeg = player.mesh.getObjectByName("leftLeg");
  const rightLeg = player.mesh.getObjectByName("rightLeg");
  const leftArm = player.mesh.getObjectByName("leftArm");
  const rightArm = player.mesh.getObjectByName("rightArm");
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

export function initPlayer(
  scene: THREE.Scene,
  physics: PhysicsWorld,
  spawn = { x: 0, z: 2 },
): Player {
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
  return { mesh: player, body };
}

export async function loadMapObjectModel(
  asset: GameObjectInstance,
  state?: ObjectVisualStateType,
): Promise<THREE.Group | null> {
  const visualState = state || "onFloor";
  const definition = getObjectDefinition(asset.type, visualState);
  if (!definition?.mesh) return null;
  const model = objectModelLoader.parse(
    definition.mesh as Parameters<typeof objectModelLoader.parse>[0],
  );
  model.scale.set(asset.w, 1, asset.d);
  model.userData.canGrab = Boolean(asset.canBeGrabbed);
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
