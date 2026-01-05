"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    addCardSizeToDB,
    addCardTypeToDB,
    addCollectionToDB,
    addCollectionTypeToDB,
    getMetadataFromDB,
    updateCollectionInDB,
} from "@/actions";
import { ReportType, reportWindowURL, CACHE_DURATION_MS } from "@/constants";
import { authClient, ClientSession, isAtLeastMod } from "@/auth-client";
import { toast } from "sonner";
import { Collections, CollectionTypes, CardTypes, CardSizes, Photocards } from "./db";
import { Insertable, Selectable } from "kysely";

const STORAGE_KEYS = {
    collections: "metadata_collections",
    collectionTypes: "metadata_collectionTypes",
    cardTypes: "metadata_cardTypes",
    cardSizes: "metadata_cardSizes",
    lastUpdated: "metadata_lastUpdated",
} as const;

interface MetadataContextType {
    session: ClientSession;
    sessionRefetch: () => Promise<void>;
    collections: Selectable<Collections>[];
    collectionTypes: Selectable<CollectionTypes>[];
    cardTypes: Selectable<CardTypes>[];
    cardSizes: Selectable<CardSizes>[];
    isLoading: boolean;
    addCollection: (collection: Insertable<Collections>, photocards: Insertable<Photocards>[]) => Promise<boolean>;
    updateCollection: (
        collectionId: number,
        collection: Insertable<Collections>,
        photocards: Insertable<Photocards>[],
    ) => Promise<boolean>;
    addCollectionType: (collectionType: Insertable<CollectionTypes>) => Promise<number | undefined>;
    addCardType: (cardType: Insertable<CardTypes>) => Promise<number | undefined>;
    addCardSize: (cardSize: Insertable<CardSizes>) => Promise<number | undefined>;
    setError: (message: string) => void;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

function getFromStorage<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
}

function setToStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage might be full or unavailable
    }
}

function isCacheValid(): boolean {
    const lastUpdated = getFromStorage<number>(STORAGE_KEYS.lastUpdated);
    if (!lastUpdated) return false;
    return Date.now() - lastUpdated < CACHE_DURATION_MS;
}

function loadFromStorage(): {
    collections: Selectable<Collections>[] | null;
    collectionTypes: Selectable<CollectionTypes>[] | null;
    cardTypes: Selectable<CardTypes>[] | null;
    cardSizes: Selectable<CardSizes>[] | null;
    hasAll: boolean;
} {
    const collections = getFromStorage<Selectable<Collections>[]>(STORAGE_KEYS.collections);
    const collectionTypes = getFromStorage<Selectable<CollectionTypes>[]>(STORAGE_KEYS.collectionTypes);
    const cardTypes = getFromStorage<Selectable<CardTypes>[]>(STORAGE_KEYS.cardTypes);
    const cardSizes = getFromStorage<Selectable<CardSizes>[]>(STORAGE_KEYS.cardSizes);

    return {
        collections,
        collectionTypes,
        cardTypes,
        cardSizes,
        hasAll: !!(collections && collectionTypes && cardTypes && cardSizes),
    };
}

function saveToStorage(
    collections: Selectable<Collections>[],
    collectionTypes: Selectable<CollectionTypes>[],
    cardTypes: Selectable<CardTypes>[],
    cardSizes: Selectable<CardSizes>[],
): void {
    setToStorage(STORAGE_KEYS.collections, collections);
    setToStorage(STORAGE_KEYS.collectionTypes, collectionTypes);
    setToStorage(STORAGE_KEYS.cardTypes, cardTypes);
    setToStorage(STORAGE_KEYS.cardSizes, cardSizes);
    setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
}

export function MetadataProvider({ children }: { children: ReactNode }) {
    const [collections, setCollections] = useState<Selectable<Collections>[]>([]);
    const [collectionTypes, setCollectionTypes] = useState<Selectable<CollectionTypes>[]>([]);
    const [cardTypes, setCardTypes] = useState<Selectable<CardTypes>[]>([]);
    const [cardSizes, setCardSizes] = useState<Selectable<CardSizes>[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const {
        data: session,
        isPending: sessionIsPending, //loading state
        error: sessionError, //error object
        refetch: sessionRefetch, //refetch the session
    } = authClient.useSession();

    useEffect(() => {
        async function fetchMetadata() {
            // Try to load from localStorage first
            const cached = loadFromStorage();

            if (cached.collections) setCollections(cached.collections);
            if (cached.collectionTypes) setCollectionTypes(cached.collectionTypes);
            if (cached.cardTypes) setCardTypes(cached.cardTypes);
            if (cached.cardSizes) setCardSizes(cached.cardSizes);

            // If cache is valid, don't fetch from DB
            if (cached.hasAll && isCacheValid()) {
                setIsLoading(false);
                return;
            }

            const { cardSizes, collectionTypes, cardTypes, collections } = await getMetadataFromDB();
            setCollections(collections);
            setCollectionTypes(collectionTypes);
            setCardTypes(cardTypes);
            setCardSizes(cardSizes);

            // Save to localStorage
            saveToStorage(collections, collectionTypes, cardTypes, cardSizes);
            setIsLoading(false);
        }

        fetchMetadata();
    }, []);

    // Listen for storage changes from other tabs
    useEffect(() => {
        function handleStorageChange(event: StorageEvent) {
            if (
                !event.key ||
                !Object.values(STORAGE_KEYS).includes(event.key as (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS])
            ) {
                return;
            }

            // Reload all metadata from storage when any metadata key changes
            const cached = loadFromStorage();
            if (cached.collections) setCollections(cached.collections);
            if (cached.collectionTypes) setCollectionTypes(cached.collectionTypes);
            if (cached.cardTypes) setCardTypes(cached.cardTypes);
            if (cached.cardSizes) setCardSizes(cached.cardSizes);
        }

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    function setError(message: string) {
        toast.error(message, {
            action: {
                label: "Report",
                onClick: () => {
                    const url = reportWindowURL(ReportType.Error, window.location.href, message);
                    window.open(url, "_blank");
                },
            },
        });
    }

    async function addCollection(collection: Insertable<Collections>, photocards: Insertable<Photocards>[]) {
        const allowed = isAtLeastMod(session);
        if (!allowed) {
            setError("Not authorized to add collection");
            return false;
        }

        const result = await addCollectionToDB(collection, photocards);
        if (result.error) {
            setError(`Server error: ${result.error}`);
            return false;
        } else {
            collection.id = Number(result.data);
            const newCollections = [...collections, collection as Selectable<Collections>];
            setCollections(newCollections);
            setToStorage(STORAGE_KEYS.collections, newCollections);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return true;
        }
    }

    async function addCollectionType(collectionType: Insertable<CollectionTypes>) {
        const allowed = isAtLeastMod(session);
        if (!allowed) {
            setError("Not authorized to add collection category");
            return;
        }

        const result = await addCollectionTypeToDB(collectionType);
        if (result.error) {
            setError(`Server error: ${result.error}`);
            return;
        } else {
            collectionType.id = Number(result.data);
            const newCollectionTypes = [...collectionTypes, collectionType as Selectable<CollectionTypes>];
            console.log(`New collection types: ${JSON.stringify(newCollectionTypes)}`);
            setCollectionTypes(newCollectionTypes);
            setToStorage(STORAGE_KEYS.collectionTypes, newCollectionTypes);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return collectionType.id!;
        }
    }

    async function addCardType(cardType: Insertable<CardTypes>) {
        const allowed = isAtLeastMod(session);
        if (!allowed) {
            setError("Not authorized to add card type");
            return;
        }

        const result = await addCardTypeToDB(cardType);
        if (result.error) {
            setError(`Server error: ${result.error}`);
            return;
        } else {
            cardType.id = Number(result.data);
            const newCardTypes = [...cardTypes, cardType as Selectable<CardTypes>];
            setCardTypes(newCardTypes);
            setToStorage(STORAGE_KEYS.cardTypes, newCardTypes);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return cardType.id!;
        }
    }

    async function addCardSize(cardSize: Insertable<CardSizes>) {
        const allowed = isAtLeastMod(session);
        if (!allowed) {
            setError("Not authorized to add card size");
            return;
        }

        const result = await addCardSizeToDB(cardSize);
        if (result.error) {
            setError(`Server error: ${result.error}`);
            return;
        } else {
            cardSize.id = Number(result.data);
            const newCardSizes = [...cardSizes, cardSize as Selectable<CardSizes>];
            setCardSizes(newCardSizes);
            setToStorage(STORAGE_KEYS.cardSizes, newCardSizes);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return cardSize.id!;
        }
    }

    async function updateCollection(
        collectionId: number,
        collection: Insertable<Collections>,
        photocards: Insertable<Photocards>[],
    ) {
        const allowed = isAtLeastMod(session);
        if (!allowed) {
            // TODO: Allow users to upload photos
            setError("Not authorized to update collection");
            return false;
        }

        const result = await updateCollectionInDB(collectionId, collection, photocards);
        if (result.error) {
            setError(`Server error: ${result.error}`);
            return false;
        } else {
            // Update local state
            const updatedCollection: Selectable<Collections> = {
                ...collection,
                id: collectionId,
                release_date: new Date(collection.release_date),
                version: collection.version ?? null,
                version_order: collection.version_order ?? null,
            };
            const newCollections = collections.map((c) => (c.id === collectionId ? updatedCollection : c));
            setCollections(newCollections);
            setToStorage(STORAGE_KEYS.collections, newCollections);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return true;
        }
    }

    return (
        <MetadataContext.Provider
            value={{
                session,
                sessionRefetch: async () => {
                    await sessionRefetch({
                        query: {
                            disableCookieCache: true,
                        },
                    });
                },
                collections,
                collectionTypes,
                cardTypes,
                cardSizes,
                isLoading,
                addCollection,
                updateCollection,
                addCollectionType,
                addCardType,
                addCardSize,
                setError,
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
