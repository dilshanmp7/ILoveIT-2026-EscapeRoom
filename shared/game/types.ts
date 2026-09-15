export type AssetType = string;

export type HeldObjectType = "laptop" | "server" | "key";

export interface HoldingSlot {
  id: string;
  label: string;
  accepts: "any" | "configured" | HeldObjectType;
  maxContents?: number;
  consumeOnDrop?: boolean;
  insertedState?:
    | "grabbed"
    | "onFloor"
    | "onTable"
    | "configured"
    | "opened"
    | "completed";
  insertedMesh?: object;
}

export type DropRule =
  | { mode: "none" }
  | { mode: "floor" }
  | { mode: "any"; maxContents?: number }
  | { mode: "types"; types: HeldObjectType[]; maxContents?: number }
  | { mode: "configured"; maxContents?: number }
  | { mode: "objects"; objectIds: string[]; maxContents?: number };

export interface GameObjectInstance {
  id: string;
  position: {
    x: number;
    z: number;
    rotation: number;
  };
  w: number;
  d: number;
  color: number;
  type: AssetType;
  label: string;
  canHold: boolean;
  canBePushed: boolean;
  canBeGrabbed: boolean;
  keyId?: string;
  requiredKeyIds?: string[];
  isOpen?: boolean;
  actionType?: "none" | "config" | "quiz" | "deliver" | "trash" | "key";
  dropRule?: DropRule;
  acceptsDrop?: "none" | "floor" | "any" | "configured" | HeldObjectType;
  useAction?: "none" | "open_door" | "quiz";
  useRequiredKey?: string;
  actionIds?: string[];
  holdingSlots?: HoldingSlot[];
}

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
