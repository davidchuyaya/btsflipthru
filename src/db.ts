import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { SEPARATOR } from "./constants";

// Important: Any number used by an enum should not be reused in the future
export enum Role {
    USER = 0,
    MOD = 1,
    ADMIN = 2,
}

export enum ExclusiveCountry {
    Global = 0,
    USA = 1,
    Korea = 2,
    Japan = 3,
    Taiwan = 4,
    Australia = 5,
    Brazil = 6,
    Canada = 7,
    Chile = 8,
    China = 9,
    England = 10,
    France = 11,
    Germany = 12,
    HongKong = 13,
    Indonesia = 14,
    Italy = 15,
    Malaysia = 16,
    Mexico = 17,
    Netherlands = 18,
    Philippines = 19,
    Russia = 20,
    Singapore = 21,
    Spain = 22,
    Sweden = 23,
    Thailand = 24,
    UAE = 25,
    Vietnam = 26,
}
export const EXCLUSIVE_COUNTRIES = Object.values(ExclusiveCountry);
export const EXCLUSIVE_COUNTRIES_NAME_TO_ENUM: [string, number][] = Object.entries(ExclusiveCountry).filter(
    ([_, value]) => typeof value === "number",
) as [string, number][];

export enum BackImageType {
    Image = 0,
    White = 1,
    Transparent = 2,
}
export const BACK_IMAGE_TYPES = Object.values(BackImageType).filter((value) => typeof value === "number") as number[];
export const BACK_IMAGE_TYPES_NAME_TO_ENUM = Object.entries(BackImageType).filter(
    ([_, value]) => typeof value === "number",
) as [string, number][];

interface User {
    id: string;
    name: string;
    role: number; // Should be one of Role enum values
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface Session {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface Account {
    id: string;
    userId: string;
    accountId: string;
    providerId: string;
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
    scope: string | null;
    idToken: string | null;
    password: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface Verification {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Photocard {
    id?: number;
    collectionId: number;
    imageId: string | null;
    backImageId: string | null;
    backImageType: number; // Should be one of BackImageType enum values
    cardType: number | null;
    sizeId: number;
    effects: string | null;
    exclusiveCountry: number; // Should be one of ExclusiveCountry enum key types
    temporary: boolean; // True for all user uploads. Can be marked false by admin/mod (no more overwrites)

    rm: boolean;
    jimin: boolean;
    jungkook: boolean;
    v: boolean;
    jin: boolean;
    suga: boolean;
    jhope: boolean;

    imageContributorId: string;
    updatedAt: number;
}

export interface CardType {
    id?: number;
    name: string;
}

export interface CardSize {
    id?: number;
    name: string;
    width: number;
    height: number;
}

export interface Collection {
    id?: number;
    name: string;
    releaseDate: number;
    collectionTypes: string; // Array of collection type IDs stored as a string
}

export function parseCollection(collection: Collection): ParsedCollection {
    return {
        id: collection.id,
        name: collection.name,
        releaseDate: new Date(collection.releaseDate),
        collectionTypes: collection.collectionTypes.split(SEPARATOR).map(Number),
    };
}

export interface ParsedCollection {
    id?: number;
    name: string;
    releaseDate: Date;
    collectionTypes: number[];
}

export function serializeCollection(collection: ParsedCollection): Collection {
    return {
        id: collection.id,
        name: collection.name,
        releaseDate: collection.releaseDate.getTime(),
        collectionTypes: collection.collectionTypes.join(SEPARATOR),
    };
}

export interface CollectionType {
    id?: number;
    name: string;
}


export interface Report {
    id?: number;
    title: string;
    description: string;
    imageId: string | null;
    userId: string | null; // Null if submitted by someone who hasn't logged in
    userEmail: string | null; // Null if they don't want an email followup
    url: string;
    createdAt: Date;
}

interface Database {
    user: User;
    session: Session;
    account: Account;
    verification: Verification;
    photocards: Photocard;
    cardTypes: CardType;
    cardSizes: CardSize;
    collections: Collection;
    collectionTypes: CollectionType;
    reports: Report;
}

export const db = (env: Env) => new Kysely<Database>({ dialect: new D1Dialect({ database: env.DB }) });
