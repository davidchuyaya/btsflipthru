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

export function errorIfLessPrivilegedThanMod(session: ReturnType<typeof authClient.useSession>["data"]) {
    if (!session || session.user.role !== Role.ADMIN && session.user.role !== Role.MOD) {
        throw new Error("Not authorized");
    }
}

export function errorIfNotAdmin(session: ReturnType<typeof authClient.useSession>["data"]) {
    if (!session || session.user.role !== Role.ADMIN) {
        throw new Error("Not authorized");
    }
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