import type {
  EventStats,
  Floorplan,
  GameObjectRecord,
  GameSession,
  LeaderboardEntry,
  LevelProgress,
  QuizQuestion,
} from "#shared/game/types";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import seedFloorplan from "../../public/game/defaultLayout.json";
import { ESCAPE_ROOM_QUESTIONS, getRandomQuestionsForLevel } from "../../shared/game/questions-data";

let database: DatabaseSync | undefined;

function getDatabase() {
  if (database) return database;

  let filePath =
    process.env.NUXT_GAME_DB_PATH ||
    (process.env.VERCEL ? "/tmp/courier.sqlite" : join(process.cwd(), "data", "courier.sqlite"));
  try {
    mkdirSync(dirname(filePath), { recursive: true });
  } catch (err) {
    console.warn(`Could not create directory for database at ${filePath}, falling back to /tmp/courier.sqlite:`, err);
    filePath = "/tmp/courier.sqlite";
    mkdirSync(dirname(filePath), { recursive: true });
  }
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
      session_key TEXT,
      user_code TEXT,
      first_name TEXT,
      last_name TEXT,
      department TEXT,
      shift TEXT,
      current_level INTEGER NOT NULL DEFAULT 1,
      hints_used INTEGER NOT NULL DEFAULT 0,
      time_spent_seconds INTEGER NOT NULL DEFAULT 0,
      access_token TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      floorplan_json TEXT NOT NULL DEFAULT '{}',
      quizzes_json TEXT NOT NULL DEFAULT '[]',
      level_progress_json TEXT NOT NULL DEFAULT '{}',
      score_breakdown_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quiz_sets (
      id TEXT PRIMARY KEY,
      quizzes_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS access_tokens (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
  `);

  // Safe migrations for added columns
  const migrationColumns = [
    "ALTER TABLE game_sessions ADD COLUMN session_key TEXT",
    "ALTER TABLE game_sessions ADD COLUMN user_code TEXT",
    "ALTER TABLE game_sessions ADD COLUMN first_name TEXT",
    "ALTER TABLE game_sessions ADD COLUMN last_name TEXT",
    "ALTER TABLE game_sessions ADD COLUMN department TEXT",
    "ALTER TABLE game_sessions ADD COLUMN shift TEXT",
    "ALTER TABLE game_sessions ADD COLUMN current_level INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE game_sessions ADD COLUMN hints_used INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE game_sessions ADD COLUMN time_spent_seconds INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE game_sessions ADD COLUMN floorplan_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE game_sessions ADD COLUMN quizzes_json TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE game_sessions ADD COLUMN level_progress_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE game_sessions ADD COLUMN score_breakdown_json TEXT NOT NULL DEFAULT '{}'",
  ];

  for (const column of migrationColumns) {
    try {
      database.exec(column);
    } catch {
      /* Column already exists in schema */
    }
  }

  const existingFloorplan = database
    .prepare("SELECT id, layout_json FROM floorplans WHERE id = ?")
    .get("main") as { id: string; layout_json: string } | undefined;
  const now = new Date().toISOString();
  if (!existingFloorplan) {
    database
      .prepare(
        "INSERT INTO floorplans (id, name, layout_json, updated_at) VALUES (?, ?, ?, ?)",
      )
      .run("main", "Main dispatch floor", JSON.stringify(seedFloorplan), now);
  } else {
    try {
      const parsed = JSON.parse(existingFloorplan.layout_json);
      const items = Array.isArray(parsed) ? parsed : parsed.layout;
      if (!items || items.length < 20 || items.some((x: any) => x.id === "term_l1_6") || !items.some((x: any) => x.id === "key_sector_2") || items.some((x: any) => x.id === "term_l1_2" && x.position?.z === -3.8)) {
        database
          .prepare(
            "UPDATE floorplans SET layout_json = ?, updated_at = ? WHERE id = ?",
          )
          .run(JSON.stringify(seedFloorplan), now, "main");
      }
    } catch {
      // Ignore parse failure
    }
  }

  const quizSet = database
    .prepare("SELECT id FROM quiz_sets WHERE id = ?")
    .get("main");
  if (!quizSet) {
    database
      .prepare(
        "INSERT INTO quiz_sets (id, quizzes_json, updated_at) VALUES (?, ?, ?)",
      )
      .run("main", JSON.stringify(ESCAPE_ROOM_QUESTIONS[1]), new Date().toISOString());
  }

  return database;
}

export function readQuizzes(): QuizQuestion[] {
  const row = getDatabase()
    .prepare("SELECT quizzes_json FROM quiz_sets WHERE id = ?")
    .get("main") as { quizzes_json: string } | undefined;
  return row
    ? (JSON.parse(row.quizzes_json) as QuizQuestion[])
    : structuredClone(ESCAPE_ROOM_QUESTIONS[1]);
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
      ? { x: -6, z: 1 }
      : value.playerSpawn || { x: -6, z: 1 },
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
    playerSpawn: { x: -6, z: 1 },
  });
}

export function insertGameSession(
  session: GameSession,
  sessionKey: string,
  accessToken: string,
  floorplan: Floorplan,
  levelProgress: LevelProgress,
) {
  getDatabase()
    .prepare(
      `INSERT INTO game_sessions (
        id, session_key, user_code, first_name, last_name, department, shift,
        current_level, hints_used, time_spent_seconds, access_token, status,
        score, floorplan_json, quizzes_json, level_progress_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      session.id,
      sessionKey,
      session.userCode,
      session.firstName || "",
      session.lastName || "",
      session.department || "",
      session.shift || "",
      session.currentLevel || 1,
      session.hintsUsed || 0,
      session.timeSpentSeconds || 0,
      accessToken,
      session.status,
      session.score,
      JSON.stringify(floorplan),
      JSON.stringify(levelProgress.level1Questions),
      JSON.stringify(levelProgress),
      session.createdAt,
      session.updatedAt,
    );
}

export function saveAccessToken(token: string, createdAt: number) {
  try {
    getDatabase()
      .prepare(
        "INSERT OR REPLACE INTO access_tokens (token, created_at) VALUES (?, ?)",
      )
      .run(token, createdAt);
  } catch {
    // Ignore DB save failure
  }
}

export function getAccessTokenRecord(token: string): { token: string; created_at: number } | null {
  try {
    const row = getDatabase()
      .prepare("SELECT token, created_at FROM access_tokens WHERE token = ?")
      .get(token) as { token: string; created_at: number } | undefined;
    if (row) return row;

    const sessionRow = getDatabase()
      .prepare("SELECT access_token FROM game_sessions WHERE access_token = ? LIMIT 1")
      .get(token) as { access_token: string } | undefined;
    if (sessionRow) {
      return { token, created_at: Date.now() };
    }
  } catch {
    // Ignore DB error
  }
  return null;
}

export function removeAccessTokenRecord(token: string) {
  try {
    getDatabase().prepare("DELETE FROM access_tokens WHERE token = ?").run(token);
  } catch {
    // Ignore error
  }
}

export function clearAllGameSessions() {
  const db = getDatabase();
  const sessionResult = db.prepare("DELETE FROM game_sessions").run();
  const tokenResult = db.prepare("DELETE FROM access_tokens").run();
  return {
    deletedSessions: Number(sessionResult.changes) || 0,
    deletedTokens: Number(tokenResult.changes) || 0,
  };
}

export function updateSessionAccessToken(id: string, token: string) {
  const updatedAt = new Date().toISOString();
  try {
    getDatabase()
      .prepare("UPDATE game_sessions SET access_token = ?, updated_at = ? WHERE id = ?")
      .run(token, updatedAt, id);
  } catch {
    // Ignore error
  }
}

export function findSessionByUserCode(userCode: string) {
  const row = getDatabase()
    .prepare(
      `SELECT id, session_key, user_code, first_name, last_name, department, shift,
              current_level, hints_used, time_spent_seconds, access_token, status, score,
              floorplan_json, quizzes_json, level_progress_json,
              created_at AS createdAt, updated_at AS updatedAt
       FROM game_sessions
       WHERE user_code = ? OR session_key = ? OR id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .get(userCode, userCode, userCode) as Record<string, unknown> | undefined;

  if (!row) return null;
  return mapSessionRow(row);
}

export function readGameSession(sessionKey: string, accessToken?: string) {
  const query = accessToken
    ? `SELECT id, session_key, user_code, first_name, last_name, department, shift,
              current_level, hints_used, time_spent_seconds, access_token, status, score,
              floorplan_json, quizzes_json, level_progress_json,
              created_at AS createdAt, updated_at AS updatedAt
       FROM game_sessions
       WHERE (session_key = ? OR id = ? OR user_code = ?) AND access_token = ?
       LIMIT 1`
    : `SELECT id, session_key, user_code, first_name, last_name, department, shift,
              current_level, hints_used, time_spent_seconds, access_token, status, score,
              floorplan_json, quizzes_json, level_progress_json,
              created_at AS createdAt, updated_at AS updatedAt
       FROM game_sessions
       WHERE session_key = ? OR id = ? OR user_code = ?
       LIMIT 1`;

  const row = (
    accessToken
      ? getDatabase().prepare(query).get(sessionKey, sessionKey, sessionKey, accessToken)
      : getDatabase().prepare(query).get(sessionKey, sessionKey, sessionKey)
  ) as Record<string, unknown> | undefined;

  if (!row) return null;
  return mapSessionRow(row);
}

function mapSessionRow(row: Record<string, unknown>) {
  const storedFloorplan = JSON.parse((row.floorplan_json as string) || "{}") as Partial<Floorplan>;
  const storedProgress = JSON.parse((row.level_progress_json as string) || "{}") as Partial<LevelProgress>;
  const storedQuizzes = JSON.parse((row.quizzes_json as string) || "[]") as QuizQuestion[];

  const levelProgress: LevelProgress = {
    currentLevel: (Number(row.current_level) as 1 | 2 | 3) || storedProgress.currentLevel || 1,
    solvedQuestionIds: Array.isArray(storedProgress.solvedQuestionIds) ? storedProgress.solvedQuestionIds : [],
    hintUsedQuestionIds: Array.isArray(storedProgress.hintUsedQuestionIds) ? storedProgress.hintUsedQuestionIds : [],
    level1Questions: storedProgress.level1Questions?.length ? storedProgress.level1Questions : getRandomQuestionsForLevel(1, 5),
    level2Questions: storedProgress.level2Questions?.length ? storedProgress.level2Questions : getRandomQuestionsForLevel(2, 5),
    level3Questions: storedProgress.level3Questions?.length ? storedProgress.level3Questions : getRandomQuestionsForLevel(3, 5),
    attemptsByQuestionId: storedProgress.attemptsByQuestionId || {},
  };

  const session: GameSession = {
    id: String(row.id),
    sessionKey: (row.session_key as string) || String(row.id),
    userCode: (row.user_code as string) || String(row.id),
    firstName: (row.first_name as string) || "",
    lastName: (row.last_name as string) || "",
    department: (row.department as string) || "",
    shift: (row.shift as string) || "",
    currentLevel: levelProgress.currentLevel,
    hintsUsed: Number(row.hints_used) || 0,
    timeSpentSeconds: Number(row.time_spent_seconds) || 0,
    levelProgress,
    status: (row.status as "active" | "completed") || "active",
    score: Number(row.score) || 0,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };

  return {
    session,
    floorplan: Array.isArray(storedFloorplan.layout) &&
      storedFloorplan.layout.some((x: any) => x.id === "key_sector_2") &&
      !storedFloorplan.layout.some((x: any) => x.id === "term_l1_6")
      ? (storedFloorplan as Floorplan)
      : readFloorplan(),
    quizzes: storedQuizzes.length ? storedQuizzes : levelProgress.level1Questions,
    levelProgress,
  };
}

export function updateStoredSession(
  id: string,
  accessToken: string,
  score: number,
  status: GameSession["status"],
  updatedAt: string,
  options?: {
    currentLevel?: 1 | 2 | 3;
    hintsUsed?: number;
    timeSpentSeconds?: number;
    levelProgress?: LevelProgress;
  },
) {
  let result;
  if (options) {
    result = getDatabase()
      .prepare(
        `UPDATE game_sessions SET
           score = ?,
           status = ?,
           current_level = COALESCE(?, current_level),
           hints_used = COALESCE(?, hints_used),
           time_spent_seconds = COALESCE(?, time_spent_seconds),
           level_progress_json = COALESCE(?, level_progress_json),
           access_token = COALESCE(?, access_token),
           updated_at = ?
         WHERE id = ?`,
      )
      .run(
        score,
        status,
        options.currentLevel ?? null,
        options.hintsUsed ?? null,
        options.timeSpentSeconds ?? null,
        options.levelProgress ? JSON.stringify(options.levelProgress) : null,
        accessToken || null,
        updatedAt,
        id,
      );
  } else {
    result = getDatabase()
      .prepare(
        "UPDATE game_sessions SET score = ?, status = ?, access_token = COALESCE(?, access_token), updated_at = ? WHERE id = ?",
      )
      .run(score, status, accessToken || null, updatedAt, id);
  }

  if (!result.changes) return null;
  const mapped = readGameSession(id);
  return mapped ? mapped.session : null;
}

export function getLeaderboard(department?: string, shift?: string): LeaderboardEntry[] {
  let query = `
    SELECT id, user_code, first_name, last_name, department, shift,
           score, time_spent_seconds, current_level, status, hints_used, updated_at
    FROM game_sessions
    WHERE 1=1
  `;
  const params: string[] = [];
  if (department && department.trim()) {
    query += " AND department = ?";
    params.push(department.trim());
  }
  if (shift && shift.trim()) {
    query += " AND shift = ?";
    params.push(shift.trim());
  }
  query += `
    ORDER BY score DESC, time_spent_seconds ASC, updated_at DESC
    LIMIT 100
  `;

  const rows = getDatabase().prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map((row, index) => ({
    rank: index + 1,
    id: String(row.id),
    userCode: (row.user_code as string) || "CPH-USER",
    firstName: (row.first_name as string) || "Agent",
    lastName: (row.last_name as string) || "",
    department: (row.department as string) || "Operations",
    shift: (row.shift as string) || "Day Shift",
    score: Number(row.score) || 0,
    timeSpentSeconds: Number(row.time_spent_seconds) || 0,
    currentLevel: Number(row.current_level) || 1,
    completed: row.status === "completed",
    hintsUsed: Number(row.hints_used) || 0,
    updatedAt: String(row.updated_at),
  }));
}

export function getEventStats(): EventStats {
  const db = getDatabase();
  const totalRow = db.prepare("SELECT COUNT(*) as count FROM game_sessions").get() as { count: number };
  const completedRow = db.prepare("SELECT COUNT(*) as count FROM game_sessions WHERE status = 'completed'").get() as { count: number };
  const fastestRow = db.prepare("SELECT MIN(time_spent_seconds) as min_time FROM game_sessions WHERE status = 'completed' AND time_spent_seconds > 0").get() as { min_time: number | null };
  const avgScoreRow = db.prepare("SELECT AVG(score) as avg_score FROM game_sessions").get() as { avg_score: number | null };
  const topDeptRow = db.prepare(`
    SELECT department, AVG(score) as avg_score
    FROM game_sessions
    WHERE department IS NOT NULL AND department != ''
    GROUP BY department
    ORDER BY avg_score DESC
    LIMIT 1
  `).get() as { department: string; avg_score: number } | undefined;

  return {
    totalRegistered: totalRow?.count || 0,
    totalCompleted: completedRow?.count || 0,
    fastestTimeSeconds: fastestRow?.min_time || null,
    topDepartment: topDeptRow?.department || null,
    averageScore: Math.round(avgScoreRow?.avg_score || 0),
  };
}
