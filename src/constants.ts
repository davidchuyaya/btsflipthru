export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const THUMBNAIL_HEIGHT_PX = 200;

export function fullSizeId(imageId: string): string {
    return `${imageId}_fullSize`;
}

export function thumbnailId(imageId: string): string {
    return `${imageId}_thumbnail`;
}