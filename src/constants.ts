export const SEPARATOR = ","; // Used when arrays are stored as strings in the database
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const THUMBNAIL_DISPLAY_HEIGHT_PX = 200;
export const THUMBNAIL_COMPRESSION_HEIGHT_PX = THUMBNAIL_DISPLAY_HEIGHT_PX * 2; // To reduce compression artifacts
export const IMAGES_URL = 'https://images.btsflipthru.com/';

export function fullSizeId(imageId: string): string {
    return `${imageId}_fullSize`;
}

export function thumbnailId(imageId: string): string {
    return `${imageId}_thumbnail`;
}