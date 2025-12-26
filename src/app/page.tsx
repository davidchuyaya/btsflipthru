"use client";

import { authClient, signInGoogle } from "@/app/auth-client";
import CreateCollectionComponent from "./createCollection/page";
import Link from "next/link";

export default function Home() {
    const {
        data: session,
        isPending, //loading state
        error, //error object
        refetch, //refetch the session
    } = authClient.useSession();

    return (
        <div>
            <button onClick={signInGoogle}>Sign in</button>
            <div>{JSON.stringify(session)}</div>
            <Link href="/createCollection">Go Create a Collection</Link>
            <Link href="/search">Search</Link>
        </div>
    );
}
