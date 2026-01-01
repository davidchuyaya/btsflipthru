"use client";

import { useEffect, useState } from "react";

export default function BigProgressBar({ progress, description }: { progress: number; description?: string }) {
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        // Start animation when progress changes from 0
        if (progress > 0 && displayProgress === 0) {
            const duration = 2000; // 2 seconds
            const startTime = Date.now();
            const startValue = 0;

            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progressRatio = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation (ease-out)
                const easedProgress = 1 - Math.pow(1 - progressRatio, 3);
                const newValue = Math.round(startValue + (progress - startValue) * easedProgress);

                setDisplayProgress(newValue);

                if (progressRatio < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        } else if (progress === 0) {
            setDisplayProgress(0);
        } else if (progress !== displayProgress && displayProgress !== 0) {
            // Update immediately if not animating from 0
            setDisplayProgress(progress);
        }
    }, [progress]);

    return (
        <div className="flex flex-col justify-stretch items-stretch gap-6 w-48">
            <div className="h-full rounded-full bg-accent-light flex flex-col justify-end">
                <div
                    className="rounded-full bg-main font-heading text-5xl! text-accent flex items-center justify-center transition-all duration-1000 ease-out"
                    style={{ height: `${displayProgress}%` }}
                >
                    {displayProgress}%
                </div>
            </div>
            {description && <p className="text-center">{description}</p>}
        </div>
    );
}
