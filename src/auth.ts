import { betterAuth } from "better-auth";
import { db, Role } from "./db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

export const auth = (env: Env) => betterAuth({
    database: {
        db: db(env),
        type: "sqlite"
    },
    socialProviders: {
        google: { 
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
    },
    // See https://www.better-auth.com/docs/concepts/session-management#stateless-session-management
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 7 * 24 * 60 * 60, // 7 days cache duration
            refreshCache: true, // Enable stateless refres
        }
    },
    account: {
        storeStateStrategy: "cookie",
        storeAccountCookie: true, // Store account data after OAuth flow in a cookie (useful for database-less flows)
    },
    // See https://www.better-auth.com/docs/concepts/database#extending-core-schema
    user: {
        additionalFields: {
            role: {
                type: Object.keys(Role),
                required: true,
                default: Role.USER,
                input: false,
            }
        }
    }
});

// Throw an error if not authenticated
async function getSession() {
    const { env } = getCloudflareContext();
    const authInstance = auth(env as Env);

    const session = await authInstance.api.getSession({
        headers: await headers()
    });

    if (!session) {
        throw new Error("Not authenticated");
    }
    return session;
}

export async function errorIfLessPrivilegedThanMod() {
    const session = await getSession();
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.MOD) {
        throw new Error("Not authorized");
    }
}

export async function errorIfNotAdmin() {
    const session = await getSession();
    if (session.user.role !== Role.ADMIN) {
        throw new Error("Not authorized");
    }
}