/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
    NextFetchEvent,
    NextProxy,
    NextRequest,
    NextResponse,
} from 'next/server'
import { ConfigFactory, Matcher, MiddlewareFactory } from './utils/types'
import { nextjsRegexpPageOnly, nextNoApi, noPublic } from './utils/static'
import { validateEnvSafe } from '#/env'
import { toAbsoluteUrl } from '@/lib/utils'
import { createDebug } from '@/lib/debug'
import { getCookieCache, getSessionCookie } from "better-auth/cookies"
import type { Session } from '@repo/auth'

const debugFirstLoad = createDebug('middleware/firstload')

const env = validateEnvSafe(process.env).data

// Paths that should not trigger the first load redirect
const EXCLUDED_PATHS = [
    '/login',
    '/register',
    '/presentation',
    '/api',
    '/middleware/error',
    '/_next',
    '/static',
]

const withFirstLoad: MiddlewareFactory = (next: NextProxy) => {
    if (!env) {
        throw new Error('env is not valid')
    }

    return async (request: NextRequest, _next: NextFetchEvent) => {
        const pathname = request.nextUrl.pathname

        debugFirstLoad(`Checking first load for ${pathname}`)

        // Skip excluded paths
        if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
            debugFirstLoad(`Skipping excluded path: ${pathname}`)
            return next(request, _next)
        }

        // Check if user is authenticated
        const sessionCookie = getSessionCookie(request)
        
        console.log('Session cookie:', sessionCookie)
        
        if (!sessionCookie) {
            debugFirstLoad('No session, skipping first load check')
            return next(request, _next)
        }

        // Get session data to check user role
        let session: Session | null = null
        try {
            session = await getCookieCache<Session>(request, {
                secret: env.BETTER_AUTH_SECRET,
                // Match the cookie security setting from the API
                // In Docker without HTTPS termination, use non-secure cookies
                isSecure: env.NEXT_PUBLIC_API_URL?.startsWith('https://') ?? false
            })
            console.log('session: ', session)
        } catch (error) {
            console.log('session access error:', error)
            debugFirstLoad('Error getting session cache:', error)
            return next(request, _next)
        }

        // Only apply first load check to users with 'sarah' role
        const userRole = session?.user?.role
        if (userRole !== 'sarah') {
            debugFirstLoad(`User role is ${userRole ?? 'unknown'}, skipping first load check (only applies to sarah role)`)
            return next(request, _next)
        }

        // Check if user has completed first load (cookie-based)
        const hasSeenPresentation = request.cookies.get('presentation_seen')?.value === 'true'

        if (hasSeenPresentation) {
            debugFirstLoad('User has already seen presentation')
            return next(request, _next)
        }
        
        debugFirstLoad('Redirecting to presentation page')
        
        // Redirect to presentation page - use toAbsoluteUrl for proper redirect
        return NextResponse.redirect(toAbsoluteUrl('/presentation'))
    }
}

export default withFirstLoad

export const matcher: Matcher = [
    {
        and: [
            nextNoApi,
            nextjsRegexpPageOnly,
            noPublic,
        ],
    },
]

export const config: ConfigFactory = {
    name: 'withFirstLoad',
    matcher: true,
}
