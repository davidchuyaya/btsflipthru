import { betterAuth } from "better-auth";
import { db } from "./db";

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
    }
});