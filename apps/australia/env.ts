import zod from 'zod/v4'

// Helper to trim trailing slash
const trimTrailingSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url)

// Fallback defaults for local / test usage. **Never** rely on defaults in production.
const LOCAL_AUSTRALIA_FALLBACK = 'http://localhost:3000'
const LOCAL_API_FALLBACK = 'http://localhost:4000'

const guardedUrl = (name: string, fallback: string) =>
    zod
        .url()
        .or(zod.string().min(1))
        .transform((val) => {
            // If we had to use a fallback in production, surface a hard error.
            if (process.env.NODE_ENV === 'production' && !val) {
                throw new Error(`${name} is required in production but was not provided`)
            }
            return val || fallback
        })
        .transform(trimTrailingSlash)

// Debug scope parser - transforms comma-separated scopes into structured format
const parseDebugScopes = (input: string): { patterns: string[], enableAll: boolean } => {
    if (!input || input.trim() === '') {
        return { patterns: [], enableAll: false }
    }
    
    const scopes = input.split(',').map(s => s.trim()).filter(Boolean)
    const enableAll = scopes.includes('*')
    
    return {
        patterns: scopes,
        enableAll
    }
}

export const envSchema = zod.object({
    // Provide dev/test fallback; production guard above will error if missing.
    NEXT_PUBLIC_AUSTRALIA_URL: guardedUrl('NEXT_PUBLIC_AUSTRALIA_URL', LOCAL_AUSTRALIA_FALLBACK),
    NEXT_PUBLIC_SHOW_AUTH_LOGS: zod.coerce.boolean().optional().default(false),
    NEXT_PUBLIC_DEBUG: zod
        .string()
        .optional()
        .default('')
        .transform(parseDebugScopes),
    NEXT_PUBLIC_API_URL: guardedUrl('NEXT_PUBLIC_API_URL', LOCAL_API_FALLBACK),
    API_URL: guardedUrl('API_URL', LOCAL_API_FALLBACK),
    NODE_ENV: zod
        .enum(['development', 'production', 'test'] as const)
        .optional()
        .default('development'),
    BETTER_AUTH_SECRET: zod.string().optional(),
    BETTER_AUTH_URL: zod.string().url().optional(),
    NEXT_PUBLIC_DEV_AUTH_KEY: zod.string().optional(),
})

export const validateEnvSafe = (object: object) => {
    return envSchema.safeParse(object)
}

export const envIsValid = (object: object) => {
    return validateEnvSafe(object).success
}

export const validateEnv = (object: object) => {
    return envSchema.parse(object)
}

export const validateEnvPath = <T extends keyof typeof envSchema.shape>(
    input: zod.input<(typeof envSchema.shape)[T]>,
    path: T
): zod.infer<(typeof envSchema.shape)[T]> => {
    if (!envSchema.shape[path]) {
        throw new Error(`Environment variable ${String(path)} is not defined in the schema`)
    }
    return envSchema.shape[path].parse(input) as zod.infer<
        (typeof envSchema.shape)[T]
    >
}
