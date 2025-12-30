export const SEPARATOR = ","; // Used when arrays are stored as strings in the database
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes before metadata is refetched
export const THUMBNAIL_DISPLAY_HEIGHT_PX = 200;
export const THUMBNAIL_COMPRESSION_HEIGHT_PX = THUMBNAIL_DISPLAY_HEIGHT_PX * 2; // To reduce compression artifacts
export const IMAGE_TYPE = "image/avif";
export const CLOUDFLARE_TURNSTILE_SITE_KEY = "0x4AAAAAACJg4L7-eUjaAdjN";
export const CLOUDINARY_CLOUD_NAME = "dddxuuyxu";
export const CLOUDINARY_API_KEY = "688582694844734";

export function fullSizeUrl(imageId: string): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${imageId}`;
}

const THUMBNAIL_POSTFIX = `c_scale,h_${THUMBNAIL_COMPRESSION_HEIGHT_PX}/f_avif`;

export function thumbnailUrl(imageId: string): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${THUMBNAIL_POSTFIX}/${imageId}`;
}

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

export type CloudinarySignedParams = {
    timestamp: number;
    public_id: string;
    overwrite: boolean;
    transformation: string;
    eager?: string;
}

export type PresignedUrl = {
    signature: string;
    params: CloudinarySignedParams;
}

export function generateSignedParams(createThumbnail: boolean): CloudinarySignedParams {
    const params: CloudinarySignedParams = {
        timestamp: Math.floor(Date.now() / 1000),
        public_id: crypto.randomUUID(),
        overwrite: false,
        transformation: "f_avif", // Add thumbnail conversion
    };
    if (createThumbnail) {
        params.eager = THUMBNAIL_POSTFIX;
    }
    return params;
}