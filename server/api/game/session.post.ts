import type { PlayerRegistration } from "#shared/game/types";
import { getCookie, readBody, setCookie } from "h3";
import {
  ACCESS_COOKIE,
  createAccessToken,
  createOrResumeGameSession,
  isAccessTokenValid,
} from "../../utils/game-session";

export default defineEventHandler(async (event) => {
  let accessToken = getCookie(event, ACCESS_COOKIE);
  if (!isAccessTokenValid(accessToken)) {
    accessToken = createAccessToken();
    setCookie(event, ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
      path: "/",
    });
  }

  const body = await readBody<
    Partial<PlayerRegistration> & { sessionKey?: string }
  >(event);

  return createOrResumeGameSession(accessToken, body || {});
});
