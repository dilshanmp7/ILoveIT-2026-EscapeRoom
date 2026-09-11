import { defaultQuizzes } from '#shared/game/defaults'

import type { ObjectActionContext, ObjectActionDefinition, ObjectQuizSuccess, ObjectVisualState } from '#shared/game/runtime'
import { GameItem, getObjectActions, getObjectGeometry, getObjectInteraction, getObjectTypeDefinition, getRotatedAABBSize, initPlayers, loadMapObjectModel, loadObjectDefinitions, PhysicalBody, PhysicsWorld, SoundFX, updatePlayerAnimation } from '#shared/game/runtime'
import type { DropRule, Floorplan, HeldObjectType, MapAsset, QuizQuestion } from '#shared/game/types'
import * as THREE from 'three'
import { reactive, readonly, shallowRef } from 'vue'

interface HeldItem {
  id: string
  type: HeldObjectType
  configured?: boolean
  keyId?: string
  mesh?: THREE.Group
}

interface Counter {
  asset: MapAsset
  mesh: THREE.Group
  heldItems: HeldItem[]
  state: ObjectVisualState
}

function createObjectId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const initialState = () => ({
  score: 0,
  secondsRemaining: 180,
  nearbyLabel: '',
  nearbyId: '',
  holding: '',
  holdingConfigured: false,
  canGrab: false,
  canUse: false,
  quiz: null as QuizQuestion | null,
  quizOpen: false,
  editorOpen: false,
  finished: false,
  objectSelectionOpen: false,
  objectSelectionOptions: [] as { id: string; label: string; type: string }[],
  actionSelectionOpen: false,
  actionSelectionOptions: [] as { id: string; label: string; type: string }[],
  message: '',
})

export function useGameEngine() {
  const state = reactive(initialState())
  const canvas = shallowRef<HTMLCanvasElement | null>(null)
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let player: THREE.Group | null = null
  let playerPhysicsBody: PhysicalBody | null = null
  let physicsWorld = new PhysicsWorld()
  const sound = new SoundFX()
  const walkCycle = { value: 0 }
  let animationFrame = 0
  let timerId: ReturnType<typeof setInterval> | undefined
  let lastFrame = 0
  let heldItem: HeldItem | null = null
  let pendingQuizSuccess: ObjectQuizSuccess | undefined
  let pendingQuizAssetId = ''
  let isPushing = false
  let nearby: Counter | null = null
  let floorplan: Floorplan = { layout: [], playerSpawn: { x: 0, z: 2 } }
  let joystick = { x: 0, y: 0 }
  let removeListeners: (() => void) | undefined
  const keys = new Set<string>()
  const counters: Counter[] = []
  const objectInstances = new Map<string, { asset: MapAsset; state: ObjectVisualState; mesh: THREE.Group | null; heldItems: HeldItem[] }>()
  const bodies: PhysicalBody[] = []
  const occludableMeshes: THREE.Group[] = []
  const occlusionRaycaster = new THREE.Raycaster()

  function createMaterial(color: number) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  }

  async function buildFloorplan() {
    if (!scene) return
    const previousInstances = new Map(objectInstances)
    counters.splice(0)
    objectInstances.clear()
    bodies.splice(0)
    occludableMeshes.splice(0)
    physicsWorld = new PhysicsWorld()
    for (const child of [...scene.children]) {
      if (child.userData.courierAsset) scene.remove(child)
    }

    for (const asset of floorplan.layout.map(item => ({ ...item }))) {
      const previous = previousInstances.get(asset.id)
      const state = previous?.state || (asset.isOpen ? 'opened' : getObjectTypeDefinition(asset.type)?.defaultState || 'onFloor')
      const instance = { asset, state, mesh: null as THREE.Group | null, heldItems: previous?.heldItems || [] }
      objectInstances.set(asset.id, instance)
      const mesh = await loadMapObjectModel(asset, state)
      instance.mesh = mesh
      const geometry = getObjectGeometry(asset.type)
      if (geometry?.countsAsCounter) {
        if (mesh) counters.push({ asset, mesh, heldItems: instance.heldItems, state })
      }
      if (mesh) {
        mesh.position.set(asset.x, 0, asset.z)
        mesh.rotation.y = THREE.MathUtils.degToRad(asset.rotation)
        mesh.userData.courierAsset = true
        scene.add(mesh)
        occludableMeshes.push(mesh)
      }
      if (!(geometry?.isBarrier && state === 'opened')) {
        const size = getRotatedAABBSize(asset.w, asset.d, asset.rotation)
        bodies.push(physicsWorld.addBody(new PhysicalBody({ assetId: asset.id, x: asset.x, y: 0, z: asset.z, width: size.width, depth: size.depth, isStatic: geometry?.isStatic ?? !asset.canPush, canPush: geometry?.canPush ?? asset.canPush ?? false, mesh })))
      }
    }
  }

  function persistPhysicsPositions() {
    for (const body of bodies) {
      if (!body.assetId) continue
      const asset = floorplan.layout.find(item => item.id === body.assetId)
      if (!asset) continue
      asset.x = body.x
      asset.z = body.z
    }
  }

  function getNearby() {
    if (!player) return null
    let closest: Counter | null = null
    let distance = 1.85
    for (const counter of counters) {
      const dx = player.position.x - counter.asset.x
      const dz = player.position.z - counter.asset.z
      const nextDistance = Math.hypot(dx, dz)
      if (nextDistance < distance) {
        distance = nextDistance
        closest = counter
      }
    }
    return closest
  }

  function removeBodyForAsset(assetId: string) {
    const bodyIndex = bodies.findIndex(body => body.assetId === assetId)
    if (bodyIndex === -1) return
    const body = bodies[bodyIndex]
    if (!body) return
    const physicsBodyIndex = physicsWorld.bodies.indexOf(body)
    if (physicsBodyIndex !== -1) physicsWorld.bodies.splice(physicsBodyIndex, 1)
    bodies.splice(bodyIndex, 1)
  }

  async function setObjectState(assetId: string, nextState: ObjectVisualState) {
    const instance = objectInstances.get(assetId)
    if (!instance || instance.state === nextState) return
    const previousMesh = instance.mesh
    instance.state = nextState
    const nextMesh = await loadMapObjectModel(instance.asset, nextState)
    instance.mesh = nextMesh
    if (previousMesh) {
      if (scene) scene.remove(previousMesh)
      const previousIndex = occludableMeshes.indexOf(previousMesh)
      if (previousIndex !== -1) occludableMeshes.splice(previousIndex, 1)
    }
    if (nextMesh && scene) {
      nextMesh.position.set(instance.asset.x, 0, instance.asset.z)
      nextMesh.rotation.y = THREE.MathUtils.degToRad(instance.asset.rotation)
      nextMesh.userData.courierAsset = true
      scene.add(nextMesh)
      occludableMeshes.push(nextMesh)
    }
    const geometry = getObjectGeometry(instance.asset.type)
    if (geometry?.isBarrier && nextState === 'opened') removeBodyForAsset(assetId)
  }

  function emitGameEvent(event: string) {
    for (const instance of objectInstances.values()) {
      const reaction = getObjectTypeDefinition(instance.asset.type)?.reactions?.find(item => item.event === event)
      if (reaction) void setObjectState(instance.asset.id, reaction.state)
    }
  }

  function updateMovement(delta: number) {
    if (!player) return false
    let x = 0
    let z = 0
    if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1
    if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
    if (joystick.x || joystick.y) {
      x = joystick.x
      z = joystick.y
    }
    if (!x && !z) return false
    const length = Math.hypot(x, z)
    const speed = 0.12
    const nextX = player.position.x + (x / length) * speed
    const nextZ = player.position.z + (z / length) * speed
    isPushing = playerPhysicsBody
      ? physicsWorld.moveBodyWithSlide(playerPhysicsBody, nextX - player.position.x, nextZ - player.position.z)
      : false
    persistPhysicsPositions()
    player.rotation.y = Math.atan2(x, z)
    return true
  }

  function updateNearby() {
    nearby = getNearby()
    state.nearbyId = nearby?.asset.id || ''
    state.nearbyLabel = nearby?.asset.label || ''
    const interaction = nearby ? getObjectInteraction(nearby.asset.type) : undefined
    state.canGrab = Boolean(heldItem || nearby?.asset.canHold || nearby?.asset.allowGrab || nearby?.heldItems.length || interaction?.canGrab)
    state.canUse = getAvailableActions().length > 0
  }

  function getAvailableActions(): ObjectActionDefinition[] {
    if (!nearby) return []
    return getObjectActions(nearby.asset.type, nearby.asset.actionIds)
      .filter(action => !action.visibleWhen || action.visibleWhen(createActionContext()))
  }

  function createActionContext(): ObjectActionContext {
    return {
      asset: nearby!.asset,
      state: objectInstances.get(nearby!.asset.id)?.state || 'onFloor',
      heldItem,
      heldItems: nearby!.heldItems,
      emitEvent: emitGameEvent,
      setState: state => setObjectState(nearby!.asset.id, state),
      configureContained: () => configureContainedItem(),
      openQuiz: success => openQuiz(success),
      showMessage: message => { state.message = message },
      discardHeld: () => discardHeldItem(),
      deliverHeld: () => deliverHeldItem(),
      addScore: amount => { state.score += amount },
    }
  }

  function getDropRule(asset: MapAsset): DropRule {
    if (asset.dropRule) return asset.dropRule
    if (asset.acceptsDrop === 'any') return { mode: 'any' }
    if (asset.acceptsDrop === 'configured') return { mode: 'configured' }
    if (asset.acceptsDrop === 'laptop' || asset.acceptsDrop === 'server') return { mode: 'types', types: [asset.acceptsDrop] }
    return { mode: 'none' }
  }

  function canDrop(item: HeldItem, asset: MapAsset, contents: HeldItem[]) {
    if (getObjectGeometry(asset.type)?.isBarrier) return false
    const rule = getDropRule(asset)
    if (rule.mode === 'none') return false
    if (rule.mode === 'floor') return true
    if (rule.maxContents !== undefined && contents.length >= rule.maxContents) return false
    if (rule.mode === 'any') return true
    if (rule.mode === 'configured') return item.configured === true
    if (rule.mode === 'types') return rule.types.includes(item.type)
    return rule.objectIds.includes(item.id)
  }

  function getHoldingSlot(asset: MapAsset, item: HeldItem, contents: HeldItem[]) {
    const slots = asset.holdingSlots || getObjectTypeDefinition(asset.type)?.holdingSlots
    return slots?.find(slot => {
      if (slot.maxContents !== undefined && contents.length >= slot.maxContents) return false
      if (slot.accepts === 'any') return true
      if (slot.accepts === 'configured') return item.configured === true
      return slot.accepts === item.type
    })
  }

  async function triggerGrabDrop() {
    if (state.objectSelectionOpen) return
    if (heldItem) {
      const targetSlot = nearby ? getHoldingSlot(nearby.asset, heldItem, nearby.heldItems) : undefined
      if (nearby && targetSlot) {
        const droppedItem = heldItem
        player?.getObjectByName('holdingSlot')?.remove(droppedItem.mesh || new THREE.Group())
        if (!targetSlot.consumeOnDrop) {
          nearby.heldItems.push(droppedItem)
          if (droppedItem.mesh) {
            nearby.mesh.add(droppedItem.mesh)
            droppedItem.mesh.position.set(0, getSurfaceHeight(nearby.asset, nearby.heldItems.length), 0)
          }
        }
        if (targetSlot.insertedState) await setObjectState(nearby.asset.id, targetSlot.insertedState)
        heldItem = null
        state.holding = ''
        state.holdingConfigured = false
        sound.play('drop')
        return
      }
      if (nearby && canDrop(heldItem, nearby.asset, nearby.heldItems)) {
        const targetRule = getDropRule(nearby.asset)
        if (targetRule.mode !== 'floor') {
          const holdingSlot = player?.getObjectByName('holdingSlot')
          holdingSlot?.remove(heldItem.mesh || new THREE.Group())
          nearby.heldItems.push(heldItem)
          if (heldItem.mesh) {
            nearby.mesh.add(heldItem.mesh)
            heldItem.mesh.position.set(0, getSurfaceHeight(nearby.asset, nearby.heldItems.length), 0)
          }
          heldItem = null
          state.holding = ''
          state.holdingConfigured = false
          sound.play('drop')
          return
        }
      }
      if (nearby && getDropRule(nearby.asset).mode === 'floor') placeOnFloor(heldItem)
      else if (nearby && getObjectInteraction(nearby.asset.type)?.action === 'trash') discardHeldItem()
      else dropHeldItemToFloor(heldItem)
      return
    }
    const nearbyDefinition = nearby ? getObjectTypeDefinition(nearby.asset.type) : undefined
    if (!nearby || !(nearby.asset.canHold ?? nearby.asset.allowGrab ?? nearbyDefinition?.interaction?.canGrab)) return
    if (nearby.heldItems.length) {
      if (nearby.heldItems.length > 1) {
        state.objectSelectionOptions = nearby.heldItems.map(item => ({ id: item.id, label: getObjectTypeDefinition(item.type)?.editor?.label || item.type, type: item.configured ? 'Configured' : item.type }))
        state.objectSelectionOpen = true
        return
      }
      heldItem = nearby.heldItems.pop() || null
      if (heldItem?.mesh) {
        nearby.mesh.remove(heldItem.mesh)
        player?.getObjectByName('holdingSlot')?.add(heldItem.mesh)
        heldItem.mesh.position.set(0, 0, 0)
      }
    } else if (getObjectTypeDefinition(nearby.asset.type)?.source?.itemType) {
      const sourceType = getObjectTypeDefinition(nearby.asset.type)!.source!.itemType
      const item = new GameItem(sourceType as HeldObjectType)
      await item.createMeshFromAsset('grabbed')
      heldItem = { id: createObjectId(nearby.asset.id), type: item.type as HeldObjectType, keyId: nearby.asset.keyId, configured: item.isConfigured, mesh: item.mesh }
      removePickedUpAsset(nearby.asset.id)
    }
    state.holding = heldItem?.type || ''
    state.holdingConfigured = Boolean(heldItem?.configured)
    if (heldItem?.mesh) player?.getObjectByName('holdingSlot')?.add(heldItem.mesh)
    sound.play('pickup')
  }

  function getSurfaceHeight(asset: MapAsset, stackIndex = 0) {
    const geometry = getObjectGeometry(asset.type)
    return (geometry?.surfaceHeight ?? 0.1) + stackIndex * 0.12
  }

  function selectObject(objectId: string) {
    if (!nearby || heldItem) return
    const itemIndex = nearby.heldItems.findIndex(item => item.id === objectId)
    if (itemIndex === -1) return
    heldItem = nearby.heldItems.splice(itemIndex, 1)[0] || null
    if (heldItem?.mesh) {
      nearby.mesh.remove(heldItem.mesh)
      player?.getObjectByName('holdingSlot')?.add(heldItem.mesh)
      heldItem.mesh.position.set(0, 0, 0)
    }
    state.objectSelectionOpen = false
    state.objectSelectionOptions = []
    state.holding = heldItem?.type || ''
    state.holdingConfigured = Boolean(heldItem?.configured)
    sound.play('pickup')
  }

  function closeObjectSelection() {
    state.objectSelectionOpen = false
    state.objectSelectionOptions = []
  }

  function removePickedUpAsset(assetId: string) {
    floorplan.layout = floorplan.layout.filter(asset => asset.id !== assetId)
    objectInstances.delete(assetId)
    buildFloorplan()
  }

  function placeOnFloor(item: HeldItem) {
    dropHeldItemToFloor(item)
  }

  function dropHeldItemToFloor(item: HeldItem) {
    if (!scene || !player) return
    const distance = 1.2
    const x = Math.round((player.position.x + Math.sin(player.rotation.y) * distance) * 2) / 2
    const z = Math.round((player.position.z + Math.cos(player.rotation.y) * distance) * 2) / 2
    if (item.mesh) player.getObjectByName('holdingSlot')?.remove(item.mesh)
    const itemDefinition = getObjectTypeDefinition(item.type)
    const dropType = itemDefinition?.dropObjectType || item.type
    const editor = getObjectTypeDefinition(dropType)?.editor
    floorplan.layout.push({
      id: item.id,
      x,
      z,
      w: 1.2,
      d: 1.2,
      rotation: 0,
      color: editor ? Number.parseInt(editor.color.slice(1), 16) : 0x334155,
      type: dropType as MapAsset['type'],
      label: `Dropped ${itemDefinition?.editor?.label || item.type}`,
      allowGrab: true,
      keyId: item.keyId,
      actionType: 'none',
    })
    buildFloorplan()
    heldItem = null
    state.holding = ''
    state.holdingConfigured = false
    sound.play('drop')
  }

  function discardHeldItem() {
    if (!heldItem) return
    if (heldItem.mesh) player?.getObjectByName('holdingSlot')?.remove(heldItem.mesh)
    heldItem = null
    state.holding = ''
    state.holdingConfigured = false
    sound.play('drop')
  }

  async function configureContainedItem() {
    if (!nearby?.heldItems[0] || nearby.heldItems[0].configured) return false
    const item = nearby.heldItems[0]
    const rule = getDropRule(nearby.asset)
    if (rule.mode !== 'types' || !rule.types.includes(item.type)) return false
    item.configured = true
    if (item.mesh) {
      const parent = item.mesh.parent
      parent?.remove(item.mesh)
      const replacement = new GameItem(item.type)
      replacement.isConfigured = true
      await replacement.createMeshFromAsset('configured')
      item.mesh = replacement.mesh
      const heldOffset = getObjectTypeDefinition(item.type)?.heldOffset || [0, 0, 0]
      item.mesh.position.set(heldOffset[0], getSurfaceHeight(nearby.asset, 0) + heldOffset[1], heldOffset[2])
      parent?.add(item.mesh)
    }
    state.score += 25
    sound.play(getObjectTypeDefinition(item.type)?.configureSound || 'process')
    return true
  }

  function deliverHeldItem() {
    if (!heldItem?.configured) return
    heldItem = null
    state.holding = ''
    state.holdingConfigured = false
    state.score += 150
    state.finished = true
    sound.play('deliver')
  }

  async function useNearby() {
    const actions = getAvailableActions()
    if (!nearby || !actions.length) return
    if (actions.length > 1) {
      state.actionSelectionOptions = actions.map(action => ({ id: action.id, label: action.label, type: nearby!.asset.label }))
      state.actionSelectionOpen = true
      return
    }
    await executeAction(actions[0]!.id)
  }

  async function executeAction(actionId: string) {
    const action = getAvailableActions().find(item => item.id === actionId)
    if (!action) return
    state.actionSelectionOpen = false
    state.actionSelectionOptions = []
    const context = createActionContext()
    if (action.canExecute && !action.canExecute(context)) {
      if (action.blockedMessage) state.message = action.blockedMessage
      return
    }
    await action.execute(context)
  }

  function closeActionSelection() {
    state.actionSelectionOpen = false
    state.actionSelectionOptions = []
  }

  function answerQuiz(index: number) {
    if (state.quiz && index === state.quiz.correct) {
      const success = pendingQuizSuccess
      state.score += success?.score ?? 100
      if (success?.event) emitGameEvent(success.event)
      if (success?.state && pendingQuizAssetId) void setObjectState(pendingQuizAssetId, success.state)
      if (success?.message) state.message = success.message
    }
    pendingQuizSuccess = undefined
    pendingQuizAssetId = ''
    state.quizOpen = false
    state.quiz = null
  }

  function openQuiz(success?: ObjectQuizSuccess) {
    pendingQuizSuccess = success
    pendingQuizAssetId = nearby?.asset.id || ''
    state.quiz = defaultQuizzes[Math.floor(Math.random() * defaultQuizzes.length)]!
    state.quizOpen = true
  }

  function closeMessage() {
    state.message = ''
  }

  function updateCameraOcclusion() {
    if (!player || !camera || !scene) return

    const targetPosition = new THREE.Vector3()
    player.getWorldPosition(targetPosition)
    targetPosition.y += .9

    const rayDirection = targetPosition.clone().sub(camera.position)
    const distance = rayDirection.length()
    rayDirection.normalize()
    occlusionRaycaster.set(camera.position, rayDirection)
    occlusionRaycaster.far = distance - .2

    const currentlyOccluding = new Set<THREE.Group>()
    for (const hit of occlusionRaycaster.intersectObjects(occludableMeshes, true)) {
      let object: THREE.Object3D | null = hit.object
      while (object && !occludableMeshes.includes(object as THREE.Group) && object.parent !== scene) {
        object = object.parent
      }
      if (object) currentlyOccluding.add(object as THREE.Group)
    }

    for (const root of occludableMeshes) {
      const isOccluding = currentlyOccluding.has(root)
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          const meshData = object.userData as { originalOpacity?: number }
          if (meshData.originalOpacity === undefined) meshData.originalOpacity = material.opacity
          if (isOccluding) {
            material.transparent = true
            material.opacity = .25
          } else {
            material.opacity = meshData.originalOpacity
            if (material.opacity >= .99) material.transparent = false
          }
        }
      })
    }
  }

  function dash() {
    if (!player) return
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y)
    if (playerPhysicsBody) physicsWorld.moveBodyWithSlide(playerPhysicsBody, direction.x * 1.2, direction.z * 1.2)
    sound.play('dash')
  }

  function frame(time: number) {
    const delta = Math.min((time - lastFrame) / 1000 || 0, .05)
    lastFrame = time
    const isMoving = updateMovement(delta)
    updatePlayerAnimation(player, isMoving, Boolean(heldItem) || isPushing, walkCycle)
    updateNearby()
    if (player && camera) {
      camera.position.lerp(new THREE.Vector3(player.position.x, 8.5, player.position.z + 8.8), .08)
      camera.lookAt(player.position.x, .5, player.position.z)
    }
    scene?.traverse(object => {
      if (object.userData.canRotate) object.rotation.y += .02
    })
    updateCameraOcclusion()
    renderer?.render(scene!, camera!)
    animationFrame = requestAnimationFrame(frame)
  }

  function setJoystick(x: number, y: number) {
    joystick = { x, y }
  }

  function setFloorplan(value: Floorplan | MapAsset[]) {
    floorplan = Array.isArray(value)
      ? { layout: value.map(item => ({ ...item })), playerSpawn: { x: 0, z: 2 } }
      : { layout: value.layout.map(item => ({ ...item })), playerSpawn: { ...value.playerSpawn } }
    if (scene) void buildFloorplan()
  }

  async function mount(target: HTMLCanvasElement, layout?: Floorplan | MapAsset[]) {
    await loadObjectDefinitions()
    if (layout) setFloorplan(layout)
    canvas.value = target
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x9bd7f5)
    camera = new THREE.PerspectiveCamera(45, target.clientWidth / target.clientHeight, .1, 100)
    camera.position.set(0, 8.5, 10)
    renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(target.clientWidth, target.clientHeight, false)
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffcc00, 1.5))
    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(4, 12, 8)
    scene.add(light)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), createMaterial(0xfff7d6))
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    const grid = new THREE.GridHelper(20, 20, 0xd40511, 0xffcc00)
    grid.position.y = .01
    scene.add(grid)
    physicsWorld = new PhysicsWorld()
    const players = initPlayers(scene, physicsWorld, floorplan.playerSpawn)
    player = players.player
    playerPhysicsBody = players.playerBody
    await buildFloorplan()

    const resize = () => {
      if (!camera || !renderer) return
      camera.aspect = target.clientWidth / target.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(target.clientWidth, target.clientHeight, false)
    }
    const keydown = (event: KeyboardEvent) => {
      keys.add(event.code)
      if (event.code === 'KeyE' || event.code === 'KeyZ' || event.key === 'z' || event.key === 'Z') triggerGrabDrop()
      if (event.code === 'Space' || event.code === 'KeyX' || event.key === 'x' || event.key === 'X') useNearby()
      if (event.code === 'ShiftLeft' || event.key === 'Shift') dash()
    }
    const keyup = (event: KeyboardEvent) => keys.delete(event.code)
    window.addEventListener('resize', resize)
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    timerId = setInterval(() => {
      if (state.secondsRemaining > 0 && !state.finished) state.secondsRemaining -= 1
    }, 1000)
    animationFrame = requestAnimationFrame(frame)

    removeListeners = () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
    }
  }

  function unmount() {
    removeListeners?.()
    removeListeners = undefined
    cancelAnimationFrame(animationFrame)
    if (timerId) clearInterval(timerId)
    scene?.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose())
        else object.material.dispose()
      }
    })
    renderer?.dispose()
    scene = null
    camera = null
    renderer = null
    player = null
    playerPhysicsBody = null
    physicsWorld = new PhysicsWorld()
  }

  function openEditor() { state.editorOpen = true }
  function closeEditor() { state.editorOpen = false }
  function deployEditor() { void buildFloorplan(); state.editorOpen = false }

  return {
    state: readonly(state),
    mount,
    unmount,
    setJoystick,
    setFloorplan,
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
    openEditor,
    closeEditor,
    deployEditor,
  }
}
