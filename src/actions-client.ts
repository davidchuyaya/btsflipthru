"use client";

import { Result } from "./constants";

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export async function uploadImage(presignedUrl: string, image: File): Promise<Result<boolean>> {
    return fetch(presignedUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "image/*",
        },
        body: image,
    })
        .then((res) => (!res.ok ? { error: `Image upload failed: ${res.status}` } : { data: true }))
        .catch((error) => ({
            error: (error as Error).message,
        }));
}