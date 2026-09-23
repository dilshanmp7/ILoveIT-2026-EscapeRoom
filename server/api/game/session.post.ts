import type { PlayerRegistration } from "#shared/game/types";
import { getCookie, getHeader, readBody, setCookie } from "h3";
import {
  ACCESS_COOKIE,
  createAccessToken,
  createOrResumeGameSession,
  isAccessTokenValid,
} from "../../utils/game-session";
import { isRemoteStorageConfigured, saveRemoteSession } from "../../utils/remote-storage";

export default defineEventHandler(async (event) => {
  let accessToken = getCookie(event, ACCESS_COOKIE) || getHeader(event, "x-access-token");
  if (!isAccessTokenValid(accessToken)) {
    accessToken = createAccessToken();
    setCookie(event, ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  }

  const body = await readBody<
    Partial<PlayerRegistration> & { sessionKey?: string }
  >(event);

  const result = await createOrResumeGameSession(accessToken, body || {});
  if (isRemoteStorageConfigured() && result?.session) {
    await saveRemoteSession(result.session);
  }
  return result;
});
