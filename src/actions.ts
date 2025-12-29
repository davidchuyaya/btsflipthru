"use server";

import { getSession, isAtLeastMod } from "@/auth";
import {
    db,
    Collection,
    Photocard,
    CollectionType,
    CardType,
    CardSize,
    ParsedCollection,
    parseCollection,
    Report,
} from "@/db";
import { fullSizeId, thumbnailId, MAX_IMAGE_SIZE_BYTES, Result } from "@/constants";
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
 *
 * @param collectionType Only the name field is used
 * @returns The auto-assigned ID of the collection type.
 */
export async function addCollectionTypeToDB(collectionType: CollectionType): Promise<Result<bigint>> {
    const result = await isAtLeastMod<bigint>();
    if (result.error) {
        return result;
    }
    return await getDb()
        .insertInto("collectionTypes")
        .values({ name: collectionType.name })
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.insertId === undefined) {
                    return { error: "Collection type conflicts with existing entry" };
                }
                return { data: result.insertId };
            },
            (reason) => ({
                error: "Could not add collection type",
            }),
        );
}

export async function getCollectionTypesFromDB(): Promise<CollectionType[]> {
    const database = getDb();
    return await database.selectFrom("collectionTypes").selectAll().execute();
}

/**
 *
 * @param cardType Only the name field is used
 * @returns The auto-assigned ID of the card type.
 */
export async function addCardTypeToDB(cardType: CardType): Promise<Result<bigint>> {
    const result = await isAtLeastMod<bigint>();
    if (result.error) {
        return result;
    }
    return await getDb()
        .insertInto("cardTypes")
        .values({ name: cardType.name })
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.insertId === undefined) {
                    return { error: "Card type conflicts with existing entry" };
                }
                return { data: result.insertId };
            },
            (reason) => ({
                error: "Could not add card type",
            }),
        );
}

export async function getCardTypesFromDB(): Promise<CardType[]> {
    const database = getDb();
    return await database.selectFrom("cardTypes").selectAll().execute();
}

/**
 *
 * @param cardSize The name, width, and height fields are used
 * @returns The auto-assigned ID of the card size.
 */
export async function addCardSizeToDB(cardSize: CardSize): Promise<Result<bigint>> {
    const result = await isAtLeastMod<bigint>();
    if (result.error) {
        return result;
    }
    return await getDb()
        .insertInto("cardSizes")
        .values({
            name: cardSize.name,
            width: cardSize.width,
            height: cardSize.height,
        })
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.insertId === undefined) {
                    return { error: "Card size conflicts with existing entry" };
                }
                return { data: result.insertId };
            },
            (reason) => ({
                error: "Could not add card size",
            }),
        );
}

export async function getCardSizesFromDB(): Promise<CardSize[]> {
    const database = getDb();
    return await database.selectFrom("cardSizes").selectAll().execute();
}

/**
 * Upload pre-converted images to R2.
 * @param images Array of [imageId, imageData] tuples to upload
 * @returns Result indicating success or error
 */
async function uploadImagesToR2(images: [string, ArrayBuffer][], mustBeMod: boolean): Promise<Result<boolean>> {
    if (mustBeMod) {
        const result = await isAtLeastMod<boolean>();
        if (result.error) {
            return result;
        }
    }

    // Check all image sizes
    if (images.some(([, imageData]) => imageData.byteLength > MAX_IMAGE_SIZE_BYTES)) {
        return { error: "Image exceeds size limit." };
    }

    const r2 = getR2();

    // Check for existing images
    const existingChecks = await Promise.all(images.map(([id]) => r2.head(id)));
    if (existingChecks.some((existing) => existing !== null)) {
        return { error: "Image with the same ID already exists." };
    }

    const httpMetadata = {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
    };

    // Upload all images
    await Promise.all(images.map(([id, data]) => r2.put(id, data, { httpMetadata })));
    return { data: true };
}

/**
 * Upload pre-converted images to R2.
 * Client should convert to AVIF and create thumbnail before calling this.
 * @param fullSizeImage Full-size photocard
 * @param thumbnailImage Thumbnail of photocard
 * @param id Image ID. Error if image with same ID already exists.
 */
export async function uploadImage(
    fullSizeImage: ArrayBuffer,
    thumbnailImage: ArrayBuffer,
    id: string,
): Promise<Result<boolean>> {
    return uploadImagesToR2([
        [fullSizeId(id), fullSizeImage],
        [thumbnailId(id), thumbnailImage],
    ], true);
}

export async function addCollectionToDB(collection: Collection, photocards: Photocard[]): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }
    const result = await isAtLeastMod<boolean>(session);
    if (result.error) {
        return result;
    }

    const date = Date.now();
    const database = getDb();
    // Insert the collection, get its ID
    const collectionId: Result<number> = await database
        .insertInto("collections")
        .values(collection)
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.insertId === undefined) {
                    return { error: "Collection conflicts with existing entry" };
                }
                return { data: Number(result.insertId) };
            },
            (reason) => ({ error: "Could not add collection." }),
        );

    if (collectionId.error) {
        return { error: collectionId.error };
    }

    if (photocards.length === 0) {
        return { error: "Collection must have at least one photocard." };
    }

    // Insert the photocards, linking them to the collection and fixing any placeholder data
    for (const photocard of photocards) {
        photocard.collectionId = collectionId.data!;
        photocard.imageContributorId = session.data!.user.id;
        photocard.updatedAt = date;
    }
    const photocardIds: Result<boolean>[] = await Promise.all(
        photocards.map(async (photocard) =>
            database
                .insertInto("photocards")
                .values(photocard)
                .executeTakeFirstOrThrow()
                .then(
                    (result) => ({
                        data: true,
                    }),
                    (reason) => ({
                        error: "Could not add photocard to database.",
                    }),
                ),
        ),
    );
    if (photocardIds.some((res) => res.error)) {
        return { error: "Could not add photocards to database." };
    }

    return { data: true };
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

export async function verifyTurnstile(token: string): Promise<Result<boolean>> {
    try {
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: new URLSearchParams({
                secret: getEnv().TURNSTILE_SECRET_KEY,
                response: token,
            }),
        });
        const data: { success: boolean } = await response.json();
        return { data: data.success };
    } catch (error) {
        return { error: `Error verifying you are human: ${error}.` };
    }
}

export async function addReportToDB(report: Report, image: ArrayBuffer, turnstileToken: string): Promise<Result<boolean>> {
    const turnstileResult = await verifyTurnstile(turnstileToken);
    if (turnstileResult.error) {
        return turnstileResult;
    }

    const database = getDb();
    const result = await database
        .insertInto("reports")
        .values(report)
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.insertId === undefined) {
                    return { error: "Could not add report to database." };
                }
                return { data: true };
            },
            (reason) => ({
                error: "Could not add report to database.",
            }),
        );

    if (result.error || !report.imageId) {
        return result;
    }

    return await uploadImagesToR2([[report.imageId, image]], false);
}
