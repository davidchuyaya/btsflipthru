"use client";

import { CLOUDINARY_API_KEY, CLOUDINARY_CLOUD_NAME, PresignedUrl, Result } from "./constants";

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export async function uploadImage(presignedUrl: PresignedUrl, image: File): Promise<Result<boolean>> {
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

    return fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
    })
        .then((res) => (!res.ok ? { error: `Image upload failed: ${res.status}` } : { data: true }))
        .catch((error) => ({
            error: (error as Error).message,
        }));
}
