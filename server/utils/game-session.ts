import type {
  FinalScorePayload,
  GameSession,
  LevelProgress,
  PlayerRegistration,
} from "#shared/game/types";
import { randomUUID } from "node:crypto";
import { createError } from "h3";
import { generateUserCode, getRandomQuestionsForLevel } from "../../shared/game/questions-data";
import {
  findSessionByUserCode,
  getAccessTokenRecord,
  insertGameSession,
  readFloorplan,
  readGameSession,
  removeAccessTokenRecord,
  saveAccessToken,
  updateSessionAccessToken,
  updateStoredSession,
} from "./game-database";

export const ACCESS_COOKIE = "courier_access";

interface AccessRecord {
  token: string;
  createdAt: number;
}

const accessRecords = new Map<string, AccessRecord>();

export function createAccessToken() {
  const token = randomUUID();
  const createdAt = Date.now();
  accessRecords.set(token, { token, createdAt });
  saveAccessToken(token, createdAt);
  return token;
}

export function isAccessTokenValid(token: string | undefined) {
  if (!token) return false;
  let record = accessRecords.get(token);
  if (!record) {
    const dbRecord = getAccessTokenRecord(token);
    if (dbRecord) {
      record = { token: dbRecord.token, createdAt: Number(dbRecord.created_at) };
      accessRecords.set(token, record);
    }
  }
  if (!record) return false;
  if (Date.now() - record.createdAt > 1000 * 60 * 60 * 12) {
    accessRecords.delete(token);
    removeAccessTokenRecord(token);
    return false;
  }
  return true;
}

export function createOrResumeGameSession(
  accessToken: string,
  registration?: Partial<PlayerRegistration> & { sessionKey?: string },
) {
  const firstName = registration?.firstName?.trim() || "";
  const lastName = registration?.lastName?.trim() || "";
  const department = registration?.department?.trim() || "Operations - Sort / Hub Operations";
  const shift = registration?.shift?.trim() || "Day Shift";

  let userCode = registration?.userCode?.trim();
  if (!userCode && (firstName || lastName)) {
    userCode = generateUserCode(firstName, lastName, department, shift);
  }

  // Check if an existing session exists for this user code or session key
  const lookupKey = userCode || registration?.sessionKey;
  if (lookupKey) {
    const existing = findSessionByUserCode(lookupKey) || readGameSession(lookupKey);
    if (existing) {
      // If the session is already finished (completed or timed out), block replaying!
      const isFinished =
        existing.session.status === "completed" ||
        existing.session.status === "timed_out" ||
        (existing.session.timeSpentSeconds !== undefined && existing.session.timeSpentSeconds >= 300);

      if (isFinished) {
        throw createError({
          statusCode: 403,
          statusMessage: `Agent ${existing.session.userCode} (${existing.session.firstName} ${existing.session.lastName}) has already completed their mission with ${existing.session.score} points! Each operative is strictly permitted one attempt. Check your standing on the Leaderboard.`,
        });
      }

      if (!existing.floorplan?.layout || existing.floorplan.layout.length < 15 || existing.floorplan.layout.some((x: any) => x.id === "term_l1_6")) {
        existing.floorplan = readFloorplan();
        updateStoredSession(existing.session.id, { floorplan: existing.floorplan });
      }
      updateSessionAccessToken(existing.session.id, accessToken);
      return {
        isResumed: true,
        session: existing.session,
        floorplan: existing.floorplan,
        levelProgress: existing.levelProgress,
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
  };
}

export function updateGameSession(
  id: string,
  accessToken: string,
  payload: FinalScorePayload,
) {
  const isTimedOut = payload.timeSpentSeconds !== undefined && payload.timeSpentSeconds >= 300;
  const status = isTimedOut ? "timed_out" : (payload.completed === false ? "active" : "completed");
  return updateStoredSession(
    id,
    accessToken,
    payload.score,
    status,
    new Date().toISOString(),
    {
      currentLevel: payload.currentLevel,
      hintsUsed: payload.hintsUsed,
      timeSpentSeconds: payload.timeSpentSeconds,
      levelProgress: payload.levelProgress,
    },
  );
}
