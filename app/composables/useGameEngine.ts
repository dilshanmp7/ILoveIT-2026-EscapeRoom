import { defaultMapLayout, defaultQuizzes } from '#shared/game/defaults'
import { createObjectMesh, initPlayers, KitchenPhysicsWorld, PhysicalBody, SoundFX, TechItem, updatePlayerAnimation } from '#shared/game/runtime'
import type { MapAsset, QuizQuestion } from '#shared/game/types'
import * as THREE from 'three'
import { reactive, readonly, shallowRef } from 'vue'

interface HeldItem {
  type: 'laptop' | 'server' | 'key'
  configured?: boolean
  keyId?: string
  mesh?: THREE.Group
}

interface Counter {
  asset: MapAsset
  mesh: THREE.Group
  heldItem: HeldItem | null
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

  function createMaterial(color: number) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  }

  function buildFloorplan() {
    if (!scene) return
    counters.splice(0)
    bodies.splice(0)
    for (const child of [...scene.children]) {
      if (child.userData.courierAsset) scene.remove(child)
    }

    for (const asset of floorplan.map(item => ({ ...item }))) {
      const mesh = createObjectMesh(asset.w, asset.d, asset.type === 'delivery' ? 0xd40511 : asset.color, asset.type, { isOpen: asset.isOpen })
      mesh.position.set(asset.x, 0, asset.z)
      mesh.rotation.y = THREE.MathUtils.degToRad(asset.rotation)
      mesh.userData.courierAsset = true
      scene.add(mesh)
      counters.push({ asset, mesh, heldItem: null })
      if (asset.type === 'wall' || (asset.type === 'door' && !asset.isOpen)) {
        bodies.push(physicsWorld.addBody(new PhysicalBody({ x: asset.x, y: 0, z: asset.z, width: asset.w, depth: asset.d, isStatic: true })))
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
    const speed = 3.2 * delta
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
    state.canGrab = Boolean(heldItem || nearby?.asset.allowGrab || nearby?.heldItem || nearby?.asset.actionType === 'trash')
    state.canUse = Boolean(nearby && (nearby.asset.actionType === 'config' || nearby.asset.actionType === 'quiz' || nearby.asset.actionType === 'deliver' || nearby.asset.type === 'riddle' || nearby.asset.type === 'door' || nearby.asset.useAction === 'quiz' || nearby.asset.useAction === 'open_door'))
  }

  function pickUp() {
    if (heldItem) {
      if (nearby && nearby.asset.acceptsDrop && !nearby.heldItem) {
        const accepts = nearby.asset.acceptsDrop
        const valid = accepts === 'any' || accepts === heldItem.type || (accepts === 'configured' && heldItem.configured)
        if (valid) {
          nearby.heldItem = heldItem
          heldItem = null
          state.holding = ''
          state.holdingConfigured = false
          sound.play('drop')
          return
        }
      }
      return
    }
    if (!nearby || !nearby.asset.allowGrab) return
    if (nearby.heldItem) {
      heldItem = nearby.heldItem
      nearby.heldItem = null
    } else if (nearby.asset.type === 'key') {
      heldItem = { type: 'key', keyId: nearby.asset.keyId }
      nearby.mesh.visible = false
    } else if (nearby.asset.type === 'box_laptop' || nearby.asset.type === 'box_server') {
      const item = new TechItem(nearby.asset.type === 'box_server' ? 'server' : 'laptop')
      heldItem = { type: item.type, configured: item.isConfigured, mesh: item.mesh }
    }
    state.holding = heldItem?.type || ''
    state.holdingConfigured = Boolean(heldItem?.configured)
    if (heldItem?.mesh) player?.getObjectByName('holdingSlot')?.add(heldItem.mesh)
    sound.play('pickup')
  }

  function useNearby() {
    if (!nearby) return
    const asset = nearby.asset
    if (asset.type === 'door' || asset.useAction === 'open_door') {
      if (heldItem?.keyId === asset.useRequiredKey) {
        asset.isOpen = true
        const panel = nearby.mesh.getObjectByName('door-panel')
        if (panel) panel.position.x = asset.w / 2
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
    if (asset.actionType === 'config' && nearby.heldItem && !nearby.heldItem.configured) {
      const expected = asset.type === 'server_rack' ? 'server' : 'laptop'
      if (nearby.heldItem.type === expected) {
        nearby.heldItem.configured = true
        state.score += 25
        sound.play(nearby.heldItem.type === 'laptop' ? 'type' : 'process')
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
      if (event.code === 'KeyE') pickUp()
      if (event.code === 'Space') useNearby()
      if (event.code === 'ShiftLeft') dash()
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
    pickUp,
    useNearby,
    dash,
    answerQuiz,
    openQuiz,
    openEditor,
    closeEditor,
    deployEditor,
  }
}
