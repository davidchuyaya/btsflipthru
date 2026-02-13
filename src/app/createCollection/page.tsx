import {
    getCardSizesFromDB,
    getCardTypesFromDB,
    getCollectionTypesFromDB,
} from "@/actions";
import CreateCollectionClient from "./create-collection-client";
import { Suspense } from "react";

async function CreateCollectionContent() {
    const [collectionTypesRes, cardTypesRes, cardSizesRes] = await Promise.all([
        getCollectionTypesFromDB(),
        getCardTypesFromDB(),
        getCardSizesFromDB(),
    ]);

    if (
        collectionTypesRes.error ||
        cardTypesRes.error ||
        cardSizesRes.error ||
        !collectionTypesRes.data ||
        !cardTypesRes.data ||
        !cardSizesRes.data
    ) {
        throw new Error("Failed to load data for create collection page");
    }

    return (
        <CreateCollectionClient
            serverCollectionTypes={collectionTypesRes.data}
            serverCardTypes={cardTypesRes.data}
            serverCardSizes={cardSizesRes.data}
        />
    );
}

export default function CreateCollectionPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center p-12">Loading...</div>
            }
        >
            <CreateCollectionContent />
        </Suspense>
    );
}

export const metadata = {
    title: "Create Collection | BTS Flipthru",
    description: "Add a missing photocard collection to BTS Flipthru.",
};
