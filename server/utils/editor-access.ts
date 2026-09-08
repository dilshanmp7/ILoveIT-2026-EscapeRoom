import { getCookie, type H3Event } from 'h3'
import { randomUUID } from 'node:crypto'
import { ACCESS_COOKIE, isAccessTokenValid } from './game-session'

export const EDITOR_ACCESS_COOKIE = 'courier_editor_access'

const editorTokens = new Set<string>()

function isPasswordDisabled(event: H3Event) {
  const config = useRuntimeConfig(event)
  return config.disableEditorPassword === true
    // || config.disableEditorPassword === 'true'
    || process.env.NUXT_DISABLE_EDITOR_PASSWORD === 'true'
}

function getEditorPassword(event: H3Event) {
  const config = useRuntimeConfig(event)
  return config.editorPassword || process.env.NUXT_EDITOR_PASSWORD || 'editor'
}

export function isEditorAuthorized(event: H3Event) {
  if (isPasswordDisabled(event)) return true
  if (isAccessTokenValid(getCookie(event, ACCESS_COOKIE))) return true
  return editorTokens.has(getCookie(event, EDITOR_ACCESS_COOKIE) || '')
}

export function verifyEditorPassword(event: H3Event, password: string) {
  if (isPasswordDisabled(event)) return true
  return password === getEditorPassword(event)
}

export function createEditorAccessToken() {
  const token = randomUUID()
  editorTokens.add(token)
  return token
}