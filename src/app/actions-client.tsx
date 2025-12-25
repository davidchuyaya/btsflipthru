import { fullSizeId, thumbnailId } from "@/constants";

export function fullSizeUrl(imageId: string): string {
    return `${process.env.IMAGES_URL}${fullSizeId(imageId)}`;
}

export function thumbnailUrl(imageId: string): string {
    return `${process.env.IMAGES_URL}${thumbnailId(imageId)}`;
}