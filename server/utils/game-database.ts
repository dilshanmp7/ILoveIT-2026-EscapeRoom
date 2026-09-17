import type {
  Floorplan,
  GameObjectRecord,
  GameSession,
  QuizQuestion,
} from "#shared/game/types";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import seedFloorplan from "../../public/game/defaultLayout.json";
import defaultQuizzes from "../../public/game/defaultQuizzes.json";

let database: DatabaseSync | undefined;

function getDatabase() {
  if (database) return database;

  const filePath =
    process.env.NUXT_GAME_DB_PATH ||
    join(process.cwd(), "data", "courier.sqlite");
  mkdirSync(dirname(filePath), { recursive: true });
  database = new DatabaseSync(filePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS floorplans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      layout_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      floorplan_json TEXT NOT NULL DEFAULT '{}',
      quizzes_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quiz_sets (
      id TEXT PRIMARY KEY,
      quizzes_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  for (const column of [
    "ALTER TABLE game_sessions ADD COLUMN floorplan_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE game_sessions ADD COLUMN quizzes_json TEXT NOT NULL DEFAULT '[]'",
  ]) {
    try {
      database.exec(column);
    } catch {
      /* Existing databases already have the column. */
    }
  }

  const existing = database
    .prepare("SELECT id FROM floorplans WHERE id = ?")
    .get("main");
  if (!existing) {
    const now = new Date().toISOString();
    database
      .prepare(
        "INSERT INTO floorplans (id, name, layout_json, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run("main", "Main dispatch floor", JSON.stringify(seedFloorplan), now);
  }

  const quizSet = database
    .prepare("SELECT id FROM quiz_sets WHERE id = ?")
    .get("main");
  if (!quizSet) {
    database
      .prepare(
        "INSERT INTO quiz_sets (id, quizzes_json, updated_at) VALUES (?, ?, ?)",
      )
      .run("main", JSON.stringify(defaultQuizzes), new Date().toISOString());
  }

  return database;
}

export function readQuizzes(): QuizQuestion[] {
  const row = getDatabase()
    .prepare("SELECT quizzes_json FROM quiz_sets WHERE id = ?")
    .get("main") as { quizzes_json: string } | undefined;
  return row
    ? (JSON.parse(row.quizzes_json) as QuizQuestion[])
    : structuredClone(defaultQuizzes);
}

export function writeQuizzes(quizzes: QuizQuestion[]) {
  const updatedAt = new Date().toISOString();
  getDatabase()
    .prepare(
      "UPDATE quiz_sets SET quizzes_json = ?, updated_at = ? WHERE id = ?",
    )
    .run(JSON.stringify(quizzes), updatedAt, "main");
  return { id: "main", quizzes, updatedAt };
}

export function readFloorplan(): Floorplan {
  const row = getDatabase()
    .prepare("SELECT layout_json FROM floorplans WHERE id = ?")
    .get("main") as { layout_json: string } | undefined;
  const value = row
    ? (JSON.parse(row.layout_json) as Floorplan | GameObjectRecord[])
    : (structuredClone(seedFloorplan) as GameObjectRecord[]);
  const layout = Array.isArray(value) ? value : value.layout;
  const normalizedLayout = layout.map((asset) => {
    const legacyAsset = asset as GameObjectRecord & {
      x?: number;
      z?: number;
      rotation?: number;
      canBePushed?: boolean;
      canBeGrabbed?: boolean;
    };
    const canPush = asset.canPush ?? legacyAsset.canBePushed;
    const allowGrab = asset.allowGrab ?? legacyAsset.canBeGrabbed;
    return legacyAsset.position
      ? {
          ...asset,
          canHold: Boolean(asset.canHold),
          canPush: Boolean(canPush),
          allowGrab: Boolean(allowGrab),
        }
      : {
          ...asset,
          canHold: Boolean(asset.canHold),
          canPush: Boolean(canPush),
          allowGrab: Boolean(allowGrab),
          position: {
            x: legacyAsset.x || 0,
            z: legacyAsset.z || 0,
            rotation: legacyAsset.rotation || 0,
          },
        };
  });
  return {
    layout: normalizedLayout,
    playerSpawn: Array.isArray(value)
      ? { x: 0, z: 2 }
      : value.playerSpawn || { x: 0, z: 2 },
  };
}

export function writeFloorplan(floorplan: Floorplan) {
  const updatedAt = new Date().toISOString();
  getDatabase()
    .prepare(
      "UPDATE floorplans SET layout_json = ?, updated_at = ? WHERE id = ?",
    )
    .run(JSON.stringify(floorplan), updatedAt, "main");
  return { id: "main", name: "Main dispatch floor", ...floorplan, updatedAt };
}

export function resetFloorplan() {
  return writeFloorplan({
    layout: structuredClone(seedFloorplan) as GameObjectRecord[],
    playerSpawn: { x: 0, z: 2 },
  });
}

export function insertGameSession(
  session: GameSession,
  accessToken: string,
  floorplan: Floorplan,
  quizzes: QuizQuestion[],
) {
  getDatabase()
    .prepare(
      `INSERT INTO game_sessions (id, access_token, status, score, floorplan_json, quizzes_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      session.id,
      accessToken,
      session.status,
      session.score,
      JSON.stringify(floorplan),
      JSON.stringify(quizzes),
      session.createdAt,
      session.updatedAt,
    );
}

export function readGameSession(id: string, accessToken: string) {
  const row = getDatabase()
    .prepare(
      "SELECT id, status, score, floorplan_json, quizzes_json, created_at AS createdAt, updated_at AS updatedAt FROM game_sessions WHERE id = ? AND access_token = ?",
    )
    .get(id, accessToken) as
    | {
        id: string;
        status: GameSession["status"];
        score: number;
        floorplan_json: string;
        quizzes_json: string;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;
  if (!row) return null;
  const storedFloorplan = JSON.parse(row.floorplan_json) as Partial<Floorplan>;
  const storedQuizzes = JSON.parse(row.quizzes_json) as QuizQuestion[];
  return {
    session: {
      id: row.id,
      status: row.status,
      score: row.score,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    floorplan: Array.isArray(storedFloorplan.layout)
      ? (storedFloorplan as Floorplan)
      : readFloorplan(),
    quizzes: storedQuizzes.length ? storedQuizzes : readQuizzes(),
  };
}

export function updateStoredSession(
  id: string,
  accessToken: string,
  score: number,
  status: GameSession["status"],
  updatedAt: string,
) {
  const result = getDatabase()
    .prepare(
      "UPDATE game_sessions SET score = ?, status = ?, updated_at = ? WHERE id = ? AND access_token = ?",
    )
    .run(score, status, updatedAt, id, accessToken);
  if (!result.changes) return null;
  const row = getDatabase()
    .prepare(
      "SELECT id, status, score, created_at AS createdAt, updated_at AS updatedAt FROM game_sessions WHERE id = ?",
    )
    .get(id) as Record<string, unknown> | undefined;
  if (
    !row ||
    typeof row.id !== "string" ||
    (row.status !== "active" && row.status !== "completed") ||
    typeof row.score !== "number" ||
    typeof row.createdAt !== "string" ||
    typeof row.updatedAt !== "string"
  )
    return null;
  return {
    id: row.id,
    status: row.status,
    score: row.score,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } satisfies GameSession;
}
