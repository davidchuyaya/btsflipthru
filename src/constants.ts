export const SEPARATOR = ","; // Used when arrays are stored as strings in the database
export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes before metadata is refetched
export const THUMBNAIL_DISPLAY_HEIGHT_PX = 200;
export const THUMBNAIL_COMPRESSION_HEIGHT_PX = THUMBNAIL_DISPLAY_HEIGHT_PX * 2; // To reduce compression artifacts
export const IMAGES_URL = "https://images.btsflipthru.com/";
export const CLOUDFLARE_TURNSTILE_SITE_KEY = "0x4AAAAAACJg4L7-eUjaAdjN";

export function fullSizeId(imageId: string): string {
    return `${imageId}_fullSize`;
}

export function thumbnailId(imageId: string): string {
    return `${imageId}_thumbnail`;
}

export enum Member {
    rm = "RM",
    jin = "Jin",
    suga = "Suga",
    jhope = "j-hope",
    jimin = "Jimin",
    v = "V",
    jungkook = "Jung Kook",
}
export const NAME_TO_MEMBER: [string, Member][] = Object.entries(Member).map(([key, value]) => [value, key as Member]);
export function memberFromName(name: string): Member | undefined {
    const entry = NAME_TO_MEMBER.find(([memberName, _]) => memberName === name);
    return entry ? entry[1] : undefined;
}

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
