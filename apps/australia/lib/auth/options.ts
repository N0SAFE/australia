import { BetterAuthClientOptions } from 'better-auth'
import masterTokenClient from './plugins/masterToken'
import { loginAsClientPlugin } from './plugins/loginAs'
import { passkeyClient, adminClient } from 'better-auth/client/plugins'
import { validateEnvPath } from '#/env'

const appUrl = validateEnvPath(
    process.env.NEXT_PUBLIC_AUSTRALIA_URL ?? '',
    'NEXT_PUBLIC_AUSTRALIA_URL'
)

export const options = {
    basePath: '/api/auth',
    baseURL: appUrl,
    plugins: [passkeyClient(), adminClient(), masterTokenClient(), loginAsClientPlugin()],
} satisfies BetterAuthClientOptions
