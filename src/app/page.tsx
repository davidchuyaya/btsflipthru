"use client";

import { authClient, signInGoogle } from "@/app/auth-client";
import CreateSetComponent from "./createset/page";

export default function Home() {
    const {
        data: session,
        isPending, //loading state
        error, //error object
        refetch //refetch the session
    } = authClient.useSession();

    return (
        <div>
            <button onClick={signInGoogle}>Sign in</button>
            <div>{JSON.stringify(session)}</div>
            <CreateSetComponent />
        </div>
    );
}
