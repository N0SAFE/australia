import { BetterAuthClientOptions } from 'better-auth'
import masterTokenClient from './plugins/masterToken'
import { loginAsClientPlugin } from './plugins/loginAs'
import { passkeyClient, adminClient } from 'better-auth/client/plugins'
import { createAuthClientFactory } from '@repo/auth/client'
import { validateEnvPath } from '#/env'

const appUrl = validateEnvPath(
    process.env.NEXT_PUBLIC_APP_URL ?? '',
    'NEXT_PUBLIC_APP_URL'
)

export const authClient = createAuthClientFactory({
    basePath: '/api/auth',
    baseURL: appUrl,
    fetchOptions: {
        credentials: 'include',
    },
    plugins: [passkeyClient(), adminClient(), masterTokenClient(), loginAsClientPlugin()],
} satisfies BetterAuthClientOptions)
