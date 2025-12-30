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
    Result,
    ImageUploadSchema,
    THUMBNAIL_COMPRESSION_HEIGHT_PX,
    IMAGE_TYPE,
    CLOUDFLARE_R2_PREPROCESS_ENDPOINT,
    MAX_IMAGE_SIZE_BYTES,
} from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

function getPreprocessS3Client() {
    const env = getEnv();
    return new S3Client({
        region: "auto",
        endpoint: CLOUDFLARE_R2_PREPROCESS_ENDPOINT,
        credentials: {
            accessKeyId: env.R2_PREPROCESS_S3_ACCESS_KEY_ID,
            secretAccessKey: env.R2_PREPROCESS_S3_SECRET_ACCESS_KEY,
        },
    });
}

/**
 * Generate pre-signed URLs for the client to upload images directly to R2.
 * @param numImages How many images does the client plan on uploading?
 * @param mustBeMod Whether the client must be a mod to get these URLs. Since this is toggle-able, do not export this function; otherwise the client can turn off authentication.
 * @returns (Array of pre-signed URLs, imageIds)
 */
async function generateSignedUploadUrl(
    imageLengths: number[],
    mustBeMod: boolean,
): Promise<Result<{ url: string; imageId: string }[]>> {
    if (mustBeMod) {
        const result = await isAtLeastMod<boolean>();
        if (result.error) {
            return result;
        }
    }

    if (imageLengths.some((length) => length > MAX_IMAGE_SIZE_BYTES)) {
        return { error: `One or more images exceed the maximum size of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB.` };
    }

    const s3Client = getPreprocessS3Client();
    const imageIds: string[] = [];
    const putUrlPromises: Promise<string>[] = [];
    for (const imageLength of imageLengths) {
        const imageId = crypto.randomUUID();
        imageIds.push(imageId);
        putUrlPromises.push(
            getSignedUrl(
                s3Client,
                new PutObjectCommand({
                    Bucket: "preprocess",
                    Key: imageId,
                    ContentLength: imageLength, // The uploaded image must match this length
                    ContentType: "image/*",
                }),
                { expiresIn: 900 },
            ), // URLs valid for 15 minutes
        );
    }

    const putUrls = await Promise.all(putUrlPromises).catch((error) => {
        return { error: `Error generating signed URLs: ${error}` };
    });
    if (!Array.isArray(putUrls)) {
        return putUrls; // it's an error
    }

    const resultArray: { url: string; imageId: string }[] = [];
    for (let i = 0; i < imageLengths.length; i++) {
        resultArray.push({ url: putUrls[i], imageId: imageIds[i] });
    }
    return { data: resultArray };
}

export async function generateSignedUploadUrlForPhotocards(
    imageLengths: number[],
): Promise<Result<{ url: string; imageId: string }[]>> {
    return generateSignedUploadUrl(imageLengths, true);
}

/**
 * Converts the uploaded image in the preprocess bucket into `IMAGE_TYPE`, moves it to the destination bucket, then deletes the image from the preprocess bucket.
 *
 * @param imageId The ID of the image in the preprocess bucket.
 * @param destinationBucket Where to place the image after converting into `IMAGE_TYPE`
 * @param mustBeMod Whether the user must be at least a moderator to upload. Note: Do NOT export this function, as the client could then bypass authentication.
 * @param makeThumbnail Whether to also create a thumbnail. If true, then the original image will be stored at `fullSizeId(imageId)` and the thumbnail at `thumbnailId(imageId)`.
 */
async function convertUploadedImage(
    imageId: string,
    destinationBucket: R2Bucket,
    mustBeMod: boolean,
    makeThumbnail: boolean,
): Promise<Result<boolean>> {
    if (mustBeMod) {
        const result = await isAtLeastMod<boolean>();
        if (result.error) {
            return result;
        }
    }

    // Fetch the original image
    const originalImage = await getEnv().preprocessedPhotocards.get(imageId);
    if (originalImage === null) {
        return { error: "Could not find uploaded image in preprocess bucket." };
    }

    // Check if there's a collision on the destination
    const actualId = makeThumbnail ? fullSizeId(imageId) : imageId;
    const existingChecks = await destinationBucket.head(actualId);
    if (existingChecks !== null) {
        // Delete the original image since we won't be using it
        await getEnv().preprocessedPhotocards.delete(imageId);
        return { error: "Image with the same ID already exists." };
    }

    // Transform the full-size image
    const env = getEnv();
    const convertedFullSizeImage = await env.IMAGES.input(originalImage.body).output({ format: IMAGE_TYPE });
    const fullSizeResponse = convertedFullSizeImage.response();
    if (!fullSizeResponse.ok) {
        return { error: `Image conversion failed: ${fullSizeResponse.status}.` };
    }

    // Place the full-size image into the destination bucket
    const httpMetadata = {
        contentType: IMAGE_TYPE,
        cacheControl: "public, max-age=31536000, immutable",
    };
    await destinationBucket.put(actualId, convertedFullSizeImage.image(), { httpMetadata });

    // Transform the thumbnail if requested
    if (makeThumbnail) {
        // Fetch the image again to reinitialize the stream
        const originalImageForThumbnail = await getEnv().preprocessedPhotocards.get(imageId);
        if (originalImageForThumbnail === null) {
            return { error: "Could not find uploaded image in preprocess bucket for thumbnail." };
        }

        const convertedThumbnailImage = await env.IMAGES.input(originalImageForThumbnail.body)
            .transform({
                fit: "scale-down",
                height: THUMBNAIL_COMPRESSION_HEIGHT_PX,
            })
            .output({ format: IMAGE_TYPE });
        const thumbnailResponse = convertedThumbnailImage.response();
        if (!thumbnailResponse.ok) {
            return { error: `Thumbnail conversion failed: ${thumbnailResponse.status}.` };
        }

        // Place the thumbnail into the destination bucket
        await destinationBucket.put(thumbnailId(imageId), convertedThumbnailImage.image(), { httpMetadata });
    }

    // Delete the original image since we won't be using it
    await getEnv().preprocessedPhotocards.delete(imageId);

    return { data: true };
}

/**
 * Converts the uploaded photocard image in the preprocess bucket into `IMAGE_TYPE`, creates a thumbnail, moves both to the photocards bucket, then deletes the original.
 * @param imageId ID of the image to convert
 */
export async function convertUploadedPhotocard(imageId: string): Promise<Result<boolean>> {
    return convertUploadedImage(imageId, getEnv().photocards, true, false);
}

/**
 * Converts the uploaded report image in the preprocess bucket into `IMAGE_TYPE`, moves it to the reports bucket, then deletes the original.
 * @param imageId ID of the image to convert
 * @returns
 */
export async function convertUploadedReport(imageId: string): Promise<Result<boolean>> {
    return convertUploadedImage(imageId, getEnv().reports, false, true);
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
): Promise<Result<{ url: string; imageId: string } | null>> {
    // Check captcha
    const turnstileResult = await verifyTurnstile(turnstileToken);
    if (turnstileResult.error) {
        return turnstileResult;
    }

    // Fetch the pre-signed URL
    let presignUrl: string | null = null;
    if (imageSize !== null) {
        const urlResult = await generateSignedUploadUrl([imageSize], false);
        if (urlResult.error) {
            return { error: `Error generating signed URL for report image: ${urlResult.error}` };
        }
        const { url, imageId } = urlResult.data![0];
        report.imageId = imageId;
        presignUrl = url;
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

    // Return the pre-signed URL and image ID for uploading
    return { data: { url: presignUrl!, imageId: report.imageId } };
}
