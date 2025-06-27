// JWT utility functions

/**
 * Decodes a JWT token and returns the payload
 */
export function decodeToken(token: string) {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )

    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error("Error decoding token:", error)
    return null
  }
}

/**
 * Checks if a token is expired
 */
export function isTokenExpired(token: string) {
  const payload = decodeToken(token)
  if (!payload) return true

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}

/**
 * Gets user information from a token
 */
export function getUserFromToken(token: string) {
  const payload = decodeToken(token)
  if (!payload) return null

  return {
    id: payload.user_id.toString(),
    email: payload.sub,
    name: payload.name || payload.sub.split("@")[0], // Use name if available, otherwise extract from email
    role: payload.roles[0].toLowerCase(), // Convert "ADMIN" to "admin"
    organizationId: payload.org_id ? payload.org_id.toString() : undefined,
  }
}
