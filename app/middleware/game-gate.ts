export default defineNuxtRouteMiddleware(async (to) => {
  if (to.query.session || to.query.first) {
    return
  }

  const requestFetch = useRequestFetch()

  try {
    const response = await requestFetch<{ authenticated: boolean }>('/api/access/status')
    if (response.authenticated) return
  } catch {
    // Treat API failures as unauthenticated so the game never opens by accident.
  }

  return navigateTo('/')
})
