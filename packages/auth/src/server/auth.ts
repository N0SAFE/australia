import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "better-auth/plugins/passkey";
import { openAPI } from "better-auth/plugins";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { masterTokenPlugin } from "./plugins/masterTokenAuth";
import { loginAsPlugin } from "./plugins/loginAs";
import { useAdmin } from "../permissions/index";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const betterAuthFactory = <TSchema extends Record<string, unknown> = Record<string, never>>(
    database: unknown,
    env: {
        DEV_AUTH_KEY: string | undefined;
        PASSKEY_RPID: string;
        PASSKEY_RPNAME: string;
        PASSKEY_ORIGIN: string;
        NODE_ENV: string;
        BETTER_AUTH_SECRET?: string;
        BASE_URL?: string;
        APP_URL?: string;
        NEXT_PUBLIC_APP_URL?: string;
        TRUSTED_ORIGINS?: string;
    }
) => {
    const dbInstance = database as NodePgDatabase<TSchema>;

    const {
        DEV_AUTH_KEY,
        PASSKEY_RPID,
        PASSKEY_RPNAME,
        PASSKEY_ORIGIN,
        NODE_ENV,
        BETTER_AUTH_SECRET,
        BASE_URL,
        APP_URL,
        NEXT_PUBLIC_APP_URL,
        TRUSTED_ORIGINS,
    } = env

    // Build trusted origins: both public and private web app URLs + additional origins
    const origins: string[] = [];
    
    // Trust the private Docker network URL (APP_URL)
    if (APP_URL) {
        origins.push(APP_URL);
    }
    
    // Trust the public web app URL (NEXT_PUBLIC_APP_URL)
    if (NEXT_PUBLIC_APP_URL) {
        origins.push(NEXT_PUBLIC_APP_URL);
    }
    
    // Add additional trusted origins if provided
    if (TRUSTED_ORIGINS) {
        const additionalOrigins = TRUSTED_ORIGINS.split(',').map(origin => origin.trim());
        origins.push(...additionalOrigins);
    }

    const isHttps = BASE_URL?.startsWith('https://') ?? false;

    return {
        auth: betterAuth({
            secret: BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
            baseURL: BASE_URL ?? process.env.NEXT_PUBLIC_API_URL,
            trustedOrigins: origins.length > 0 ? origins : undefined,
            advanced: {
                // In production with HTTPS, use secure cookies
                // CRITICAL: Must match the isSecure setting in middleware
                useSecureCookies: isHttps,
                // Set cross-origin cookie options for mobile compatibility
                crossSubDomainCookies: {
                    enabled: isHttps,
                },
            },
            database: drizzleAdapter(dbInstance, {
                provider: "pg",
            }),
            emailAndPassword: {
                enabled: true,
            },
            session: {
                cookieCache: {
                    enabled: true,
                    maxAge: 5 * 60, // Cache duration in seconds
                },
            },
            plugins: [
                passkey({
                    rpID: PASSKEY_RPID,
                    rpName: PASSKEY_RPNAME,
                    origin: PASSKEY_ORIGIN,
                }),
                useAdmin(),
                masterTokenPlugin({
                    devAuthKey: DEV_AUTH_KEY ?? "",
                    enabled: NODE_ENV === "development" && !!DEV_AUTH_KEY,
                }),
                loginAsPlugin({
                    enabled: NODE_ENV === "development" && !!DEV_AUTH_KEY,
                    devAuthKey: DEV_AUTH_KEY ?? "",
                }),
                openAPI(),
            ],
        }),
    };
};
