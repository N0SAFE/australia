import { NextRequest, NextResponse, NextFetchEvent, NextProxy } from 'next/server'
import type { MiddlewareFactory, Matcher, ConfigFactory } from './utils/types'
import { nextjsRegexpPageOnly, nextNoApi } from './utils/static'
import { Unlock } from '@/routes'
import { toAbsoluteUrl } from '@/lib/utils'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const withUnlock: MiddlewareFactory = (next: NextProxy) => {
    return async (request: NextRequest, _next: NextFetchEvent) => {
        const pathname = request.nextUrl.pathname

        // Get the unlock page path (for comparison)
        const unlockPath = Unlock({})

        // Skip middleware for unlock page itself
        if (pathname === unlockPath) {
            return next(request, _next)
        }

        // Get the lastUnlock cookie
        const lastUnlockCookie = request.cookies.get('lastUnlock')
        const now = Date.now()

        // Build the redirect URL with the current location
        const currentLocation = request.nextUrl.pathname + request.nextUrl.search

        if (!lastUnlockCookie) {
            // First visit - redirect to unlock page with redirectUrl
            return NextResponse.redirect(
                toAbsoluteUrl(
                    Unlock({}, {
                        redirectUrl: currentLocation
                    })
                )
            )
        }

        const lastUnlockTime = parseInt(lastUnlockCookie.value, 10)
        const timeSinceUnlock = now - lastUnlockTime

        if (timeSinceUnlock >= ONE_DAY_MS) {
            // More than 24 hours have passed - redirect to unlock page with redirectUrl
            return NextResponse.redirect(
                toAbsoluteUrl(
                    Unlock({}, {
                        redirectUrl: currentLocation
                    })
                )
            )
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
