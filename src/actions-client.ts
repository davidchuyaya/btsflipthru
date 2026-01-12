"use client";

import { Insertable } from "kysely";
import {
    CLOUDINARY_API_KEY,
    CLOUDINARY_CLOUD_NAME,
    ExclusiveCountry,
    MemberToIntWithOT7,
    PresignedUrl,
    Result,
} from "./constants";
import { CardSizes } from "./db";

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export async function uploadImage(presignedUrl: PresignedUrl, image: File): Promise<Result<boolean>> {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("api_key", CLOUDINARY_API_KEY);

    formData.append("timestamp", presignedUrl.params.timestamp.toString());
    formData.append("public_id", presignedUrl.params.public_id);
    formData.append("signature", presignedUrl.signature);
    formData.append("overwrite", presignedUrl.params.overwrite.toString());
    formData.append("transformation", presignedUrl.params.transformation);

    if (presignedUrl.params.eager) {
        formData.append("eager", presignedUrl.params.eager);
    }

    return fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
    })
        .then((res) => (!res.ok ? { error: `Image upload failed: ${res.status}` } : { data: true }))
        .catch((error) => ({
            error: (error as Error).message,
        }));
}

export function createCardSizeFromString(sizeString: string): Result<Insertable<CardSizes>> {
    // Match format: "Name WidthxHeight" (e.g., "Standard 55x85")
    const match = sizeString.match(/^(.+?)\s+(\d+)\s*x\s*(\d+)$/i);
    if (!match) {
        return { error: 'Please provide dimensions in the format "Name WidthxHeight" (e.g., "Standard 55x85")' };
    }

    const name = match[1].trim();
    if (name === "") {
        return { error: "Name cannot be empty." };
    }

    const width = Number(match[2]);
    const height = Number(match[3]);
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        return { error: "Width and height must be positive numbers." };
    }
    return { data: { name, width, height } };
}

export function cardSizeToString(cardSize: Insertable<CardSizes>): string {
    return `${cardSize.name} ${cardSize.width}x${cardSize.height}`;
}

export function executeSearchLogic<T, S, CT, CS>(
    input: string,
    data: {
        tops: T[];
        subs: S[];
        cardTypes: CT[];
        cardSizes: CS[];
    },
    accessors: {
        topName: (item: T) => string;
        subName: (item: S) => string;
        cardTypeName: (item: CT) => string;
        cardSizeName: (item: CS) => string;
    },
) {
    const allTerms = input
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

    const memberEntries = Object.entries(MemberToIntWithOT7);
    const { winners: winningMembers, matchedTerms: memberMatchedTerms } = getWinnersFromTerms(
        memberEntries,
        ([name, _]) => name,
        allTerms,
    );

    // Filter out terms used by Members
    const termsAfterMembers = allTerms.filter((term) => !memberMatchedTerms.has(term));

    const { winners: winningTopCols, matchedTerms: topColMatchedTerms } = getWinnersFromTerms(
        data.tops,
        accessors.topName,
        termsAfterMembers,
    );

    const { winners: winningSubCols, matchedTerms: subColMatchedTerms } = getWinnersFromTerms(
        data.subs,
        accessors.subName,
        termsAfterMembers,
    );

    const termsAfterCollections = termsAfterMembers.filter(
        (term) => !topColMatchedTerms.has(term) && !subColMatchedTerms.has(term),
    );

    const { winners: winningCardTypes } = getWinnersFromTerms(
        data.cardTypes,
        accessors.cardTypeName,
        termsAfterCollections,
    );

    const { winners: winningCardSizes } = getWinnersFromTerms(
        data.cardSizes,
        accessors.cardSizeName,
        termsAfterCollections,
    );

    const countryEntries = Object.entries(ExclusiveCountry);
    const { winners: winningCountries } = getWinnersFromTerms(
        countryEntries,
        ([name, _]) => name,
        termsAfterCollections,
    );

    return {
        winningMembers: new Set(Array.from(winningMembers).map(([_name, val]) => val)),
        winningTopCols,
        winningSubCols,
        winningCardTypes,
        winningCardSizes,
        winningCountries: new Set(Array.from(winningCountries).map(([_name, val]) => val)),
    };
}

function countMatches(text: string, searchTerms: string[]): { matches: number; matchedTerms: Set<string> } {
    const lowerText = text.toLowerCase();
    let matches = 0;
    const matchedTerms = new Set<string>();
    for (const term of searchTerms) {
        if (lowerText.includes(term)) {
            matches++;
            matchedTerms.add(term);
        }
    }
    return { matches, matchedTerms };
}

function getWinnersFromTerms<T>(
    items: T[],
    textFn: (item: T) => string,
    availableTerms: string[],
): { winners: Set<T>; matchedTerms: Set<string> } {
    let maxScore = 0;
    const scores = new Map<T, { score: number; matched: Set<string> }>();

    for (const item of items) {
        const { matches, matchedTerms } = countMatches(textFn(item), availableTerms);
        if (matches > 0) {
            scores.set(item, { score: matches, matched: matchedTerms });
            if (matches > maxScore) maxScore = matches;
        }
    }

    let winners = new Set<T>();
    const aggregatedMatchedTerms = new Set<string>();

    if (maxScore > 0) {
        for (const [item, data] of scores) {
            if (data.score === maxScore) {
                winners.add(item);
                data.matched.forEach((t) => aggregatedMatchedTerms.add(t));
            }
        }
    } else if (availableTerms.length === 0) {
        // No matches, return all items
        winners = new Set(items);
    }
    return { winners, matchedTerms: aggregatedMatchedTerms };
}
