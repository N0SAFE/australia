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
import { getSessionCookie } from "better-auth/cookies"

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

        // If user is accessing admin pages, they automatically bypass the presentation
        if (pathname.startsWith('/admin')) {
            debugFirstLoad('Admin path detected, marking presentation as seen')
            
            // Check if the cookie is already set to avoid unnecessary response modification
            const hasSeenPresentation = request.cookies.get('presentation_seen')?.value === 'true'
            
            if (!hasSeenPresentation) {
                // Create a response with the cookie set
                const response = NextResponse.next()
                response.cookies.set('presentation_seen', 'true', { 
                    path: '/', 
                    maxAge: 31536000 // 1 year
                })
                return response
            }
            
            return next(request, _next)
        }

        // Check if user is authenticated
        const sessionCookie = getSessionCookie(request)
        
        if (!sessionCookie) {
            debugFirstLoad('No session, skipping first load check')
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
