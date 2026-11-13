/** Edge cookie check. API AuthGuard validates Redis session + signature. */
export function hasSessionCookie(
  cookies: { name: string; value: string }[],
  cookieName = 'autobi_session',
): boolean {
  // cookie-parser signed values are `s:<payload>.<sig>`
  return cookies.some((c) => c.name === cookieName && c.value.startsWith('s:'));
}

const PUBLIC = new Set(['/', '/login', '/register', '/verify-email', '/invite']);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC.has(pathname);
}
