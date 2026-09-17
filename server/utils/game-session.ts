import type { FinalScorePayload, GameSession } from "#shared/game/types";
import { randomUUID } from "node:crypto";
import {
  insertGameSession,
  readFloorplan,
  readGameSession,
  readQuizzes,
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
  accessRecords.set(token, { token, createdAt: Date.now() });
  return token;
}

export function isAccessTokenValid(token: string | undefined) {
  if (!token) return false;
  const record = accessRecords.get(token);
  if (!record) return false;
  if (Date.now() - record.createdAt > 1000 * 60 * 60 * 12) {
    accessRecords.delete(token);
    return false;
  }
  return true;
}

export function createGameSession(accessToken: string, existingId?: string) {
  if (existingId) {
    const existing = readGameSession(existingId, accessToken);
    if (existing) return existing;
  }
  const now = new Date().toISOString();
  const session: GameSession & { accessToken: string } = {
    id: randomUUID(),
    status: "active",
    score: 0,
    createdAt: now,
    updatedAt: now,
    accessToken,
  };
  insertGameSession(session, accessToken, readFloorplan(), readQuizzes());
  return {
    session: toPublicSession(session),
    floorplan: readFloorplan(),
    quizzes: readQuizzes(),
  };
}

export function updateGameSession(
  id: string,
  accessToken: string,
  payload: FinalScorePayload,
) {
  const status = payload.completed === false ? "active" : "completed";
  return updateStoredSession(
    id,
    accessToken,
    payload.score,
    status,
    new Date().toISOString(),
  );
}

function toPublicSession(
  session: GameSession & { accessToken: string },
): GameSession {
  const { accessToken: _accessToken, ...publicSession } = session;
  return publicSession;
}
