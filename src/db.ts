import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

// Important: Any number used by an enum should not be reused in the future
export enum Role {
    USER = 0,
    MOD = 1,
    ADMIN = 2,
}
export const ROLES = Object.values(Role).filter(
    (value) => typeof value === "number"
) as number[];

export enum Press {
    Unknown = 0,
    USA = 1,
    Korea = 2,
    Japan = 3,
    Taiwan = 4,
}
export const PRESSES = Object.values(Press).filter(
    (value) => typeof value === "number"
) as number[];
export const PRESSES_WITH_NAMES = Object.entries(Press).filter(
    ([_, value]) => typeof value === "number"
) as [string, number][];

export enum BackImageType {
    Image = 0,
    White = 1,
    Transparent = 2,
}
export const BACK_IMAGE_TYPES = Object.values(BackImageType).filter(
    (value) => typeof value === "number"
) as number[];
export const BACK_IMAGE_TYPES_WITH_NAMES = Object.entries(BackImageType).filter(
    ([_, value]) => typeof value === "number"
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
    setId: string;
    imageId: string | null;
    backImageId: string | null;
    backImageType: number; // Should be one of BackImageType enum values
    sizeId: number;
    effects: string | null;
    temporary: boolean; // True for all user uploads. Can be marked false by admin/mod (no more overwrites)

    rm: boolean;
    jimin: boolean;
    jungkook: boolean;
    v: boolean;
    jin: boolean;
    suga: boolean;
    jhope: boolean;

    imageContributorId: string;
    updatedAt: Date;
}

export interface CardType {
    id?: number;
    name: string;
}

export interface CardToCardType {
    cardId: number;
    cardTypeId: number;
}

export interface CardSize {
    id?: number;
    name: string;
    width: number;
    height: number;
}

export interface Set {
    id?: number;
    name: string;
    press: number; // Should be one of Press enum values
    releaseDate: Date;
    coverImageId: string | null;
}

export interface SetType {
    id?: number;
    name: string;
}

export interface SetToSetType {
    setId: number;
    setTypeId: number;
}

interface Database {
    user: User;
    session: Session;
    account: Account;
    verification: Verification;
    photocards: Photocard;
    cardTypes: CardType;
    cardToCardTypes: CardToCardType;
    cardSizes: CardSize;
    sets: Set;
    setTypes: SetType;
    setToSetTypes: SetToSetType;
}

export const db = (env: Env) =>
    new Kysely<Database>({ dialect: new D1Dialect({ database: env.DB }) });
