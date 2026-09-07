import * as THREE from 'three'
import { reactive, readonly, shallowRef } from 'vue'
import { defaultMapLayout, defaultQuizzes } from '#shared/game/defaults'
import type { MapAsset, QuizQuestion } from '#shared/game/types'

interface HeldItem {
  type: 'laptop' | 'server' | 'key'
  configured?: boolean
  keyId?: string
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
  let player: THREE.Mesh | null = null
  let animationFrame = 0
  let timerId: ReturnType<typeof setInterval> | undefined
  let lastFrame = 0
  let heldItem: HeldItem | null = null
  let nearby: Counter | null = null
  const keys = new Set<string>()
  const counters: Counter[] = []
  const bodies: MapAsset[] = []

  function createMaterial(color: number) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  }

  function createAssetMesh(asset: MapAsset) {
    const group = new THREE.Group()
    const baseColor = asset.type === 'delivery' ? 0xd40511 : asset.color
    const base = new THREE.Mesh(new THREE.BoxGeometry(asset.w, asset.type === 'wall' ? 2.5 : 1, asset.d), createMaterial(baseColor))
    base.position.y = asset.type === 'wall' ? 1.25 : 0.5
    group.add(base)

    if (asset.type.startsWith('box_')) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(.72, .52, .72), createMaterial(0xffcc00))
      box.position.y = 1.3
      group.add(box)
    }
    if (asset.type === 'config_desk' || asset.type === 'server_rack') {
      const device = new THREE.Mesh(new THREE.BoxGeometry(.72, .52, .42), createMaterial(asset.type === 'server_rack' ? 0x111827 : 0x0f172a))
      device.position.y = 1.35
      group.add(device)
    }
    if (asset.type === 'riddle') {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(.62, .42, .08), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }))
      screen.position.y = 1.3
      group.add(screen)
    }
    if (asset.type === 'key') {
      const badge = new THREE.Mesh(new THREE.BoxGeometry(.2, .3, .05), new THREE.MeshBasicMaterial({ color: asset.color }))
      badge.position.y = 1.15
      group.add(badge)
    }
    if (asset.type === 'door') {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(asset.w - .25, 2, .08), new THREE.MeshStandardMaterial({ color: asset.color, transparent: true, opacity: asset.isOpen ? .2 : .85 }))
      panel.position.y = 1
      panel.name = 'door-panel'
      group.add(panel)
    }
    return group
  }

  function createPlayer() {
    const group = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.3, .65, 4, 10), createMaterial(0xffcc00))
    body.position.y = .75
    group.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), createMaterial(0xfde047))
    head.position.y = 1.45
    group.add(head)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .12, 16), createMaterial(0xd40511))
    cap.position.y = 1.7
    group.add(cap)
    return group
  }

  function buildFloorplan() {
    if (!scene) return
    counters.splice(0)
    bodies.splice(0)
    for (const child of [...scene.children]) {
      if (child.userData.courierAsset) scene.remove(child)
    }

    for (const asset of defaultMapLayout.map(item => ({ ...item }))) {
      const mesh = createAssetMesh(asset)
      mesh.position.set(asset.x, 0, asset.z)
      mesh.rotation.y = THREE.MathUtils.degToRad(asset.rotation)
      mesh.userData.courierAsset = true
      scene.add(mesh)
      counters.push({ asset, mesh, heldItem: null })
      if (asset.type === 'wall' || asset.type === 'door') bodies.push(asset)
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

  function collides(x: number, z: number) {
    const half = .35
    return bodies.some(body => {
      if (body.type === 'door' && body.isOpen) return false
      return x + half > body.x - body.w / 2 && x - half < body.x + body.w / 2 && z + half > body.z - body.d / 2 && z - half < body.z + body.d / 2
    })
  }

  function updateMovement(delta: number) {
    if (!player) return
    let x = 0
    let z = 0
    if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1
    if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
    if (!x && !z) return
    const length = Math.hypot(x, z)
    const speed = 3.2 * delta
    const nextX = player.position.x + (x / length) * speed
    const nextZ = player.position.z + (z / length) * speed
    if (!collides(nextX, player.position.z)) player.position.x = nextX
    if (!collides(player.position.x, nextZ)) player.position.z = nextZ
    player.rotation.y = Math.atan2(x, z)
  }

  function updateNearby() {
    nearby = getNearby()
    state.nearbyId = nearby?.asset.id || ''
    state.nearbyLabel = nearby?.asset.label || ''
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
      heldItem = { type: nearby.asset.type === 'box_server' ? 'server' : 'laptop' }
    }
    state.holding = heldItem?.type || ''
    state.holdingConfigured = Boolean(heldItem?.configured)
  }

  function useNearby() {
    if (!nearby) return
    const asset = nearby.asset
    if (asset.type === 'door' || asset.useAction === 'open_door') {
      if (heldItem?.keyId === asset.useRequiredKey) {
        asset.isOpen = true
        const panel = nearby.mesh.getObjectByName('door-panel')
        if (panel) panel.position.x = asset.w / 2
      }
      return
    }
    if (asset.useAction === 'quiz' || asset.type === 'riddle' || asset.actionType === 'quiz') {
      state.quiz = defaultQuizzes[Math.floor(Math.random() * defaultQuizzes.length)]
      state.quizOpen = true
      return
    }
    if (asset.actionType === 'config' && nearby.heldItem && !nearby.heldItem.configured) {
      const expected = asset.type === 'server_rack' ? 'server' : 'laptop'
      if (nearby.heldItem.type === expected) {
        nearby.heldItem.configured = true
        state.score += 25
      }
      return
    }
    if (asset.actionType === 'deliver' && heldItem?.configured) {
      state.score += 150
      heldItem = null
      state.holding = ''
      state.holdingConfigured = false
      state.finished = true
    }
  }

  function answerQuiz(index: number) {
    if (state.quiz && index === state.quiz.correct) state.score += 100
    state.quizOpen = false
    state.quiz = null
  }

  function openQuiz() {
    state.quiz = defaultQuizzes[Math.floor(Math.random() * defaultQuizzes.length)]
    state.quizOpen = true
  }

  function dash() {
    if (!player) return
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y)
    const nextX = player.position.x + direction.x * 1.2
    const nextZ = player.position.z + direction.z * 1.2
    if (!collides(nextX, nextZ)) player.position.set(nextX, 0, nextZ)
  }

  function frame(time: number) {
    const delta = Math.min((time - lastFrame) / 1000 || 0, .05)
    lastFrame = time
    updateMovement(delta)
    updateNearby()
    if (player && camera) {
      camera.position.lerp(new THREE.Vector3(player.position.x, 8.5, player.position.z + 8.8), .08)
      camera.lookAt(player.position.x, .5, player.position.z)
    }
    renderer?.render(scene!, camera!)
    animationFrame = requestAnimationFrame(frame)
  }

  function mount(target: HTMLCanvasElement) {
    canvas.value = target
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    scene.fog = new THREE.FogExp2(0x0f172a, .025)
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
    player = createPlayer()
    player.position.set(0, 0, 2)
    scene.add(player)
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

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
    }
  }

  function unmount() {
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
  }

  function openEditor() { state.editorOpen = true }
  function closeEditor() { state.editorOpen = false }
  function deployEditor() { buildFloorplan(); state.editorOpen = false }

  return {
    state: readonly(state),
    mount,
    unmount,
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
