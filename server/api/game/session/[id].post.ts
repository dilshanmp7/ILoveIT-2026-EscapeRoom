import type { FinalScorePayload } from "#shared/game/types";
import { createError, getCookie, readBody } from "h3";
import {
  ACCESS_COOKIE,
  isAccessTokenValid,
  updateGameSession,
} from "../../../utils/game-session";

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, ACCESS_COOKIE);
  if (!isAccessTokenValid(accessToken)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Game access required",
    });
  }

  const body = await readBody<Partial<FinalScorePayload>>(event);
  const score = typeof body?.score === "number" && Number.isFinite(body.score) ? Math.max(0, Math.round(body.score)) : 0;

  const session = updateGameSession(
    event.context.params?.id || "",
    accessToken!,
    {
      score,
      completed: body?.completed !== false,
      currentLevel: body?.currentLevel,
      hintsUsed: body?.hintsUsed,
      timeSpentSeconds: body?.timeSpentSeconds,
      levelProgress: body?.levelProgress,
    },
  );

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: "Game session not found",
    });
  }

  return { session };
});
