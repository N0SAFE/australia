import { BetterAuthClientOptions } from 'better-auth'
import { createAuthClientFactory } from '@repo/auth/client'
import { getBaseApiUrl } from '../api-url'

// Use direct API URLs, bypassing Next.js proxy
// Browser: NEXT_PUBLIC_API_URL (public endpoint)
// Server: API_URL (private Docker network endpoint)
export const authClient = createAuthClientFactory({
    basePath: '/api/auth',
    baseURL: getBaseApiUrl(),
    fetchOptions: {
        credentials: 'include',
    },
} satisfies BetterAuthClientOptions)
