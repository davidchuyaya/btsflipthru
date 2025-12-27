import { callPromiseOrError } from "@/actions";
import { fullSizeId, IMAGES_URL, thumbnailId } from "@/constants";

export function fullSizeUrl(imageId: string): string {
    return `${IMAGES_URL}${fullSizeId(imageId)}`;
}

export function thumbnailUrl(imageId: string): string {
    return `${IMAGES_URL}${thumbnailId(imageId)}`;
}

/**
 * 
 * @param promise Must return a non-falsy value when correct, otherwise will detect server errors
 * @returns 
 */
export async function invokeOrError<T>(promise: Promise<T>): Promise<T | { error: string }> {
    const result = await callPromiseOrError(promise);
    if (!result) {
        return { error: "Server error" };
    }
    if (typeof result === "object" && "error" in result) {
        return { error: result.error };
    }
    return result;
}

export async function convertToAvif(file: File, maxHeight?: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (maxHeight && height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Could not convert to AVIF"));
                        return;
                    }
                    blob.arrayBuffer().then(resolve).catch(reject);
                },
                "image/webp",
                0.8,
            );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(file);
    });
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}