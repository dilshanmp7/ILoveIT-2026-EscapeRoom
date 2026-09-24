import {
  type FinalScorePayload,
  type GameSession,
  type LevelProgress,
  type PlayerRegistration,
  calculateScore,
  GAME_TIME_LIMIT_SECONDS,
} from "#shared/game/types";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createError } from "h3";
import { generateUserCode, getRandomQuestionsForLevel } from "../../shared/game/questions-data";
import {
  deleteGameSession,
  findSessionByUserCode,
  getAccessTokenRecord,
  insertGameSession,
  readFloorplan,
  readGameSession,
  removeAccessTokenRecord,
  saveAccessToken,
  updateSessionAccessToken,
  updateSessionFloorplan,
  updateStoredSession,
} from "./game-database";
import { getRemoteSessionByIdOrCode, isRemoteStorageConfigured } from "./remote-storage";

export const ACCESS_COOKIE = "courier_access";

const TOKEN_SECRET =
  process.env.NUXT_AUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "cph-escape-room-2026-auth-secret";

interface AccessRecord {
  token: string;
  createdAt: number;
}

const accessRecords = new Map<string, AccessRecord>();

export function createAccessToken(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const payload = `${timestamp}.${nonce}`;
  const hmac = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  const token = `${payload}.${hmac}`;

  const createdAt = Date.now();
  accessRecords.set(token, { token, createdAt });
  saveAccessToken(token, createdAt);
  return token;
}

export function isAccessTokenValid(token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;

  // 1. Stateless HMAC validation (seamless across serverless lambda containers)
  const parts = token.split(".");
  if (parts.length === 3) {
    const [timestampStr, nonce, receivedHmac] = parts;
    const timestampSec = parseInt(timestampStr, 10);
    if (!isNaN(timestampSec)) {
      const nowSec = Math.floor(Date.now() / 1000);
      const ageSec = nowSec - timestampSec;
      // Valid for 24 hours (86400 seconds) with 60s future clock skew allowance
      if (ageSec >= -60 && ageSec <= 86400) {
        const expectedHmac = createHmac("sha256", TOKEN_SECRET)
          .update(`${timestampStr}.${nonce}`)
          .digest("hex");
        if (receivedHmac.length === expectedHmac.length) {
          try {
            if (timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
              return true;
            }
          } catch {
            // Buffer length or timing mismatch
          }
        }
      }
    }
  }

  // 2. Fallback to in-memory / SQLite check (for legacy UUID tokens)
  let record = accessRecords.get(token);
  if (!record) {
    const dbRecord = getAccessTokenRecord(token);
    if (dbRecord) {
      record = { token: dbRecord.token, createdAt: Number(dbRecord.created_at) };
      accessRecords.set(token, record);
    }
  }
  if (!record) return false;
  if (Date.now() - record.createdAt > 1000 * 60 * 60 * 24) {
    accessRecords.delete(token);
    removeAccessTokenRecord(token);
    return false;
  }
  return true;
}

export async function createOrResumeGameSession(
  accessToken: string,
  registration?: Partial<PlayerRegistration> & { sessionKey?: string },
) {
  const firstName = registration?.firstName?.trim() || "";
  const lastName = registration?.lastName?.trim() || "";
  const department = registration?.department?.trim() || "Operation";
  const shift = registration?.shift?.trim() || "Day Shift";

  let userCode = registration?.userCode?.trim();
  if (!userCode && (firstName || lastName)) {
    userCode = generateUserCode(firstName, lastName, department, shift);
  }

  // Check if an existing session exists for this user code or session key
  const lookupKey = userCode || registration?.sessionKey;
  if (lookupKey) {
    let existing = findSessionByUserCode(lookupKey) || readGameSession(lookupKey);

    // If Upstash Redis is configured, it is the authoritative remote store:
    if (isRemoteStorageConfigured()) {
      const remote = await getRemoteSessionByIdOrCode(lookupKey);
      if (!remote) {
        // Player details were deleted from Upstash Redis!
        // Clear out any stale local SQLite records so the player can start fresh
        if (existing) {
          deleteGameSession(existing.session.id);
          deleteGameSession(lookupKey);
          existing = null;
        }
      } else {
        // Active/completed session found in Upstash Redis, keep local SQLite synced
        const floorplan = existing?.floorplan || readFloorplan();
        const levelProg: LevelProgress = remote.levelProgress || {
          currentLevel: (remote.currentLevel as 1 | 2 | 3) || 1,
          solvedQuestionIds: [],
          hintUsedQuestionIds: [],
          level1Questions: getRandomQuestionsForLevel(1, 5),
          level2Questions: getRandomQuestionsForLevel(2, 5),
          level3Questions: getRandomQuestionsForLevel(3, 5),
          attemptsByQuestionId: {},
        };
        try {
          insertGameSession(remote, remote.userCode, accessToken, floorplan, levelProg);
        } catch {
          // Ignore sync failure
        }
        existing = {
          session: remote,
          floorplan,
          quizzes: levelProg.level1Questions || [],
          levelProgress: levelProg,
        };
      }
    }

    if (existing) {
      // If the session is already finished (completed or timed out), block replaying!
      const isFinished =
        existing.session.status === "completed" ||
        existing.session.status === "timed_out" ||
        (existing.session.timeSpentSeconds !== undefined && existing.session.timeSpentSeconds >= GAME_TIME_LIMIT_SECONDS);

      if (isFinished) {
        throw createError({
          statusCode: 403,
          statusMessage: `Agent ${existing.session.userCode} (${existing.session.firstName} ${existing.session.lastName}) has already completed their mission with ${existing.session.score} points! Each operative is strictly permitted one attempt. Check your standing on the Leaderboard.`,
        });
      }

      if (!existing.floorplan?.layout || existing.floorplan.layout.length < 15 || existing.floorplan.layout.some((x: any) => x.id === "term_l1_6") || !existing.floorplan.layout.some((x: any) => x.id === "obs_l1_1")) {
        existing.floorplan = readFloorplan();
        updateSessionFloorplan(existing.session.id, existing.floorplan);
      }
      updateSessionAccessToken(existing.session.id, accessToken);
      return {
        isResumed: true,
        session: existing.session,
        floorplan: existing.floorplan,
        levelProgress: existing.levelProgress,
        accessToken,
      };
    }
  }

  // If attempting to resume with an agent code only and no record was found
  if (!firstName && !lastName && registration?.sessionKey) {
    throw createError({
      statusCode: 404,
      statusMessage: `No active mission found for Agent Code "${registration.sessionKey}". Please check your code or register as a new agent.`,
    });
  }

  // Otherwise, create a new fresh session
  const now = new Date().toISOString();
  const sessionId = randomUUID();
  const finalUserCode = userCode || `CPH-${sessionId.slice(0, 8).toUpperCase()}`;

  const levelProgress: LevelProgress = {
    currentLevel: 1,
    solvedQuestionIds: [],
    hintUsedQuestionIds: [],
    level1Questions: getRandomQuestionsForLevel(1, 5),
    level2Questions: getRandomQuestionsForLevel(2, 5),
    level3Questions: getRandomQuestionsForLevel(3, 5),
    attemptsByQuestionId: {},
  };

  const session: GameSession = {
    id: sessionId,
    sessionKey: finalUserCode,
    userCode: finalUserCode,
    firstName: firstName || "Agent",
    lastName: lastName || "",
    department,
    shift,
    currentLevel: 1,
    hintsUsed: 0,
    timeSpentSeconds: 0,
    levelProgress,
    status: "active",
    score: 0,
    createdAt: now,
    updatedAt: now,
  };

  const floorplan = readFloorplan();
  insertGameSession(session, finalUserCode, accessToken, floorplan, levelProgress);

  return {
    isResumed: false,
    session,
    floorplan,
    levelProgress,
    accessToken,
  };
}

export function updateGameSession(
  id: string,
  accessToken: string,
  payload: FinalScorePayload,
) {
  const isTimedOut = payload.timeSpentSeconds !== undefined && payload.timeSpentSeconds >= GAME_TIME_LIMIT_SECONDS;
  const status = isTimedOut ? "timed_out" : (payload.completed === false ? "active" : "completed");
  const isCompleted = status === "completed";

  const breakdown = payload.scoreBreakdown || calculateScore({
    questionScore: payload.score,
    timeSpentSeconds: payload.timeSpentSeconds || 0,
    completed: isCompleted,
    isTimedOut,
  });

  const finalScore = isCompleted ? breakdown.totalScore : payload.score;

  return updateStoredSession(
    id,
    accessToken,
    finalScore,
    status,
    new Date().toISOString(),
    {
      currentLevel: payload.currentLevel,
      hintsUsed: payload.hintsUsed,
      timeSpentSeconds: payload.timeSpentSeconds,
      levelProgress: payload.levelProgress,
      scoreBreakdown: breakdown,
      userCode: payload.userCode,
      firstName: payload.firstName,
      lastName: payload.lastName,
      department: payload.department,
      shift: payload.shift,
    },
  );
}
