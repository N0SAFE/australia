/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
    NextFetchEvent,
    NextProxy,
    NextRequest,
    NextResponse,
} from 'next/server'
import { ConfigFactory, Matcher, MiddlewareFactory } from './utils/types'
import { nextjsRegexpPageOnly, nextNoApi } from './utils/static'
import { matcherHandler } from './utils/utils'
import { validateEnvSafe } from '#/env'
import { toAbsoluteUrl } from '@/lib/utils'
import { UserLogin } from '@/routes/index'
import { createDebug } from '@/lib/debug'
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { Session } from '@repo/auth'

const debugAuth = console.log
const debugAuthError = console.log

const env = validateEnvSafe(process.env).data

const adminRegexpAndChildren = /^\/admin(\/.*)?$/
const userRegexpAndChildren = /^(?!\/($|login(\/.*)?$|register(\/.*)?$|admin(\/.*)?$|presentation$|unlock$|invite$))\/.*$/

const withAuth: MiddlewareFactory = (next: NextProxy) => {
    if (!env) {
        debugAuthError('Environment variables are not valid')
        throw new Error('env is not valid')
    }
    return async (request: NextRequest, _next: NextFetchEvent) => {
        debugAuth(`Checking authentication for ${request.nextUrl.pathname}`, {
            path: request.nextUrl.pathname
        })

        const masterTokenEnabled = env.NODE_ENV === 'development' ? request.cookies.get('master-token-enabled')?.value === 'true' : false

        if (masterTokenEnabled) {
            return next(request, _next)
        }

        // Allow unauthenticated access to login, register, unlock, and root page
        const pathname = request.nextUrl.pathname
        if (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/presentation' || pathname === '/unlock') {
            return next(request, _next)
        }

        // Get session using Better Auth directly
        let sessionCookie: string | null = null
        let sessionError: unknown = null
        const startTime = Date.now()

        try {
            debugAuth('Getting session using Better Auth')
            
            sessionCookie = getSessionCookie(request);
            
            const s = await getCookieCache<Session>(request)
            
            console.log("s", s)
            
            debugAuth('Session processed:', {
                hasSession: !!sessionCookie,
            })
            
        } catch (error) {
            console.error('Error getting session from Better Auth:', error)
            sessionError = error
            const duration = Date.now() - startTime
            debugAuthError('Error getting session from Better Auth:', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                duration: `${String(duration)}ms`,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
            })
        }

        const isAuth = !!sessionCookie

        console.log({
            isAuth,
            sessionError,
            sessionCookie
        })

        debugAuth(`Session result - isAuth: ${String(isAuth)}, hasError: ${String(!!sessionError)}`, {
            path: request.nextUrl.pathname,
            isAuth,
            hasError: !!sessionError
        })

        if (isAuth) {
            // // Check if user is trying to access /admin routes
            // const isAdminRoute = adminRegexpAndChildren.test(pathname)
            
            // if (isAdminRoute) {
            //     // For admin routes, we need to verify the user has admin role
            //     // Since middleware can't easily access session data, we'll check via API
            //     try {
            //         const apiUrl = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
            //         const sessionResponse = await fetch(`${apiUrl}/api/auth/get-session`, {
            //             headers: {
            //                 'cookie': request.headers.get('cookie') || '',
            //             },
            //         })

            //         if (sessionResponse.ok) {
            //             const sessionData = await sessionResponse.json() as { user?: { role?: string } }
            //             const userRole = sessionData?.user?.role
                        
            //             debugAuth('User role check for admin route:', {
            //                 pathname,
            //                 userRole,
            //                 isAdmin: userRole === 'admin' || userRole?.includes('admin')
            //             })

            //             // Only admin role can access /admin routes
            //             if (userRole !== 'admin' && !userRole?.includes('admin')) {
            //                 debugAuth(`Blocking non-admin user from ${pathname}`)
            //                 return NextResponse.redirect(toAbsoluteUrl('/home'))
            //             }
            //         } else {
            //             // If we can't verify role, redirect to home for safety
            //             debugAuthError('Failed to verify user role for admin route')
            //             return NextResponse.redirect(toAbsoluteUrl('/home'))
            //         }
            //     } catch (error) {
            //         debugAuthError('Error checking user role:', error)
            //         // If there's an error checking role, redirect to home for safety
            //         return NextResponse.redirect(toAbsoluteUrl('/home'))
            //     }
            // }

            const matcher = matcherHandler(request.nextUrl.pathname, [
                {
                    and: ['/me/customer'],
                },
                () => {
                    // in this route we can check if the user is authenticated with the customer role
                    // if (session?.user?.role === 'customer') {
                    //     return next(request, _next)
                    // }
                    // return NextResponse.redirect(
                    //     process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '') +
                    //         '/auth/login' +
                    //         '?' +
                    //         encodeURIComponent(
                    //             'callbackUrl=' +
                    //                 request.nextUrl.pathname +
                    //                 (request.nextUrl.search ?? '')
                    //         )
                    // )
                },
            ])
            if (matcher.hit) {
                return matcher.data // return the Response associated
            }
            return next(request, _next) // call the next middleware because the route is good
        } else {
            // User is not authenticated, redirect to login for protected routes
            debugAuth(`Redirecting unauthenticated user from ${request.nextUrl.pathname} to signin`)
            console.log('redirecting from WithAuth middleware')
            return NextResponse.redirect(
                toAbsoluteUrl('/login')
            )
        }
    }
}

export default withAuth

export const matcher: Matcher = [
    {
        and: [
            nextNoApi,
            nextjsRegexpPageOnly,
            {
                or: [
                    userRegexpAndChildren,
                    adminRegexpAndChildren
                ],
            },
        ],
    },
]

export const config: ConfigFactory = {
    name: 'withAuth',
    matcher: true,
}
