"use server";

import { getSession, isAtLeastMod } from "@/auth";
import {
    Result,
    generateSignedParams,
    PresignedUrl,
    CLOUDINARY_API_KEY,
    CLOUDINARY_CLOUD_NAME,
    SortType,
    SearchQuery,
    NUM_HOME_PHOTOCARDS,
    NUM_LOAD_PHOTOCARDS,
    NUM_LOAD_COLLECTIONS,
    Role,
    HomeStats,
    MemberToIntWithOT7,
    MemberInts,
    MAX_USERNAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    USERNAME_REGEX,
    USERNAME_ERROR_TEXT,
    MAX_EXTERNAL_SITE_USERNAME_LENGTH,
    SPOTIFY_PLAYLIST_ID_LENGTH,
} from "@/constants";
import { v2 as cloudinary } from "cloudinary";
import { sql, type Selectable, type Insertable, Updateable } from "kysely";
import { db } from "./db-instance";
import {
    CollectionTypes,
    CardTypes,
    CardSizes,
    Collections,
    Photocards,
    Reports,
    UserData,
    ViewMostContributions,
    ViewMostOwnedPhotocards,
    ViewMostWishlistedPhotocards,
} from "./db";
import { cacheTag, updateTag } from "next/cache";

const CACHE_TAG_COLLECTIONS = "collections";
const CACHE_TAG_COLLECTION_TYPES = "collection-types";
const CACHE_TAG_CARD_TYPES = "card-types";
const CACHE_TAG_CARD_SIZES = "card-sizes";
const CACHE_TAG_HOME_STATS = "home-stats";

export async function getDate(): Promise<Date> {
    "use cache";
    return new Date();
}

export async function addUserDataToDB(user_data: Insertable<UserData>): Promise<Result<boolean>> {
    return await db
        .insertInto("user_data")
        .values(user_data)
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                return { data: true };
            },
            (reason) => ({
                error: "Could not add user data",
            }),
        );
}

export async function getUserDataFromDB(userId: string): Promise<Result<Selectable<UserData>>> {
    return await db
        .selectFrom("user_data")
        .where("user_id", "=", userId)
        .selectAll()
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: `Could not get user data: ${reason}`,
            }),
        );
}

/**
 *
 * @param collectionType Only the name field is used
 * @returns The auto-assigned ID of the collection type.
 */
export async function addCollectionTypeToDB(collectionType: Insertable<CollectionTypes>): Promise<Result<number>> {
    const result = await isAtLeastMod<number>();
    if (result.error) {
        return result;
    }
    return await db
        .insertInto("collection_types")
        .values({ name: collectionType.name })
        .returning("id")
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.id === undefined) {
                    return { error: "Collection type conflicts with existing entry" };
                }
                updateTag(CACHE_TAG_COLLECTION_TYPES);
                return { data: result.id };
            },
            (reason) => ({
                error: "Could not add collection type",
            }),
        );
}

export async function getCollectionTypesFromDB(): Promise<Result<Selectable<CollectionTypes>[]>> {
    "use cache";
    cacheTag(CACHE_TAG_COLLECTION_TYPES);
    return await db
        .selectFrom("collection_types")
        .selectAll()
        .execute()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: `Could not get collection types: ${reason}`,
            }),
        );
}

/**
 *
 * @param cardType Only the name field is used
 * @returns The auto-assigned ID of the card type.
 */
export async function addCardTypeToDB(cardType: Insertable<CardTypes>): Promise<Result<number>> {
    const result = await isAtLeastMod<number>();
    if (result.error) {
        return result;
    }
    return await db
        .insertInto("card_types")
        .values({ name: cardType.name })
        .returning("id")
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.id === undefined) {
                    return { error: "Card type conflicts with existing entry" };
                }
                updateTag(CACHE_TAG_CARD_TYPES);
                return { data: result.id };
            },
            (reason) => ({
                error: "Could not add card type",
            }),
        );
}

export async function getCardTypesFromDB(): Promise<Result<Selectable<CardTypes>[]>> {
    "use cache";
    cacheTag(CACHE_TAG_CARD_TYPES);
    return await db
        .selectFrom("card_types")
        .selectAll()
        .execute()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: `Could not get card types: ${reason}`,
            }),
        );
}

/**
 *
 * @param cardSize The name, width, and height fields are used
 * @returns The auto-assigned ID of the card size.
 */
export async function addCardSizeToDB(cardSize: Insertable<CardSizes>): Promise<Result<number>> {
    const result = await isAtLeastMod<number>();
    if (result.error) {
        return result;
    }
    return await db
        .insertInto("card_sizes")
        .values({
            name: cardSize.name,
            width: cardSize.width,
            height: cardSize.height,
        })
        .returning("id")
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.id === undefined) {
                    return { error: "Card size conflicts with existing entry" };
                }
                updateTag(CACHE_TAG_CARD_SIZES);
                return { data: result.id };
            },
            (reason) => ({
                error: "Could not add card size",
            }),
        );
}

export async function getCardSizesFromDB(): Promise<Result<Selectable<CardSizes>[]>> {
    "use cache";
    cacheTag(CACHE_TAG_CARD_SIZES);
    return await db
        .selectFrom("card_sizes")
        .selectAll()
        .execute()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: `Could not get card sizes: ${reason}`,
            }),
        );
}

export async function getCollectionsFromDB(): Promise<Result<Selectable<Collections>[]>> {
    "use cache";
    cacheTag(CACHE_TAG_COLLECTIONS);
    return await db
        .selectFrom("collections")
        .selectAll()
        .execute()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: `Could not get collections: ${reason}`,
            }),
        );
}

/**
 * Generate pre-signed URLs for the client to upload images directly to Cloudinary.
 * @param createThumbnail Whether to create a thumbnail for each image.
 * @returns Pre-signed URL and cloudinary signed params
 */
function generateSignedUploadUrl(createThumbnail: boolean): PresignedUrl {
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const params = generateSignedParams(createThumbnail);
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
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

export async function addCollectionToDB(
    collection: Insertable<Collections>,
    photocards: Insertable<Photocards>[],
): Promise<Result<number>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }
    const result = await isAtLeastMod<boolean>(session);
    if (result.error) {
        return result;
    }

    if (photocards.length === 0) {
        return { error: "Collection must have at least one photocard." };
    }

    // If the user is a mod, set admin_temporary to true for all photocards
    const mappedPhotocards = photocards.map((photocard) => ({
        ...photocard,
        admin_temporary: session.data!.user.role === Role.MOD || photocard.admin_temporary,
    }));

    try {
        const result = await sql<{ p_new_collection_id: number }>`
            CALL sp_add_collection_with_photocards(
                ${JSON.stringify(collection)},
                ${JSON.stringify(mappedPhotocards)},
                ${session.data!.user.id},
                NULL
            )
        `.execute(db);

        // When using CALL with an OUT parameter, specific driver behavior determines where the value appears.
        // In many postgres drivers, the OUT parameters are returned as the first row.
        const newCollectionId = result.rows[0]?.p_new_collection_id;

        if (newCollectionId === undefined) {
            return { error: "Stored procedure executed but returned no ID." };
        }

        updateTag(CACHE_TAG_COLLECTIONS);
        updateTag(CACHE_TAG_HOME_STATS);
        return { data: newCollectionId };
    } catch (e) {
        return { error: `Could not add collection: ${e}` };
    }
}

export async function getCollectionForEdit(
    collectionId: number,
): Promise<Result<{ collections: Selectable<Collections>; photocards: Selectable<Photocards>[] }>> {
    const result = await isAtLeastMod<boolean>();
    if (result.error) {
        return result;
    }

    const collections = await db
        .selectFrom("collections")
        .selectAll()
        .where("id", "=", collectionId)
        .executeTakeFirst();

    if (!collections) {
        return { error: "Collection not found." };
    }

    const photocards = await db
        .selectFrom("photocards")
        .selectAll()
        .where("collection_id", "=", collectionId)
        .execute();

    return { data: { collections, photocards } };
}

export async function updateCollectionInDB(
    collectionId: number,
    collection: Insertable<Collections>,
    photocards: Insertable<Photocards>[],
): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }
    const result = await isAtLeastMod<boolean>(session);
    if (result.error) {
        return result;
    }

    // Only keep cards that aren't locked by admins (unless we're an admin)
    const mappedPhotocards = photocards.filter(
        (photocard) => photocard.admin_temporary === true || session.data!.user.role === Role.ADMIN,
    );

    try {
        await sql`
            CALL sp_update_collection_with_photocards(
                ${collectionId},
                ${JSON.stringify(collection)},
                ${JSON.stringify(mappedPhotocards)},
                ${session.data!.user.id},
                ${session.data!.user.role}
            )
        `.execute(db);

        updateTag(CACHE_TAG_COLLECTIONS);
        return { data: true };
    } catch (e) {
        return { error: `Could not update collection: ${e}` };
    }
}

export async function getPhotocardFromDB(id: number): Promise<Result<Selectable<Photocards>>> {
    return await db
        .selectFrom("photocards")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirstOrThrow()
        .then(
            (pc) => ({ data: pc }),
            (reason) => ({
                error: "Could not fetch photocard: " + reason,
            }),
        );
}

export async function updatePhotocardInDB(id: number, imageId: string, backImageId: string): Promise<Result<boolean>> {
    return await db
        .updateTable("photocards")
        .set({
            image_id: imageId,
            back_image_id: backImageId,
        })
        .where("id", "=", id)
        .where("mod_temporary", "=", true) // Only if the photocard is marked temporary
        .executeTakeFirstOrThrow()
        .then(
            () => {
                updateTag(CACHE_TAG_HOME_STATS);
                return { data: true };
            },
            (reason) => ({
                error: "Could not update photocard: " + reason,
            }),
        );
}

async function verifyTurnstile(token: string): Promise<Result<boolean>> {
    try {
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: new URLSearchParams({
                secret: process.env.TURNSTILE_SECRET_KEY,
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
 * @param withImage Whether to submit an image
 * @param turnstileToken Captcha
 * @returns If an image was provided, returns the pre-signed URL and image ID for uploading. Null if no image was provided.
 */
export async function addReportToDB(
    report: Insertable<Reports>,
    withImage: boolean,
    turnstileToken: string,
): Promise<Result<PresignedUrl | null>> {
    // Check captcha
    const turnstileResult = await verifyTurnstile(turnstileToken);
    if (turnstileResult.error) {
        return turnstileResult;
    }

    // Fetch the pre-signed URL
    let presignUrl: PresignedUrl | null = null;
    if (withImage) {
        const { signature, params } = generateSignedUploadUrl(false);
        report.image_id = params.public_id;
        presignUrl = { signature, params };
    }

    const result = await db
        .insertInto("reports")
        .values(report)
        .returning("id")
        .executeTakeFirstOrThrow()
        .then(
            (result) => {
                if (result.id === undefined) {
                    return { error: "Could not add report to database." };
                }
                return { data: null };
            },
            (reason) => ({
                error: "Could not add report to database.",
            }),
        );

    if (result.error || !report.image_id) {
        return result;
    }

    // Return the pre-signed URL
    return { data: presignUrl };
}

async function getMostContributionsUser(): Promise<Result<Selectable<UserData>>> {
    const result: Result<Selectable<ViewMostContributions>> = await db
        .selectFrom("view_most_contributions")
        .selectAll()
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: "Could not fetch most contributions user: " + reason,
            }),
        );

    if (result.error) {
        return result;
    }
    if (!result.data || result.data.image_contributor_id === null) {
        return { error: "Could not fetch most contributions user" };
    }

    return getUserDataFromDB(result.data.image_contributor_id);
}

async function getMostOwnedPhotocard(): Promise<Result<Selectable<Photocards>>> {
    const photocardData: Result<Selectable<ViewMostOwnedPhotocards>> = await db
        .selectFrom("view_most_owned_photocards")
        .selectAll()
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data }),
            (reason) => ({
                error: "Could not fetch most owned photocard data: " + reason,
            }),
        );
    if (photocardData.error) {
        return photocardData;
    }
    if (!photocardData.data || photocardData.data.photocard_id === null) {
        return { error: "Could not fetch most owned photocard data." };
    }

    return getPhotocardFromDB(photocardData.data.photocard_id);
}

async function getMostWishlistedPhotocard(): Promise<Result<Selectable<Photocards>>> {
    const photocardData: Result<Selectable<ViewMostWishlistedPhotocards>> = await db
        .selectFrom("view_most_wishlisted_photocards")
        .selectAll()
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
    if (!photocardData.data || photocardData.data.photocard_id === null) {
        return { error: "Could not fetch most wishlisted photocard data." };
    }

    return getPhotocardFromDB(photocardData.data.photocard_id);
}

async function getTotalPhotocards(): Promise<Result<number>> {
    return await db
        .selectFrom("view_db_stats")
        .select("num_photocards")
        .executeTakeFirstOrThrow()
        .then(
            (data) => {
                if (data.num_photocards === null) {
                    return { error: "Could not fetch total photocards" };
                } else {
                    return { data: data.num_photocards };
                }
            },
            (reason) => ({
                error: "Could not fetch total photocards: " + reason,
            }),
        );
}

async function getTotalPhotocardsWithoutImages(): Promise<Result<number>> {
    return await db
        .selectFrom("view_db_stats")
        .select("num_photocards_without_images")
        .executeTakeFirstOrThrow()
        .then(
            (data) => {
                if (data.num_photocards_without_images === null) {
                    return { error: "Could not fetch total photocards without images" };
                } else {
                    return { data: data.num_photocards_without_images };
                }
            },
            (reason) => ({
                error: "Could not fetch total photocards without images: " + reason,
            }),
        );
}

async function getRecentlyAddedPhotocardsInDB(): Promise<Result<Selectable<Photocards>[]>> {
    return await db
        .selectFrom("photocards")
        .selectAll()
        .where("image_id", "is not", null)
        .orderBy("updated_at", "desc")
        .limit(NUM_HOME_PHOTOCARDS)
        .execute()
        .then(
            (cards) => ({ data: cards }),
            (reason) => ({
                error: "Could not fetch recently added photocards: " + reason,
            }),
        );
}

export async function getHomeStats(): Promise<Result<HomeStats>> {
    "use cache";
    cacheTag(CACHE_TAG_HOME_STATS);
    const results = await Promise.all([
        getMostContributionsUser(),
        getTotalPhotocards(),
        getTotalPhotocardsWithoutImages(),
        getRecentlyAddedPhotocardsInDB(),
    ]);
    if (results.some((result) => result.error) || results.some((result) => !result.data)) {
        return { error: "Could not fetch home stats" };
    }
    return {
        data: {
            mostContributionsUser: results[0].data!,
            totalPhotocards: results[1].data!,
            totalPhotocardsWithoutImages: results[2].data!,
            recentlyAddedPhotocards: results[3].data!,
        },
    };
}

export async function getPhotocardsInCollection(collectionId: number): Promise<Result<Selectable<Photocards>[]>> {
    return await db
        .selectFrom("photocards")
        .selectAll()
        .where("collection_id", "=", collectionId)
        .execute()
        .then(
            (cards) => ({ data: cards }),
            (reason) => ({
                error: "Could not fetch photocards in collection: " + reason,
            }),
        );
}

export async function getPhotocardsInDB(
    query: SearchQuery,
    lastId: number | null = null,
): Promise<Result<{ cards: Selectable<Photocards>[]; query: string }>> {
    let queryBuilder = db.selectFrom("photocards").selectAll();

    if (query.collectionIds.length > 0) {
        queryBuilder = queryBuilder.where("collection_id", "in", query.collectionIds);
    }
    if (query.cardTypeIds.length > 0) {
        queryBuilder = queryBuilder.where("card_type", "in", query.cardTypeIds);
    }
    if (query.sizeIds.length > 0) {
        queryBuilder = queryBuilder.where("size_id", "in", query.sizeIds);
    }
    if (query.exclusiveCountryIds.length > 0) {
        queryBuilder = queryBuilder.where("exclusive_country", "in", query.exclusiveCountryIds);
    }
    if (query.members.length > 0) {
        if (!query.members.includes(MemberToIntWithOT7.OT7)) {
            // Don't include group cards unless asked to
            queryBuilder = queryBuilder.where(sql<boolean>`NOT members @> ARRAY[${sql.join(MemberInts)}]::integer[]`);
        }

        if (query.members.includes(MemberToIntWithOT7.OT7) && query.members.length === 1) {
            // If only asked for OT7, include group cards only
            queryBuilder = queryBuilder.where(sql<boolean>`members @> ARRAY[${sql.join(MemberInts)}]::integer[]`);
        } else {
            // Otherwise, include cards with any of the members
            const remainingMembers = query.members.filter((member) => member !== MemberToIntWithOT7.OT7);
            queryBuilder = queryBuilder.where(sql<boolean>`members && ARRAY[${sql.join(remainingMembers)}]::integer[]`);
        }
    }

    // Ordering
    switch (query.sortBy) {
        case SortType.ReleaseDateAsc:
        case SortType.ReleaseDateDesc:
            // Nothing to do for these, handled on client side (with collection release dates)
            if (query.collectionIds.length === 0) {
                return { error: "Release date sorting requires at least one collection filter." };
            } else if (query.collectionIds.length > NUM_LOAD_COLLECTIONS) {
                return {
                    error: `Cannot load more than ${NUM_LOAD_COLLECTIONS} collections when sorting by release date.`,
                };
            }
            break;
        case SortType.DateAddedAsc:
            if (lastId !== null) {
                queryBuilder = queryBuilder.where("id", ">", lastId);
            }
            queryBuilder = queryBuilder.orderBy("id", "asc").limit(NUM_LOAD_PHOTOCARDS);
            break;
        case SortType.DateAddedDesc:
            if (lastId !== null) {
                queryBuilder = queryBuilder.where("id", "<", lastId);
            }
            queryBuilder = queryBuilder.orderBy("id", "desc").limit(NUM_LOAD_PHOTOCARDS);
            break;
        default:
            return { error: "Invalid sort type." };
    }

    const queryString = queryBuilder.compile().sql;
    return { data: { cards: await queryBuilder.execute(), query: queryString } };
}

export async function getUserProfileDataFromDB(id: string): Promise<Result<Selectable<UserData>>> {
    return db
        .selectFrom("user_data")
        .selectAll()
        .where("user_id", "=", id)
        .executeTakeFirstOrThrow()
        .then(
            (data): Result<Selectable<UserData>> => ({ data }),
            (reason): Result<Selectable<UserData>> => ({ error: "Could not fetch user data: " + reason }),
        );
}

export async function updateUserDataInDB(
    userData: Updateable<UserData>,
    withImage: boolean,
): Promise<Result<PresignedUrl | null>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }
    if (session.data!.user.id !== userData.user_id) {
        return { error: "You do not have permission to update this user's data." };
    }

    // Check formatting
    if (userData.username) {
        if (userData.username.length > MAX_USERNAME_LENGTH) {
            return { error: `Username exceeds ${MAX_USERNAME_LENGTH} characters.` };
        }
        if (!USERNAME_REGEX.test(userData.username)) {
            return { error: USERNAME_ERROR_TEXT };
        }
    }
    if (userData.description && userData.description.length > MAX_DESCRIPTION_LENGTH) {
        return { error: `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters.` };
    }
    if (userData.bcd_id && userData.bcd_id.length > MAX_EXTERNAL_SITE_USERNAME_LENGTH) {
        return { error: `BCD ID exceeds ${MAX_EXTERNAL_SITE_USERNAME_LENGTH} characters.` };
    }
    if (userData.bluesky_id && userData.bluesky_id.length > MAX_EXTERNAL_SITE_USERNAME_LENGTH) {
        return { error: `Bluesky ID exceeds ${MAX_EXTERNAL_SITE_USERNAME_LENGTH} characters.` };
    }
    if (userData.twitter_id && userData.twitter_id.length > MAX_EXTERNAL_SITE_USERNAME_LENGTH) {
        return { error: `Twitter ID exceeds ${MAX_EXTERNAL_SITE_USERNAME_LENGTH} characters.` };
    }
    if (userData.instagram_id && userData.instagram_id.length > MAX_EXTERNAL_SITE_USERNAME_LENGTH) {
        return { error: `Instagram ID exceeds ${MAX_EXTERNAL_SITE_USERNAME_LENGTH} characters.` };
    }
    if (userData.discord_id && userData.discord_id.length > MAX_EXTERNAL_SITE_USERNAME_LENGTH) {
        return { error: `Discord ID exceeds ${MAX_EXTERNAL_SITE_USERNAME_LENGTH} characters.` };
    }
    if (userData.spotify_playlist && userData.spotify_playlist.length !== SPOTIFY_PLAYLIST_ID_LENGTH) {
        return { error: `Spotify playlist ID must be ${SPOTIFY_PLAYLIST_ID_LENGTH} characters.` };
    }

    // Fetch the pre-signed URL
    let presignUrl: PresignedUrl | null = null;
    if (withImage) {
        const { signature, params } = generateSignedUploadUrl(false);
        userData.image_id = params.public_id;
        presignUrl = { signature, params };
    }

    const result: Result<null> = await db
        .updateTable("user_data")
        .set(userData)
        .where("user_id", "=", userData.user_id)
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: null }),
            (reason) => ({ error: "Could not update user data: " + reason }),
        );

    if (result.error || !presignUrl) {
        return result;
    }

    // Return the pre-signed URL
    return { data: presignUrl };
}

export async function doesUserOwnPhotocard(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    return await db
        .selectFrom("user_photocards")
        .select("photocard_id")
        .where("user_id", "=", session.data!.user.id)
        .where("photocard_id", "=", photocardId)
        .executeTakeFirst()
        .then(
            (data) => ({ data: data !== undefined }),
            (reason) => ({ error: "Could not check if user owns photocard: " + reason }),
        );
}

export async function didUserWishlistPhotocard(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    return await db
        .selectFrom("user_wishlists")
        .select("photocard_id")
        .where("user_id", "=", session.data!.user.id)
        .where("photocard_id", "=", photocardId)
        .executeTakeFirst()
        .then(
            (data) => ({ data: data !== undefined }),
            (reason) => ({ error: "Could not check if user wishlist photocard: " + reason }),
        );
}

/**
 * Also deletes photocard from wishlist if it exists
 * @param photocardId
 * @returns
 */
export async function addPhotocardToOwned(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    const result: [Result<boolean>, Result<boolean>] = await Promise.all([
        db
            .insertInto("user_photocards")
            .values({ user_id: session.data!.user.id, photocard_id: photocardId })
            .executeTakeFirstOrThrow()
            .then(
                (data) => ({ data: true }),
                (reason) => ({ error: "Could not add photocard to owned: " + reason }),
            ),
        removePhotocardFromWishlist(photocardId),
    ]);

    if (result[0].error || result[1].error) {
        return { error: result[0].error || result[1].error! };
    }
    return { data: true };
}

export async function addPhotocardToWishlist(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    return await db
        .insertInto("user_wishlists")
        .values({ user_id: session.data!.user.id, photocard_id: photocardId })
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: true }),
            (reason) => ({ error: "Could not add photocard to wishlist: " + reason }),
        );
}

export async function removePhotocardFromOwned(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    return await db
        .deleteFrom("user_photocards")
        .where("user_id", "=", session.data!.user.id)
        .where("photocard_id", "=", photocardId)
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: true }),
            (reason) => ({ error: "Could not remove photocard from owned: " + reason }),
        );
}

export async function removePhotocardFromWishlist(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    return await db
        .deleteFrom("user_wishlists")
        .where("user_id", "=", session.data!.user.id)
        .where("photocard_id", "=", photocardId)
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: true }),
            (reason) => ({ error: "Could not remove photocard from wishlist: " + reason }),
        );
}

export async function markPhotocardAsFavorite(photocardId: number): Promise<Result<boolean>> {
    const session = await getSession();
    if (session.error) {
        return { error: session.error };
    }

    return await db
        .updateTable("user_data")
        .set({ profile_photocard_id: photocardId })
        .where("user_id", "=", session.data!.user.id)
        .executeTakeFirstOrThrow()
        .then(
            (data) => ({ data: true }),
            (reason) => ({ error: "Could not mark photocard as favorite: " + reason }),
        );
}
