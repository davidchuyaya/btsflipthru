"use client";

import { THUMBNAIL_DISPLAY_HEIGHT_PX, Effects } from "@/constants";
import { CheckboxWithoutLabel } from "@/components/ui/checkbox";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const DEFAULT_ASPECT_RATIO = "11 / 17"; // Standard photocard aspect ratio 55mm x 85mm

async function detectBorderRadiusAndRatio(imageUrl: string): Promise<{ borderRadius: number; aspectRatio: string }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;

        img.onload = () => {
            // Extract aspect ratio
            const aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return resolve({ borderRadius: 0, aspectRatio: aspectRatio });

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
                    resolve({
                        borderRadius: Math.ceil((radius * THUMBNAIL_DISPLAY_HEIGHT_PX) / img.naturalHeight),
                        aspectRatio: aspectRatio,
                    });
                    return;
                }
            }
            resolve({ borderRadius: 0, aspectRatio: aspectRatio });
        };
    });
}

export enum PlaceholderType {
    BTS = "/bts logo.svg",
    ARMY = "/army logo.svg",
}

function PlaceholderComponent({
    type,
    borderRadius,
    aspectRatio,
    children,
    large,
}: {
    type: PlaceholderType;
    borderRadius: number;
    aspectRatio: string;
    children?: React.ReactNode;
    large: boolean;
}) {
    const [w, h] = aspectRatio.split(" / ").map(Number);
    const ratio = w / h;
    const verticalPercent = (borderRadius / THUMBNAIL_DISPLAY_HEIGHT_PX) * 100;
    const horizontalPercent = verticalPercent / ratio;
    const radiusString = `${horizontalPercent.toFixed(2)}% / ${verticalPercent.toFixed(2)}%`;

    return (
        <div
            className="bg-accent flex items-center justify-center relative p-4 text-center overflow-hidden"
            style={{
                height: large ? "auto" : `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`,
                width: large ? "100%" : "auto",
                aspectRatio: aspectRatio,
                borderRadius: radiusString,
            }}
        >
            {children && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-xs font-bold text-primary">
                    {children}
                </div>
            )}
            <img
                src={type}
                alt="Placeholder photocard"
                style={{
                    height: "50%",
                }}
            />
        </div>
    );
}

export default function PhotocardComponent({
    className,
    src,
    fallbackSrc, // If the src is not available, use this as the basis for the placeholder aspect ratio and border radius
    effects,
    manualRadius = false,
    placeholderType = PlaceholderType.BTS,
    children,
    selectable = false,
    isSelected = false,
    onToggle,
    onClick,
    large = false,
}: {
    className?: string;
    src: string | null;
    fallbackSrc?: string | null;
    effects: Effects;
    manualRadius?: boolean;
    placeholderType?: PlaceholderType;
    children?: React.ReactNode;
    selectable?: boolean;
    isSelected?: boolean;
    onToggle?: () => void;
    onClick?: () => void;
    large?: boolean;
}) {
    const [borderRadius, setBorderRadius] = useState<number>(16);
    const [aspectRatio, setAspectRatio] = useState<string>(DEFAULT_ASPECT_RATIO);
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (src && !manualRadius)
            detectBorderRadiusAndRatio(src).then(({ borderRadius, aspectRatio }) => {
                setBorderRadius(borderRadius);
                setAspectRatio(aspectRatio);
            });
        else if (fallbackSrc && !manualRadius)
            detectBorderRadiusAndRatio(fallbackSrc).then(({ borderRadius, aspectRatio }) => {
                setBorderRadius(borderRadius);
                setAspectRatio(aspectRatio);
            });
    }, [src, fallbackSrc, manualRadius]);

    useEffect(() => {
        init();
    }, [src, fallbackSrc, className, effects, borderRadius, aspectRatio, children]);

    async function init() {
        await import("hover-tilt/web-component");
        if (!hostRef.current) return;

        // 1. Create and configure
        const el = document.createElement("hover-tilt");
        if (large) {
            el.setAttribute("style", "display: block; width: 100%;");
        }
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
        const [w, h] = aspectRatio.split(" / ").map(Number);
        const ratio = w / h;
        const verticalPercent = (borderRadius / THUMBNAIL_DISPLAY_HEIGHT_PX) * 100;
        const horizontalPercent = verticalPercent / ratio;
        const radiusString = `${horizontalPercent.toFixed(2)}% / ${verticalPercent.toFixed(2)}%`;

        hostRef.current.style.setProperty("--detected-radius", radiusString);

        // 4. Inject Image
        if (!src) {
            // 1. Create a wrapper div to hold the React tree
            const placeholderContainer = document.createElement("div");
            placeholderContainer.style.borderRadius = radiusString;
            el.appendChild(placeholderContainer);

            // 2. Mount the React component into that div
            const root = createRoot(placeholderContainer);
            root.render(
                <PlaceholderComponent
                    type={placeholderType}
                    borderRadius={borderRadius}
                    aspectRatio={aspectRatio}
                    large={large}
                >
                    {children}
                </PlaceholderComponent>,
            );
        } else {
            const img = document.createElement("img");
            img.src = src;
            if (!large) {
                img.style.height = `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`;
                img.style.maxWidth = "none";
            } else {
                img.style.height = "auto";
                img.style.width = "100%";
            }
            if (manualRadius) {
                // Crop image
                img.style.borderRadius = "16px";
            }
            el.appendChild(img);
        }
    }

    return (
        <div
            className={`${className} ${large ? "w-full" : ""} flex justify-center relative`}
            onClick={() => (selectable ? onToggle?.() : onClick?.())}
        >
            <div
                ref={hostRef}
                className={`${large ? "w-full" : "inline-block"} transition-opacity ${selectable ? (isSelected ? "opacity-100" : "opacity-50") : ""}`}
            />
            {selectable && (
                <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer">
                    <CheckboxWithoutLabel checked={isSelected} className="w-8 h-8 border-2 pointer-events-none" />
                </div>
            )}
        </div>
    );
}
