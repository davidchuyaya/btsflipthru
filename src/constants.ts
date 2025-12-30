import z from "zod";
import { zfd } from "zod-form-data";

export const SEPARATOR = ","; // Used when arrays are stored as strings in the database
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes before metadata is refetched
export const THUMBNAIL_DISPLAY_HEIGHT_PX = 200;
export const THUMBNAIL_COMPRESSION_HEIGHT_PX = THUMBNAIL_DISPLAY_HEIGHT_PX * 2; // To reduce compression artifacts
export const IMAGES_URL = "https://images.btsflipthru.com/";
export const IMAGE_TYPE = "image/avif";
export const CLOUDFLARE_TURNSTILE_SITE_KEY = "0x4AAAAAACJg4L7-eUjaAdjN";
export const CLOUDFLARE_R2_PREPROCESS_ENDPOINT = "https://3c96a0744e155d77114ed3d8e86abd7d.r2.cloudflarestorage.com";

export function fullSizeId(imageId: string): string {
    return `${imageId}_fullSize`;
}

export function thumbnailId(imageId: string): string {
    return `${imageId}_thumbnail`;
}

export function fullSizeUrl(imageId: string): string {
    return `${IMAGES_URL}${fullSizeId(imageId)}`;
}

export function thumbnailUrl(imageId: string): string {
    return `${IMAGES_URL}${thumbnailId(imageId)}`;
}

export const ImageUploadSchema = zfd.formData({
    imageId: zfd.text(z.string().min(1)),
    image: zfd
        .file()
        .refine(
            (file) => file.size <= MAX_IMAGE_SIZE_BYTES,
            `Image must be smaller than ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB`,
        ),
});

export const NameToMember = {
    "RM": "rm",
    "Jin": "jin",
    "Suga": "suga",
    "j-hope": "jhope",
    "Jimin": "jimin",
    "V": "v",
    "Jung Kook": "jungkook",
}
export type NameToMember = typeof NameToMember[keyof typeof NameToMember];

export const MEMBER_TO_EMOJI = {
    rm: "🐨",
    jin: "🐹",
    suga: "🐱",
    jhope: "🐿",
    jimin: "🐣",
    v: "🐯",
    jungkook: "🐰",
};

export type Result<T> = { data: T; error?: never } | { data?: never; error: string };

export enum ReportType {
    Error = "error",
}

export function reportWindowURL(reportType: ReportType, title: string) {
    return `/report?reportType=${reportType}&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}`;
}

export function reportTypeToFields(type: ReportType) {
    switch (type) {
        case ReportType.Error:
            return {
                reportTitle: "Submit Error Report",
                descriptionPlaceholder: 'I clicked on "Create Photocard," but nothing happened.',
                descriptionSmallText:
                    "Include steps to reproduce the issue, what you expected to happen, and any other relevant information.",
            };
    }
}
