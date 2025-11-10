import { NextRequest, NextResponse, NextFetchEvent, NextProxy } from 'next/server'
import type { MiddlewareFactory, Matcher, ConfigFactory } from './utils/types'
import { nextjsRegexpPageOnly, nextNoApi } from './utils/static'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const withUnlock: MiddlewareFactory = (next: NextProxy) => {
    return async (request: NextRequest, _next: NextFetchEvent) => {
        const pathname = request.nextUrl.pathname

        // Skip middleware for unlock page itself
        if (pathname === '/unlock') {
            return next(request, _next)
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
        return next(request, _next)
    }
}

export default withUnlock

export const matcher: Matcher = [
    {
        and: [
            nextNoApi,
            nextjsRegexpPageOnly,
            {
                not: '/unlock'
            }
        ],
    },
]

export const config: ConfigFactory = {
    name: 'withUnlock',
    matcher: true,
}
