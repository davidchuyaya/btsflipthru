"use client";

import {
    THUMBNAIL_DISPLAY_HEIGHT_PX,
    Effects,
    thumbnailUrl,
} from "@/constants";
import { CheckboxWithoutLabel } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { useMetadata } from "@/metadata-context";
import { Photocards } from "@/db";
import { useDraggable } from "@dnd-kit/core";
import { Selectable } from "kysely";
import { HeartIcon } from "lucide-react";

const DEFAULT_ASPECT_RATIO = "11 / 17"; // Standard photocard aspect ratio 55mm x 85mm

async function detectBorderRadiusAndRatio(
    imageUrl: string,
): Promise<{ borderRadius: number; aspectRatio: string }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;

        img.onload = () => {
            // Extract aspect ratio
            const aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx)
                return resolve({ borderRadius: 0, aspectRatio: aspectRatio });

            // We only need to sample a small corner for performance
            const sampleSize = Math.min(img.width, img.height) / 2;
            canvas.width = sampleSize;
            canvas.height = sampleSize;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(
                0,
                0,
                sampleSize,
                sampleSize,
            ).data;

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
                        borderRadius: Math.ceil(
                            (radius * THUMBNAIL_DISPLAY_HEIGHT_PX) /
                                img.naturalHeight,
                        ),
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
    isOwned = false,
    isWishlisted = false,
    onToggle,
    onClick,
    large = false,
    tiltFactor = "0.7",
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
    isOwned?: boolean;
    isWishlisted?: boolean;
    onToggle?: () => void;
    onClick?: () => void;
    large?: boolean;
    tiltFactor?: string;
}) {
    const { effectsDisabled } = useMetadata();
    const [borderRadius, setBorderRadius] = useState<number>(16);
    const [aspectRatio, setAspectRatio] =
        useState<string>(DEFAULT_ASPECT_RATIO);

    // Load the web component once
    useEffect(() => {
        import("hover-tilt/web-component");
    }, []);

    useEffect(() => {
        if (src && !manualRadius) {
            detectBorderRadiusAndRatio(src).then(
                ({ borderRadius: br, aspectRatio: ar }) => {
                    setBorderRadius((prev) => (prev === br ? prev : br));
                    setAspectRatio((prev) => (prev === ar ? prev : ar));
                },
            );
        } else if (fallbackSrc && !manualRadius) {
            detectBorderRadiusAndRatio(fallbackSrc).then(
                ({ borderRadius: br, aspectRatio: ar }) => {
                    setBorderRadius((prev) => (prev === br ? prev : br));
                    setAspectRatio((prev) => (prev === ar ? prev : ar));
                },
            );
        }
    }, [src, fallbackSrc, manualRadius]);

    const [w, h] = aspectRatio.split(" / ").map(Number);
    const ratio = w / h;
    const verticalPercent = (borderRadius / THUMBNAIL_DISPLAY_HEIGHT_PX) * 100;
    const horizontalPercent = verticalPercent / ratio;
    const radiusString = `${horizontalPercent.toFixed(2)}% / ${verticalPercent.toFixed(2)}%`;

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

    // If effects are disabled, use a div instead so the props don't actually do anything
    const HoverTilt = effectsDisabled ? "div" : ("hover-tilt" as any);

    const imgStyle: React.CSSProperties = large
        ? {
              height: "auto",
              width: "100%",
          }
        : {
              height: `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`,
              maxWidth: "none",
          };

    if (manualRadius) {
        imgStyle.borderRadius = "16px";
    }

    return (
        <div
            className={`${className} ${large ? "w-full" : ""} flex justify-center relative`}
            onClick={() => (selectable ? onToggle?.() : onClick?.())}
        >
            <div
                className={`${large ? "w-full" : "inline-block"} transition-opacity ${selectable ? (isSelected ? "opacity-100" : "opacity-50") : ""}`}
                style={
                    { "--detected-radius": radiusString } as React.CSSProperties
                }
            >
                <HoverTilt
                    glare-intensity={glareIntensity}
                    tilt-factor={tiltFactor}
                    scale-factor="1"
                    className={`${effects === Effects.Shiny ? "shiny" : ""} ${large ? "block w-full" : ""}`}
                >
                    {src ? (
                        <img src={src} style={imgStyle} alt="Photocard" />
                    ) : (
                        <PlaceholderComponent
                            type={placeholderType}
                            borderRadius={borderRadius}
                            aspectRatio={aspectRatio}
                            large={large}
                        >
                            {children}
                        </PlaceholderComponent>
                    )}
                </HoverTilt>
            </div>
            {selectable && (
                <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer">
                    <CheckboxWithoutLabel
                        checked={isSelected}
                        className="w-8 h-8 border-2 pointer-events-none"
                    />
                </div>
            )}
            {isOwned && (
                <div className="absolute -top-2 -right-2 z-20 pointer-events-none drop-shadow-md">
                    <img
                        src="/binder_done.svg"
                        alt="Owned"
                        className="w-8 h-8"
                    />
                </div>
            )}
            {isWishlisted && (
                <HeartIcon className="absolute -top-2 -right-2 z-20 pointer-events-none drop-shadow-md w-6 h-6 fill-main" />
            )}
        </div>
    );
}

export function PhotocardWithSize({
    photocard,
    showFront,
    width,
    height,
    style,
    className,
}: {
    photocard: Selectable<Photocards>;
    showFront: boolean;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
}) {
    const frontSrc = photocard.image_id
        ? thumbnailUrl(photocard.image_id)
        : null;
    const backSrc = photocard.back_image_id
        ? thumbnailUrl(photocard.back_image_id)
        : null;
    const src = showFront ? frontSrc : backSrc;

    return (
        <div
            style={{
                width,
                height,
                ...style,
            }}
            className={className}
        >
            {src ? (
                <img
                    src={src}
                    alt="Photocard"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "fill",
                    }}
                />
            ) : (
                <PlaceholderComponent
                    type={PlaceholderType.BTS}
                    borderRadius={0}
                    aspectRatio={DEFAULT_ASPECT_RATIO}
                    large={false}
                />
            )}
        </div>
    );
}

export function DraggablePhotocard({
    photocard,
    showFront,
    width,
    height,
}: {
    photocard: Selectable<Photocards>;
    showFront: boolean;
    width?: number;
    height?: number;
}) {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: photocard.id,
        data: { photocard },
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{ width, height }}
        >
            <PhotocardComponent
                src={
                    showFront
                        ? photocard.image_id
                            ? thumbnailUrl(photocard.image_id)
                            : null
                        : photocard.back_image_id
                          ? thumbnailUrl(photocard.back_image_id)
                          : null
                }
                fallbackSrc={
                    showFront
                        ? photocard.back_image_id
                            ? thumbnailUrl(photocard.back_image_id)
                            : null
                        : photocard.image_id
                          ? thumbnailUrl(photocard.image_id)
                          : null
                }
                effects={photocard.effects}
            />
        </div>
    );
}
