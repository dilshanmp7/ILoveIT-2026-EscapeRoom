import * as THREE from "three";
import type { PhysicalBody } from "./runtime";

export type AssetType = string;

export type ObjectVisualStateType =
  | "grabbed"
  | "onFloor"
  | "onTable"
  | "configured"
  | "inserted"
  | "opened"
  | "completed";

export type EventType = string;
export type ActionType = string;

export interface ObjectEventState {
  objects: readonly GameObjectRecord[];
  score: number;
}

export interface ObjectEventContext {
  event: EventType;
  emitter: GameObjectInstance;
  emitterState: ObjectVisualStateType;
  game: ObjectEventState;
}

export type ObjectReaction = (
  context: ObjectEventContext,
) => ObjectVisualStateType | undefined;

export interface ObjectQuizSuccess {
  event?: string;
  state?: ObjectVisualStateType;
  message?: string;
  score?: number;
}

export interface ObjectActionContext {
  asset: GameObjectInstance;
  state: ObjectVisualStateType;
  heldItem: GameObjectInstance | null;
  game: ObjectEventState;
  acceptHeldItem: () => Promise<boolean>;
  emitEvent: (event: EventType) => void;
  setState: (state: ObjectVisualStateType) => Promise<void>;
  openQuiz: (success?: ObjectQuizSuccess) => void;
  showMessage: (message: string) => void;
  discardHeld: () => void;
  deliverHeld: () => void;
  addScore: (amount: number) => void;
}

export interface ObjectActionDefinition {
  id: string;
  label: string;
  blockedMessage?: string;
  isVisible?: (context: ObjectActionContext) => boolean;
  canExecute?: (context: ObjectActionContext) => boolean;
  execute: (context: ObjectActionContext) => void | Promise<void>;
  configureSound?: SoundEffect;
}

export interface GameObjectVisualStateDefinition {
  color?: string;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  mesh?: object;
  heldOffset?: [number, number, number];
}

export type ObjectDefinitions = Record<string, ObjectTypeDefinition>;

export interface ObjectTypeDefinition {
  visualStates: Partial<
    Record<ObjectVisualStateType, GameObjectVisualStateDefinition>
  >;
  holdingSlots?: HoldingSlot[];
  reactions?: Record<EventType, ObjectReaction>;
  actions?: ObjectActionDefinition[];
  source?: { itemType: string };
  interaction?: {
    action?: string;
    canGrab?: boolean;
    canUse?: boolean;
    requiredKey?: string;
  };
  interactions?: ObjectTypeDefinition["interaction"];
  dropObjectType?: string;
  geometry?: {
    isBarrier?: boolean;
    canPush?: boolean;
    canDrag?: boolean;
    isSurface?: boolean;
    surfaceHeight?: number;
  };

  editor?: {
    label: string;
    detail: string;
    color: string;
    width: number;
    depth: number;
    enabled?: boolean;
  };
}

export interface HoldingSlot {
  id: string;
  label: string;
  maxContents?: number;
  consumeOnDrop?: boolean;
  accepts?: string;
  insertedState?: ObjectVisualStateType;
}

export interface GameObjectRecord {
  id: string;
  type: AssetType;
  position: {
    x: number;
    z: number;
    rotation: number;
  };
  w: number;
  d: number;
  label: string;
  color?: number;
  canHold?: boolean;
  canPush?: boolean;
  allowGrab?: boolean;
  keyId?: string;
  requiredKeyIds?: string[];
  isOpen?: boolean;
  useRequiredKey?: string;
  actionIds?: string[];
  holdingSlots?: HoldingSlot[];
}

export interface GameObjectInstance extends GameObjectRecord {
  visualState: GameObjectVisualStateDefinition;
  state: ObjectVisualStateType;
  mesh: import("three").Group | null;
  heldItem: GameObjectInstance | null;
  configured?: boolean;
  dragAssetId?: string;
  canHold?: boolean;
  reactions: Record<EventType, ObjectReaction>;
  actions: Record<ActionType, ObjectActionDefinition>;
  canBePushed: () => boolean;
  canBeDragged: () => boolean;
  canBeGrabbed: () => boolean;
  hasInteraction: () => boolean;
  isBarrier: () => boolean;
  getSurfaceHeight: () => number;
  getSourceType: () => string | undefined;
  getHeldOffset: () => [number, number, number];
  getAvailableActions: (
    context: ObjectActionContext,
  ) => ObjectActionDefinition[];
  react: (context: ObjectEventContext) => ObjectVisualStateType | undefined;
  canAccept: (item: GameObjectInstance) => boolean;
  getHoldingSlot: (item: GameObjectInstance) => HoldingSlot | undefined;
}

export type SoundEffect =
  | "type"
  | "process"
  | "pickup"
  | "drop"
  | "unlock"
  | "deliver"
  | "riddle_success"
  | "dash"
  | "bump";

export interface PlayerSpawn {
  x: number;
  z: number;
}

export interface Floorplan {
  layout: GameObjectRecord[];
  playerSpawn: PlayerSpawn;
}

export interface QuizOption {
  id: number;
  text: string;
}

export interface QuizQuestion {
  id?: string;
  level?: 1 | 2 | 3;
  q: string;
  options: QuizOption[];
  correct: number;
  correctAnswers?: number[];
  hint?: string;
  explanation?: string;
}

export interface EscapeRoomQuestion extends QuizQuestion {
  id: string;
  level: 1 | 2 | 3;
  hint: string;
  explanation: string;
}

export interface PlayerRegistration {
  firstName: string;
  lastName: string;
  department: string;
  shift: string;
  userCode?: string;
}

export interface LevelProgress {
  currentLevel: 1 | 2 | 3;
  solvedQuestionIds: string[];
  hintUsedQuestionIds: string[];
  level1Questions: EscapeRoomQuestion[];
  level2Questions: EscapeRoomQuestion[];
  level3Questions: EscapeRoomQuestion[];
  attemptsByQuestionId: Record<string, number>;
  playerPosition?: { x: number; z: number };
}

export interface ScoreBreakdown {
  questionScore: number;
  timeBonus: number;
  timeSpentSeconds: number;
  timeRemainingSeconds: number;
  totalScore: number;
}

export interface GameSession {
  id: string;
  sessionKey: string;
  userCode: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  shift?: string;
  currentLevel: 1 | 2 | 3;
  hintsUsed: number;
  timeSpentSeconds: number;
  levelProgress?: LevelProgress;
  status: "active" | "completed" | "timed_out";
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface AccessResponse {
  authenticated: boolean;
}

export interface FinalScorePayload {
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  completed?: boolean;
  timeSpentSeconds?: number;
  currentLevel?: 1 | 2 | 3;
  hintsUsed?: number;
  levelProgress?: LevelProgress;
  playerPosition?: { x: number; z: number };
  userCode?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  shift?: string;
}


export interface LeaderboardEntry {
  rank: number;
  id: string;
  userCode: string;
  firstName: string;
  lastName: string;
  department: string;
  shift: string;
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  timeSpentSeconds: number;
  currentLevel: number;
  completed: boolean;
  hintsUsed: number;
  updatedAt: string;
}

export interface EventStats {
  totalRegistered: number;
  totalCompleted: number;
  fastestTimeSeconds: number | null;
  topDepartment: string | null;
  averageScore: number;
}

export type Player = { mesh: THREE.Group; body: PhysicalBody };

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

export const GAME_TIME_LIMIT_SECONDS = 900; // 15 minutes operational SLA

/**
 * Calculates score breakdown based on Time Bank Model:
 * Total Score = Question Score + Time Bank Bonus (Remaining Seconds)
 * - Questions award +100 (or +50 if hint used).
 * - Incorrect attempts penalize -30.
 * - Completing the escape awards +1 PT for every second remaining under the 15-minute SLA.
 */
export function calculateScore(params: {
  questionScore: number;
  timeSpentSeconds: number;
  completed: boolean;
  isTimedOut?: boolean;
}): ScoreBreakdown {
  const timeSpent = Math.max(0, Math.round(params.timeSpentSeconds || 0));
  const timeRemaining = Math.max(0, GAME_TIME_LIMIT_SECONDS - timeSpent);
  const timeBonus = params.completed && !params.isTimedOut ? timeRemaining : 0;
  const rawQuestionScore = Math.max(0, Math.round(params.questionScore || 0));
  const totalScore = rawQuestionScore + timeBonus;

  return {
    questionScore: rawQuestionScore,
    timeBonus,
    timeSpentSeconds: timeSpent,
    timeRemainingSeconds: timeRemaining,
    totalScore,
  };
}
