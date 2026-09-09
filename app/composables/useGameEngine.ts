import { defaultMapLayout, defaultQuizzes } from '#shared/game/defaults'
import { createObjectMesh, getRotatedAABBSize, initPlayers, KitchenPhysicsWorld, PhysicalBody, SoundFX, TechItem, updatePlayerAnimation } from '#shared/game/runtime'
import type { DropRule, HeldObjectType, MapAsset, QuizQuestion } from '#shared/game/types'
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
})

export function useGameEngine() {
  const state = reactive(initialState())
  const canvas = shallowRef<HTMLCanvasElement | null>(null)
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let player: THREE.Group | null = null
  let playerPhysicsBody: PhysicalBody | null = null
  let physicsWorld = new KitchenPhysicsWorld()
  const sound = new SoundFX()
  const walkCycle = { value: 0 }
  let animationFrame = 0
  let timerId: ReturnType<typeof setInterval> | undefined
  let lastFrame = 0
  let heldItem: HeldItem | null = null
  let nearby: Counter | null = null
  let floorplan = defaultMapLayout.map(item => ({ ...item }))
  let joystick = { x: 0, y: 0 }
  let removeListeners: (() => void) | undefined
  const keys = new Set<string>()
  const counters: Counter[] = []
  const bodies: PhysicalBody[] = []
  const occludableMeshes: THREE.Group[] = []
  const occlusionRaycaster = new THREE.Raycaster()

  function createMaterial(color: number) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  }

  function buildFloorplan() {
    if (!scene) return
    counters.splice(0)
    bodies.splice(0)
    occludableMeshes.splice(0)
    physicsWorld = new KitchenPhysicsWorld()
    for (const child of [...scene.children]) {
      if (child.userData.courierAsset) scene.remove(child)
    }

    for (const asset of floorplan.map(item => ({ ...item }))) {
      const mesh = createObjectMesh(asset.w, asset.d, asset.type === 'delivery' ? 0xd40511 : asset.color, asset.type, { isOpen: asset.isOpen })
      mesh.position.set(asset.x, 0, asset.z)
      mesh.rotation.y = THREE.MathUtils.degToRad(asset.rotation)
      mesh.userData.courierAsset = true
      scene.add(mesh)
      occludableMeshes.push(mesh)
      if (asset.type !== 'wall' && asset.type !== 'floor') {
        counters.push({ asset, mesh, heldItems: [] })
      }
      if (asset.type !== 'door' || !asset.isOpen) {
        const size = getRotatedAABBSize(asset.w, asset.d, asset.rotation)
        bodies.push(physicsWorld.addBody(new PhysicalBody({ x: asset.x, y: 0, z: asset.z, width: size.width, depth: size.depth, isStatic: true })))
      }
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
    if (playerPhysicsBody) physicsWorld.moveBodyWithSlide(playerPhysicsBody, nextX - player.position.x, nextZ - player.position.z)
    player.rotation.y = Math.atan2(x, z)
    return true
  }

  function updateNearby() {
    nearby = getNearby()
    state.nearbyId = nearby?.asset.id || ''
    state.nearbyLabel = nearby?.asset.label || ''
    state.canGrab = Boolean(heldItem || nearby?.asset.allowGrab || nearby?.heldItems.length || nearby?.asset.actionType === 'trash')
    state.canUse = Boolean(nearby && (nearby.asset.actionType === 'config' || nearby.asset.actionType === 'quiz' || nearby.asset.actionType === 'deliver' || nearby.asset.type === 'riddle' || nearby.asset.type === 'door' || nearby.asset.useAction === 'quiz' || nearby.asset.useAction === 'open_door'))
  }

  function getDropRule(asset: MapAsset): DropRule {
    if (asset.dropRule) return asset.dropRule
    if (asset.acceptsDrop === 'any') return { mode: 'any' }
    if (asset.acceptsDrop === 'configured') return { mode: 'configured' }
    if (asset.acceptsDrop === 'laptop' || asset.acceptsDrop === 'server') return { mode: 'types', types: [asset.acceptsDrop] }
    return { mode: 'none' }
  }

  function canDrop(item: HeldItem, asset: MapAsset, contents: HeldItem[]) {
    const rule = getDropRule(asset)
    if (rule.mode === 'none') return false
    if (rule.mode === 'floor') return true
    if (rule.maxContents !== undefined && contents.length >= rule.maxContents) return false
    if (rule.mode === 'any') return true
    if (rule.mode === 'configured') return item.configured === true
    if (rule.mode === 'types') return rule.types.includes(item.type)
    return rule.objectIds.includes(item.id)
  }

  function triggerGrabDrop() {
    if (heldItem) {
      if (nearby && canDrop(heldItem, nearby.asset, nearby.heldItems)) {
        const targetRule = getDropRule(nearby.asset)
        if (targetRule.mode !== 'floor' && nearby.heldItems.length === 0) {
          const holdingSlot = player?.getObjectByName('holdingSlot')
          holdingSlot?.remove(heldItem.mesh || new THREE.Group())
          nearby.heldItems.push(heldItem)
          if (heldItem.mesh) {
            nearby.mesh.add(heldItem.mesh)
            heldItem.mesh.position.set(0, 1.3, 0)
          }
          heldItem = null
          state.holding = ''
          state.holdingConfigured = false
          sound.play('drop')
          return
        }
      }
      if (nearby?.asset.type === 'floor') placeOnFloor(heldItem)
      else if (nearby?.asset.actionType === 'trash') discardHeldItem()
      else dropHeldItemToFloor(heldItem)
      return
    }
    if (!nearby || !nearby.asset.allowGrab) return
    if (nearby.heldItems.length) {
      heldItem = nearby.heldItems.pop() || null
      if (heldItem?.mesh) {
        nearby.mesh.remove(heldItem.mesh)
        player?.getObjectByName('holdingSlot')?.add(heldItem.mesh)
        heldItem.mesh.position.set(0, 0, 0)
      }
    } else if (nearby.asset.type === 'key') {
      heldItem = { id: nearby.asset.id, type: 'key', keyId: nearby.asset.keyId }
      removePickedUpAsset(nearby.asset.id)
    } else if (nearby.asset.type === 'box_laptop' || nearby.asset.type === 'box_server') {
      const item = new TechItem(nearby.asset.type === 'box_server' ? 'server' : 'laptop')
      heldItem = { id: createObjectId(nearby.asset.id), type: item.type, configured: item.isConfigured, mesh: item.mesh }
      removePickedUpAsset(nearby.asset.id)
    }
    state.holding = heldItem?.type || ''
    state.holdingConfigured = Boolean(heldItem?.configured)
    if (heldItem?.mesh) player?.getObjectByName('holdingSlot')?.add(heldItem.mesh)
    sound.play('pickup')
  }

  function removePickedUpAsset(assetId: string) {
    floorplan = floorplan.filter(asset => asset.id !== assetId)
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
    floorplan.push({
      id: item.id,
      x,
      z,
      w: 1.2,
      d: 1.2,
      rotation: 0,
      color: item.type === 'key' ? 0x0ea5e9 : 0x334155,
      type: item.type === 'server' ? 'box_server' : item.type === 'laptop' ? 'box_laptop' : 'key',
      label: item.type === 'key' ? 'Dropped Key' : item.type === 'server' ? 'Dropped Server' : 'Dropped Laptop',
      allowGrab: true,
      keyId: item.keyId,
      actionType: item.type === 'key' ? 'key' : 'none',
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

  function useNearby() {
    if (!nearby) return
    const asset = nearby.asset
    if (asset.type === 'door' || asset.useAction === 'open_door') {
      if (heldItem?.keyId === asset.useRequiredKey) {
        asset.isOpen = true
        const panel = nearby.mesh.getObjectByName('door-panel')
        if (panel) panel.position.x = asset.w / 2 - 0.2
        const bodyIndex = bodies.findIndex(body => body.x === asset.x && body.z === asset.z)
        if (bodyIndex !== -1) {
          const body = bodies[bodyIndex]
          if (body) {
            const physicsBodyIndex = physicsWorld.bodies.indexOf(body)
            if (physicsBodyIndex !== -1) physicsWorld.bodies.splice(physicsBodyIndex, 1)
            bodies.splice(bodyIndex, 1)
          }
        }
        sound.play('unlock')
      }
      return
    }
    if (asset.useAction === 'quiz' || asset.type === 'riddle' || asset.actionType === 'quiz') {
      if (asset.useRequiredKey && heldItem?.keyId !== asset.useRequiredKey) return
      state.quiz = defaultQuizzes[Math.floor(Math.random() * defaultQuizzes.length)]!
      state.quizOpen = true
      return
    }
    if (asset.actionType === 'config' && nearby.heldItems[0] && !nearby.heldItems[0].configured) {
      const expected = asset.type === 'server_rack' ? 'server' : 'laptop'
      if (nearby.heldItems[0].type === expected) {
        nearby.heldItems[0].configured = true
        if (nearby.heldItems[0].mesh) {
          const parent = nearby.heldItems[0].mesh.parent
          parent?.remove(nearby.heldItems[0].mesh)
          const replacement = new TechItem(nearby.heldItems[0].type)
          replacement.isConfigured = true
          replacement.mesh = replacement.createMesh()
          nearby.heldItems[0].mesh = replacement.mesh
          const configuredItem = nearby.heldItems[0].mesh
          configuredItem.position.set(0, 1.3, nearby.heldItems[0].type === 'server' ? 0.4 : 0)
          parent?.add(configuredItem)
        }
        state.score += 25
        sound.play(nearby.heldItems[0].type === 'laptop' ? 'type' : 'process')
      }
      return
    }
    if (asset.actionType === 'deliver' && heldItem?.configured) {
      state.score += 150
      heldItem = null
      state.holding = ''
      state.holdingConfigured = false
      state.finished = true
      sound.play('deliver')
    }
  }

  function answerQuiz(index: number) {
    if (state.quiz && index === state.quiz.correct) state.score += 100
    state.quizOpen = false
    state.quiz = null
  }

  function openQuiz() {
    state.quiz = defaultQuizzes[Math.floor(Math.random() * defaultQuizzes.length)]!
    state.quizOpen = true
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
    updatePlayerAnimation(player, isMoving, Boolean(heldItem), walkCycle)
    updateNearby()
    if (player && camera) {
      camera.position.lerp(new THREE.Vector3(player.position.x, 8.5, player.position.z + 8.8), .08)
      camera.lookAt(player.position.x, .5, player.position.z)
    }
    updateCameraOcclusion()
    renderer?.render(scene!, camera!)
    animationFrame = requestAnimationFrame(frame)
  }

  function setJoystick(x: number, y: number) {
    joystick = { x, y }
  }

  function setFloorplan(layout: MapAsset[]) {
    floorplan = layout.map(item => ({ ...item }))
    if (scene) buildFloorplan()
  }

  function mount(target: HTMLCanvasElement, layout?: MapAsset[]) {
    if (layout) setFloorplan(layout)
    canvas.value = target
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    camera = new THREE.PerspectiveCamera(45, target.clientWidth / target.clientHeight, .1, 100)
    camera.position.set(0, 8.5, 10)
    renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(target.clientWidth, target.clientHeight, false)
    scene.add(new THREE.AmbientLight(0xffffff, .75))
    const light = new THREE.DirectionalLight(0xffffff, 1.2)
    light.position.set(4, 12, 8)
    scene.add(light)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), createMaterial(0xe2e8f0))
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    const grid = new THREE.GridHelper(20, 20, 0x94a3b8, 0xcbd5e1)
    grid.position.y = .01
    scene.add(grid)
    physicsWorld = new KitchenPhysicsWorld()
    const players = initPlayers(scene, physicsWorld)
    player = players.player
    playerPhysicsBody = players.playerBody
    buildFloorplan()

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
    physicsWorld = new KitchenPhysicsWorld()
  }

  function openEditor() { state.editorOpen = true }
  function closeEditor() { state.editorOpen = false }
  function deployEditor() { buildFloorplan(); state.editorOpen = false }

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
    openEditor,
    closeEditor,
    deployEditor,
  }
}
