import { createError, readBody, setCookie } from 'h3'
import { createEditorAccessToken, EDITOR_ACCESS_COOKIE, verifyEditorPassword } from '../../utils/editor-access'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: unknown }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!verifyEditorPassword(event, password)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid editor password' })
  }

  if (password) {
    setCookie(event, EDITOR_ACCESS_COOKIE, createEditorAccessToken(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12,
      path: '/',
    })
  }

  return { authenticated: true }
})