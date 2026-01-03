export const SEPARATOR = ","; // Used when arrays are stored as strings in the database
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB. Enforced by Cloudinary's free tier
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes before metadata is refetched
export const THUMBNAIL_DISPLAY_HEIGHT_PX = 200;
export const THUMBNAIL_COMPRESSION_HEIGHT_PX = THUMBNAIL_DISPLAY_HEIGHT_PX * 2; // To reduce compression artifacts
export const NUM_HOME_PHOTOCARDS = 14;
export const NUM_LOAD_PHOTOCARDS = 28;
export const NUM_LOAD_COLLECTIONS = 5;
export const CLOUDFLARE_TURNSTILE_SITE_KEY = "0x4AAAAAACJg4L7-eUjaAdjN";
export const CLOUDINARY_CLOUD_NAME = "dddxuuyxu";
export const CLOUDINARY_API_KEY = "688582694844734";

export function fullSizeUrl(imageId: string): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${imageId}.avif`;
}

const THUMBNAIL_POSTFIX = `c_scale,h_${THUMBNAIL_COMPRESSION_HEIGHT_PX}/f_avif`;

export function thumbnailUrl(imageId: string): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${THUMBNAIL_POSTFIX}/${imageId}.avif`;
}

export const NameToMember = {
    RM: "rm",
    Jin: "jin",
    Suga: "suga",
    "j-hope": "jhope",
    Jimin: "jimin",
    V: "v",
    "Jung Kook": "jungkook",
} as const;
export type NameToMember = (typeof NameToMember)[keyof typeof NameToMember];

export const MEMBERS: NameToMember[] = Object.values(NameToMember);

export function membersToBooleans(activeMembers: ReadonlySet<string>): Record<NameToMember, boolean> {
    return MEMBERS.reduce((acc, member) => {
        acc[member] = activeMembers.has(member);
        return acc;
    }, {} as Record<NameToMember, boolean>);
}

export const MEMBER_CODE_TO_DISPLAY: Record<NameToMember, string> = Object.entries(NameToMember).reduce(
    (acc, [displayName, code]) => {
        acc[code] = displayName;
        return acc;
    },
    {} as Record<NameToMember, string>,
);

export type MemberBooleans = Record<NameToMember, boolean>;

export function booleansToMembers(source: MemberBooleans): NameToMember[] {
    return MEMBERS.filter((member) => source[member]);
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
    AIStolenContent = "ai_stolen_content",
    FeatureRequest = "feature_request",
    Contact = "contact",
}

export function reportWindowURL(reportType: ReportType, url: string, title: string) {
    return `/report?reportType=${reportType}&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
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
        case ReportType.AIStolenContent:
            return {
                reportTitle: "Report AI/Stolen Content",
                descriptionPlaceholder: "I found this photocard with my watermark on it.",
                descriptionSmallText:
                    "Please provide as much detail as possible, including links to the content in question.",
            };
        case ReportType.FeatureRequest:
            return {
                reportTitle: "Submit Feature Request",
                descriptionPlaceholder: "It would be great to have a feature that...",
                descriptionSmallText: "Describe the feature you'd like to see and how it would benefit users like you.",
            };
        case ReportType.Contact:
            return {
                reportTitle: "Contact Us",
                descriptionPlaceholder: "I would like to get in touch regarding...",
                descriptionSmallText: "Feel free to reach out with any questions, comments, or concerns.",
            };
    }
}

export type CloudinarySignedParams = {
    timestamp: number;
    public_id: string;
    overwrite: boolean;
    transformation: string;
    eager?: string;
};

export type PresignedUrl = {
    signature: string;
    params: CloudinarySignedParams;
};

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

export const SortType = {
    ReleaseDateAsc: "Release Date ↑",
    ReleaseDateDesc: "Release Date ↓",
    DateAddedAsc: "Date Added ↑",
    DateAddedDesc: "Date Added ↓",
};
export type SortType = (typeof SortType)[keyof typeof SortType];

/**
 * Empty array parameters = don't filter by that parameter
 */
export type SearchQuery = {
    collectionIds: number[];
    cardTypeIds: number[];
    sizeIds: number[];
    exclusiveCountryIds: number[];
    rm: boolean;
    jin: boolean;
    suga: boolean;
    jhope: boolean;
    jimin: boolean;
    v: boolean;
    jungkook: boolean;
    sortBy: SortType;
    updateDate: Date | null;
};
