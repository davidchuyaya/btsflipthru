"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
    CardSize,
    CardType,
    CollectionType,
    DEFAULT_CARD_TYPE,
    ParsedCollection,
    Photocard,
    serializeCollection,
} from "@/db";
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
import { ReportType, reportWindowURL, CACHE_DURATION_MS } from "@/constants";
import { authClient, ClientSession, isAtLeastMod } from "@/auth-client";
import { toast } from "sonner";

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
    collections: ParsedCollection[];
    collectionTypes: CollectionType[];
    cardTypes: CardType[];
    cardSizes: CardSize[];
    isLoading: boolean;
    addCollection: (collection: ParsedCollection, photocards: Photocard[]) => Promise<boolean>;
    addCollectionType: (collectionType: CollectionType) => Promise<number | undefined>;
    addCardType: (cardType: CardType) => Promise<number | undefined>;
    addCardSize: (cardSize: CardSize) => Promise<number | undefined>;
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
    collections: ParsedCollection[] | null;
    collectionTypes: CollectionType[] | null;
    cardTypes: CardType[] | null;
    cardSizes: CardSize[] | null;
    hasAll: boolean;
} {
    const collections = getFromStorage<ParsedCollection[]>(STORAGE_KEYS.collections);
    const collectionTypes = getFromStorage<CollectionType[]>(STORAGE_KEYS.collectionTypes);
    const cardTypes = getFromStorage<CardType[]>(STORAGE_KEYS.cardTypes);
    const cardSizes = getFromStorage<CardSize[]>(STORAGE_KEYS.cardSizes);

    return {
        collections,
        collectionTypes,
        cardTypes,
        cardSizes,
        hasAll: !!(collections && collectionTypes && cardTypes && cardSizes),
    };
}

function saveToStorage(
    collections: ParsedCollection[],
    collectionTypes: CollectionType[],
    cardTypes: CardType[],
    cardSizes: CardSize[],
): void {
    setToStorage(STORAGE_KEYS.collections, collections);
    setToStorage(STORAGE_KEYS.collectionTypes, collectionTypes);
    setToStorage(STORAGE_KEYS.cardTypes, cardTypes);
    setToStorage(STORAGE_KEYS.cardSizes, cardSizes);
    setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
}

export function MetadataProvider({ children }: { children: ReactNode }) {
    const [collections, setCollections] = useState<ParsedCollection[]>([]);
    const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
    const [cardTypes, setCardTypes] = useState<CardType[]>([]);
    const [cardSizes, setCardSizes] = useState<CardSize[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const {
        data: session,
        isPending: sessionIsPending, //loading state
        error: sessionError, //error object
        refetch: sessionRefetch, //refetch the session
    } = authClient.useSession();

    function setCardTypesWithDefault(types: CardType[]) {
        setCardTypes([DEFAULT_CARD_TYPE, ...types]);
    }

    useEffect(() => {
        async function fetchMetadata() {
            // Try to load from localStorage first
            const cached = loadFromStorage();

            if (cached.collections) setCollections(cached.collections);
            if (cached.collectionTypes) setCollectionTypes(cached.collectionTypes);
            if (cached.cardTypes) setCardTypesWithDefault(cached.cardTypes);
            if (cached.cardSizes) setCardSizes(cached.cardSizes);

            // If cache is valid, don't fetch from DB
            if (cached.hasAll && isCacheValid()) {
                setIsLoading(false);
                return;
            }

            const [collectionsData, types, cardTypesData, sizes] = await Promise.all([
                getCollectionsFromDB(),
                getCollectionTypesFromDB(),
                getCardTypesFromDB(),
                getCardSizesFromDB(),
            ]);
            setCollections(collectionsData);
            setCollectionTypes(types);
            setCardTypesWithDefault(cardTypesData);
            setCardSizes(sizes);

            // Save to localStorage
            saveToStorage(collectionsData, types, cardTypesData, sizes);
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
            if (cached.cardTypes) setCardTypesWithDefault(cached.cardTypes);
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

    async function addCollection(collection: ParsedCollection, photocards: Photocard[]) {
        const allowed = isAtLeastMod(session);
        if (!allowed) {
            setError("Not authorized to add collection");
            return false;
        }

        const result = await addCollectionToDB(serializeCollection(collection), photocards);
        if (result.error) {
            setError(`Server error: ${result.error}`);
            return false;
        } else {
            collection.id = Number(result.data);
            const newCollections = [...collections, collection];
            setCollections(newCollections);
            setToStorage(STORAGE_KEYS.collections, newCollections);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return true;
        }
    }

    async function addCollectionType(collectionType: CollectionType) {
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
            const newCollectionTypes = [...collectionTypes, collectionType];
            console.log(`New collection types: ${JSON.stringify(newCollectionTypes)}`);
            setCollectionTypes(newCollectionTypes);
            setToStorage(STORAGE_KEYS.collectionTypes, newCollectionTypes);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return collectionType.id!;
        }
    }

    async function addCardType(cardType: CardType) {
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
            const newCardTypes = [...cardTypes, cardType];
            setCardTypesWithDefault(newCardTypes);
            setToStorage(STORAGE_KEYS.cardTypes, newCardTypes);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return cardType.id!;
        }
    }

    async function addCardSize(cardSize: CardSize) {
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
            const newCardSizes = [...cardSizes, cardSize];
            setCardSizes(newCardSizes);
            setToStorage(STORAGE_KEYS.cardSizes, newCardSizes);
            setToStorage(STORAGE_KEYS.lastUpdated, Date.now());
            return cardSize.id!;
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
