"use client";

import { CLOUDINARY_API_KEY, CLOUDINARY_CLOUD_NAME, PresignedUrl, Result } from "./constants";
import { BackImageType, CardSize, Effects, ExclusiveCountry, Photocard } from "./db";

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

export function getTestPhotocards(num: number): Photocard[] {
    const photocard: Photocard = {
        collectionId: 1,
        imageId: null,
        backImageId: null,
        backImageType: BackImageType.Image,
        cardType: 1,
        sizeId: 1,
        effects: Effects.Matte,
        exclusiveCountry: ExclusiveCountry.Global,
        modTemporary: false,
        adminTemporary: false,
        rm: false,
        jimin: false,
        jungkook: false,
        v: false,
        jin: false,
        suga: false,
        jhope: false,
        imageContributorId: "test",
        updatedAt: Date.now(),
    };
    const imageIds = [
        "801c7740-f720-4897-b810-d3b4b2efb8f0",
        "360d3a45-d43f-45f9-817a-2ac6bf3682c4",
        "53fbde39-2797-40fb-a429-dca37ce276fe",
        "d7343d88-af69-4f8b-a0b4-b999899a8209",
        "fc859e3a-d173-46c5-8860-f3af8a6493c3",
        "ed6cd127-85c6-432a-96b5-789b4e9f0a18",
    ];
    const photocards: Photocard[] = [];
    for (let i = 0; i < num; i++) {
        photocard.id = i + 1;
        photocard.imageId = imageIds[i % imageIds.length];
        photocards.push({ ...photocard });
    }
    return photocards;
}

export function createCardSizeFromString(sizeString: string): Result<CardSize> {
    // Match format: "Name WidthxHeight" (e.g., "Standard 55x85")
    const match = sizeString.match(/^(.+?)\s+(\d+)\s*x\s*(\d+)$/i);
    if (!match) {
        return { error: 'Please provide dimensions in the format "Name WidthxHeight" (e.g., "Standard 55x85")' };
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

export function cardSizeToString(cardSize: CardSize): string {
    return `${cardSize.name} ${cardSize.width}x${cardSize.height}`;
}