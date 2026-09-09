import * as THREE from 'three'
import type { MapAsset } from './types'

export class SoundFX {
  private context: AudioContext | null = null

  private init() {
    if (typeof window === 'undefined' || this.context) return
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) this.context = new AudioContextClass()
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, volume = 0.1) {
    if (!this.context) return
    try {
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime)
      gain.gain.setValueAtTime(volume, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(this.context.destination)
      oscillator.start()
      oscillator.stop(this.context.currentTime + duration)
    } catch { /* Audio is optional. */ }
  }

  play(effect: 'type' | 'process' | 'pickup' | 'drop' | 'unlock' | 'deliver' | 'riddle_success' | 'dash') {
    this.init()
    if (effect === 'type') {
      this.playTone(800, 'square', 0.05, 0.05)
      setTimeout(() => this.playTone(850, 'square', 0.05, 0.05), 50)
    } else if (effect === 'process') {
      this.playTone(150, 'sawtooth', 0.1, 0.08)
      setTimeout(() => this.playTone(200, 'sawtooth', 0.1, 0.08), 100)
    } else if (effect === 'pickup') this.playTone(600, 'sine', 0.1, 0.15)
    else if (effect === 'drop') this.playTone(300, 'triangle', 0.1, 0.15)
    else if (effect === 'unlock') {
      this.playTone(800, 'sine', 0.1, 0.1)
      setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.15), 100)
    } else if (effect === 'deliver') {
      this.playTone(523.25, 'sine', 0.1, 0.2)
      setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.2), 100)
      setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.2), 200)
    } else if (effect === 'riddle_success') {
      this.playTone(440, 'triangle', 0.1, 0.2)
      setTimeout(() => this.playTone(880, 'sine', 0.25, 0.2), 120)
    } else this.playTone(200, 'sawtooth', 0.1, 0.12)
  }
}

export class PhysicalBody {
  x: number
  y: number
  z: number
  width: number
  depth: number
  isStatic: boolean
  mesh: THREE.Object3D | null

  constructor(params: { x?: number; y?: number; z?: number; width?: number; depth?: number; isStatic?: boolean; mesh?: THREE.Object3D | null }) {
    this.x = params.x || 0
    this.y = params.y || 0
    this.z = params.z || 0
    this.width = params.width || 1
    this.depth = params.depth || 1
    this.isStatic = params.isStatic || false
    this.mesh = params.mesh || null
  }

  getAABB() {
    return { minX: this.x - this.width / 2, maxX: this.x + this.width / 2, minZ: this.z - this.depth / 2, maxZ: this.z + this.depth / 2 }
  }
}

export class KitchenPhysicsWorld {
  readonly bodies: PhysicalBody[] = []

  addBody(body: PhysicalBody) {
    this.bodies.push(body)
    return body
  }

  checkAABBCollision(first: PhysicalBody, second: PhysicalBody) {
    const a = first.getAABB()
    const b = second.getAABB()
    return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
  }

  moveBodyWithSlide(body: PhysicalBody, deltaX: number, deltaZ: number) {
    if (body.isStatic) return
    body.x += deltaX
    for (const other of this.bodies) {
      if (other !== body && this.checkAABBCollision(body, other)) {
        body.x = deltaX > 0 ? other.x - other.width / 2 - body.width / 2 - 0.001 : other.x + other.width / 2 + body.width / 2 + 0.001
      }
    }
    body.z += deltaZ
    for (const other of this.bodies) {
      if (other !== body && this.checkAABBCollision(body, other)) {
        body.z = deltaZ > 0 ? other.z - other.depth / 2 - body.depth / 2 - 0.001 : other.z + other.depth / 2 + body.depth / 2 + 0.001
      }
    }
    if (body.mesh) {
      body.mesh.position.x = body.x
      body.mesh.position.z = body.z
    }
  }
}

export class TechItem {
  isConfigured = false
  mesh: THREE.Group

  constructor(public readonly type: 'laptop' | 'server') {
    this.mesh = this.createMesh()
  }

  createMesh() {
    const group = new THREE.Group()
    if (this.type === 'laptop') {
      const material = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8 })
      group.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), material))
      if (this.isConfigured) {
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x111827 }))
        screen.position.set(0, 0.15, -0.14)
        screen.rotation.x = -Math.PI / 12
        group.add(screen)
        const display = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), new THREE.MeshBasicMaterial({ color: 0x22c55e }))
        display.position.set(0, 0.15, -0.125)
        display.rotation.x = -Math.PI / 12
        group.add(display)
      } else {
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), material)
        lid.position.y = 0.04
        group.add(lid)
      }
    } else {
      group.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })))
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: this.isConfigured ? 0x22c55e : 0xef4444 }))
      light.position.set(-0.1, 0, 0.26)
      group.add(light)
    }
    return group
  }
}

export function createCourierAvatarMesh(shirtColorHex: number) {
  const group = new THREE.Group()
  const skin = new THREE.MeshStandardMaterial({ color: 0xfde047 })
  const clothes = new THREE.MeshStandardMaterial({ color: shirtColorHex, roughness: 0.4 })
  const pants = new THREE.MeshStandardMaterial({ color: 0x1e293b })
  const shoes = new THREE.MeshStandardMaterial({ color: 0x111827 })

  for (const [name, x, side] of [['leftLeg', -0.16, -1], ['rightLeg', 0.16, 1]] as const) {
    const leg = new THREE.Group()
    leg.name = name
    leg.position.set(x, 0.3, 0)
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.35, 12), pants)
    legMesh.position.y = -0.175
    leg.add(legMesh)
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), shoes)
    shoe.position.set(0, -0.35, 0.05)
    leg.add(shoe)
    group.add(leg)
    void side
  }

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.55, 16), clothes)
  body.position.y = 0.65
  group.add(body)
  for (const [name, x] of [['leftArm', -0.42], ['rightArm', 0.42]] as const) {
    const arm = new THREE.Group()
    arm.name = name
    arm.position.set(x, 0.85, 0)
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.4, 10), clothes)
    armMesh.position.y = -0.2
    arm.add(armMesh)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), skin)
    hand.position.y = -0.42
    arm.add(hand)
    group.add(arm)
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16), skin)
  head.position.y = 1.12
  group.add(head)
  const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const pupil = new THREE.MeshBasicMaterial({ color: 0x000000 })
  for (const sign of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), eyeWhite)
    eye.position.set(sign * 0.11, 1.16, 0.29)
    group.add(eye)
    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), pupil)
    eyePupil.position.set(sign * 0.11, 1.16, 0.34)
    group.add(eyePupil)
  }
  const capColor = shirtColorHex === 0xffcc00 ? 0xd40511 : 0xffcc00;
  const cap = new THREE.MeshStandardMaterial({ color: capColor })
  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.15, 16), cap)
  capBase.position.y = 1.4
  group.add(capBase)
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), cap)
  capTop.position.y = 1.47
  group.add(capTop)
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), cap)
  brim.position.set(0, 1.35, 0.25)
  group.add(brim)
  const holdingSlot = new THREE.Group()
  holdingSlot.name = 'holdingSlot'
  holdingSlot.position.set(0, 0.9, 0.5)
  group.add(holdingSlot)
  return group
}

export function updatePlayerAnimation(player: THREE.Group | null, isMoving: boolean, isHolding: boolean, walkCycle: { value: number }) {
  if (!player) return
  const leftLeg = player.getObjectByName('leftLeg')
  const rightLeg = player.getObjectByName('rightLeg')
  const leftArm = player.getObjectByName('leftArm')
  const rightArm = player.getObjectByName('rightArm')
  if (isMoving) {
    walkCycle.value += 0.25
    const swing = Math.sin(walkCycle.value) * 0.55
    if (leftLeg) leftLeg.rotation.x = swing
    if (rightLeg) rightLeg.rotation.x = -swing
    if (!isHolding) {
      if (leftArm) leftArm.rotation.x = -swing * 0.7
      if (rightArm) rightArm.rotation.x = swing * 0.7
    }
  } else {
    walkCycle.value = 0
    if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.2)
    if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.2)
  }
  if (isHolding) {
    if (leftArm) { leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -Math.PI / 2.2, 0.2); leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.15, 0.2) }
    if (rightArm) { rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -Math.PI / 2.2, 0.2); rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.15, 0.2) }
  } else if (!isMoving) {
    if (leftArm) { leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.2); leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, 0.2) }
    if (rightArm) { rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.2); rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0, 0.2) }
  }
}

export function createObjectMesh(width: number, depth: number, topColor: number, type: MapAsset['type'], options: { isOpen?: boolean } = {}) {
  const group = new THREE.Group()
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
  if (type === 'door') {
    const frame = new THREE.MeshStandardMaterial({ color: 0x1e293b })
    for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, depth), frame)
      post.position.set(x, 1.1, 0)
      group.add(post)
    }
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 2, 0.1), new THREE.MeshStandardMaterial({ color: topColor, transparent: true, opacity: options.isOpen ? 0.2 : 0.8 }))
    panel.position.set(options.isOpen ? width / 2 - 0.2 : 0, 1, 0)
    panel.name = 'doorPanel'
    group.add(panel)
    return group
  }
  if (type === 'key') {
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0x1e293b }))
    pedestal.position.y = 0.4
    group.add(pedestal)
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: topColor }))
    badge.position.y = 0.9
    group.add(badge)
    return group
  }
  if (type === 'wall') {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, 2.5, depth), new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.9 }))
    wall.position.y = 1.25
    group.add(wall)
    return group
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 1.1, depth), baseMaterial)
  base.position.y = 0.55
  group.add(base)
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.1, depth + 0.05), new THREE.MeshStandardMaterial({ color: topColor || 0x64748b }))
  top.position.y = 1.15
  group.add(top)
  if (type.startsWith('box_')) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.9 }))
    box.position.y = 1.45
    group.add(box)
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.1, 0.71), new THREE.MeshBasicMaterial({ color: 0xd40511 }))
    stripe.position.y = 1.45
    group.add(stripe)
  } else if (type === 'config_desk') {
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x000000 }))
    screen.position.set(0, 1.5, -0.2)
    group.add(screen)
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x333333 }))
    keyboard.position.set(0, 1.21, 0.2)
    group.add(keyboard)
  } else if (type === 'server_rack') {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x111827 }))
    rack.position.y = 1.95
    group.add(rack)
    for (let index = 0; index < 3; index++) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x22c55e }))
      light.position.set(-0.2, 1.5 + index * 0.3, 0.36)
      group.add(light)
    }
  } else if (type === 'delivery') {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xd40511, transparent: true, opacity: 0.8 }))
    hatch.position.y = 1.6
    group.add(hatch)
  } else if (type === 'trash') {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x3f3f46 }))
    bin.position.y = 1.6
    group.add(bin)
  } else if (type === 'riddle') {
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.05), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }))
    screen.position.y = 1.5
    group.add(screen)
  }
  return group
}

export function getRotatedAABBSize(width: number, depth: number, rotation: number) {
  const angle = THREE.MathUtils.degToRad(rotation)
  const cosine = Math.abs(Math.cos(angle))
  const sine = Math.abs(Math.sin(angle))
  return {
    width: width * cosine + depth * sine,
    depth: width * sine + depth * cosine,
  }
}

export function initPlayers(scene: THREE.Scene, physics: KitchenPhysicsWorld) {
  const player = createCourierAvatarMesh(0xffcc00)
  player.position.set(0, 0, 2)
  scene.add(player)
  const body = physics.addBody(new PhysicalBody({ x: 0, y: 0, z: 2, width: 0.8, depth: 0.8, mesh: player }))
  return { player, playerBody: body }
}