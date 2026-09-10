import { createError, getCookie } from 'h3'
import { isEditorAuthorized } from '../../../utils/editor-access'
import { resetFloorplan } from '../../../utils/game-database'
import { ACCESS_COOKIE, isAccessTokenValid } from '../../../utils/game-session'

export default defineEventHandler((event) => {
  if (!isAccessTokenValid(getCookie(event, ACCESS_COOKIE)) && !isEditorAuthorized(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Editor access required' })
  }

  return { floorplan: resetFloorplan() }
})
