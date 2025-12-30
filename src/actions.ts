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
import {
    fullSizeId,
    thumbnailId,
    MAX_IMAGE_SIZE_BYTES,
    Result,
    ImageUploadSchema,
    THUMBNAIL_COMPRESSION_HEIGHT_PX,
    IMAGE_TYPE,
} from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import z from "zod";
import { act } from "react";

function getEnv() {
    const { env } = getCloudflareContext();
    return env as Env;
}

function getDb() {
    return db(getEnv());
}

function getR2Photocards() {
    return getEnv().photocards;
}

function getR2Reports() {
    return getEnv().reports;
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
 * Upload images to R2, converting to `IMAGE_TYPE`.
 * @param imageForm FormData that adheres to `ImageUploadSchema`
 * @param bucket R2 bucket to upload to
 * @param mustBeMod Whether the user must be at least a moderator to upload
 * @param isThumbnail Whether to resize to thumbnail size
 * @returns Result indicating success or error
 */
async function uploadImageToR2(
    imageForm: FormData,
    bucket: R2Bucket,
    mustBeMod: boolean,
    isThumbnail: boolean,
): Promise<Result<boolean>> {
    if (mustBeMod) {
        const result = await isAtLeastMod<boolean>();
        if (result.error) {
            return result;
        }
    }

    // Parse images from form data
    const result = ImageUploadSchema.safeParse(imageForm);
    if (!result.success) {
        return { error: result.error.issues.map((issue) => issue.message).join(", ") };
    }
    const { imageId, image } = result.data;

    // Check for existing images
    const actualId = isThumbnail ? thumbnailId(imageId) : fullSizeId(imageId);
    const existingChecks = await bucket.head(actualId);
    if (existingChecks !== null) {
        return { error: "Image with the same ID already exists." };
    }

    // Transform
    const env = getEnv();
    let stream = env.IMAGES.input(image.stream());
    if (isThumbnail) {
        stream = stream.transform({
            fit: "scale-down",
            height: THUMBNAIL_COMPRESSION_HEIGHT_PX,
        });
    }
    const convertedImage = await stream.output({ format: IMAGE_TYPE });
    const response = convertedImage.response();
    if (!response.ok) {
        return { error: `Image conversion failed: ${response.status}.` };
    }

    const httpMetadata = {
        contentType: IMAGE_TYPE,
        cacheControl: "public, max-age=31536000, immutable",
    };

    // Upload all images
    await bucket.put(actualId, convertedImage.image(), { httpMetadata });
    return { data: true };
}

/**
 * Upload photocard to R2.
 * @param imageForm FormData that adheres to `ImageUploadSchema`
 */
export async function uploadFullPhotocard(imageForm: FormData): Promise<Result<boolean>> {
    return uploadImageToR2(imageForm, getR2Photocards(), true, false);
}

export async function uploadThumbnailPhotocard(imageForm: FormData): Promise<Result<boolean>> {
    return uploadImageToR2(imageForm, getR2Photocards(), true, true);
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

export async function addReportToDB(
    report: Report,
    imageForm: FormData,
    turnstileToken: string,
): Promise<Result<boolean>> {
    // Check captcha
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

    // Also upload the image, since we have one we won't exceed the memory limit so we can do it all together
    return await uploadImageToR2(imageForm, getR2Reports(), false, false);
}
