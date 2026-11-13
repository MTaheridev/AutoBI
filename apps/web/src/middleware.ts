import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasSessionCookie, isPublicPath } from '@/lib/auth-gate';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    isPublicPath(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const cookies = request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
  if (!hasSessionCookie(cookies)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
