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
    Role,
    UserData,
    PhotocardData,
} from "@/db";
import { Result, generateSignedParams, PresignedUrl, CLOUDINARY_API_KEY, CLOUDINARY_CLOUD_NAME } from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { v2 as cloudinary } from "cloudinary";
import { User } from "better-auth";

function getEnv() {
    const { env } = getCloudflareContext();
    return env as Env;
}

function getDb() {
    return db(getEnv());
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
 * Generate pre-signed URLs for the client to upload images directly to Cloudinary.
 * @param createThumbnail Whether to create a thumbnail for each image.
 * @returns Pre-signed URL and cloudinary signed params
 */
function generateSignedUploadUrl(createThumbnail: boolean): PresignedUrl {
    const env = getEnv();
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
    });

    const params = generateSignedParams(createThumbnail);
    const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
    return { signature, params };
}

export async function generateSignedUploadUrlForPhotocards(numPhotocards: number): Promise<Result<PresignedUrl[]>> {
    const result = await isAtLeastMod<boolean>();
    if (result.error) {
        return result;
    }

    const signatures: PresignedUrl[] = [];
    for (let i = 0; i < numPhotocards; i++) {
        signatures.push(generateSignedUploadUrl(true));
    }
    return { data: signatures };
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

        // Only Admins can set adminTemporary = false; only Mods and above can set modTemporary = false
        switch (session.data!.user.role) {
            case Role.MOD:
                photocard.adminTemporary = true;
                break;
            case Role.USER: // Never reached for now, but just in case
                photocard.adminTemporary = true;
                photocard.modTemporary = true;
                break;
        }
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

async function verifyTurnstile(token: string): Promise<Result<boolean>> {
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

/**
 * Verifies the user with a captcha, then adds a report to the database, optionally generating a pre-signed URL for image upload.
 * @param report Report to submit to DB
 * @param imageSize Size of the image to submit. Null if none provided
 * @param turnstileToken Captcha
 * @returns If an image was provided, returns the pre-signed URL and image ID for uploading. Null if no image was provided.
 */
export async function addReportToDB(
    report: Report,
    imageSize: number | null,
    turnstileToken: string,
): Promise<Result<PresignedUrl | null>> {
    // Check captcha
    const turnstileResult = await verifyTurnstile(turnstileToken);
    if (turnstileResult.error) {
        return turnstileResult;
    }

    // Fetch the pre-signed URL
    let presignUrl: PresignedUrl | null = null;
    if (imageSize !== null) {
        const { signature, params } = generateSignedUploadUrl(false);
        report.imageId = params.public_id;
        presignUrl = { signature, params };
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
                return { data: null };
            },
            (reason) => ({
                error: "Could not add report to database.",
            }),
        );

    if (result.error || !report.imageId) {
        return result;
    }

    // Return the pre-signed URL
    return { data: presignUrl };
}

export async function getMostContributionsUser(): Promise<Result<UserData>> {
    const database = getDb();
    return await database
        .selectFrom("user_data")
        .selectAll()
        .orderBy("contributions", "desc")
        .limit(1)
        .executeTakeFirstOrThrow()
        .then(
            (userData) => ({ data: userData }),
            (reason) => ({
                error: "Could not fetch most contributions user: " + reason,
            }),
        );
}

export async function getMostOwnedPhotocard(): Promise<Result<Photocard>> {
    const database = getDb();
    const photocardData: Result<PhotocardData> = await database
        .selectFrom("photocard_data")
        .selectAll()
        .orderBy("numOwners", "desc")
        .limit(1)
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: data }),
            (reason) => ({
                error: "Could not fetch most owned photocard data: " + reason,
            }),
        );
    if (photocardData.error) {
        return photocardData;
    }

    return await database
        .selectFrom("photocards")
        .selectAll()
        .where("id", "=", photocardData.data!.photocardId)
        .executeTakeFirstOrThrow()
        .then(
            (card) => ({ data: card }),
            (reason) => ({
                error: "Could not fetch most owned photocard: " + reason,
            }),
        );
}

export async function getMostWishlistedPhotocard(): Promise<Result<Photocard>> {
    const database = getDb();
    const photocardData: Result<PhotocardData> = await database
        .selectFrom("photocard_data")
        .selectAll()
        .orderBy("numWishlists", "desc")
        .limit(1)
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: data }),
            (reason) => ({
                error: "Could not fetch most wishlisted photocard data: " + reason,
            }),
        );
    if (photocardData.error) {
        return photocardData;
    }

    return await database
        .selectFrom("photocards")
        .selectAll()
        .where("id", "=", photocardData.data!.photocardId)
        .executeTakeFirstOrThrow()
        .then(
            (card) => ({ data: card }),
            (reason) => ({
                error: "Could not fetch most wishlisted photocard: " + reason,
            }),
        );
}

export async function getTotalPhotocards(): Promise<Result<number>> {
    const database = getDb();
    return await database
        .selectFrom("db_data")
        .select("numPhotocards")
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: data.numPhotocards }),
            (reason) => ({
                error: "Could not fetch total photocards: " + reason,
            }),
        );
}

export async function getTotalPhotocardsWithoutImages(): Promise<Result<number>> {
    const database = getDb();
    return await database
        .selectFrom("db_data")
        .select("numPhotocardsWithoutImages")
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: data.numPhotocardsWithoutImages }),
            (reason) => ({
                error: "Could not fetch total photocards without images: " + reason,
            }),
        );
}

/**
 *
 * @returns Photocards with an image ID
 */
export async function getRecentlyAddedPhotocardsInDB() {
    const database = getDb();
    return await database
        .selectFrom("photocards")
        .selectAll()
        .where("imageId", "is not", null)
        .orderBy("updatedAt", "desc")
        .limit(50)
        .execute();
}
