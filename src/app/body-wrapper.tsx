"use client";

import { useMetadata } from "../metadata-context";
import { useEffect } from "react";

export default function BodyWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { cursorDisabled } = useMetadata();

    useEffect(() => {
        document.body.classList.toggle("cursor", !cursorDisabled);
        return () => document.body.classList.remove("cursor");
    }, [cursorDisabled]);

    return <div className={cursorDisabled ? "" : "cursor"}>{children}</div>;
}
