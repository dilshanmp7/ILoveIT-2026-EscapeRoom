import { getCookie, type H3Event } from 'h3'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { ACCESS_COOKIE, isAccessTokenValid } from './game-session'

export const EDITOR_ACCESS_COOKIE = 'courier_editor_access'

const EDITOR_TOKEN_SECRET = (process.env.NUXT_AUTH_SECRET || process.env.AUTH_SECRET || 'cph-escape-room-2026-auth-secret') + '-editor'
const editorTokens = new Set<string>()

function isPasswordDisabled(event: H3Event) {
  const config = useRuntimeConfig(event)
  return config.disableEditorPassword === true
    || process.env.NUXT_DISABLE_EDITOR_PASSWORD === 'true'
}

function getEditorPassword(event: H3Event) {
  const config = useRuntimeConfig(event)
  return config.editorPassword || process.env.NUXT_EDITOR_PASSWORD || 'editor'
}

export function isEditorAuthorized(event: H3Event) {
  if (isPasswordDisabled(event)) return true
  if (isAccessTokenValid(getCookie(event, ACCESS_COOKIE))) return true
  const cookie = getCookie(event, EDITOR_ACCESS_COOKIE)
  if (!cookie) return false
  if (editorTokens.has(cookie)) return true

  // Stateless HMAC verification for editor access
  const parts = cookie.split('.')
  if (parts.length === 4 && parts[0] === 'editor') {
    const [, timestampStr, nonce, receivedHmac] = parts
    const timestampSec = parseInt(timestampStr, 10)
    if (!isNaN(timestampSec)) {
      const nowSec = Math.floor(Date.now() / 1000)
      const ageSec = nowSec - timestampSec
      if (ageSec >= -60 && ageSec <= 86400) {
        const expectedHmac = createHmac('sha256', EDITOR_TOKEN_SECRET)
          .update(`editor.${timestampStr}.${nonce}`)
          .digest('hex')
        if (receivedHmac.length === expectedHmac.length) {
          try {
            if (timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
              return true
            }
          } catch {
            // Buffer length or timing mismatch
          }
        }
      }
    }
  }

  return false
}

export function verifyEditorPassword(event: H3Event, password: string) {
  if (isPasswordDisabled(event)) return true
  return password === getEditorPassword(event)
}

export function createEditorAccessToken() {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomBytes(16).toString('hex')
  const payload = `editor.${timestamp}.${nonce}`
  const hmac = createHmac('sha256', EDITOR_TOKEN_SECRET).update(payload).digest('hex')
  const token = `${payload}.${hmac}`
  editorTokens.add(token)
  return token
}