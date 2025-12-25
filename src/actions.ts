"use server";

import { errorIfLessPrivilegedThanMod } from "@/auth";
import { db, Set, Photocard, SetType, CardType, CardSize } from "@/db";
import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_HEIGHT_PX } from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import sharp from "sharp";

function getDb() {
    const { env } = getCloudflareContext();
    return db(env as Env);
}

/**
 *
 * @param setType Only the name field is used
 * @returns The auto-assigned ID of the set type. Output is undefined if error occurs
 */
export async function addSetTypeToDB(setType: SetType) {
    await errorIfLessPrivilegedThanMod();
    return await getDb()
        .insertInto("setTypes")
        .values({ name: setType.name })
        .executeTakeFirst()
        .then((result) => result.insertId);
}

export async function getSetTypesFromDB(): Promise<SetType[]> {
    const database = getDb();
    return await database.selectFrom("setTypes").selectAll().execute();
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

function avifBufferToString(data: Buffer): string {
    const base64Encoded = data.toString("base64");
    return `data:image/avif;base64,${base64Encoded}`;
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

async function convertToAvif(
    arrayBuffer: ArrayBuffer
): Promise<{ fullSize: string; thumbnail: string }> {
    const buffer = Buffer.from(arrayBuffer);

    // Do not convert if the image is greater than MAX_IMAGE_SIZE_BYTES
    if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("Image size exceeds 50MB limit.");
    }

    const avif = sharp(buffer).avif();
    const fullSize = await avif.clone().toBuffer();
    const thumbnail = await avif
        .resize({ height: THUMBNAIL_HEIGHT_PX })
        .toBuffer();

    return {
        fullSize: avifBufferToString(fullSize),
        thumbnail: avifBufferToString(thumbnail),
    };
}

export async function uploadImage(env: Env, image: ArrayBuffer, id: string) {
    await errorIfLessPrivilegedThanMod();
    const convertedImage = await convertToAvif(image);

    await Promise.all([
        env.images.put(`${id}_fullSize`, convertedImage.fullSize),
        env.images.put(`${id}_thumbnail`, convertedImage.thumbnail),
    ]);
}

export async function createSetInDB(
    set: Set,
    photocards: Photocard[]
): Promise<void | { error: string }> {
    await errorIfLessPrivilegedThanMod();

    const database = getDb();
    return await database.transaction().execute(async (trx) => {
        await trx.insertInto("sets").values(set).execute();
        for (const photocard of photocards) {
            await trx.insertInto("photocards").values(photocard).execute();
        }
    });
}
