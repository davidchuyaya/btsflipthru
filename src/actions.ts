"use server";

import { errorIfLessPrivilegedThanMod } from "@/auth";
import { db, Set, Photocard } from "@/db";
import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_HEIGHT_PX } from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import sharp from "sharp";

function getDb() {
    const { env } = getCloudflareContext();
    return db(env as Env);
}

export async function getSetTypesFromDB() {
    const database = getDb();
    return await database.selectFrom("setTypes").selectAll().execute();
}

export async function addSetTypeToDB(name: string) {
    await errorIfLessPrivilegedThanMod();
    const database = getDb();
    const id = crypto.randomUUID();
    const result = await database.insertInto("setTypes").values({ id, name }).execute()
        .then(() => { return null; },
            (e) => { return `Failed to add set type: ${e.message}`; });
    return {
        id: id,
        error: result,
    };
}

export async function getCardTypesFromDB() {
    const database = getDb();
    return await database.selectFrom("cardTypes").selectAll().execute();
}

export async function addCardTypeToDB(name: string) {
    await errorIfLessPrivilegedThanMod();
    const database = getDb();
    const id = crypto.randomUUID();
    const result = await database.insertInto("cardTypes").values({ id, name }).execute()
        .then(() => { return null; },
            (e) => { return `Failed to add card type: ${e.message}`; });
    return {
        id: id,
        error: result,
    };
}

function avifBufferToString(data: Buffer): string {
    const base64Encoded = data.toString("base64");
    return `data:image/avif;base64,${base64Encoded}`;
}

async function convertToAvif(arrayBuffer: ArrayBuffer): Promise<{ fullSize: string, thumbnail: string }> {
    const buffer = Buffer.from(arrayBuffer);

    // Do not convert if the image is greater than MAX_IMAGE_SIZE_BYTES
    if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("Image size exceeds 50MB limit.");
    }

    const avif = sharp(buffer).avif();
    const fullSize = await avif.clone().toBuffer();
    const thumbnail = await avif.resize({ height: THUMBNAIL_HEIGHT_PX }).toBuffer();

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
        env.images.put(`${id}_thumbnail`, convertedImage.thumbnail)
    ]);
}

export async function createSetInDB(set: Set, photocards: Photocard[]): Promise<void | { error: string }> {
    await errorIfLessPrivilegedThanMod();

    const database = getDb();
    return await database.transaction().execute(async (trx) => {
        await trx.insertInto("sets").values(set).execute();
        for (const photocard of photocards) {
            await trx.insertInto("photocards").values(photocard).execute();
        }
    });
}

