"use server";

import { errorIfLessPrivilegedThanMod, getSession } from "@/auth";
import { db, Set, Photocard, SetType, CardType, CardSize, CardToCardType } from "@/db";
import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_HEIGHT_PX } from "@/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import sharp from "sharp";
import { get } from "http";

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

async function convertToAvif(arrayBuffer: ArrayBuffer): Promise<{ fullSize: string; thumbnail: string }> {
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

export async function uploadImage(image: ArrayBuffer, id: string) {
    await errorIfLessPrivilegedThanMod();
    const convertedImage = await convertToAvif(image);

    // Do not allow overwriting existing images
    // Note: The check and put race. That's fine; malicious uploads to the same UUID will just overwrite each other, and otherwise UUIDs are unlikely to collide.
    const r2 = getR2();
    await r2.head(`${id}_fullSize`).then((existing) => {
        if (existing) {
            throw new Error("Image with the same ID already exists.");
        }
    });

    await Promise.all([
        r2.put(`${id}_fullSize`, convertedImage.fullSize),
        r2.put(`${id}_thumbnail`, convertedImage.thumbnail),
    ]);
}

export async function createSetInDB(
    set: Set,
    setTypes: number[],
    photocards: Photocard[],
    cardTypes: number[][] // Array of card type IDs for each photocard
) {
    await errorIfLessPrivilegedThanMod();

    if (cardTypes.length !== photocards.length) {
        throw new Error("Each photocard must have a corresponding array of card types.");
    }

    const date = Date.now();
    const database = getDb();
    // Insert the set, get its ID
    const setId = await database
        .insertInto("sets")
        .values(set)
        .executeTakeFirstOrThrow()
        .then((result) => Number(result.insertId));

    // Link set to set types
    if (setTypes.length > 0) {
        const setToSetTypeValues = setTypes.map((setTypeId) => ({
            setId: setId,
            setTypeId: setTypeId,
        }));
        await Promise.all(
            setToSetTypeValues.map(async (setToSetType) => {
                return database
                    .insertInto("setToSetTypes")
                    .values(setToSetType)
                    .executeTakeFirstOrThrow();
            }
        ));
    }

    if (photocards.length === 0) {
        return;
    }

    // Insert the photocards, linking them to the set and fixing any placeholder data
    const session = await getSession();
    for (const photocard of photocards) {
        photocard.setId = setId!;
        photocard.imageContributorId = session.user.id;
        photocard.updatedAt = date;
    }
    const photocardIds = await Promise.all(
        photocards.map(async (photocard) => {
            return database
                .insertInto("photocards")
                .values(photocard)
                .executeTakeFirstOrThrow()
                .then((result) => Number(result.insertId));
        })
    );

    // Link card to card types
    const allCardToCardTypeValues: CardToCardType[] = [];
    for (let i = 0; i < photocardIds.length; i++) {
        const cardToCardTypeValues = cardTypes[i].map((typeId) => ({
            cardId: photocardIds[i],
            cardTypeId: typeId,
        }));
        allCardToCardTypeValues.push(...cardToCardTypeValues);
    }
    if (allCardToCardTypeValues.length > 0) {
        await Promise.all(
            allCardToCardTypeValues.map(async (cardToCardType) => {
                return database
                    .insertInto("cardToCardTypes")
                    .values(cardToCardType)
                    .executeTakeFirstOrThrow();
            })
        );
    }
}
