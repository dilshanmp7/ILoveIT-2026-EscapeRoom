import { createError, getCookie, readBody, setCookie } from 'h3'
import { ACCESS_COOKIE, createAccessToken, isAccessTokenValid } from '../../utils/game-session'

interface AccessBody {
  code?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AccessBody>(event)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const config = useRuntimeConfig(event)

  const configuredCode = config.gameAccessCode || process.env.NUXT_GAME_ACCESS_CODE || 'courier-demo'
  if (!code || code !== configuredCode) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid access code' })
  }

  const existingToken = getCookie(event, ACCESS_COOKIE)
  const token = isAccessTokenValid(existingToken) ? existingToken! : createAccessToken()

  setCookie(event, ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12,
    path: '/',
  })

  return { authenticated: true }
})
