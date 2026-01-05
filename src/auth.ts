import { betterAuth } from "better-auth";
import { dbPool } from "./db-instance";
import { headers } from "next/headers";
import { Result, Role } from "./constants";
import { addUserDataToDB } from "./actions";

export const auth =
    betterAuth({
        database: dbPool,
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
        databaseHooks: {
            user: {
                create: {
                    after: async (user) => {
                        // Automatically create a user_data entry
                        await addUserDataToDB({
                            user_id: user.id,
                            username: user.email, // Username defaults to email, must be unique
                        });
                    }
                }
            }
        }
    });

// Throw an error if not authenticated
export async function getSession() {
    const session = await auth.api.getSession({
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
