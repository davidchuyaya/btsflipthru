"use client";

import { signInGoogle } from "@/app/auth-client";
import Link from "next/link";
import { useMetadata } from "./metadata-context";

export default function Home() {
    const { session, sessionRefetch } = useMetadata();

    return (
        <div>
            <button onClick={signInGoogle}>Sign in</button>
            <button onClick={sessionRefetch}>Refresh Session</button>
            <div>{JSON.stringify(session)}</div>
            <Link href="/createCollection">Go Create a Collection</Link>
            <Link href="/search">Search</Link>
        </div>
    );
}
