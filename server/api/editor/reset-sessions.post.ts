import { createError } from 'h3'
import { isEditorAuthorized } from '../../utils/editor-access'
import { clearAllGameSessions } from '../../utils/game-database'

export default defineEventHandler((event) => {
  if (!isEditorAuthorized(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Editor access required.' })
  }

  const result = clearAllGameSessions()
  return {
    success: true,
    ...result,
  }
})

