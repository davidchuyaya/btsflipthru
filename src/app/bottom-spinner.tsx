"use client";

import { Spinner } from "@/components/ui/spinner";
import { useEffect, useRef } from "react";

export default function BottomSpinnerComponent({
    dontLoad,
    loadMore,
    isLoading,
}: {
    dontLoad: boolean;
    loadMore: () => void;
    isLoading: boolean;
}) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    console.log("Loading more items...");
                    if (isLoading || dontLoad) return; // Prevent multiple triggers while loading or if loading is disabled
                    loadMore();
                }
            },
            { rootMargin: "400px" }, // Load early for better UX
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [isLoading, dontLoad]); // Re-bind if loading state affects logic

    return (
        <div
            ref={sentinelRef}
            className="h-10 w-full flex items-center justify-center"
        >
            {isLoading && <Spinner className="size-8 text-main" />}
        </div>
    );
}
