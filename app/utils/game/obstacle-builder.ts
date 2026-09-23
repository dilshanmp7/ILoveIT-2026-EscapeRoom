import * as THREE from 'three'

export interface ObstacleModelInstance {
  id: string
  sector: 1 | 2 | 3
  label: string
  rootGroup: THREE.Group
  animatedElements: {
    object: THREE.Object3D
    type: 'spin' | 'bob' | 'pulse'
    speed?: number
    baseY?: number
  }[]
  energyMaterials: THREE.MeshBasicMaterial[]
}

// Cached reusable geometries for performance
const cylGeos: Record<string, THREE.CylinderGeometry> = {}
function getCylGeo(rT: number, rB: number, h: number, seg = 16): THREE.CylinderGeometry {
  const key = `${rT}_${rB}_${h}_${seg}`
  if (!cylGeos[key]) cylGeos[key] = new THREE.CylinderGeometry(rT, rB, h, seg)
  return cylGeos[key]
}

const boxGeos: Record<string, THREE.BoxGeometry> = {}
function getBoxGeo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w}_${h}_${d}`
  if (!boxGeos[key]) boxGeos[key] = new THREE.BoxGeometry(w, h, d)
  return boxGeos[key]
}

const torusGeos: Record<string, THREE.TorusGeometry> = {}
function getTorusGeo(radius: number, tube: number, radialSeg = 8, tubularSeg = 24): THREE.TorusGeometry {
  const key = `${radius}_${tube}_${radialSeg}_${tubularSeg}`
  if (!torusGeos[key]) torusGeos[key] = new THREE.TorusGeometry(radius, tube, radialSeg, tubularSeg)
  return torusGeos[key]
}

// Sector Theme Palettes
const SECTOR_THEMES = {
  1: {
    primary: 0xf59e0b, // Amber Gold
    glow: 0xffcc00,
    dark: 0x78350f,
    chassis: 0x111827,
    trim: 0xd97706,
  },
  2: {
    primary: 0x06b6d4, // Cyan
    glow: 0x38bdf8,
    dark: 0x0e7490,
    chassis: 0x0f172a,
    trim: 0x0284c7,
  },
  3: {
    primary: 0xef4444, // Crimson Red
    glow: 0xf87171,
    dark: 0x991b1b,
    chassis: 0x180a0a,
    trim: 0xdc2626,
  },
}

/**
 * Procedurally builds a sector-themed high-tech solid obstacle
 */
export function createSectorObstacle(
  id: string,
  sector: 1 | 2 | 3,
  label: string
): ObstacleModelInstance {
  if (typeof document === 'undefined') {
    return {
      id,
      sector,
      label,
      rootGroup: new THREE.Group(),
      animatedElements: [],
      energyMaterials: [],
    }
  }

  const rootGroup = new THREE.Group()
  rootGroup.name = `obstacle_${id}`
  rootGroup.userData.isObstacle = true
  rootGroup.userData.obstacleId = id
  rootGroup.userData.sector = sector

  const theme = SECTOR_THEMES[sector]
  const animatedElements: ObstacleModelInstance['animatedElements'] = []
  const energyMaterials: THREE.MeshBasicMaterial[] = []

  // Shared Materials
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.8,
  })

  const chassisMat = new THREE.MeshStandardMaterial({
    color: theme.chassis,
    roughness: 0.45,
    metalness: 0.65,
  })

  const trimMat = new THREE.MeshStandardMaterial({
    color: theme.trim,
    roughness: 0.3,
    metalness: 0.85,
  })

  const energyGlowMat = new THREE.MeshBasicMaterial({
    color: theme.glow,
    transparent: true,
    opacity: 0.88,
  })
  energyMaterials.push(energyGlowMat)

  // 1. Heavy Industrial Base (Common to all sectors for solid grounding)
  const baseMesh = new THREE.Mesh(getCylGeo(0.52, 0.62, 0.22, 8), darkMetalMat)
  baseMesh.position.y = 0.11
  rootGroup.add(baseMesh)

  // Hazard border ring around base
  const baseRim = new THREE.Mesh(getCylGeo(0.54, 0.54, 0.06, 8), trimMat)
  baseRim.position.y = 0.23
  rootGroup.add(baseRim)

  // 2. Sector-Specific Core Architecture
  if (sector === 1) {
    // --- SECTOR 1: AURA Quantum Neural Containment Pylon ---
    // Octagonal main chassis column
    const column = new THREE.Mesh(getCylGeo(0.36, 0.42, 1.35, 8), chassisMat)
    column.position.y = 0.22 + 1.35 / 2
    rootGroup.add(column)

    // Vertical glowing energy conduits
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const conduit = new THREE.Mesh(getBoxGeo(0.06, 1.1, 0.05), energyGlowMat)
      conduit.position.set(Math.cos(angle) * 0.38, 0.9, Math.sin(angle) * 0.38)
      conduit.rotation.y = angle
      rootGroup.add(conduit)
    }

    // Floating containment ring at waist
    const ringMesh = new THREE.Mesh(getTorusGeo(0.46, 0.035, 8, 24), trimMat)
    ringMesh.rotation.x = Math.PI / 2
    ringMesh.position.y = 0.85
    rootGroup.add(ringMesh)
    animatedElements.push({
      object: ringMesh,
      type: 'spin',
      speed: 0.8,
    })

    // Glowing core crystal at top cap
    const topCap = new THREE.Mesh(getCylGeo(0.28, 0.36, 0.18, 8), darkMetalMat)
    topCap.position.y = 1.62
    rootGroup.add(topCap)

    const beaconCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), energyGlowMat)
    beaconCore.position.y = 1.82
    rootGroup.add(beaconCore)
    animatedElements.push({
      object: beaconCore,
      type: 'spin',
      speed: 1.5,
    })
    animatedElements.push({
      object: beaconCore,
      type: 'bob',
      baseY: 1.82,
    })
  } else if (sector === 2) {
    // --- SECTOR 2: CPH Cloud Routing Relay Bollard ---
    // Triple cluster of server conduits
    const clusterGroup = new THREE.Group()
    clusterGroup.position.y = 0.22
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3
      const cx = Math.cos(angle) * 0.22
      const cz = Math.sin(angle) * 0.22
      const subCol = new THREE.Mesh(getCylGeo(0.16, 0.16, 1.4, 12), chassisMat)
      subCol.position.set(cx, 0.7, cz)
      clusterGroup.add(subCol)

      // Glowing status band around each sub-column
      const band = new THREE.Mesh(getCylGeo(0.17, 0.17, 0.08, 12), energyGlowMat)
      band.position.set(cx, 0.95, cz)
      clusterGroup.add(band)
    }
    rootGroup.add(clusterGroup)

    // Central core connector
    const centerCore = new THREE.Mesh(getCylGeo(0.12, 0.12, 1.3, 8), darkMetalMat)
    centerCore.position.y = 0.92
    rootGroup.add(centerCore)

    // Rotating holographic scanner disc on top
    const scannerGroup = new THREE.Group()
    scannerGroup.position.y = 1.68

    const scannerDisc = new THREE.Mesh(getCylGeo(0.38, 0.38, 0.06, 16), trimMat)
    scannerGroup.add(scannerDisc)

    const scannerAntenna = new THREE.Mesh(getBoxGeo(0.05, 0.22, 0.05), energyGlowMat)
    scannerAntenna.position.set(0.24, 0.12, 0)
    scannerGroup.add(scannerAntenna)

    rootGroup.add(scannerGroup)
    animatedElements.push({
      object: scannerGroup,
      type: 'spin',
      speed: 2.0,
    })
  } else {
    // --- SECTOR 3: Cyber Vault Zero-Trust Monolith ---
    // Heavy angular monolithic tower
    const tower = new THREE.Mesh(getBoxGeo(0.68, 1.5, 0.68), chassisMat)
    tower.position.y = 0.22 + 1.5 / 2
    rootGroup.add(tower)

    // 4 Corner armor reinforcement brackets
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4
      const bx = Math.cos(angle) * 0.42
      const bz = Math.sin(angle) * 0.42
      const bracket = new THREE.Mesh(getBoxGeo(0.12, 1.4, 0.12), darkMetalMat)
      bracket.position.set(bx, 0.95, bz)
      rootGroup.add(bracket)
    }

    // Glowing laser-warning emitter strips on all 4 faces
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      const slit = new THREE.Mesh(getBoxGeo(0.32, 0.06, 0.04), energyGlowMat)
      slit.position.set(Math.cos(angle) * 0.35, 1.1, Math.sin(angle) * 0.35)
      slit.rotation.y = angle
      rootGroup.add(slit)

      const slit2 = new THREE.Mesh(getBoxGeo(0.24, 0.04, 0.04), energyGlowMat)
      slit2.position.set(Math.cos(angle) * 0.35, 0.65, Math.sin(angle) * 0.35)
      slit2.rotation.y = angle
      rootGroup.add(slit2)
    }

    // Rotating warning beacon assembly on top
    const beaconHead = new THREE.Group()
    beaconHead.position.y = 1.76

    const beaconBase = new THREE.Mesh(getCylGeo(0.22, 0.26, 0.14, 12), trimMat)
    beaconHead.add(beaconBase)

    const beaconDome = new THREE.Mesh(getCylGeo(0.15, 0.18, 0.22, 12), energyGlowMat)
    beaconDome.position.y = 0.15
    beaconHead.add(beaconDome)

    rootGroup.add(beaconHead)
    animatedElements.push({
      object: beaconHead,
      type: 'spin',
      speed: 3.0,
    })
    animatedElements.push({
      object: beaconHead,
      type: 'pulse',
    })
  }

  return {
    id,
    sector,
    label,
    rootGroup,
    animatedElements,
    energyMaterials,
  }
}

/**
 * Animates obstacle rotating components, glowing pulse, and warning beacons
 */
export function updateObstaclesAnimation(
  obstacles: ObstacleModelInstance[],
  time: number
) {
  const pulseVal = 0.75 + Math.sin(time / 200) * 0.25
  const bobOffset = Math.sin(time / 240) * 0.05

  for (const obs of obstacles) {
    // Pulse energy materials
    for (const mat of obs.energyMaterials) {
      mat.opacity = pulseVal
    }

    // Animate parts
    for (const item of obs.animatedElements) {
      if (item.type === 'spin') {
        const speed = item.speed || 1.0
        item.object.rotation.y += 0.02 * speed
      } else if (item.type === 'bob' && item.baseY !== undefined) {
        item.object.position.y = item.baseY + bobOffset
      } else if (item.type === 'pulse') {
        const scaleVal = 1.0 + Math.sin(time / 180) * 0.08
        item.object.scale.set(scaleVal, scaleVal, scaleVal)
      }
    }
  }
}

