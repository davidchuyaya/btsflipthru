"use server";

import sharp from "sharp";

export async function convertToAvif(arrayBuffer: ArrayBuffer): Promise<string> {
    const buffer = Buffer.from(arrayBuffer);
    const data = await sharp(buffer)
        .avif()
        .toBuffer();
    
    const base64Encoded = data.toString("base64");
    return `data:image/avif;base64,${base64Encoded}`;
}
