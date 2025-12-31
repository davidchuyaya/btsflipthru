"use client";

import { THUMBNAIL_DISPLAY_HEIGHT_PX } from "@/constants";
import { Effects } from "@/db";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

async function detectBorderRadius(imageUrl: string): Promise<number> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return resolve(0);

            // We only need to sample a small corner for performance
            const sampleSize = Math.min(img.width, img.height) / 2;
            canvas.width = sampleSize;
            canvas.height = sampleSize;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

            // Scan diagonally from the top-left (0,0) towards the center
            for (let i = 0; i < sampleSize; i++) {
                // Pixel data is [R, G, B, A] -> Alpha is at index (y * width + x) * 4 + 3
                const x = i;
                const y = i;
                const alphaIndex = (y * sampleSize + x) * 4 + 3;

                if (imageData[alphaIndex] > 20) {
                    // Threshold for "not transparent"
                    // We've hit the card!
                    // Basic geometric approximation for radius:
                    // In a circle, the distance from (0,0) to the curve at 45°
                    // is roughly r * (2 - √2)
                    const radius = i / (1 - Math.SQRT1_2);
                    resolve(Math.ceil((radius * THUMBNAIL_DISPLAY_HEIGHT_PX) / img.naturalHeight));
                    return;
                }
            }
            resolve(0);
        };
    });
}

export enum PlaceholderType {
    BTS = "/bts logo.svg",
    ARMY = "/army logo.svg"
}

function PlaceholderComponent({ type }: { type: PlaceholderType }) {
    return (
        <div
            className="bg-accent flex items-center justify-center rounded-[16]"
            style={{
                height: `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`,
                aspectRatio: "11 / 17", // Standard photocard aspect ratio 55mm x 85mm
            }}
        >
            <img
                src={type}
                alt="Placeholder photocard"
                style={{
                    height: `${THUMBNAIL_DISPLAY_HEIGHT_PX / 2}px`,
                }}
            />
        </div>
    );
}

export default function PhotocardComponent({
    className,
    src,
    effects,
    manualRadius = false,
    placeholderType = PlaceholderType.BTS,
}: {
    className?: string;
    src: string | null;
    effects: Effects;
    manualRadius?: boolean;
    placeholderType?: PlaceholderType;
}) {
    const [borderRadius, setBorderRadius] = useState<number>(16);
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (src && !manualRadius) detectBorderRadius(src).then(setBorderRadius);
    }, [src, manualRadius]);

    useEffect(() => {
        init();
    }, [src, className, effects, borderRadius]);

    async function init() {
        await import("hover-tilt/web-component");
        if (!hostRef.current) return;

        // 1. Create and configure
        const el = document.createElement("hover-tilt");
        let glareIntensity = "";
        switch (effects) {
            case Effects.Matte:
                glareIntensity = "0.3";
                break;
            case Effects.Glossy:
                glareIntensity = "1.0";
                break;
            case Effects.Shiny:
                glareIntensity = "1.5";
                break;
        }
        el.setAttribute("glare-intensity", glareIntensity);
        el.setAttribute("tilt-factor", "0.7");
        el.setAttribute("scale-factor", "1");
        if (effects === Effects.Shiny) {
            el.className = "shiny";
        }

        // 2. Append to DOM BEFORE accessing .style
        hostRef.current.innerHTML = ""; // Clear previous
        hostRef.current.appendChild(el);

        // 3. Now set styles safely
        hostRef.current.style.setProperty("--detected-radius", `${borderRadius}px`);

        // 4. Inject Image
        if (!src) {
            // 1. Create a wrapper div to hold the React tree
            const placeholderContainer = document.createElement("div");
            placeholderContainer.className = "rounded-[16px]";
            el.appendChild(placeholderContainer);

            // 2. Mount the React component into that div
            const root = createRoot(placeholderContainer);
            root.render(<PlaceholderComponent type={placeholderType} />);
        } else {
            const img = document.createElement("img");
            img.src = src;
            img.style.height = `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`;
            img.style.maxWidth = "none";
            if (manualRadius) {
                // Crop image
                img.style.borderRadius = "16px";
            }
            el.appendChild(img);
        }
    }

    return (
        <div className={`${className} flex justify-center`}>
            <div ref={hostRef} className="inline-block" />
        </div>
    );
}
