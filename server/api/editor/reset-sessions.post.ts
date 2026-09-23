import { createError } from 'h3'
import { isEditorAuthorized } from '../../utils/editor-access'
import { clearAllGameSessions } from '../../utils/game-database'
import { deleteRemoteSessions, isRemoteStorageConfigured } from '../../utils/remote-storage'

export default defineEventHandler(async (event) => {
  if (!isEditorAuthorized(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Editor access required.' })
  }

  const result = clearAllGameSessions()
  if (isRemoteStorageConfigured()) {
    await deleteRemoteSessions()
  }

  return {
    success: true,
    ...result,
  }
})

