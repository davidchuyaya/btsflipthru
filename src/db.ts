import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { types } from 'util';

// Important: Do not change names of existing roles
export enum Role {
    USER = "USER",
    MOD = "MOD",
    ADMIN = "ADMIN",
}

interface User {
    id: string;
    name: string;
    role: string; // Should be one of Role enum values
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
    id: string;
    setId: string;
    imageId: string | null;
    backImageId: string | null;

    width: number;
    height: number;
    effects: string | null;

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
    id: string;
    name: string;
}

export interface CardToCardType {
    cardId: string;
    cardTypeId: string;
}

export interface Set {
    id: string;
    name: string;
    releaseDate: Date;
    coverImageId: string;
}

export interface SetType {
    id: string;
    name: string;
}

export interface SetToSetType {
    setId: string;
    setTypeId: string;
}

interface Database {
    user: User;
    session: Session;
    account: Account;
    verification: Verification;
    photocards: Photocard;
    cardTypes: CardType;
    cardToCardTypes: CardToCardType;
    sets: Set;
    setTypes: SetType;
    setToSetTypes: SetToSetType;
}

export const db = (env: Env) => new Kysely<Database>({ dialect: new D1Dialect({ database: env.DB }) });