// WithUnlock.ts
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import type { CustomMiddleware } from './utils/types'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function withUnlock(middleware: CustomMiddleware): CustomMiddleware {
  return async (
    request: NextRequest,
    event: NextFetchEvent,
    response: NextResponse,
  ) => {
    const pathname = request.nextUrl.pathname

    // Skip middleware for unlock page itself and static files
    if (
      pathname === '/unlock' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|woff|woff2|ttf)$/)
    ) {
      return middleware(request, event, response)
    }

    // Get the lastUnlock cookie
    const lastUnlockCookie = request.cookies.get('lastUnlock')
    const now = Date.now()

    if (!lastUnlockCookie) {
      // First visit - redirect to unlock page
      const url = request.nextUrl.clone()
      url.pathname = '/unlock'
      return NextResponse.redirect(url)
    }

    const lastUnlockTime = parseInt(lastUnlockCookie.value, 10)
    const timeSinceUnlock = now - lastUnlockTime

    if (timeSinceUnlock >= ONE_DAY_MS) {
      // More than 24 hours have passed - redirect to unlock page
      const url = request.nextUrl.clone()
      url.pathname = '/unlock'
      return NextResponse.redirect(url)
    }

    // User has unlocked within the last 24 hours - continue
    return middleware(request, event, response)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
