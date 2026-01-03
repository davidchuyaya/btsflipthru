"use client";

import { useParams } from "next/navigation";

export default function PhotocardPage() {
    const params = useParams();

    return (
        <div className="flex flex-row gap-4">
            <div className="flex flex-col gap-2">Photocard ID: {params?.id}</div>
        </div>
    );
}
