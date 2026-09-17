import { createError, getCookie, readBody } from "h3";
import {
  ACCESS_COOKIE,
  createGameSession,
  isAccessTokenValid,
} from "../../utils/game-session";

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, ACCESS_COOKIE);
  if (!isAccessTokenValid(accessToken)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Game access required",
    });
  }

  const body = await readBody<{ sessionId?: string }>(event);
  return createGameSession(accessToken!, body?.sessionId);
});
