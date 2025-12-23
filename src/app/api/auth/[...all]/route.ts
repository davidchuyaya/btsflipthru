import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
    const { env } = getCloudflareContext();
    const handler = toNextJsHandler(auth(env as Env));
    return handler.POST(request);
}

export async function GET(request: Request) {
    const { env } = getCloudflareContext();
    const handler = toNextJsHandler(auth(env as Env));
    return handler.GET(request);
}
