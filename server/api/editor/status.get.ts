import { getCookie } from 'h3'
import { EDITOR_ACCESS_COOKIE, isEditorAuthorized } from '../../utils/editor-access'

export default defineEventHandler((event) => ({
  authenticated: isEditorAuthorized(event),
  hasEditorCookie: Boolean(getCookie(event, EDITOR_ACCESS_COOKIE)),
}))