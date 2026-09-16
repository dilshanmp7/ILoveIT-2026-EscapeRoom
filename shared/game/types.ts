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
  objects: readonly GameObjectInstance[];
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
  heldItem: { type: string; keyId?: string; configured?: boolean } | null;
  emitEvent: (event: EventType) => void;
  setState: (state: ObjectVisualStateType) => Promise<void>;
  configureContained: () => Promise<boolean>;
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
}

export type ObjectDefinitions = Record<string, ObjectTypeDefinition>;

export interface ObjectTypeDefinition {
  visualStates: Partial<
    Record<ObjectVisualStateType, GameObjectVisualStateDefinition>
  >;
  holdingSlots: HoldingSlot[];
  reactions: Record<EventType, ObjectReaction>;
  actions: Record<ActionType, ObjectActionDefinition>;
  geometry?: {
    isBarrier?: boolean;
    canPush?: boolean;
    isSurface?: boolean;
    surfaceHeight?: number;
  };

  canBePushed: () => boolean;
  canBeDragged: () => boolean;
  canBeGrabbed: () => boolean;

  heldOffset?: [number, number, number];
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
}

export interface GameObjectInstance {
  id: string;
  type: AssetType;
  position: {
    x: number;
    z: number;
    rotation: number;
  };
  w: number;
  d: number;
  visualState: GameObjectVisualStateDefinition;
  label: string;
  canHold: boolean;
  keyId?: string;
  requiredKeyIds?: string[];
  isOpen?: boolean;
  useRequiredKey?: string;
  actionIds?: string[];
  holdingSlots: HoldingSlot[];
  reactions: Record<EventType, ObjectReaction>;
  actions: Record<ActionType, ObjectActionDefinition>;
  canBePushed: () => boolean;
  canBeDragged: () => boolean;
  canBeGrabbed: () => boolean;
}

export type SoundEffect =
  | "type"
  | "process"
  | "pickup"
  | "drop"
  | "unlock"
  | "deliver"
  | "riddle_success"
  | "dash";

export interface PlayerSpawn {
  x: number;
  z: number;
}

export interface Floorplan {
  layout: GameObjectInstance[];
  playerSpawn: PlayerSpawn;
}

export interface QuizOption {
  id: number;
  text: string;
}

export interface QuizQuestion {
  q: string;
  options: QuizOption[];
  correct: number;
}

export interface GameSession {
  id: string;
  status: "active" | "completed";
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessResponse {
  authenticated: boolean;
}

export interface FinalScorePayload {
  score: number;
  completed?: boolean;
}
