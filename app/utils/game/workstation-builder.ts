import * as THREE from 'three'

export interface WorkstationModelInstance {
  termId: string
  sector: 1 | 2 | 3
  step: number
  label: string
  shortLabel: string
  rootGroup: THREE.Group
  screenMaterial: THREE.MeshBasicMaterial
  screenCanvas: HTMLCanvasElement
  screenContext: CanvasRenderingContext2D
  screenTexture: THREE.CanvasTexture
  accentMaterials: THREE.MeshBasicMaterial[]
  animatedParts: {
    mesh: THREE.Mesh
    type: 'bob' | 'spin' | 'pulse'
    baseY?: number
  }[]
  currentStatus: string
}

// Reusable shared geometries to maximize performance across 30 workstations
const boxGeos: Record<string, THREE.BoxGeometry> = {}
function getBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w}_${h}_${d}`
  if (!boxGeos[key]) boxGeos[key] = new THREE.BoxGeometry(w, h, d)
  return boxGeos[key]
}

const cylGeos: Record<string, THREE.CylinderGeometry> = {}
function getCylGeo(rT: number, rB: number, h: number, seg = 16): THREE.CylinderGeometry {
  const key = `${rT}_${rB}_${h}_${seg}`
  if (!cylGeos[key]) cylGeos[key] = new THREE.CylinderGeometry(rT, rB, h, seg)
  return cylGeos[key]
}

// Palette constants
const THEME_COLORS = {
  1: { primary: 0xf59e0b, dark: 0x78350f, glow: '#f59e0b', bg: '#0b0f19', text: '#fbbf24' }, // Gen-AI Amber
  2: { primary: 0x06b6d4, dark: 0x0e7490, glow: '#06b6d4', bg: '#081326', text: '#38bdf8' }, // CPH Apps Cyan
  3: { primary: 0xef4444, dark: 0x991b1b, glow: '#ef4444', bg: '#180a0a', text: '#f87171' }, // Cyber Vault Red
}

/**
 * Creates dynamic high-tech canvas textures for the workstation screens
 */
export function drawWorkstationScreen(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  sector: 1 | 2 | 3,
  step: number,
  label: string,
  shortLabel: string,
  status: 'locked' | 'current' | 'completed',
  time = 0
) {
  const w = canvas.width
  const h = canvas.height
  const theme = THEME_COLORS[sector]
  const stepStr = step < 10 ? `0${step}` : `${step}`

  // 1. Background Fill
  if (status === 'completed') {
    ctx.fillStyle = '#06281e'
  } else if (status === 'current') {
    ctx.fillStyle = theme.bg
  } else {
    ctx.fillStyle = '#090d16'
  }
  ctx.fillRect(0, 0, w, h)

  // 2. Scanline overlay & Grid Lines
  ctx.strokeStyle = status === 'completed'
    ? 'rgba(16, 185, 129, 0.12)'
    : (status === 'current' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(71, 85, 105, 0.08)')
  ctx.lineWidth = 1
  for (let y = 0; y < h; y += 12) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // 3. Screen Header Bar
  const barColor = status === 'completed'
    ? '#10b981'
    : (status === 'current' ? (sector === 1 ? '#f59e0b' : (sector === 2 ? '#06b6d4' : '#ef4444')) : '#475569')

  ctx.fillStyle = barColor
  ctx.fillRect(16, 16, w - 32, 44)

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 22px "Courier New", monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const sectorName = sector === 1 ? 'AURA GEN-AI CORE' : (sector === 2 ? 'CPH APPS COMMAND' : 'CYBER DEFENSE VAULT')
  ctx.fillText(`⚡ ${sectorName} // ST-0${stepStr}`, 32, 38)

  // Status Badge Pill in Header
  ctx.textAlign = 'right'
  const statusPill = status === 'completed' ? '✔ VERIFIED' : (status === 'current' ? '● ONLINE' : '🔒 STANDBY')
  ctx.fillText(statusPill, w - 32, 38)

  // 4. Station Label
  ctx.fillStyle = status === 'completed' ? '#a7f3d0' : (status === 'current' ? '#ffffff' : '#94a3b8')
  ctx.font = 'bold 28px "Courier New", monospace'
  ctx.textAlign = 'left'
  ctx.fillText(label.toUpperCase(), 32, 95)

  // 5. Central Graphic Area depending on Sector & Status
  if (status === 'completed') {
    // COMPLETED STATE (Vibrant Emerald Green)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
    ctx.roundRect(32, 125, w - 64, 180, 12)
    ctx.fill()
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#34d399'
    ctx.font = 'bold 54px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('✔ STATION CALIBRATED', w / 2, 190)

    ctx.fillStyle = '#a7f3d0'
    ctx.font = '22px "Courier New", monospace'
    ctx.fillText('DIAGNOSTIC PROTOCOL VERIFIED • ACCESS GRANTED', w / 2, 255)
  } else if (status === 'current') {
    // ACTIVE STATE: Distinct topic visual per sector!
    if (sector === 1) {
      // Sector 1: Gen-AI Neural Synapse & Prompt Waves
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let x = 32; x < w - 32; x += 10) {
        const y = 210 + Math.sin(x * 0.03 + time * 0.005) * 45 + Math.cos(x * 0.015 - time * 0.004) * 20
        if (x === 32) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Synapse Nodes
      for (let i = 0; i < 6; i++) {
        const nx = 90 + i * 85
        const ny = 210 + Math.sin(nx * 0.03 + time * 0.005) * 45
        ctx.fillStyle = '#ffcc00'
        ctx.beginPath()
        ctx.arc(nx, ny, 7, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#fde68a'
      ctx.font = '20px "Courier New", monospace'
      ctx.textAlign = 'left'
      ctx.fillText('AI INFERENCE: ACTIVE • HUMAN-IN-THE-LOOP REQUIRED', 40, 145)
      ctx.fillText('MODEL: AURA-v4.2-LOGISTICS • LOSS: 0.0014', 40, 290)
    } else if (sector === 2) {
      // Sector 2: Enterprise Logistics Dashboard (GUS Blue / ServiceNow / CAFE)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'
      ctx.roundRect(32, 125, w - 64, 180, 8)
      ctx.fill()
      ctx.strokeStyle = '#06b6d4'
      ctx.lineWidth = 2
      ctx.stroke()

      // App Metric Blocks
      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 24px "Courier New", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`APP SYSTEM: ${shortLabel}`, 48, 160)

      ctx.font = '18px "Courier New", monospace'
      ctx.fillStyle = '#e0f2fe'
      ctx.fillText('STATUS: SYNCHRONIZING • SLA TIMER: 00:14:59', 48, 200)
      ctx.fillText('PACKET THROUGHPUT: 1,480 ops/sec • UAT VERIFIED', 48, 235)

      // Progress bar
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(48, 260, w - 96, 18)
      ctx.fillStyle = '#0284c7'
      ctx.fillRect(48, 260, (w - 96) * 0.72, 18)
    } else {
      // Sector 3: Cyber Security Shield & Threat Radar
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
      ctx.roundRect(32, 125, w - 64, 180, 8)
      ctx.fill()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.stroke()

      // Shield graphic & radar
      ctx.fillStyle = '#f87171'
      ctx.font = 'bold 36px "Courier New", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('🛡️ SECURITY DEFENSE ACTIVE', w / 2, 175)

      ctx.font = 'bold 20px "Courier New", monospace'
      ctx.fillStyle = '#fca5a5'
      ctx.fillText(`PROTOCOL: ${shortLabel.toUpperCase()}`, w / 2, 220)
      ctx.fillText('MFA / BIOMETRIC IDENTIFICATION ENFORCED', w / 2, 260)
    }
  } else {
    // LOCKED / STANDBY STATE
    ctx.fillStyle = 'rgba(51, 65, 85, 0.3)'
    ctx.roundRect(32, 130, w - 64, 170, 8)
    ctx.fill()

    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 38px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('🔒 TERMINAL LOCKED', w / 2, 200)

    ctx.font = '20px "Courier New", monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('Awaiting sequential sector clearance', w / 2, 250)
  }

  // Footer status bar
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(16, h - 34, w - 32, 22)
  ctx.fillStyle = status === 'completed' ? '#10b981' : (status === 'current' ? barColor : '#64748b')
  ctx.font = 'bold 14px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('DHL CPH IT ESCAPE ROOM OPERATIONS • NODE CONTROLLER', w / 2, h - 18)
}

/**
 * Builds a high-fidelity, sector-themed 3D workstation model
 */
export function createSectorWorkstation(
  termId: string,
  sector: 1 | 2 | 3,
  step: number,
  label: string,
  shortLabel: string
): WorkstationModelInstance {
  if (typeof document === 'undefined') {
    return {
      termId,
      sector,
      step,
      label,
      shortLabel,
      rootGroup: new THREE.Group(),
      screenMaterial: new THREE.MeshBasicMaterial(),
      screenCanvas: null as unknown as HTMLCanvasElement,
      screenContext: null as unknown as CanvasRenderingContext2D,
      screenTexture: new THREE.CanvasTexture(new Image()),
      accentMaterials: [],
      animatedParts: [],
      currentStatus: 'locked',
    }
  }

  const rootGroup = new THREE.Group()
  rootGroup.name = `workstation_${termId}`

  const theme = THEME_COLORS[sector]
  const accentMaterials: THREE.MeshBasicMaterial[] = []
  const animatedParts: WorkstationModelInstance['animatedParts'] = []

  // Shared Standard Materials
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.7,
  })

  const chassisMat = new THREE.MeshStandardMaterial({
    color: sector === 1 ? 0x111827 : (sector === 2 ? 0x0f172a : 0x090d16),
    roughness: 0.5,
    metalness: 0.6,
  })

  const deskTopMat = new THREE.MeshStandardMaterial({
    color: sector === 1 ? 0x18181b : (sector === 2 ? 0x1e293b : 0x0f172a),
    roughness: 0.35,
    metalness: 0.8,
  })

  // Accent Glow Material (for strips, LEDs, and trims)
  const accentMat = new THREE.MeshBasicMaterial({
    color: theme.primary,
    transparent: true,
    opacity: 0.85,
  })
  accentMaterials.push(accentMat)

  // ========================================================
  // 1. DESK BASE & CHASSIS (COMMON ERGONOMIC TECH DESK)
  // ========================================================
  // Left and Right Pedestals
  const leftPedestal = new THREE.Mesh(getBoxGeo(0.24, 0.8, 0.8), darkMetalMat)
  leftPedestal.position.set(-0.48, 0.4, -0.05)
  rootGroup.add(leftPedestal)

  const rightPedestal = new THREE.Mesh(getBoxGeo(0.24, 0.8, 0.8), darkMetalMat)
  rightPedestal.position.set(0.48, 0.4, -0.05)
  rootGroup.add(rightPedestal)

  // Modesty Back Panel
  const backPanel = new THREE.Mesh(getBoxGeo(0.85, 0.65, 0.05), chassisMat)
  backPanel.position.set(0, 0.45, -0.38)
  rootGroup.add(backPanel)

  // Footrest / Cable Conduit Rail
  const conduitRail = new THREE.Mesh(getCylGeo(0.03, 0.03, 0.85), darkMetalMat)
  conduitRail.rotation.z = Math.PI / 2
  conduitRail.position.set(0, 0.15, -0.15)
  rootGroup.add(conduitRail)

  // Workstation Tabletop Surface (w: 1.35m, d: 0.95m, h: 0.06m)
  const deskTop = new THREE.Mesh(getBoxGeo(1.35, 0.06, 0.95), deskTopMat)
  deskTop.position.set(0, 0.83, 0)
  rootGroup.add(deskTop)

  // Glowing Front Neon Lip on Desk Surface
  const frontGlowStrip = new THREE.Mesh(getBoxGeo(1.3, 0.02, 0.02), accentMat)
  frontGlowStrip.position.set(0, 0.83, 0.47)
  rootGroup.add(frontGlowStrip)

  // Ground Underglow Strip
  const underglow = new THREE.Mesh(getBoxGeo(1.1, 0.02, 0.04), accentMat)
  underglow.position.set(0, 0.02, 0.35)
  rootGroup.add(underglow)

  // ========================================================
  // 2. MAIN DIAGNOSTIC DISPLAY & CANVAS TEXTURE
  // ========================================================
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  drawWorkstationScreen(canvas, ctx, sector, step, label, shortLabel, 'locked', 0)

  const screenTex = new THREE.CanvasTexture(canvas)
  screenTex.needsUpdate = true

  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTex,
    transparent: false,
  })

  // Monitor Mount Stand
  const monitorStand = new THREE.Mesh(getCylGeo(0.04, 0.05, 0.4), darkMetalMat)
  monitorStand.position.set(0, 1.03, -0.22)
  rootGroup.add(monitorStand)

  // Curved / Ultrawide Monitor Frame (w: 0.92m, h: 0.52m, d: 0.04m)
  const monitorFrame = new THREE.Mesh(getBoxGeo(0.92, 0.52, 0.04), chassisMat)
  monitorFrame.position.set(0, 1.25, -0.2)
  monitorFrame.rotation.x = -0.15 // tilted slightly back for optimal angled top-down visibility
  rootGroup.add(monitorFrame)

  // Interactive Screen Plane
  const screenMesh = new THREE.Mesh(getBoxGeo(0.88, 0.48, 0.01), screenMaterial)
  screenMesh.position.set(0, 1.25, -0.175)
  screenMesh.rotation.x = -0.15
  rootGroup.add(screenMesh)

  // ========================================================
  // 3. KEYBOARD & INPUT DECK (Tilted for Ergonomics)
  // ========================================================
  const keyboardGroup = new THREE.Group()
  keyboardGroup.position.set(0, 0.87, 0.2)
  keyboardGroup.rotation.x = 0.08

  const keyboardBase = new THREE.Mesh(getBoxGeo(0.55, 0.02, 0.22), darkMetalMat)
  keyboardGroup.add(keyboardBase)

  const keysPlane = new THREE.Mesh(getBoxGeo(0.48, 0.015, 0.16), accentMat)
  keysPlane.position.set(0, 0.012, -0.01)
  keyboardGroup.add(keysPlane)

  rootGroup.add(keyboardGroup)

  // ========================================================
  // 4. SECTOR SPECIFIC TOPICAL ACCESSORIES
  // ========================================================
  if (sector === 1) {
    // ----------------------------------------------------
    // SECTOR 1: AURA GEN-AI COPROCESSOR CORE CYLINDER
    // ----------------------------------------------------
    const coreCasing = new THREE.Mesh(
      getCylGeo(0.12, 0.12, 0.45, 16),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.45,
      })
    )
    coreCasing.position.set(0.46, 1.08, -0.12)
    rootGroup.add(coreCasing)

    // Inner glowing neural energy crystal
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07),
      new THREE.MeshBasicMaterial({ color: 0xffcc00 })
    )
    crystal.position.set(0.46, 1.08, -0.12)
    rootGroup.add(crystal)
    animatedParts.push({ mesh: crystal, type: 'bob', baseY: 1.08 })

    // Neural data tube running from core to desk
    const tube = new THREE.Mesh(getCylGeo(0.018, 0.018, 0.25), accentMat)
    tube.rotation.z = Math.PI / 4
    tube.position.set(0.35, 0.96, -0.12)
    rootGroup.add(tube)
  } else if (sector === 2) {
    // ----------------------------------------------------
    // SECTOR 2: CPH APPS ENTERPRISE SERVER & NETSCAN DOCK
    // ----------------------------------------------------
    // Left: Handheld NetScan Laser Barcode Scanner in Dock
    const dockBase = new THREE.Mesh(getBoxGeo(0.12, 0.08, 0.16), darkMetalMat)
    dockBase.position.set(-0.46, 0.89, 0.15)
    rootGroup.add(dockBase)

    const scannerHandle = new THREE.Mesh(getCylGeo(0.02, 0.025, 0.14), chassisMat)
    scannerHandle.rotation.x = -Math.PI / 6
    scannerHandle.position.set(-0.46, 0.98, 0.13)
    rootGroup.add(scannerHandle)

    const scannerHead = new THREE.Mesh(getBoxGeo(0.07, 0.05, 0.1), darkMetalMat)
    scannerHead.position.set(-0.46, 1.05, 0.11)
    rootGroup.add(scannerHead)

    const scannerLaser = new THREE.Mesh(getBoxGeo(0.05, 0.015, 0.01), accentMat)
    scannerLaser.position.set(-0.46, 1.05, 0.16)
    rootGroup.add(scannerLaser)

    // Right: Logistics Server Blade Rack Tower
    const serverTower = new THREE.Mesh(getBoxGeo(0.18, 0.52, 0.45), chassisMat)
    serverTower.position.set(0.48, 1.12, -0.15)
    rootGroup.add(serverTower)

    // Server LED Status Bars
    for (let i = 0; i < 4; i++) {
      const led = new THREE.Mesh(getBoxGeo(0.14, 0.015, 0.01), accentMat)
      led.position.set(0.48, 0.95 + i * 0.1, 0.08)
      rootGroup.add(led)
    }
  } else {
    // ----------------------------------------------------
    // SECTOR 3: CYBER SECURITY BIOMETRIC DECK & SHIELD PRISM
    // ----------------------------------------------------
    // Left: Biometric Palm / Thumbprint Scanner Glass
    const biometricPad = new THREE.Mesh(getBoxGeo(0.15, 0.02, 0.18), darkMetalMat)
    biometricPad.position.set(-0.46, 0.87, 0.15)
    rootGroup.add(biometricPad)

    const biometricGlass = new THREE.Mesh(getBoxGeo(0.11, 0.005, 0.12), accentMat)
    biometricGlass.position.set(-0.46, 0.885, 0.15)
    rootGroup.add(biometricGlass)

    // Right: Smartcard Security Badge Reader Slot
    const readerBase = new THREE.Mesh(getBoxGeo(0.14, 0.08, 0.12), chassisMat)
    readerBase.position.set(0.46, 0.9, 0.15)
    rootGroup.add(readerBase)

    const cardSlot = new THREE.Mesh(getBoxGeo(0.08, 0.01, 0.01), accentMat)
    cardSlot.position.set(0.46, 0.92, 0.2)
    rootGroup.add(cardSlot)

    // Top of Monitor: High-Security Threat Containment Prism
    const prism = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.14, 4),
      new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true })
    )
    prism.position.set(0, 1.58, -0.2)
    prism.rotation.y = Math.PI / 4
    rootGroup.add(prism)
    animatedParts.push({ mesh: prism, type: 'spin' })
  }

  return {
    termId,
    sector,
    step,
    label,
    shortLabel,
    rootGroup,
    screenMaterial,
    screenCanvas: canvas,
    screenContext: ctx,
    screenTexture: screenTex,
    accentMaterials,
    animatedParts,
    currentStatus: 'locked',
  }
}

/**
 * Dynamically updates workstation screen graphics, neon accents, and bobbing animations
 */
export function updateWorkstationVisualState(
  ws: WorkstationModelInstance,
  status: 'locked' | 'current' | 'completed',
  time: number
) {
  // 1. Redraw Screen Texture if Status Changed or if Active Animation
  if (ws.currentStatus !== status || status === 'current') {
    ws.currentStatus = status
    drawWorkstationScreen(
      ws.screenCanvas,
      ws.screenContext,
      ws.sector,
      ws.step,
      ws.label,
      ws.shortLabel,
      status,
      time
    )
    ws.screenTexture.needsUpdate = true
  }

  // 2. Update Accent Colors & Underglow Intensity
  const theme = THEME_COLORS[ws.sector]
  for (const mat of ws.accentMaterials) {
    if (status === 'completed') {
      mat.color.setHex(0x10b981)
      mat.opacity = 0.95
    } else if (status === 'current') {
      mat.color.setHex(theme.primary)
      mat.opacity = 0.7 + Math.sin(time / 180) * 0.25
    } else {
      mat.color.setHex(0x475569)
      mat.opacity = 0.35
    }
  }

  // 3. Animate Internal Moving Parts
  for (const part of ws.animatedParts) {
    if (part.type === 'bob' && part.baseY !== undefined) {
      const amplitude = status === 'current' ? 0.03 : 0.01
      const speed = status === 'current' ? 180 : 350
      part.mesh.position.y = part.baseY + Math.sin(time / speed) * amplitude
      part.mesh.rotation.y += status === 'current' ? 0.03 : 0.01
    } else if (part.type === 'spin') {
      part.mesh.rotation.y += status === 'current' ? 0.05 : 0.01
    }
  }
}

/**
 * Safely disposes workstation Three.js geometries and textures
 */
export function disposeWorkstation(ws: WorkstationModelInstance) {
  ws.screenTexture.dispose()
  ws.screenMaterial.dispose()
  for (const mat of ws.accentMaterials) {
    mat.dispose()
  }
  ws.rootGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.material instanceof THREE.Material) {
        child.material.dispose()
      }
    }
  })
}
