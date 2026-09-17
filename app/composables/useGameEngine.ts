import {
  createMaterial,
  GamePhysics,
  getObjectTypeDefinition,
  getRotatedAABBSize,
  hydrateGameObject,
  initPlayer,
  loadMapObjectModel,
  loadObjectDefinitions,
  PhysicalBody,
  serializeGameObject,
  SoundFX,
  updatePlayerAnimation,
} from "#shared/game/runtime";
import type {
  EventType,
  Floorplan,
  GameObjectInstance,
  ObjectActionContext,
  ObjectActionDefinition,
  ObjectEventContext,
  ObjectQuizSuccess,
  ObjectVisualStateType,
  Player,
  QuizQuestion,
} from "#shared/game/types";
import * as THREE from "three";
import { reactive, readonly, shallowRef } from "vue";

function createObjectId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const initialState = () => ({
  score: 0,
  runningTime: 0,
  nearbyLabel: "",
  nearbyId: "",
  holding: "",
  holdingConfigured: false,
  canGrab: false,
  canUse: false,
  quiz: null as QuizQuestion | null,
  quizOpen: false,
  finished: false,
  objectSelectionOpen: false,
  objectSelectionOptions: [] as { id: string; label: string; type: string }[],
  actionSelectionOpen: false,
  actionSelectionOptions: [] as { id: string; label: string; type: string }[],
  message: "",
});

export function useGameEngine() {
  const state = reactive(initialState());
  const canvas = shallowRef<HTMLCanvasElement | null>(null);
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let player: Player | null = null;
  let physics = new GamePhysics();
  const sound = new SoundFX();
  const walkCycle = { value: 0 };
  let animationFrame = 0;
  let timerId: ReturnType<typeof setInterval> | undefined;
  let lastFrame = 0;
  let heldItem: GameObjectInstance | null = null;
  let pendingQuizSuccess: ObjectQuizSuccess | undefined;
  let pendingQuizAssetId = "";
  let isPushing = false;
  let nearby: GameObjectInstance | null = null;
  let floorplan: Floorplan = { layout: [], playerSpawn: { x: 0, z: 2 } };
  let quizzes: QuizQuestion[] = [];
  let joystick = { x: 0, y: 0 };
  let removeListeners: (() => void) | undefined;

  const keys = new Set<string>();
  const objectInstances = new Map<string, GameObjectInstance>();
  const bodies: PhysicalBody[] = physics.bodies;
  const occludableMeshes: THREE.Group[] = [];
  const occlusionRaycaster = new THREE.Raycaster();

  async function buildFloorplan() {
    if (!scene) return;
    const previousInstances = new Map(objectInstances);
    objectInstances.clear();
    bodies.splice(0);
    occludableMeshes.splice(0);
    physics = new GamePhysics();
    for (const child of [...scene.children]) {
      if (child.userData.courierAsset) scene.remove(child);
    }

    for (const record of floorplan.layout.map((item) => ({ ...item }))) {
      const asset = hydrateGameObject(record);
      const previous = previousInstances.get(asset.id);
      const instance = asset;
      instance.state = previous?.state || (asset.isOpen ? "opened" : "onFloor");
      instance.mesh = null;
      instance.heldItem = previous?.heldItem || null;
      objectInstances.set(asset.id, instance);
      const mesh = await loadMapObjectModel(instance, instance.state);
      instance.mesh = mesh;
      if (mesh) {
        mesh.position.set(asset.position.x, 0, asset.position.z);
        mesh.rotation.y = THREE.MathUtils.degToRad(asset.position.rotation);
        mesh.userData.courierAsset = true;
        scene.add(mesh);
        occludableMeshes.push(mesh);
      }
      if (!(instance.isBarrier() && instance.state === "opened")) {
        const size = getRotatedAABBSize(
          asset.w,
          asset.d,
          asset.position.rotation,
        );
        bodies.push(
          physics.world.addBody(
            new PhysicalBody({
              assetId: asset.id,
              x: asset.position.x,
              y: 0,
              z: asset.position.z,
              width: size.width,
              depth: size.depth,
              isStatic: !instance.canBePushed() && !instance.canBeDragged(),
              canPush: instance.canBePushed(),
              mesh,
            }),
          ),
        );
      }
    }
  }

  function persistPhysicsPositions() {
    for (const body of bodies) {
      if (!body.assetId) continue;
      const asset = floorplan.layout.find((item) => item.id === body.assetId);
      if (!asset) continue;
      asset.position.x = body.x;
      asset.position.z = body.z;
    }
  }

  function getNearby() {
    if (!player) return null;
    return physics.findNearby(player, objectInstances.values());
  }

  function removeBodyForAsset(assetId: string) {
    const bodyIndex = bodies.findIndex((body) => body.assetId === assetId);
    if (bodyIndex === -1) return;
    const body = bodies[bodyIndex];
    if (!body) return;
    const physicsBodyIndex = physics.world.bodies.indexOf(body);
    if (physicsBodyIndex !== -1)
      physics.world.bodies.splice(physicsBodyIndex, 1);
    bodies.splice(bodyIndex, 1);
  }

  async function setObjectState(
    assetId: string,
    nextState: ObjectVisualStateType,
  ) {
    const instance = objectInstances.get(assetId);
    if (!instance || instance.state === nextState) return;
    const previousMesh = instance.mesh;
    instance.state = nextState;
    const nextMesh = await loadMapObjectModel(instance, nextState);
    instance.mesh = nextMesh;
    if (previousMesh) {
      if (scene) scene.remove(previousMesh);
      const previousIndex = occludableMeshes.indexOf(previousMesh);
      if (previousIndex !== -1) occludableMeshes.splice(previousIndex, 1);
    }
    if (nextMesh && scene) {
      nextMesh.position.set(instance.position.x, 0, instance.position.z);
      nextMesh.rotation.y = THREE.MathUtils.degToRad(
        instance.position.rotation,
      );
      nextMesh.userData.courierAsset = true;
      scene.add(nextMesh);
      occludableMeshes.push(nextMesh);
    }
    if (instance.isBarrier() && nextState === "opened")
      removeBodyForAsset(assetId);
  }

  function emitGameEvent(event: EventType, emitter: GameObjectInstance) {
    const gameState = {
      objects: [...objectInstances.values()].map(serializeGameObject),
      score: state.score,
    } satisfies ObjectEventContext["game"];
    for (const instance of objectInstances.values()) {
      const reactionState = instance.react({
        event,
        emitter,
        emitterState: emitter.state,
        game: gameState,
      });
      if (reactionState) void setObjectState(instance.id, reactionState);
    }
  }

  function updateMovement(delta: number) {
    if (!player) return false;
    let x = 0;
    let z = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (joystick.x || joystick.y) {
      x = joystick.x;
      z = joystick.y;
    }
    if (!x && !z) return false;
    const length = Math.hypot(x, z);
    const speed = 0.12;
    const nextX = player.mesh.position.x + (x / length) * speed;
    const nextZ = player.mesh.position.z + (z / length) * speed;
    isPushing = player.body
      ? physics.movePlayer(
          player,
          nextX - player.mesh.position.x,
          nextZ - player.mesh.position.z,
          speed,
        )
      : false;
    if (heldItem?.dragAssetId) {
      const draggedBody = bodies.find(
        (body) => body.assetId === heldItem?.dragAssetId,
      );
      if (draggedBody) {
        draggedBody.x = player.mesh.position.x;
        draggedBody.z = player.mesh.position.z;
      }
    }
    persistPhysicsPositions();
    player.mesh.rotation.y = Math.atan2(x, z);
    return true;
  }

  function updateNearby() {
    nearby = getNearby();
    state.nearbyId = nearby?.id || "";
    state.nearbyLabel = nearby?.label || "";
    state.canGrab = Boolean(
      !heldItem &&
      (nearby?.canHold || nearby?.canBeGrabbed || nearby?.heldItem),
    );
    state.canUse = getAvailableActions().length > 0;
  }

  function getAvailableActions(): ObjectActionDefinition[] {
    if (!nearby) return [];
    return nearby.getAvailableActions(createActionContext());
  }

  function createActionContext(): ObjectActionContext {
    return {
      asset: nearby!,
      state: nearby!.state,
      heldItem,
      game: {
        objects: [...objectInstances.values()],
        score: state.score,
      },
      acceptHeldItem: () => acceptHeldItem(),
      emitEvent: (event) => emitGameEvent(event, nearby!),
      setState: (state) => setObjectState(nearby!.id, state),
      configureContained: () => configureContainedItem(),
      openQuiz: (success) => openQuiz(success),
      showMessage: (message) => {
        state.message = message;
      },
      discardHeld: () => discardHeldItem(),
      deliverHeld: () => deliverHeldItem(),
      addScore: (amount) => {
        state.score += amount;
      },
    };
  }

  async function acceptHeldItem() {
    if (!player || !nearby || !heldItem || !nearby.canAccept(heldItem))
      return false;
    const targetSlot = nearby.getHoldingSlot(heldItem);
    const droppedItem = heldItem;
    droppedItem.dragAssetId = undefined;
    player.mesh
      .getObjectByName("holdingSlot")
      ?.remove(droppedItem.mesh || new THREE.Group());
    if (!targetSlot || !targetSlot.consumeOnDrop) {
      nearby.heldItem = droppedItem;
      nearby.mesh?.add(droppedItem.mesh || new THREE.Group());
      droppedItem.mesh?.position.set(0, getSurfaceHeight(nearby), 0);
    }
    if (targetSlot?.insertedState)
      await setObjectState(nearby.id, targetSlot.insertedState);
    heldItem = null;
    state.holding = "";
    state.holdingConfigured = false;
    sound.play("drop");
    return true;
  }

  async function triggerGrabDrop() {
    if (state.objectSelectionOpen) return;
    if (heldItem) {
      if (nearby && (await acceptHeldItem())) return;
      if (nearby) {
        const actionContext = createActionContext();
        const discardAction = Object.values(nearby.actions).find(
          (action) => action.id === "discard",
        );
        if (
          discardAction &&
          (discardAction.canExecute?.(actionContext) ?? false)
        )
          await discardAction.execute(actionContext);
        else dropHeldItemToFloor(heldItem);
      } else dropHeldItemToFloor(heldItem);
      return;
    }
    if (heldItem) return;
    if (!nearby || !(nearby.canHold ?? nearby.canBeGrabbed())) return;
    if (nearby.heldItem) {
      heldItem = nearby.heldItem;
      nearby.heldItem = null;
      if (heldItem && nearby.canBePushed()) heldItem.dragAssetId = nearby.id;
      if (heldItem?.mesh) {
        nearby.mesh?.remove(heldItem.mesh);
        player?.mesh.getObjectByName("holdingSlot")?.add(heldItem.mesh);
        heldItem.mesh.position.set(0, 0, 0);
      }
    } else if (nearby.getSourceType()) {
      const sourceType = nearby.getSourceType()!;
      const item = hydrateGameObject({
        id: createObjectId(nearby.id),
        type: sourceType,
        position: { x: 0, z: 0, rotation: 0 },
        w: 1,
        d: 1,
        label: `Held ${sourceType}`,
        allowGrab: true,
        keyId: nearby.keyId,
      });
      item.keyId = nearby.keyId;
      item.configured = false;
      await item.loadMesh("grabbed");
      heldItem = item;
      removePickedUpAsset(nearby.id);
    }
    state.holding = heldItem?.type || "";
    state.holdingConfigured = Boolean(heldItem?.configured);
    if (heldItem?.mesh)
      player?.mesh.getObjectByName("holdingSlot")?.add(heldItem.mesh);
    sound.play("pickup");
  }

  function getSurfaceHeight(asset: GameObjectInstance, stackIndex = 0) {
    return asset.getSurfaceHeight() + stackIndex * 0.12;
  }

  function selectObject(objectId: string) {
    if (!nearby || heldItem) return;
    if (!nearby.heldItem || nearby.heldItem.id !== objectId) return;
    heldItem = nearby.heldItem;
    nearby.heldItem = null;
    if (heldItem && nearby.canBePushed()) heldItem.dragAssetId = nearby.id;
    if (heldItem?.mesh) {
      nearby.mesh?.remove(heldItem.mesh);
      player?.mesh.getObjectByName("holdingSlot")?.add(heldItem.mesh);
      heldItem.mesh.position.set(0, 0, 0);
    }
    state.objectSelectionOpen = false;
    state.objectSelectionOptions = [];
    state.holding = heldItem?.type || "";
    state.holdingConfigured = Boolean(heldItem?.configured);
    sound.play("pickup");
  }

  function closeObjectSelection() {
    state.objectSelectionOpen = false;
    state.objectSelectionOptions = [];
  }

  function removePickedUpAsset(assetId: string) {
    floorplan.layout = floorplan.layout.filter((asset) => asset.id !== assetId);
    objectInstances.delete(assetId);
    buildFloorplan();
  }

  function dropHeldItemToFloor(item: GameObjectInstance) {
    if (!scene || !player) return;
    const distance = 1.2;
    const x =
      Math.round(
        (player.mesh.position.x + Math.sin(player.mesh.rotation.y) * distance) *
          2,
      ) / 2;
    const z =
      Math.round(
        (player.mesh.position.z + Math.cos(player.mesh.rotation.y) * distance) *
          2,
      ) / 2;
    if (item.mesh)
      player.mesh.getObjectByName("holdingSlot")?.remove(item.mesh);
    item.dragAssetId = undefined;
    const itemDefinition = getObjectTypeDefinition(item.type);
    const dropType = itemDefinition?.dropObjectType || item.type;
    const editor = getObjectTypeDefinition(dropType)?.editor;
    floorplan.layout.push({
      id: item.id,
      position: {
        x,
        z,
        rotation: 0,
      },
      w: 1.2,
      d: 1.2,
      canHold: false,
      canPush: false,
      color: editor ? Number.parseInt(editor.color.slice(1), 16) : 0x334155,
      type: dropType as GameObjectInstance["type"],
      label: `Dropped ${itemDefinition?.editor?.label || item.type}`,
      allowGrab: true,
      keyId: item.keyId,
    });
    buildFloorplan();
    heldItem = null;
    state.holding = "";
    state.holdingConfigured = false;
    sound.play("drop");
  }

  function discardHeldItem() {
    if (!heldItem) return;
    if (heldItem.mesh)
      player?.mesh.getObjectByName("holdingSlot")?.remove(heldItem.mesh);
    heldItem = null;
    state.holding = "";
    state.holdingConfigured = false;
    sound.play("drop");
  }

  async function configureContainedItem() {
    if (!nearby?.heldItem || nearby.heldItem.configured) return false;
    const item = nearby.heldItem;
    const slot = nearby.getHoldingSlot(item);
    if (!slot || !nearby.canAccept(item) || item.configured) return false;
    item.configured = true;
    if (item.mesh) {
      const parent = item.mesh.parent;
      parent?.remove(item.mesh);
      await item.loadMesh("configured");
      const heldOffset = item.getHeldOffset();
      item.mesh.position.set(
        heldOffset[0],
        getSurfaceHeight(nearby, 0) + heldOffset[1],
        heldOffset[2],
      );
      parent?.add(item.mesh);
    }
    state.score += 25;
    sound.play(item.getConfigureSound());
    return true;
  }

  function deliverHeldItem() {
    if (!heldItem?.configured) return;
    heldItem = null;
    state.holding = "";
    state.holdingConfigured = false;
    state.score += 150;
    state.finished = true;
    sound.play("deliver");
  }

  async function useNearby() {
    if (state.actionSelectionOpen) return;
    const actions = getAvailableActions();
    if (!nearby || !actions.length) return;
    if (actions.length > 1) {
      state.actionSelectionOptions = actions.map((action) => ({
        id: action.id,
        label: action.label,
        type: nearby!.label,
      }));
      state.actionSelectionOpen = true;
      return;
    }
    await executeAction(actions[0]!.id);
  }

  async function executeAction(actionId: string) {
    const action = getAvailableActions().find((item) => item.id === actionId);
    if (!action) return;
    state.actionSelectionOpen = false;
    state.actionSelectionOptions = [];
    const context = createActionContext();
    if (action.canExecute && !action.canExecute(context)) {
      if (action.blockedMessage) state.message = action.blockedMessage;
      return;
    }
    await action.execute(context);
  }

  function closeActionSelection() {
    state.actionSelectionOpen = false;
    state.actionSelectionOptions = [];
  }

  function answerQuiz(optionId: number) {
    if (optionId < 0) {
      pendingQuizSuccess = undefined;
      pendingQuizAssetId = "";
      state.quizOpen = false;
      state.quiz = null;
      return;
    }
    if (!state.quiz || optionId !== state.quiz.correct) return;
    const success = pendingQuizSuccess;
    state.score += success?.score ?? 100;
    if (success?.event && nearby) emitGameEvent(success.event, nearby);
    if (success?.state && pendingQuizAssetId)
      void setObjectState(pendingQuizAssetId, success.state);
    if (success?.message) state.message = success.message;
    pendingQuizSuccess = undefined;
    pendingQuizAssetId = "";
    state.quizOpen = false;
    state.quiz = null;
  }

  function openQuiz(success?: ObjectQuizSuccess) {
    pendingQuizSuccess = success;
    pendingQuizAssetId = nearby?.id || "";
    state.quiz = quizzes[Math.floor(Math.random() * quizzes.length)]!;
    state.quizOpen = true;
  }

  function closeMessage() {
    state.message = "";
  }

  function updateCameraOcclusion() {
    if (!player || !camera || !scene) return;

    const targetPosition = new THREE.Vector3();
    player.mesh.getWorldPosition(targetPosition);
    targetPosition.y += 0.9;

    const rayDirection = targetPosition.clone().sub(camera.position);
    const distance = rayDirection.length();
    rayDirection.normalize();
    occlusionRaycaster.set(camera.position, rayDirection);
    occlusionRaycaster.far = distance - 0.2;

    const currentlyOccluding = new Set<THREE.Group>();
    for (const hit of occlusionRaycaster.intersectObjects(
      occludableMeshes,
      true,
    )) {
      let object: THREE.Object3D | null = hit.object;
      while (
        object &&
        !occludableMeshes.includes(object as THREE.Group) &&
        object.parent !== scene
      ) {
        object = object.parent;
      }
      if (object) currentlyOccluding.add(object as THREE.Group);
    }

    for (const root of occludableMeshes) {
      const isOccluding = currentlyOccluding.has(root);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          const meshData = object.userData as { originalOpacity?: number };
          if (meshData.originalOpacity === undefined)
            meshData.originalOpacity = material.opacity;
          if (isOccluding) {
            material.transparent = true;
            material.opacity = 0.25;
          } else {
            material.opacity = meshData.originalOpacity;
            if (material.opacity >= 0.99) material.transparent = false;
          }
        }
      });
    }
  }

  function dash() {
    if (!player) return;
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      player.mesh.rotation.y,
    );
    if (player.body)
      physics.world.moveBodyWithSlide(
        player.body,
        direction.x * 1.2,
        direction.z * 1.2,
      );
    sound.play("dash");
  }

  function frame(time: number) {
    const delta = Math.min((time - lastFrame) / 1000 || 0, 0.05);
    lastFrame = time;
    const isMoving = updateMovement(delta);
    if (player) {
      updatePlayerAnimation(
        player,
        isMoving,
        Boolean(heldItem) || isPushing,
        walkCycle,
      );
      updateNearby();
      if (player && camera) {
        camera.position.lerp(
          new THREE.Vector3(
            player.mesh.position.x,
            8.5,
            player.mesh.position.z + 8.8,
          ),
          0.08,
        );
        camera.lookAt(player.mesh.position.x, 0.5, player.mesh.position.z);
      }
      scene?.traverse((object) => {
        if (object.userData.canRotate) object.rotation.y += 0.02;
      });
    }
    updateCameraOcclusion();
    renderer?.render(scene!, camera!);
    animationFrame = requestAnimationFrame(frame);
  }

  function setJoystick(x: number, y: number) {
    joystick = { x, y };
  }

  function setFloorplan(value: Floorplan | GameObjectInstance[]) {
    floorplan = Array.isArray(value)
      ? {
          layout: value.map((item) => ({ ...item })),
          playerSpawn: { x: 0, z: 2 },
        }
      : {
          layout: value.layout.map((item) => ({ ...item })),
          playerSpawn: { ...value.playerSpawn },
        };
    if (scene) void buildFloorplan();
  }

  function setQuizzes(value: QuizQuestion[]) {
    quizzes = value.map((quiz) => ({
      ...quiz,
      options: quiz.options.map((option) => ({ ...option })),
    }));
  }

  async function mount(
    target: HTMLCanvasElement,
    layout?: Floorplan | GameObjectInstance[],
    quizSet?: QuizQuestion[],
  ) {
    await loadObjectDefinitions();
    if (layout) setFloorplan(layout);
    if (quizSet) setQuizzes(quizSet);
    canvas.value = target;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9bd7f5);
    camera = new THREE.PerspectiveCamera(
      45,
      target.clientWidth / target.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 8.5, 10);
    renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(target.clientWidth, target.clientHeight, false);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffcc00, 1.5));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(4, 12, 8);
    scene.add(light);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 16),
      createMaterial(0xfff7d6),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(20, 20, 0xd40511, 0xffcc00);
    grid.position.y = 0.01;
    scene.add(grid);
    physics = new GamePhysics();
    player = initPlayer(scene, physics.world, floorplan.playerSpawn);

    await buildFloorplan();

    const resize = () => {
      if (!camera || !renderer) return;
      camera.aspect = target.clientWidth / target.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(target.clientWidth, target.clientHeight, false);
    };
    const keydown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (
        event.code === "KeyE" ||
        event.code === "KeyZ" ||
        event.key === "z" ||
        event.key === "Z"
      ) {
        triggerGrabDrop();
      }

      if (
        event.code === "Space" ||
        event.code === "KeyX" ||
        event.key === "x" ||
        event.key === "X"
      ) {
        useNearby();
      }

      if (event.code === "ShiftLeft" || event.key === "Shift") {
        dash();
      }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.code);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    timerId = setInterval(() => {
      if (!state.finished) {
        state.runningTime += 1;
      }
    }, 1000);
    animationFrame = requestAnimationFrame(frame);

    removeListeners = () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }

  function unmount() {
    removeListeners?.();
    removeListeners = undefined;
    cancelAnimationFrame(animationFrame);
    if (timerId) clearInterval(timerId);
    scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
    renderer?.dispose();
    scene = null;
    camera = null;
    renderer = null;
    player = null;
    physics = new GamePhysics();
  }

  return {
    state: readonly(state),
    mount,
    unmount,
    setJoystick,
    setFloorplan,
    setQuizzes,
    pickUp: triggerGrabDrop,
    useNearby,
    dash,
    answerQuiz,
    openQuiz,
    selectObject,
    closeObjectSelection,
    executeAction,
    closeActionSelection,
    closeMessage,
  };
}
