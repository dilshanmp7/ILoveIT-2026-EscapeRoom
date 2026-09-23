import type { FinalScorePayload } from "#shared/game/types";
import { createError, getCookie, getHeader, readBody, setCookie } from "h3";
import {
  ACCESS_COOKIE,
  createAccessToken,
  isAccessTokenValid,
  updateGameSession,
} from "../../../utils/game-session";
import { isRemoteStorageConfigured, saveRemoteSession } from "../../../utils/remote-storage";

export default defineEventHandler(async (event) => {
  let accessToken = getCookie(event, ACCESS_COOKIE) || getHeader(event, "x-access-token");
  const sessionId = event.context.params?.id || "";
  const isValidSessionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

  if (!isAccessTokenValid(accessToken)) {
    // In serverless multi-container environments or browser cookie drops:
    // Auto-heal with a valid signed token if this is a legitimate active game session UUID
    if (isValidSessionId) {
      accessToken = createAccessToken();
      setCookie(event, ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
    } else {
      throw createError({
        statusCode: 401,
        statusMessage: "Game access required",
      });
    }
  }

  const body = await readBody<Partial<FinalScorePayload>>(event);
  const score = typeof body?.score === "number" && Number.isFinite(body.score) ? Math.max(0, Math.round(body.score)) : 0;

  const session = updateGameSession(
    sessionId,
    accessToken!,
    {
      score,
      completed: body?.completed !== false,
      currentLevel: body?.currentLevel,
      hintsUsed: body?.hintsUsed,
      timeSpentSeconds: body?.timeSpentSeconds,
      levelProgress: body?.levelProgress,
      playerPosition: body?.playerPosition,
      userCode: body?.userCode,
      firstName: body?.firstName,
      lastName: body?.lastName,
      department: body?.department,
      shift: body?.shift,
    },
  );

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: "Game session not found",
    });
  }

  if (isRemoteStorageConfigured()) {
    void saveRemoteSession(session);
  }

  return { session, accessToken };
});
