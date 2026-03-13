"use client";

import { Insertable } from "kysely";
import { toast } from "sonner";
import {
    CLOUDINARY_API_KEY,
    CLOUDINARY_CLOUD_NAME,
    PresignedUrl,
    Result,
} from "./constants";
import { CardSizes } from "./db";

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export async function uploadImage(
    presignedUrl: PresignedUrl,
    image: File,
): Promise<Result<boolean>> {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("api_key", CLOUDINARY_API_KEY);

    formData.append("timestamp", presignedUrl.params.timestamp.toString());
    formData.append("public_id", presignedUrl.params.public_id);
    formData.append("signature", presignedUrl.signature);
    formData.append("overwrite", presignedUrl.params.overwrite.toString());
    formData.append("transformation", presignedUrl.params.transformation);

    if (presignedUrl.params.eager) {
        formData.append("eager", presignedUrl.params.eager);
    }

    return fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData,
        },
    )
        .then((res) =>
            !res.ok
                ? { error: `Image upload failed: ${res.status}` }
                : { data: true },
        )
        .catch((error) => ({
            error: (error as Error).message,
        }));
}

export function createCardSizeFromString(
    sizeString: string,
): Result<Insertable<CardSizes>> {
    // Match format: "Name WidthxHeight" (e.g., "Standard 55x85")
    const match = sizeString.match(/^(.+?)\s+(\d+)\s*x\s*(\d+)$/i);
    if (!match) {
        return {
            error: 'Please provide dimensions in the format "Name WidthxHeight" (e.g., "Standard 55x85")',
        };
    }

    const name = match[1].trim();
    if (name === "") {
        return { error: "Name cannot be empty." };
    }

    const width = Number(match[2]);
    const height = Number(match[3]);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        return { error: "Width and height must be positive numbers." };
    }
    return { data: { name, width, height } };
}

export function cardSizeToString(cardSize: Insertable<CardSizes>): string {
    return `${cardSize.name} ${cardSize.width}x${cardSize.height}`;
}

export async function shareOrCopyCurrentUrl(resourceName: string): Promise<void> {
    const url = window.location.href;
    const userAgentData = (
        navigator as Navigator & { userAgentData?: { mobile?: boolean } }
    ).userAgentData;
    const isMobileDevice =
        userAgentData?.mobile ??
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobileDevice && navigator.share) {
        try {
            await navigator.share({ url });
            return;
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
        }
    }

    await navigator.clipboard.writeText(url);
    toast.success(`${resourceName} URL copied to clipboard`);
}
