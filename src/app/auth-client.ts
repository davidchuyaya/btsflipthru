import { auth } from "@/auth";
import { Role } from "@/db";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react"
import { env } from "process"

export const authClient = createAuthClient({
    baseURL: env.BETTER_AUTH_URL,
    // Must remain in sync with src/auth.ts
    plugins: [inferAdditionalFields<ReturnType<typeof auth>>()]
});

type Session = ReturnType<typeof authClient.useSession>["data"];

export function errorIfLessPrivilegedThanMod(session: Session) {
    if (session) {
        switch (session.user.role) {
            case Role.ADMIN:
            case Role.MOD:
                return;
            default:
                // Continue to error
                break;
        }
    }
    throw new Error("Not authorized");
}

export function errorIfNotAdmin(session: Session) {
    if (session) {
        switch (session.user.role) {
            case Role.ADMIN:
                return;
            default:
                // Continue to error
                break;
        }
    }
    throw new Error("Not authorized");
}

export async function signInGoogle() {
    await authClient.signIn.social({
        provider: "google",
        callbackURL: "/profile",
        errorCallbackURL: "/error",
        newUserCallbackURL: "/profile",
        disableRedirect: false,
    });
}