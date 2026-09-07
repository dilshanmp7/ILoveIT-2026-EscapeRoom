import { getCookie } from 'h3'
import { ACCESS_COOKIE, isAccessTokenValid } from '../../utils/game-session'

export default defineEventHandler((event) => ({
  authenticated: isAccessTokenValid(getCookie(event, ACCESS_COOKIE)),
}))
