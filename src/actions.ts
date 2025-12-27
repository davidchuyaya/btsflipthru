"use server";

import { errorIfLessPrivilegedThanMod, getSession } from "@/auth";
import { db, Collection, Photocard, CollectionType, CardType, CardSize, ParsedCollection, parseCollection } from "@/db";
import { fullSizeId, thumbnailId, MAX_IMAGE_SIZE_BYTES } from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function getEnv() {
    const { env } = getCloudflareContext();
    return env as Env;
}

function getDb() {
    return db(getEnv());
}

function getR2() {
    return getEnv().images;
}

/**
 * For Clients.
 * Instead of calling a server function that might throw an error directly, wrap it in this function.
 *
 * @param promise
 * @returns
 */
export async function callPromiseOrError<T>(promise: Promise<T>): Promise<T | { error: string }> {
    try {
        return await promise;
    } catch (error) {
        if (error instanceof Error) {
            return { error: error.message };
        } else {
            return { error: "An unknown error occurred." };
        }
    }
}

/**
 *
 * @param collectionType Only the name field is used
 * @returns The auto-assigned ID of the collection type. Output is undefined if error occurs
 */
export async function addCollectionTypeToDB(collectionType: CollectionType) {
    await errorIfLessPrivilegedThanMod();
    return await getDb()
        .insertInto("collectionTypes")
        .values({ name: collectionType.name })
        .executeTakeFirst()
        .then((result) => result.insertId);
}

export async function getCollectionTypesFromDB(): Promise<CollectionType[]> {
    const database = getDb();
    return await database.selectFrom("collectionTypes").selectAll().execute();
}

/**
 *
 * @param cardType Only the name field is used
 * @returns The auto-assigned ID of the card type. Output is undefined if error occurs
 */
export async function addCardTypeToDB(cardType: CardType) {
    await errorIfLessPrivilegedThanMod();
    return await getDb()
        .insertInto("cardTypes")
        .values({ name: cardType.name })
        .executeTakeFirst()
        .then((result) => result.insertId);
}

export async function getCardTypesFromDB(): Promise<CardType[]> {
    const database = getDb();
    return await database.selectFrom("cardTypes").selectAll().execute();
}

/**
 *
 * @param cardSize The name, width, and height fields are used
 * @returns The auto-assigned ID of the card size. Output is undefined if error occurs
 */
export async function addCardSizeToDB(cardSize: CardSize) {
    await errorIfLessPrivilegedThanMod();
    return await getDb()
        .insertInto("cardSizes")
        .values({
            name: cardSize.name,
            width: cardSize.width,
            height: cardSize.height,
        })
        .executeTakeFirst()
        .then((result) => result.insertId);
}

export async function getCardSizesFromDB(): Promise<CardSize[]> {
    const database = getDb();
    return await database.selectFrom("cardSizes").selectAll().execute();
}

/**
 * Upload pre-converted images to R2.
 * Client should convert to AVIF and create thumbnail before calling this.
 */
export async function uploadImage(fullSizeImage: ArrayBuffer, thumbnailImage: ArrayBuffer, id: string) {
    await errorIfLessPrivilegedThanMod();

    if (fullSizeImage.byteLength > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("Image size exceeds limit.");
    }

    const r2 = getR2();
    if (!r2) {
        throw new Error("R2 binding not available.");
    }

    // Do not allow overwriting existing images
    const existing = await r2.head(fullSizeId(id));
    if (existing) {
        throw new Error("Image with the same ID already exists.");
    }

    const httpMetadata = {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
    };

    await Promise.all([
        r2.put(fullSizeId(id), fullSizeImage, { httpMetadata }),
        r2.put(thumbnailId(id), thumbnailImage, { httpMetadata }),
    ]);
    return true;
}

export async function addCollectionToDB(collection: Collection, photocards: Photocard[]) {
    await errorIfLessPrivilegedThanMod();

    const date = Date.now();
    const database = getDb();
    // Insert the collection, get its ID
    const collectionId = await database
        .insertInto("collections")
        .values(collection)
        .executeTakeFirstOrThrow()
        .then((result) => Number(result.insertId));

    if (photocards.length === 0) {
        return true;
    }

    // Insert the photocards, linking them to the collection and fixing any placeholder data
    const session = await getSession();
    for (const photocard of photocards) {
        photocard.collectionId = collectionId!;
        photocard.imageContributorId = session.user.id;
        photocard.updatedAt = date;
    }
    await Promise.all(
        photocards.map(async (photocard) => {
            return database.insertInto("photocards").values(photocard).executeTakeFirstOrThrow();
        }),
    );
    return true;
}

export async function getCollectionsFromDB(): Promise<ParsedCollection[]> {
    const database = getDb();
    const collections = await database.selectFrom("collections").selectAll().execute();
    return collections.map((collection) => parseCollection(collection));
}

export async function searchPhotocardsInDB() {
    //TODO: Currently always shows the 50 most recently added cards, change later
    const database = getDb();
    return await database.selectFrom("photocards").selectAll().orderBy("updatedAt", "desc").limit(50).execute();
}
