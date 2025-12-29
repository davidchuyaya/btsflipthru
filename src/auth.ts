import { betterAuth } from "better-auth";
import { db, Role } from "./db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { Result } from "./constants";

export const auth = (env: Env) =>
    betterAuth({
        database: {
            db: db(env),
            type: "sqlite",
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
            },
        },
        account: {
            storeStateStrategy: "cookie",
            storeAccountCookie: true, // Store account data after OAuth flow in a cookie (useful for database-less flows)
        },
        // See https://www.better-auth.com/docs/concepts/database#extending-core-schema
        user: {
            additionalFields: {
                role: {
                    type: "number",
                    required: true,
                    default: Role.USER,
                    input: false,
                },
            },
        },
    });

// Throw an error if not authenticated
export async function getSession() {
    const { env } = getCloudflareContext();
    const authInstance = auth(env as Env);

    const session = await authInstance.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { error: "Not authenticated" };
    }
    return { data: session };
}

type ServerSession = Awaited<ReturnType<typeof getSession>>;

export async function isAtLeastMod<T>(session?: ServerSession): Promise<Result<T>> {
    if (!session) {
        session = await getSession();
    }
    if (!session.data) {
        return session;
    }
    if (session.data.user.role !== Role.ADMIN && session.data.user.role !== Role.MOD) {
        return { error: "Not authorized" };
    }
    return { data: undefined as T };
}

export async function isAdmin<T>(session?: ServerSession): Promise<Result<T>> {
    if (!session) {
        session = await getSession();
    }
    if (!session.data) {
        return session;
    }
    if (session.data.user.role !== Role.ADMIN) {
        return { error: "Not authorized" };
    }
    return { data: undefined as T };
}
