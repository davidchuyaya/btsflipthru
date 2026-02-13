"use client";

import { useMetadata } from "../metadata-context";

export default function BodyWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const { cursorDisabled } = useMetadata();
    return <div className={cursorDisabled ? "" : "cursor"}>{children}</div>;
}
