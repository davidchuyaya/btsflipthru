import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function POST(request: Request) {
    const handler = toNextJsHandler(auth);
    return handler.POST(request);
}

export async function GET(request: Request) {
    const handler = toNextJsHandler(auth);
    return handler.GET(request);
}
