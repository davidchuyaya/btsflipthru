"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CardSize, CardType, CollectionType, ParsedCollection, Photocard, serializeCollection } from "@/db";
import {
    addCardSizeToDB,
    addCardTypeToDB,
    addCollectionToDB,
    addCollectionTypeToDB,
    getCardSizesFromDB,
    getCardTypesFromDB,
    getCollectionsFromDB,
    getCollectionTypesFromDB,
} from "@/actions";
import { invokeOrError } from "./actions-client";

interface MetadataContextType {
    collections: ParsedCollection[];
    collectionTypes: CollectionType[];
    cardTypes: CardType[];
    cardSizes: CardSize[];
    isLoading: boolean;
    error: string | null;
    addCollection: (collection: ParsedCollection, photocards: Photocard[]) => Promise<boolean>;
    addCollectionType: (collectionType: CollectionType) => Promise<boolean>;
    addCardType: (cardType: CardType) => Promise<boolean>;
    addCardSize: (cardSize: CardSize) => Promise<boolean>;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({ children }: { children: ReactNode }) {
    const [collections, setCollections] = useState<ParsedCollection[]>([]);
    const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
    const [cardTypes, setCardTypes] = useState<CardType[]>([]);
    const [cardSizes, setCardSizes] = useState<CardSize[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetadata() {
            try {
                const [collections, types, cardTypesData, sizes] = await Promise.all([
                    getCollectionsFromDB(),
                    getCollectionTypesFromDB(),
                    getCardTypesFromDB(),
                    getCardSizesFromDB(),
                ]);
                setCollections(collections);
                setCollectionTypes(types);
                setCardTypes(cardTypesData);
                setCardSizes(sizes);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load metadata");
            } finally {
                setIsLoading(false);
            }
        }

        fetchMetadata();
    }, []);

    async function addCollection(collection: ParsedCollection, photocards: Photocard[]) {
        const result = await invokeOrError(addCollectionToDB(serializeCollection(collection), photocards));
        if (typeof result === "boolean") {
            setCollections((prev) => [...prev, collection]);
            setError(null);
            return true;
        }
        else {
            setError(result.error);
            return false;
        }
    }

    async function addCollectionType(collectionType: CollectionType) {
        const result = await invokeOrError(addCollectionTypeToDB(collectionType));
        if (typeof result === "bigint") {
            collectionType.id = Number(result);
            setCollectionTypes((prev) => [...prev, collectionType]);
            setError(null);
            return true;
        }
        else {
            if (!result) {
                setError("Unknown error adding collection type");
            }
            else {
                setError(result.error);
            }
            return false;
        }
    }

    async function addCardType(cardType: CardType) {
        const result = await invokeOrError(addCardTypeToDB(cardType));
        if (typeof result === "bigint") {
            cardType.id = Number(result);
            setCardTypes((prev) => [...prev, cardType]);
            setError(null);
            return true;
        }
        else {
            if (!result) {
                setError("Unknown error adding card type");
            }
            else {
                setError(result.error);
            }
            return false;
        }
    }

    async function addCardSize(cardSize: CardSize) {
        const result = await invokeOrError(addCardSizeToDB(cardSize));
        if (typeof result === "bigint") {
            cardSize.id = Number(result);
            setCardSizes((prev) => [...prev, cardSize]);
            setError(null);
            return true;
        }
        else {
            if (!result) {
                setError("Unknown error adding card size");
            }
            else {
                setError(result.error);
            }
            return false;
        }
    }

    return (
        <MetadataContext.Provider
            value={{
                collections,
                collectionTypes,
                cardTypes,
                cardSizes,
                isLoading,
                error,
                addCollection,
                addCollectionType,
                addCardType,
                addCardSize,
            }}
        >
            {children}
        </MetadataContext.Provider>
    );
}

export function useMetadata() {
    const context = useContext(MetadataContext);
    if (context === undefined) {
        throw new Error("useMetadata must be used within a MetadataProvider");
    }
    return context;
}
