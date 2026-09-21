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
  EscapeRoomQuestion,
  EventType,
  Floorplan,
  GameObjectInstance,
  GameSession,
  LevelProgress,
  ObjectActionContext,
  ObjectActionDefinition,
  ObjectEventContext,
  ObjectQuizSuccess,
  ObjectVisualStateType,
  Player,
  QuizQuestion,
} from "#shared/game/types";
import { ESCAPE_ROOM_QUESTIONS, getRandomQuestionsForLevel } from "#shared/game/questions-data";
import {
  createSectorWorkstation,
  disposeWorkstation,
  updateWorkstationVisualState,
  type WorkstationModelInstance,
} from "~/utils/game/workstation-builder";
import * as THREE from "three";
import { reactive, readonly, shallowRef } from "vue";

function createObjectId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface SectorObjective {
  id: string;
  label: string;
  shortLabel: string;
  questionId?: string;
  position: { x: number; z: number };
}

export interface PathNodeState {
  id: string;
  step: number;
  label: string;
  shortLabel: string;
  x: number;
  z: number;
  solved: boolean;
  isCurrent: boolean;
  isGate: boolean;
  isKey?: boolean;
}

export const SECTOR_OBJECTIVES: Record<1 | 2 | 3, SectorObjective[]> = {
  1: [
    { id: "term_l1_1", label: "AURA Gen-AI Diagnostic Station 1", shortLabel: "Station 1", position: { x: -13.5, z: -3.8 } },
    { id: "term_l1_2", label: "AURA Gen-AI Diagnostic Station 2", shortLabel: "Station 2", position: { x: -7.5, z: 3.5 } },
    { id: "term_l1_3", label: "AURA Gen-AI Diagnostic Station 3", shortLabel: "Station 3", position: { x: -7.5, z: -3.8 } },
    { id: "term_l1_4", label: "AURA Gen-AI Diagnostic Station 4", shortLabel: "Station 4", position: { x: -13.0, z: 3.5 } },
    { id: "term_l1_5", label: "AURA Gen-AI Diagnostic Station 5", shortLabel: "Station 5", position: { x: -10.5, z: -0.5 } },
    { id: "key_admin", label: "AURA Clearance Keycard", shortLabel: "Security Key", position: { x: -6.5, z: 2.0 } },
    { id: "slide_door_1", label: "Sector 1 Security Gate", shortLabel: "Gate 1", position: { x: -5, z: 0 } },
  ],
  2: [
    { id: "term_l2_1", label: "CPH Apps: GUS Butterfly Blue Terminal", shortLabel: "GUS Blue", position: { x: -3.5, z: -3.8 } },
    { id: "term_l2_2", label: "CPH Apps: Sherloc Logistics Hub", shortLabel: "Sherloc", position: { x: 3.2, z: 3.5 } },
    { id: "term_l2_3", label: "CPH Apps: App Incident Response Desk", shortLabel: "App Team", position: { x: 3.2, z: -3.8 } },
    { id: "term_l2_4", label: "CPH Apps: ServiceNow Incident Console", shortLabel: "ServiceNow", position: { x: -3.5, z: 3.5 } },
    { id: "term_l2_5", label: "CPH Apps: Power Automate & UAT Hub", shortLabel: "Power Auto", position: { x: 0.0, z: -0.5 } },
    { id: "key_sector_2", label: "Firewall Security Token", shortLabel: "Firewall Key", position: { x: 3.5, z: 2.0 } },
    { id: "slide_door_2", label: "Sector 2 Firewall Gate", shortLabel: "Gate 2", position: { x: 5, z: 0 } },
  ],
  3: [
    { id: "term_l3_1", label: "Cyber Vault: Phishing Detection Sentinel", shortLabel: "Phishing", position: { x: 6.8, z: -3.8 } },
    { id: "term_l3_2", label: "Cyber Vault: Email Domain Authenticator", shortLabel: "Domains", position: { x: 12.8, z: 3.5 } },
    { id: "term_l3_3", label: "Cyber Vault: Password Cryptography Console", shortLabel: "Passwords", position: { x: 12.8, z: -3.8 } },
    { id: "term_l3_4", label: "Cyber Vault: Data Classification Sentinel", shortLabel: "Data Class", position: { x: 6.8, z: 3.5 } },
    { id: "term_l3_5", label: "Cyber Vault: Zscaler & Remote Access Pod", shortLabel: "Zscaler", position: { x: 9.8, z: -0.5 } },
    { id: "key_sector_3", label: "Master Override Cryptokey", shortLabel: "Master Key", position: { x: 11.5, z: 2.0 } },
    { id: "final_escape_hatch", label: "Master Dispatch Hatch", shortLabel: "Hatch", position: { x: 13.5, z: 0 } },
  ],
};

function createStationLabelTexture(
  step: number,
  label: string,
  status: string,
  isGate: boolean,
  isKey: boolean = false,
): THREE.CanvasTexture {
  if (typeof document === "undefined") return new THREE.CanvasTexture(new Image());
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 160);

  const r = 24;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, r);

  if (status === "completed") {
    ctx.fillStyle = "rgba(6, 78, 59, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 8;
    ctx.stroke();

    const stepStr = step < 10 ? `0${step}` : `${step}`;
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 32px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let title = `✔ ${stepStr} [COMPLETED]`;
    if (isGate) title = "🔓 UNLOCKED // PROCEED";
    else if (isKey) title = "✔ KEY ACQUIRED";
    ctx.fillText(title, 256, 48);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'Courier New', monospace";
    ctx.fillText(label, 256, 105);
  } else if (status === "current") {
    ctx.fillStyle = "rgba(120, 53, 15, 0.96)";
    ctx.fill();
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 10;
    ctx.stroke();

    const stepStr = step < 10 ? `0${step}` : `${step}`;
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 32px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let title = `▶ ${stepStr} [ACTIVE OBJECTIVE]`;
    if (isGate) title = "▶ SWIPE KEY TO UNLOCK ➔";
    else if (isKey) title = "▶ 🔑 GRAB KEY [E] ◀";
    ctx.fillText(title, 256, 48);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'Courier New', monospace";
    ctx.fillText(label, 256, 105);
  } else {
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 6;
    ctx.stroke();

    const stepStr = step < 10 ? `0${step}` : `${step}`;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 30px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let title = `🔒 ${stepStr} [UPCOMING]`;
    if (isGate) title = "🔒 LOCKED // CLEARS AT 5/5";
    else if (isKey) title = "🔒 KEY ENCRYPTED [STANDBY]";
    ctx.fillText(title, 256, 48);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "26px 'Courier New', monospace";
    ctx.fillText(label, 256, 105);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const initialState = () => ({
  score: 0,
  runningTime: 0,
  timeRemaining: 300,
  isTimedOut: false,
  currentLevel: 1 as 1 | 2 | 3,
  levelTitle: "Sector 1: AURA Gen-AI Core (Amber Alert)",
  solvedCountInLevel: 0,
  totalInLevel: 5,
  totalSolved: 0,
  hintsUsed: 0,
  nearbyLabel: "",
  nearbyId: "",
  currentObjectiveLabel: "AURA Gen-AI Fundamentals Console",
  currentObjectiveDistance: 0,
  currentObjectiveId: "term_l1_1",
  pathNodes: [] as PathNodeState[],
  playerPosition: { x: -10, z: 1 },
  mapModalOpen: false,
  holding: "",
  holdingConfigured: false,
  canGrab: false,
  canUse: false,
  quiz: null as EscapeRoomQuestion | null,
  quizOpen: false,
  quizHintRevealed: false,
  quizFeedback: null as {
    isCorrect: boolean;
    explanation: string;
    scoreAwarded: number;
  } | null,
  levelClearedModal: null as {
    level: number;
    title: string;
    message: string;
  } | null,
  missionBriefingOpen: false,
  finished: false,
  objectSelectionOpen: false,
  objectSelectionOptions: [] as { id: string; label: string; type: string }[],
  actionSelectionOpen: false,
  actionSelectionOptions: [] as { id: string; label: string; type: string }[],
  message: "",
  userCode: "",
  playerName: "",
  playerDepartment: "",
  playerShift: "",
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
  let autoSaveTimer: ReturnType<typeof setInterval> | undefined;
  let lastFrame = 0;
  let heldItem: GameObjectInstance | null = null;
  let pendingQuizSuccess: ObjectQuizSuccess | undefined;
  let pendingQuizAssetId = "";
  let isPushing = false;
  let nearby: GameObjectInstance | null = null;
  let floorplan: Floorplan = { layout: [], playerSpawn: { x: -10, z: 1 } };
  let joystick = { x: 0, y: 0 };
  let pendingPlayerSpawn: { x: number; z: number } | null = null;
  let removeListeners: (() => void) | undefined;
  let onSaveCallback: ((snapshot: {
    score: number;
    timeSpentSeconds: number;
    currentLevel: 1 | 2 | 3;
    hintsUsed: number;
    levelProgress: LevelProgress;
    completed: boolean;
  }) => void) | undefined;

  let levelProgress: LevelProgress = {
    currentLevel: 1,
    solvedQuestionIds: [],
    hintUsedQuestionIds: [],
    level1Questions: getRandomQuestionsForLevel(1, 5),
    level2Questions: getRandomQuestionsForLevel(2, 5),
    level3Questions: getRandomQuestionsForLevel(3, 5),
    attemptsByQuestionId: {},
  };

  function getSectorObjectives(level: 1 | 2 | 3): SectorObjective[] {
    const baseObjectives = SECTOR_OBJECTIVES[level] || [];
    let questionsForLevel: EscapeRoomQuestion[] = [];
    if (level === 1) {
      if (!levelProgress.level1Questions?.length) {
        levelProgress.level1Questions = getRandomQuestionsForLevel(1, 5);
      }
      questionsForLevel = levelProgress.level1Questions;
    } else if (level === 2) {
      if (!levelProgress.level2Questions?.length) {
        levelProgress.level2Questions = getRandomQuestionsForLevel(2, 5);
      }
      questionsForLevel = levelProgress.level2Questions;
    } else {
      if (!levelProgress.level3Questions?.length) {
        levelProgress.level3Questions = getRandomQuestionsForLevel(3, 5);
      }
      questionsForLevel = levelProgress.level3Questions;
    }

    return baseObjectives.map((obj) => {
      const match = obj.id.match(/term_l\d_(\d)/);
      if (match) {
        const stepIdx = parseInt(match[1]!, 10) - 1;
        const q = questionsForLevel[stepIdx];
        if (q) {
          return {
            ...obj,
            questionId: q.id,
          };
        }
      }
      return obj;
    });
  }

  function getQuestionIdForTerminal(terminalId: string): string | undefined {
    const sectorObjs = getSectorObjectives(levelProgress.currentLevel);
    const station = sectorObjs.find((o) => o.id === terminalId);
    return station?.questionId;
  }

  const keys = new Set<string>();
  const objectInstances = new Map<string, GameObjectInstance>();
  const bodies: PhysicalBody[] = physics.bodies;
  const occludableMeshes: THREE.Group[] = [];
  const occlusionRaycaster = new THREE.Raycaster();
  const terminalBeacons: THREE.Mesh[] = [];

  const stationHolograms: {
    sprite: THREE.Sprite;
    id: string;
    step: number;
    label: string;
    currentStatus: string;
  }[] = [];
  const stationFloorRings: { mesh: THREE.Mesh; id: string }[] = [];
  const sectorWorkstations = new Map<string, WorkstationModelInstance>();
  let stationDecorGroup: THREE.Group | null = null;

  function updatePathNodes() {
    const objectives = getSectorObjectives(levelProgress.currentLevel);
    const currentObj = getCurrentSectorObjective();

    state.currentObjectiveId = currentObj?.id || "";

    state.pathNodes = objectives.map((obj, idx) => {
      const isKey = obj.id.startsWith("key_");
      const isGate = obj.id.startsWith("slide_door_") || obj.id === "final_escape_hatch";
      let solved = false;
      if (obj.questionId) {
        solved = levelProgress.solvedQuestionIds.includes(obj.questionId);
      } else if (isKey) {
        solved = Boolean(heldItem?.type === "key" || !objectInstances.has(obj.id));
      } else if (isGate) {
        const gateInstance = objectInstances.get(obj.id);
        solved = gateInstance?.state === "opened";
      }
      const isCurrent = Boolean(currentObj && currentObj.id === obj.id);

      return {
        id: obj.id,
        step: idx + 1,
        label: obj.label,
        shortLabel: obj.shortLabel,
        x: obj.position.x,
        z: obj.position.z,
        solved,
        isCurrent,
        isGate,
        isKey,
      };
    });
  }

  function updateLevelStats() {
    const currentQuestions = getCurrentLevelQuestions();
    const solvedInLevel = currentQuestions.filter((q) =>
      levelProgress.solvedQuestionIds.includes(q.id),
    ).length;

    state.currentLevel = levelProgress.currentLevel;
    state.solvedCountInLevel = solvedInLevel;
    state.totalInLevel = currentQuestions.length || 5;
    state.totalSolved = levelProgress.solvedQuestionIds.length;
    state.hintsUsed = levelProgress.hintUsedQuestionIds.length;

    if (state.currentLevel === 1) {
      state.levelTitle = "Sector 1: AURA Gen-AI Core (Amber Alert)";
    } else if (state.currentLevel === 2) {
      state.levelTitle = "Sector 2: CPH Applications Command (Cyan Grid)";
    } else {
      state.levelTitle = "Sector 3: Cyber Security Vault (Crimson Alert)";
    }

    updatePathNodes();
  }

  function getCurrentLevelQuestions(): EscapeRoomQuestion[] {
    if (levelProgress.currentLevel === 1) {
      if (!levelProgress.level1Questions?.length) {
        levelProgress.level1Questions = getRandomQuestionsForLevel(1, 5);
      }
      return levelProgress.level1Questions;
    }
    if (levelProgress.currentLevel === 2) {
      if (!levelProgress.level2Questions?.length) {
        levelProgress.level2Questions = getRandomQuestionsForLevel(2, 5);
      }
      return levelProgress.level2Questions;
    }
    if (!levelProgress.level3Questions?.length) {
      levelProgress.level3Questions = getRandomQuestionsForLevel(3, 5);
    }
    return levelProgress.level3Questions;
  }

  function getNextUnsolvedQuestion(): EscapeRoomQuestion | null {
    const list = getCurrentLevelQuestions();
    const unsolved = list.find(
      (q) => !levelProgress.solvedQuestionIds.includes(q.id),
    );
    return unsolved || list[0] || null;
  }

  function getCurrentSectorObjective(): SectorObjective | null {
    const objectives = getSectorObjectives(levelProgress.currentLevel);
    if (!objectives) return null;

    // 1. Any unsolved question terminals in the sector first
    for (const obj of objectives) {
      if (obj.questionId && !levelProgress.solvedQuestionIds.includes(obj.questionId)) {
        return obj;
      }
    }

    // 2. All 5 terminals are solved!
    const keyObj = objectives.find((o) => o.id.startsWith("key_"));
    const gateObj = objectives.find((o) => o.id.startsWith("slide_door_") || o.id === "final_escape_hatch");

    // If player is holding a key, guide them to the security gate
    if (heldItem?.type === "key") {
      return gateObj || keyObj || null;
    }

    // If the gate is already opened, guide through the gate
    if (gateObj) {
      const gateInstance = objectInstances.get(gateObj.id);
      if (gateInstance?.state === "opened") {
        return gateObj;
      }
    }

    // Otherwise, guide them to grab the decrypted key
    return keyObj || gateObj || null;
  }

  function updateObjectiveTracking() {
    if (!player) return;

    const currentObj = getCurrentSectorObjective();
    if (!currentObj) {
      state.currentObjectiveLabel = "";
      state.currentObjectiveDistance = 0;
      return;
    }

    const playerPos = player.mesh.position;
    const targetX = currentObj.position.x;
    const targetZ = currentObj.position.z;

    const dx = targetX - playerPos.x;
    const dz = targetZ - playerPos.z;
    const totalDistance = Math.hypot(dx, dz);

    state.currentObjectiveLabel = currentObj.label;
    state.currentObjectiveDistance = Math.round(totalDistance * 10) / 10;
  }

  function initStationTrackAndHolograms() {
    if (!scene) return;
    if (stationDecorGroup) scene.remove(stationDecorGroup);
    stationDecorGroup = new THREE.Group();
    stationDecorGroup.name = "stationDecor";
    stationHolograms.length = 0;
    stationFloorRings.length = 0;

    const objectives = getSectorObjectives(levelProgress.currentLevel);

    // Create Floor Rings and 3D Floating Holograms for each node
    for (let i = 0; i < objectives.length; i++) {
      const obj = objectives[i]!;
      const isKey = obj.id.startsWith("key_");
      const isGate = obj.id.startsWith("slide_door_") || obj.id === "final_escape_hatch";
      const step = i + 1;

      // Glowing ground ring
      const innerR = isKey ? 0.55 : 0.75;
      const outerR = isKey ? 0.72 : 0.9;
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(obj.position.x, 0.025, obj.position.z);
      stationDecorGroup.add(ringMesh);
      stationFloorRings.push({ mesh: ringMesh, id: obj.id });

      // Floating 3D Sprite Hologram above station
      const spriteMat = new THREE.SpriteMaterial({
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      const spriteY = isGate ? 3.0 : (isKey ? 1.8 : 2.7);
      const spriteScaleX = isGate ? 2.0 : (isKey ? 1.6 : 1.7);
      const spriteScaleY = isGate ? 0.6 : (isKey ? 0.5 : 0.52);
      sprite.position.set(obj.position.x, spriteY, obj.position.z);
      sprite.scale.set(spriteScaleX, spriteScaleY, 1);
      stationDecorGroup.add(sprite);
      stationHolograms.push({
        sprite,
        id: obj.id,
        step,
        label: obj.shortLabel,
        currentStatus: "",
      });
    }

    scene.add(stationDecorGroup);
    updateStationVisualStates(0);
  }

  function updateStationVisualStates(time: number) {
    const objectives = getSectorObjectives(levelProgress.currentLevel);
    const currentObj = getCurrentSectorObjective();

    for (const item of stationHolograms) {
      const obj = objectives.find((o) => o.id === item.id);
      if (!obj) continue;

      const isKey = obj.id.startsWith("key_");
      const isGate = obj.id.startsWith("slide_door_") || obj.id === "final_escape_hatch";
      let status = "locked";
      if (obj.questionId) {
        if (levelProgress.solvedQuestionIds.includes(obj.questionId)) {
          status = "completed";
        } else if (currentObj && currentObj.id === obj.id) {
          status = "current";
        } else {
          status = "locked";
        }
      } else if (isKey) {
        const isHoldingKey = heldItem?.type === "key" || !objectInstances.has(obj.id);
        if (isHoldingKey) {
          status = "completed";
        } else if (currentObj && currentObj.id === obj.id) {
          status = "current";
        } else {
          status = "locked";
        }
      } else if (isGate) {
        const gateInstance = objectInstances.get(obj.id);
        if (gateInstance?.state === "opened") {
          status = "completed";
        } else if (currentObj && currentObj.id === obj.id) {
          status = "current";
        } else {
          status = "locked";
        }
      }

      if (item.currentStatus !== status) {
        item.currentStatus = status;
        const oldTex = item.sprite.material.map;
        if (oldTex) oldTex.dispose();
        item.sprite.material.map = createStationLabelTexture(item.step, item.label, status, isGate, isKey);
        item.sprite.material.needsUpdate = true;
      }

      if (status === "current") {
        const baseY = isGate ? 3.0 : (isKey ? 1.8 : 2.7);
        item.sprite.position.y = baseY + Math.sin(time / 200) * 0.1;
      }
    }

    // Update ground rings
    for (const ring of stationFloorRings) {
      const obj = objectives.find((o) => o.id === ring.id);
      if (!obj) continue;
      const mat = ring.mesh.material as THREE.MeshBasicMaterial;
      const isKey = obj.id.startsWith("key_");
      const isGate = obj.id.startsWith("slide_door_") || obj.id === "final_escape_hatch";

      if (obj.questionId) {
        if (levelProgress.solvedQuestionIds.includes(obj.questionId)) {
          mat.color.setHex(0x10b981);
          mat.opacity = 0.8;
          ring.mesh.scale.set(1, 1, 1);
        } else if (currentObj && currentObj.id === obj.id) {
          mat.color.setHex(0xffcc00);
          mat.opacity = 0.9;
          const pulse = 1.0 + Math.sin(time / 180) * 0.08;
          ring.mesh.scale.set(pulse, pulse, pulse);
        } else {
          mat.color.setHex(0x475569);
          mat.opacity = 0.4;
          ring.mesh.scale.set(1, 1, 1);
        }
      } else if (isKey) {
        const isHoldingKey = heldItem?.type === "key" || !objectInstances.has(obj.id);
        if (isHoldingKey) {
          mat.color.setHex(0x10b981);
          mat.opacity = 0.6;
          ring.mesh.scale.set(1, 1, 1);
        } else if (currentObj && currentObj.id === obj.id) {
          mat.color.setHex(0xffcc00);
          mat.opacity = 0.95;
          const pulse = 1.0 + Math.sin(time / 150) * 0.12;
          ring.mesh.scale.set(pulse, pulse, pulse);
        } else {
          mat.color.setHex(0x475569);
          mat.opacity = 0.35;
          ring.mesh.scale.set(1, 1, 1);
        }
      } else if (isGate) {
        const gateInstance = objectInstances.get(obj.id);
        if (gateInstance?.state === "opened") {
          mat.color.setHex(0x10b981);
          mat.opacity = 0.8;
          ring.mesh.scale.set(1, 1, 1);
        } else if (currentObj && currentObj.id === obj.id) {
          mat.color.setHex(0xffcc00);
          mat.opacity = 0.95;
          const pulse = 1.0 + Math.sin(time / 180) * 0.1;
          ring.mesh.scale.set(pulse, pulse, pulse);
        } else {
          mat.color.setHex(0x475569);
          mat.opacity = 0.4;
          ring.mesh.scale.set(1, 1, 1);
        }
      }
    }

    // Update 3D Sector Workstations (screens, LED trims, bobbing accessories)
    for (const [termId, ws] of sectorWorkstations) {
      const obj = objectives.find((o) => o.id === termId);
      let status: 'locked' | 'current' | 'completed' = 'locked';
      if (obj?.questionId) {
        if (levelProgress.solvedQuestionIds.includes(obj.questionId)) {
          status = 'completed';
        } else if (currentObj && currentObj.id === termId) {
          status = 'current';
        } else {
          status = 'locked';
        }
      }
      updateWorkstationVisualState(ws, status, time);
    }
  }

  async function buildFloorplan() {
    if (!scene) return;
    for (const ws of sectorWorkstations.values()) {
      disposeWorkstation(ws);
    }
    sectorWorkstations.clear();

    const previousInstances = new Map(objectInstances);
    objectInstances.clear();
    bodies.splice(0);
    occludableMeshes.splice(0);
    terminalBeacons.splice(0);
    physics = new GamePhysics();
    for (const child of [...scene.children]) {
      if (child.userData.courierAsset || child.userData.isBeacon) scene.remove(child);
    }

    for (const record of floorplan.layout.map((item) => ({ ...item }))) {
      const asset = hydrateGameObject(record);
      const previous = previousInstances.get(asset.id);
      const instance = asset;
      instance.state = previous?.state || (asset.isOpen ? "opened" : "onFloor");
      instance.mesh = null;
      instance.heldItem = previous?.heldItem || null;
      objectInstances.set(asset.id, instance);

      let mesh: THREE.Group | null = null;
      if (asset.id.startsWith("term_l")) {
        const parts = asset.id.split("_");
        const sectorNum = Number.parseInt(parts[1]?.replace("l", "") || "1", 10) as 1 | 2 | 3;
        const stepNum = Number.parseInt(parts[2] || "1", 10);
        const objDef = (getSectorObjectives(sectorNum) || []).find((o) => o.id === asset.id);
        const label = objDef?.label || asset.label || `Sector ${sectorNum} Station ${stepNum}`;
        const shortLabel = objDef?.shortLabel || `Station ${stepNum}`;

        const ws = createSectorWorkstation(asset.id, sectorNum, stepNum, label, shortLabel);
        sectorWorkstations.set(asset.id, ws);
        mesh = ws.rootGroup;
      } else {
        mesh = await loadMapObjectModel(instance, instance.state);
      }
      instance.mesh = mesh;
      if (mesh) {
        mesh.position.set(asset.position.x, 0, asset.position.z);
        mesh.rotation.y = THREE.MathUtils.degToRad(asset.position.rotation);
        mesh.userData.courierAsset = true;
        scene.add(mesh);
        occludableMeshes.push(mesh);

        // Add visual glowing beacon diamond over active puzzle terminals
        if (asset.type === "riddle" || (asset.type === "config_desk" && !asset.id.includes("admin"))) {
          const beaconGeo = new THREE.OctahedronGeometry(0.22);
          const beaconMat = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            wireframe: false,
          });
          const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
          beaconMesh.position.set(asset.position.x, 2.2, asset.position.z);
          beaconMesh.userData.isBeacon = true;
          beaconMesh.userData.terminalId = asset.id;
          scene.add(beaconMesh);
          terminalBeacons.push(beaconMesh);
        }
      }

      if (!(instance.isBarrier() && instance.state === "opened") && asset.type !== "key") {
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

    // Pre-open doors according to current level
    if (levelProgress.currentLevel >= 2) {
      await setObjectState("slide_door_1", "opened");
      floorplan.layout = floorplan.layout.filter((a) => a.id !== "key_admin");
      objectInstances.delete("key_admin");
    }
    if (levelProgress.currentLevel >= 3) {
      await setObjectState("slide_door_2", "opened");
      floorplan.layout = floorplan.layout.filter((a) => a.id !== "key_sector_2");
      objectInstances.delete("key_sector_2");
    }
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
    if (instance.isBarrier() && nextState === "opened") {
      removeBodyForAsset(assetId);
    }
  }

  function emitGameEvent(event: EventType, emitter: GameObjectInstance) {
    if (event === "escape_hatch_triggered") {
      const isHatchOpened = emitter.state === "opened";
      if (isHatchOpened) {
        state.finished = true;
        sound.play("deliver");
        triggerSave();
      } else {
        state.message = "🔒 The Master Dispatch Hatch is locked! Complete all 5 Sector 3 cybersecurity protocols and swipe the Master Override Cryptokey here.";
      }
      return;
    }

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
    isPushing = physics.movePlayerWithInput(player, x, z, 0.13);
    if (heldItem?.dragAssetId) {
      const draggedBody = bodies.find(
        (body) => body.assetId === heldItem?.dragAssetId,
      );
      if (draggedBody) physics.dragBodyToPlayer(draggedBody, player);
    }
    physics.syncObjectPositions(floorplan.layout);
    return true;
  }

  function updateNearby() {
    if (!player) return;

    nearby = physics.findNearby(player, objectInstances.values());
    if (state.nearbyId !== (nearby?.id ?? "")) {
      state.nearbyId = nearby?.id || "";
      let label = nearby?.label || "";
      const qId = nearby?.id ? getQuestionIdForTerminal(nearby.id) : undefined;
      const currentObj = getCurrentSectorObjective();
      const sectorObjs = getSectorObjectives(levelProgress.currentLevel);
      const isSectorStation = sectorObjs.some((o) => o.id === nearby?.id && o.questionId);

      if (qId && levelProgress.solvedQuestionIds.includes(qId)) {
        label += " [✔ COMPLETED]";
      } else if (isSectorStation && currentObj && nearby?.id !== currentObj.id) {
        label += ` [🔒 LOCKED // ACTIVE: ${currentObj.shortLabel || currentObj.label}]`;
      } else if (nearby?.type === "key" || (nearby?.id.startsWith("key_") ?? false)) {
        const currentQuestions = getCurrentLevelQuestions();
        const solvedInLevel = currentQuestions.filter((q) =>
          levelProgress.solvedQuestionIds.includes(q.id),
        ).length;
        if (solvedInLevel < currentQuestions.length) {
          label += ` [🔒 ENCRYPTED (${solvedInLevel}/${currentQuestions.length})]`;
        } else {
          label += " [🔓 ACTIVATED - PRESS E TO GRAB]";
        }
      } else if (nearby?.type === "door") {
        if (nearby.state === "opened") {
          label += " [🔓 GATE OPEN - PROCEED]";
        } else if (heldItem?.type === "key") {
          label += " [🔑 READY TO UNLOCK - PRESS SPACE OR E]";
        } else {
          label += " [🔒 LOCKED // REQUIRES KEYCARD]";
        }
      } else if (nearby?.type === "delivery") {
        if (nearby.state === "opened") {
          label += " [🚀 HATCH OPEN - ESCAPE ROUTE]";
        } else if (heldItem?.type === "key") {
          label += " [🔑 READY TO DEPRESSURIZE - PRESS SPACE OR E]";
        } else {
          label += " [🔒 LOCKED // REQUIRES MASTER CRYPTOKEY]";
        }
      }
      state.nearbyLabel = label;
      const isKey = nearby?.type === "key" || (nearby?.id.startsWith("key_") ?? false);
      let canGrabKey = true;
      if (isKey) {
        const currentQuestions = getCurrentLevelQuestions();
        const solvedInLevel = currentQuestions.filter((q) =>
          levelProgress.solvedQuestionIds.includes(q.id),
        ).length;
        canGrabKey = solvedInLevel >= currentQuestions.length;
      }
      state.canGrab = Boolean(!heldItem && nearby?.canBeGrabbed() && canGrabKey);
      state.canUse = getAvailableActions().length > 0;
    }
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
    const targetNearby = nearby;
    droppedItem.dragAssetId = undefined;
    player.mesh
      .getObjectByName("holdingSlot")
      ?.remove(droppedItem.mesh || new THREE.Group());
    if (!targetSlot || !targetSlot.consumeOnDrop) {
      targetNearby.heldItem = droppedItem;
      targetNearby.mesh?.add(droppedItem.mesh || new THREE.Group());
      droppedItem.mesh?.position.set(0, getSurfaceHeight(targetNearby), 0);
    }
    if (targetSlot?.insertedState)
      await setObjectState(targetNearby.id, targetSlot.insertedState);
    heldItem = null;
    state.holding = "";
    state.holdingConfigured = false;
    sound.play("drop");

    // Escape room door swipe handling
    if (droppedItem.type === "key") {
      if (targetNearby.id === "slide_door_1") {
        sound.play("unlock");
        await handleLevelCompletion(1);
      } else if (targetNearby.id === "slide_door_2") {
        sound.play("unlock");
        await handleLevelCompletion(2);
      } else if (targetNearby.id === "final_escape_hatch") {
        sound.play("unlock");
        await handleLevelCompletion(3);
        state.finished = true;
        sound.play("deliver");
      }
    }

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
    if (!nearby) return;

    const isKey = nearby.type === "key" || (nearby.id?.startsWith("key_") ?? false);
    const canBeGrabbed = isKey || Boolean(nearby.canBeGrabbed?.()) || Boolean(nearby.canHold);

    if (!canBeGrabbed) {
      await useNearby();
      return;
    }

    if (nearby.heldItem) {
      heldItem = nearby.heldItem;
      nearby.heldItem = null;
      if (heldItem && nearby.canBePushed()) heldItem.dragAssetId = nearby.id;
      if (heldItem?.mesh) {
        nearby.mesh?.remove(heldItem.mesh);
        player?.mesh.getObjectByName("holdingSlot")?.add(heldItem.mesh);
        heldItem.mesh.position.set(0, 0, 0);
      }
    } else if (isKey || nearby.getSourceType() || nearby.canBeGrabbed()) {
      if (isKey) {
        const currentQuestions = getCurrentLevelQuestions();
        const solvedInLevel = currentQuestions.filter((q) =>
          levelProgress.solvedQuestionIds.includes(q.id),
        ).length;
        if (solvedInLevel < currentQuestions.length) {
          sound.play("type");
          state.message = `🔒 Clearance Key Encrypted! Solve all 5 sector terminals (${solvedInLevel}/${currentQuestions.length} completed) to activate this key.`;
          return;
        }
      }

      const sourceType = nearby.getSourceType() || nearby.type;
      const itemLabel = nearby.label || `Held ${sourceType}`;
      const item = hydrateGameObject({
        id: createObjectId(nearby.id),
        type: sourceType,
        position: { x: 0, z: 0, rotation: 0 },
        w: 1,
        d: 1,
        label: itemLabel,
        allowGrab: true,
        keyId: nearby.keyId,
      });
      item.keyId = nearby.keyId;
      item.configured = false;
      await item.loadMesh("grabbed");
      heldItem = item;
      removePickedUpAsset(nearby.id);
      if (isKey) {
        state.message = "🔑 Security Key acquired! Carry it to the security gate reader and press Space or Action to unlock.";
      }
    }
    state.holding = heldItem?.label || heldItem?.type || "";
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
    const existing = objectInstances.get(assetId);
    if (existing?.mesh && scene) {
      scene.remove(existing.mesh);
      const occludeIdx = occludableMeshes.indexOf(existing.mesh);
      if (occludeIdx !== -1) occludableMeshes.splice(occludeIdx, 1);
    }
    removeBodyForAsset(assetId);
    objectInstances.delete(assetId);

    if (nearby?.id === assetId) {
      nearby = null;
      state.nearbyId = "";
      state.nearbyLabel = "";
      state.canGrab = false;
      state.canUse = false;
    }
    updatePathNodes();
    if (stationDecorGroup) {
      updateStationVisualStates(0);
    }
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
      position: { x, z, rotation: 0 },
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

  function deliverHeldItem() {
    heldItem = null;
    state.holding = "";
    state.holdingConfigured = false;
    state.score += 150;
    state.finished = true;
    sound.play("deliver");
    triggerSave();
  }

  async function useNearby() {
    if (state.actionSelectionOpen) return;
    if (heldItem && nearby && (await acceptHeldItem())) return;
    if (!nearby) return;

    const isKey = nearby.type === "key" || (nearby.id?.startsWith("key_") ?? false);
    if (isKey || (!heldItem && state.canGrab)) {
      await triggerGrabDrop();
      return;
    }

    // Direct terminal challenge handling: open quiz directly without action selection modal
    const qId = getQuestionIdForTerminal(nearby.id);
    const isTerminal = Boolean(qId) || nearby.id.startsWith("term_l") || nearby.type === "riddle";
    if (isTerminal) {
      openQuiz();
      return;
    }

    const actions = getAvailableActions();
    if (!actions.length) {
      if (nearby.canBeGrabbed?.() || nearby.canHold) {
        await triggerGrabDrop();
      }
      return;
    }
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

  function openQuiz(success?: ObjectQuizSuccess) {
    pendingQuizSuccess = success;
    pendingQuizAssetId = nearby?.id || "";

    const targetAssetId = nearby?.id || "";
    const questionId = getQuestionIdForTerminal(targetAssetId);

    // If this terminal is already solved, inform player and prevent repeat quiz
    if (questionId && levelProgress.solvedQuestionIds.includes(questionId)) {
      sound.play("pickup");
      state.message = "✅ Station Calibrated & Secure. Check your HUD roadmap or press M for the sector path map to proceed to the next objective!";
      return;
    }

    // Enforce sequential escape room progression: only ONE active objective can be accessed at a time
    const currentObj = getCurrentSectorObjective();
    const sectorObjs = getSectorObjectives(levelProgress.currentLevel);
    const isSectorStation = sectorObjs.some((o) => o.id === targetAssetId && o.questionId);

    if (isSectorStation && currentObj && currentObj.id !== targetAssetId) {
      sound.play("pickup");
      state.message = `🔒 Station Locked. You must first complete active objective [${currentObj.shortLabel || currentObj.label}]!`;
      return;
    }

    let question: EscapeRoomQuestion | null = null;
    if (questionId) {
      const currentQuestions = getCurrentLevelQuestions();
      question = currentQuestions.find((q) => q.id === questionId) || null;
      if (!question) {
        const allLevelQuestions = [
          ...(levelProgress.level1Questions || []),
          ...(levelProgress.level2Questions || []),
          ...(levelProgress.level3Questions || []),
        ];
        question = allLevelQuestions.find((q) => q.id === questionId) || null;
      }
    }

    if (!question) {
      question = getNextUnsolvedQuestion();
    }

    if (!question) {
      state.message = `All challenges in Sector ${levelProgress.currentLevel} are completed! Head toward the gate or hatch.`;
      return;
    }

    state.quiz = question;
    state.quizHintRevealed = levelProgress.hintUsedQuestionIds.includes(question.id);
    state.quizFeedback = null;
    state.quizOpen = true;
  }

  function requestHint(): string | null {
    if (!state.quiz) return null;
    if (!levelProgress.hintUsedQuestionIds.includes(state.quiz.id)) {
      levelProgress.hintUsedQuestionIds.push(state.quiz.id);
    }
    state.quizHintRevealed = true;
    state.hintsUsed = levelProgress.hintUsedQuestionIds.length;
    triggerSave();
    return state.quiz.hint || "Analyze the system details carefully.";
  }

  function answerQuiz(answer: number | number[]) {
    if (typeof answer === "number" && answer < 0) {
      pendingQuizSuccess = undefined;
      pendingQuizAssetId = "";
      state.quizOpen = false;
      state.quiz = null;
      state.quizFeedback = null;
      return;
    }

    if (!state.quiz) return;
    const question = state.quiz;
    const attempts = (levelProgress.attemptsByQuestionId[question.id] || 0) + 1;
    levelProgress.attemptsByQuestionId[question.id] = attempts;

    let isCorrect = false;
    if (question.correctAnswers && question.correctAnswers.length > 0) {
      const rawList = Array.isArray(answer) ? answer : [answer];
      const selected = Array.from(new Set(rawList.map(Number)));
      const expected = [...question.correctAnswers].map(Number).sort((a, b) => a - b);
      const actual = [...selected].sort((a, b) => a - b);
      isCorrect = expected.length === actual.length && expected.every((val, idx) => val === actual[idx]);
    } else {
      const single = typeof answer === "number" ? answer : answer[0]!;
      isCorrect = single === question.correct;
    }

    if (!isCorrect) {
      sound.play("type");
      state.score = Math.max(0, state.score - 30);
      triggerSave();
      state.quizFeedback = {
        isCorrect: false,
        explanation: question.correctAnswers && question.correctAnswers.length > 0
          ? "Security protocol validation failed! One or more required countermeasures were missed or incorrect. (-30 pts penalty applied) Re-evaluate the threat and try again or request a tactical hint."
          : "Incorrect protocol! System access denied. (-30 pts penalty applied) Try again or request a tactical hint.",
        scoreAwarded: -30,
      };
      return;
    }

    // Correct answer chosen!
    sound.play("riddle_success");
    const hintUsed = levelProgress.hintUsedQuestionIds.includes(question.id);
    const scoreAwarded = hintUsed ? 50 : 100;

    state.score += scoreAwarded;
    if (!levelProgress.solvedQuestionIds.includes(question.id)) {
      levelProgress.solvedQuestionIds.push(question.id);
    }

    state.quizFeedback = {
      isCorrect: true,
      explanation: question.explanation,
      scoreAwarded,
    };

    updateLevelStats();
    triggerSave();

    // Check if all sector terminals are solved - activate key!
    const currentQuestions = getCurrentLevelQuestions();
    const solvedInLevel = currentQuestions.filter((q) =>
      levelProgress.solvedQuestionIds.includes(q.id),
    ).length;

    if (solvedInLevel >= currentQuestions.length) {
      sound.play("riddle_success");
      const keyNames: Record<1 | 2 | 3, string> = {
        1: "AURA Clearance Keycard",
        2: "Firewall Security Token",
        3: "Master Override Cryptokey",
      };
      const keyName = keyNames[levelProgress.currentLevel];
      state.message = `🔑 CLEARANCE KEY ACTIVATED! All 5 terminals secured. Grab the ${keyName} near the gate and swipe it to unlock the sector exit!`;
    }
  }

  async function handleLevelCompletion(level: 1 | 2 | 3) {
    sound.play("unlock");
    if (level === 1) {
      await setObjectState("slide_door_1", "opened");
      levelProgress.currentLevel = 2;
      initStationTrackAndHolograms();
      updateLevelStats();
      state.levelClearedModal = {
        level: 1,
        title: "⚡ AURA AI CORE STABILIZED: SECTOR 1 UNLOCKED!",
        message:
          "Human-in-the-Loop validation confirmed! You successfully audited rogue prompts, protected DHL shipment data from external leakage, and restored neural stability. AURA has disengaged the Sector 1 Security Gate! Head through the open gate into Sector 2: CPH Applications Command.",
      };
    } else if (level === 2) {
      await setObjectState("slide_door_2", "opened");
      levelProgress.currentLevel = 3;
      initStationTrackAndHolograms();
      updateLevelStats();
      state.levelClearedModal = {
        level: 2,
        title: "📦 SECTOR 2 SYNCHRONIZED: APPLICATIONS RESTORED!",
        message:
          "GUS Butterfly Blue, ServiceNow, Power Automate, and sorting applications are fully synchronized! Sector 2 Firewall Gate has opened. Head through the open gate into Sector 3: Cyber Security Vault.",
      };
    } else if (level === 3) {
      state.levelClearedModal = {
        level: 3,
        title: "🛡️ CYBER DEFENSE PROTOCOLS ENFORCED: MASTER HATCH UNLOCKED!",
        message:
          "All 5 security countermeasures have been validated! Phishing neutralized, credentials encrypted, and physical perimeter secured. The Master Dispatch Hatch is depressurized—step into the hatch to finalize your escape!",
      };
    }
    triggerSave();
  }

  function closeLevelClearedModal() {
    state.levelClearedModal = null;
    if (levelProgress.currentLevel === 2 || levelProgress.currentLevel === 3) {
      state.missionBriefingOpen = true;
    }
  }

  function openMissionBriefing() {
    state.missionBriefingOpen = true;
  }

  function closeMissionBriefing() {
    state.missionBriefingOpen = false;
  }

  function closeFeedbackAndAdvance() {
    state.quizFeedback = null;
    state.quizOpen = false;
    state.quiz = null;
  }

  function retryQuiz() {
    state.quizFeedback = null;
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
    physics.dash(player, 1.4);
    sound.play("dash");
  }

  function frame(time: number) {
    const delta = Math.min((time - lastFrame) / 1000 || 0, 0.05);
    lastFrame = time;
    const isMoving = updateMovement(delta);
    if (player) {
      state.playerPosition = {
        x: Math.round(player.mesh.position.x * 10) / 10,
        z: Math.round(player.mesh.position.z * 10) / 10,
      };
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
            9.0,
            player.mesh.position.z + 8.8,
          ),
          0.08,
        );
        camera.lookAt(player.mesh.position.x, 0.5, player.mesh.position.z);
      }
    }

    // Animate glowing terminal beacons
    const currentObj = getCurrentSectorObjective();
    const beaconBob = Math.sin(time / 250) * 0.12;
    for (const beacon of terminalBeacons) {
      const termId = beacon.userData.terminalId as string;
      const qId = getQuestionIdForTerminal(termId);
      const isSolved = qId && levelProgress.solvedQuestionIds.includes(qId);
      const isCurrentTarget = currentObj && currentObj.id === termId;
      const mat = beacon.material as THREE.MeshBasicMaterial;

      if (isSolved) {
        mat.color.setHex(0x10b981);
        beacon.rotation.y += 0.01;
        beacon.position.y = 2.1;
        beacon.scale.set(0.75, 0.75, 0.75);
      } else if (isCurrentTarget) {
        mat.color.setHex(0xffcc00);
        beacon.rotation.y += 0.05;
        beacon.position.y = 2.25 + beaconBob * 1.5;
        const pulse = 1.0 + Math.sin(time / 150) * 0.15;
        beacon.scale.set(pulse, pulse, pulse);
      } else {
        mat.color.setHex(0x94a3b8);
        beacon.rotation.y += 0.02;
        beacon.position.y = 2.2 + beaconBob * 0.5;
        beacon.scale.set(0.85, 0.85, 0.85);
      }
    }

    updateObjectiveTracking();
    updateStationVisualStates(time);

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
          playerSpawn: { x: -10, z: 1 },
        }
      : {
          layout: value.layout.map((item) => ({ ...item })),
          playerSpawn: { ...value.playerSpawn },
        };
    if (scene) void buildFloorplan();
  }

  function getSectorDefaultSpawn(level: 1 | 2 | 3): { x: number; z: number } {
    if (level === 2) return { x: -3.5, z: 0 };
    if (level === 3) return { x: 6.5, z: 0 };
    return { x: -10, z: 1 };
  }

  function initSessionProgress(session: GameSession, progress: LevelProgress) {
    state.score = session.score || 0;
    state.runningTime = session.timeSpentSeconds || 0;
    state.timeRemaining = Math.max(0, 300 - state.runningTime);
    state.userCode = session.userCode || "";
    state.playerName = `${session.firstName || ""} ${session.lastName || ""}`.trim() || "Agent";
    state.playerDepartment = session.department || "Operations";
    state.playerShift = session.shift || "Day Shift";

    if (session.status === "completed" || session.status === "timed_out" || state.runningTime >= 300) {
      state.finished = true;
      state.isTimedOut = session.status === "timed_out" || state.runningTime >= 300;
    }

    levelProgress = {
      currentLevel: progress.currentLevel || 1,
      solvedQuestionIds: progress.solvedQuestionIds || [],
      hintUsedQuestionIds: progress.hintUsedQuestionIds || [],
      level1Questions: progress.level1Questions?.length ? progress.level1Questions : getRandomQuestionsForLevel(1, 5),
      level2Questions: progress.level2Questions?.length ? progress.level2Questions : getRandomQuestionsForLevel(2, 5),
      level3Questions: progress.level3Questions?.length ? progress.level3Questions : getRandomQuestionsForLevel(3, 5),
      attemptsByQuestionId: progress.attemptsByQuestionId || {},
      playerPosition: progress.playerPosition,
    };

    updateLevelStats();

    // Determine target spawn coordinates
    let spawn = getSectorDefaultSpawn(levelProgress.currentLevel);
    if (
      progress.playerPosition &&
      typeof progress.playerPosition.x === "number" &&
      typeof progress.playerPosition.z === "number" &&
      Number.isFinite(progress.playerPosition.x) &&
      Number.isFinite(progress.playerPosition.z)
    ) {
      spawn = { x: progress.playerPosition.x, z: progress.playerPosition.z };
    }

    pendingPlayerSpawn = { ...spawn };
    state.playerPosition = { ...spawn };

    if (player) {
      player.mesh.position.set(spawn.x, 0, spawn.z);
      player.body.x = spawn.x;
      player.body.z = spawn.z;
      if (camera) {
        camera.position.set(spawn.x, 9.0, spawn.z + 8.8);
        camera.lookAt(spawn.x, 0.5, spawn.z);
      }
    }

    if (levelProgress.solvedQuestionIds.length === 0) {
      state.missionBriefingOpen = true;
    }
    if (scene) {
      void buildFloorplan().then(() => {
        initStationTrackAndHolograms();
      });
    }
  }

  function onSaveState(callback: typeof onSaveCallback) {
    onSaveCallback = callback;
  }

  function getSessionSnapshot(completed?: boolean) {
    levelProgress.playerPosition = { ...state.playerPosition };
    return {
      score: state.score,
      timeSpentSeconds: state.runningTime,
      currentLevel: levelProgress.currentLevel,
      hintsUsed: levelProgress.hintUsedQuestionIds.length,
      levelProgress: { ...levelProgress },
      completed: completed ?? state.finished,
    };
  }

  function triggerSave(completed?: boolean) {
    if (!onSaveCallback) return;
    onSaveCallback(getSessionSnapshot(completed));
  }

  async function mount(
    target: HTMLCanvasElement,
    layout?: Floorplan | GameObjectInstance[],
  ) {
    if (scene) unmount();
    await loadObjectDefinitions();
    if (layout) setFloorplan(layout);
    canvas.value = target;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1128); // High-tech midnight cyber blue
    camera = new THREE.PerspectiveCamera(
      45,
      target.clientWidth / target.clientHeight,
      0.1,
      120,
    );
    const initialSpawn = pendingPlayerSpawn || floorplan.playerSpawn || getSectorDefaultSpawn(levelProgress.currentLevel);
    state.playerPosition = { ...initialSpawn };
    camera.position.set(initialSpawn.x, 9.0, initialSpawn.z + 8.8);
    camera.lookAt(initialSpawn.x, 0.5, initialSpawn.z);
    renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(target.clientWidth, target.clientHeight, false);

    // Dynamic Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.8));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(0, 15, 10);
    scene.add(mainLight);

    // Sector 1: Amber Alert Point Light (Project AURA Emergency Lockdown)
    const sector1AmberLight = new THREE.PointLight(0xf59e0b, 2.5, 16);
    sector1AmberLight.position.set(-10, 3.5, 0);
    scene.add(sector1AmberLight);

    // Sector 2: Cyan Alert Point Light (CPH Applications Command Grid)
    const sector2CyanLight = new THREE.PointLight(0x06b6d4, 2.5, 16);
    sector2CyanLight.position.set(0, 3.5, 0);
    scene.add(sector2CyanLight);

    // Sector 3: Crimson Alert Point Light (Cyber Security Vault)
    const sector3RedLight = new THREE.PointLight(0xef4444, 2.5, 16);
    sector3RedLight.position.set(10, 3.5, 0);
    scene.add(sector3RedLight);

    // Large 34x14 Floor across 3 sectors
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 14),
      createMaterial(0x1e293b),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Floor high-contrast grid lines
    const grid = new THREE.GridHelper(34, 34, 0xd40511, 0xffcc00);
    grid.position.y = 0.01;
    scene.add(grid);

    physics = new GamePhysics();
    player = initPlayer(scene, physics.world, initialSpawn);

    await buildFloorplan();
    initStationTrackAndHolograms();

    const resize = () => {
      if (!camera || !renderer) return;
      camera.aspect = target.clientWidth / target.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(target.clientWidth, target.clientHeight, false);
    };

    const keydown = (event: KeyboardEvent) => {
      keys.add(event.code);
      const isEKey = event.code === "KeyE" || event.key === "e" || event.key === "E";
      const isZKey = event.code === "KeyZ" || event.key === "z" || event.key === "Z";
      const isSpaceKey = event.code === "Space" || event.key === " " || event.key === "Spacebar";
      const isEnterKey = event.code === "Enter" || event.key === "Enter";
      const isXKey = event.code === "KeyX" || event.key === "x" || event.key === "X";

      if (isEKey || isZKey) {
        if (!heldItem && state.canGrab) {
          triggerGrabDrop();
        } else if (state.canUse && !state.canGrab) {
          useNearby();
        } else {
          triggerGrabDrop();
        }
      }

      if (isSpaceKey || isEnterKey || isXKey) {
        if (!heldItem && state.canGrab) {
          triggerGrabDrop();
        } else {
          useNearby();
        }
      }

      if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.key === "Shift") {
        dash();
      }

      if (event.code === "KeyM" || event.key === "m" || event.key === "M") {
        state.mapModalOpen = !state.mapModalOpen;
      }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.code);

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    timerId = setInterval(() => {
      if (!state.finished) {
        state.runningTime += 1;
        state.timeRemaining = Math.max(0, 300 - state.runningTime);
        if (state.runningTime >= 300) {
          state.finished = true;
          state.isTimedOut = true;
          state.quizOpen = false;
          sound.play("deliver");
          state.message = "⏰ TIME OUT! 5-Minute emergency window expired. Submitting your final operational score...";
          triggerSave();
        }
      }
    }, 1000);

    // Periodic auto-save every 5 seconds
    autoSaveTimer = setInterval(() => {
      if (!state.finished) {
        triggerSave();
      }
    }, 5000);

    animationFrame = requestAnimationFrame(frame);

    removeListeners = () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }

  function unmount() {
    triggerSave();
    removeListeners?.();
    removeListeners = undefined;
    cancelAnimationFrame(animationFrame);
    if (timerId) clearInterval(timerId);
    if (autoSaveTimer) clearInterval(autoSaveTimer);

    if (stationDecorGroup && scene) {
      scene.remove(stationDecorGroup);
    }
    for (const h of stationHolograms) {
      h.sprite.material.map?.dispose();
      h.sprite.material.dispose();
    }
    stationHolograms.length = 0;
    for (const r of stationFloorRings) {
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    stationFloorRings.length = 0;
    stationDecorGroup = null;

    for (const ws of sectorWorkstations.values()) {
      disposeWorkstation(ws);
    }
    sectorWorkstations.clear();

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
    initSessionProgress,
    onSaveState,
    triggerSave,
    getSessionSnapshot,
    pickUp: triggerGrabDrop,
    useNearby,
    dash,
    answerQuiz,
    requestHint,
    closeFeedbackAndAdvance,
    retryQuiz,
    closeLevelClearedModal,
    openQuiz,
    openMissionBriefing,
    closeMissionBriefing,
    openMapModal: () => {
      state.mapModalOpen = true;
    },
    closeMapModal: () => {
      state.mapModalOpen = false;
    },
    selectObject,
    closeObjectSelection,
    executeAction,
    closeActionSelection,
    closeMessage,
  };
}
