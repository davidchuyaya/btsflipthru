import { Collections, Photocards, UserData } from "@/db";
import { Selectable } from "kysely";

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
export const MAX_USERNAME_LENGTH = 32;
export const MAX_DESCRIPTION_LENGTH = 100;
export const MAX_EXTERNAL_SITE_USERNAME_LENGTH = 32;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
export const USERNAME_ERROR_TEXT = "Username can only contain letters, numbers, and underscores.";
export const SPOTIFY_PLAYLIST_ID_LENGTH = 22;

// Important: Any number used by an enum should not be reused in the future
export const Role = {
    USER: 0,
    MOD: 1,
    ADMIN: 2,
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ExclusiveCountry = {
    Global: 0,
    USA: 1,
    Korea: 2,
    Japan: 3,
    Taiwan: 4,
    Australia: 5,
    Brazil: 6,
    Canada: 7,
    Chile: 8,
    China: 9,
    England: 10,
    France: 11,
    Germany: 12,
    "Hong Kong": 13,
    Indonesia: 14,
    Italy: 15,
    Malaysia: 16,
    Mexico: 17,
    Netherlands: 18,
    Philippines: 19,
    Russia: 20,
    Singapore: 21,
    Spain: 22,
    Sweden: 23,
    Thailand: 24,
    "United Arab Emirates": 25,
    Vietnam: 26,
};
export type ExclusiveCountry = (typeof ExclusiveCountry)[keyof typeof ExclusiveCountry];

export const BackImageType = {
    Image: 0,
    White: 1,
    Transparent: 2,
};
export type BackImageType = (typeof BackImageType)[keyof typeof BackImageType];

export const Effects = {
    Matte: 0,
    Glossy: 1,
    Shiny: 2,
};
export type Effects = (typeof Effects)[keyof typeof Effects];

export function fullSizeUrl(imageId: string): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${imageId}.avif`;
}

const THUMBNAIL_POSTFIX = `c_scale,h_${THUMBNAIL_COMPRESSION_HEIGHT_PX}/f_avif`;

export function thumbnailUrl(imageId: string): string {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${THUMBNAIL_POSTFIX}/${imageId}.avif`;
}

export function collectionDisplayName(collection: Selectable<Collections> | undefined | null): string {
    if (!collection) {
        return "Unknown Collection";
    }
    return collection.version ? `${collection.name} (${collection.version})` : collection.name;
}

export const MemberToInt = {
    RM: 1,
    Jin: 2,
    Suga: 3,
    "j-hope": 4,
    Jimin: 5,
    V: 6,
    "Jung Kook": 7,
} as const;
export type MemberToInt = (typeof MemberToInt)[keyof typeof MemberToInt];

export const MemberInts: MemberToInt[] = Object.values(MemberToInt);

// Note: MemberToInt is 1-indexed, so we need to subtract 1
export function memberIntsToName(source: number[]): string {
    if (source.length === 7) {
        return "OT7";
    }
    return source.map((member) => Object.keys(MemberToInt)[member - 1]).join(", ");
}

export const MemberToIntWithOT7 = {
    RM: 1,
    Jin: 2,
    Suga: 3,
    "j-hope": 4,
    Jimin: 5,
    V: 6,
    "Jung Kook": 7,
    OT7: 8,
} as const;
export type MemberToIntWithOT7 = (typeof MemberToIntWithOT7)[keyof typeof MemberToIntWithOT7];

export const MemberIntsWithOT7: MemberToIntWithOT7[] = Object.values(MemberToIntWithOT7);

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
    ReleaseDateAsc: "Release Date (Oldest First)",
    ReleaseDateDesc: "Release Date (Newest First)",
    DateAddedAsc: "Date Added (Oldest First)",
    DateAddedDesc: "Date Added (Newest First)",
};
export type SortType = (typeof SortType)[keyof typeof SortType];

/**
 * Empty array parameters = don't filter by that parameter
 */
export type SearchQuery = {
    collectionIds: number[];
    cardTypeIds: number[];
    sizeIds: number[];
    exclusiveCountryIds: ExclusiveCountry[];
    members: MemberToIntWithOT7[];
    sortBy: SortType;
};

export type HomeStats = {
    mostContributionsUser: Selectable<UserData>;
    // TODO: Uncomment when we allow saving and wishlisting
    // mostOwnedPhotocard: Selectable<Photocards>;
    // mostWishlistedPhotocard: Selectable<Photocards>;
    totalPhotocards: number;
    totalPhotocardsWithoutImages: number;
    recentlyAddedPhotocards: Selectable<Photocards>[];
};

/**
 * Fix potential time zone issues with dates
 * @param date 
 * @returns 
 */
export function dateToString(date: Date) {
   const dateObj = new Date(date);
   dateObj.setUTCHours(12);
   return dateObj.toISOString().split("T")[0];
}