"use client";

import { Button } from "@/components/ui/button";
import { useMetadata } from "@/metadata-context";

export default function ProfileComponent() {
    const { sessionRefetch } = useMetadata();
    return (
        <div>
            <Button onClick={sessionRefetch}>Activate Mod</Button>
        </div>
    );
}
