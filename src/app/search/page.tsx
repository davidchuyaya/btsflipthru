import { getCardSizesFromDB, getCardTypesFromDB, getCollectionsFromDB, getCollectionTypesFromDB } from "@/actions";
import SearchClient from "./search-client";

export default async function SearchPage() {
    const [collectionsRes, collectionTypesRes, cardTypesRes, cardSizesRes] = await Promise.all([
        getCollectionsFromDB(),
        getCollectionTypesFromDB(),
        getCardTypesFromDB(),
        getCardSizesFromDB(),
    ]);

    if (collectionsRes.error || collectionTypesRes.error || cardTypesRes.error || cardSizesRes.error) {
        throw new Error("Failed to load data for search page");
    }

    return (
        <SearchClient
            collections={collectionsRes.data!}
            collectionTypes={collectionTypesRes.data!}
            cardTypes={cardTypesRes.data!}
            cardSizes={cardSizesRes.data!}
        />
    );
}

export const metadata = {
    title: "Photocard Archive | BTS Flipthru",
    description: "Search for photocards.",
};