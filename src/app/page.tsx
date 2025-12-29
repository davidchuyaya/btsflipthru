"use client";

import { isAtLeastMod, signInGoogle } from "@/app/auth-client";
import Link from "next/link";
import { useMetadata } from "./metadata-context";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
    const { session, sessionRefetch } = useMetadata();

    return (
        <div>
            <Image src="/LOGO_BORDER.png" alt="Flip Thru Logo" width={200} height={200} />
            <Button onClick={signInGoogle}>Sign In</Button>
            <Button onClick={sessionRefetch}>Activate Mod</Button>
            <div>{JSON.stringify(session)}</div>
            <Button hidden={!isAtLeastMod(session)} asChild>
                <Link href="/createCollection">Add to Archive</Link>
            </Button>
            <Button asChild>
                <Link href="/search">Search</Link>
            </Button>
        </div>
    );
}
