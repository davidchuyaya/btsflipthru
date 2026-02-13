import { auth } from "@/auth";
import { Role } from "@/constants";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "process";

export const authClient = createAuthClient({
    baseURL: env.BETTER_AUTH_URL,
    // Must remain in sync with src/auth.ts
    plugins: [inferAdditionalFields<typeof auth>()],
});

export type ClientSession = ReturnType<typeof authClient.useSession>["data"];

export function isAtLeastMod(session: ClientSession) {
    if (session) {
        switch (session.user.role) {
            case Role.ADMIN:
            case Role.MOD:
                return true;
            default:
                break;
        }
    }
    return false;
}

export function isAdmin(session: ClientSession) {
    if (session) {
        switch (session.user.role) {
            case Role.ADMIN:
                return true;
            default:
                break;
        }
    }
    return false;
}

export async function signInGoogle(callbackURL?: string | null | unknown) {
    const finalCallbackURL =
        typeof callbackURL === "string" ? callbackURL : "/";
    await authClient.signIn.social({
        provider: "google",
        callbackURL: finalCallbackURL,
        errorCallbackURL: "/error",
        newUserCallbackURL: "/",
        disableRedirect: false,
    });
}
