import { createError, getCookie } from 'h3'
import { ACCESS_COOKIE, createGameSession, isAccessTokenValid } from '../../utils/game-session'

export default defineEventHandler((event) => {
  const accessToken = getCookie(event, ACCESS_COOKIE)
  if (!isAccessTokenValid(accessToken)) {
    throw createError({ statusCode: 401, statusMessage: 'Game access required' })
  }

  return { session: createGameSession(accessToken!) }
})
