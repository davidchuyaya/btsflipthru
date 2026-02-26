import {
    getCardSizesFromDB,
    getCardTypesFromDB,
    getCollectionsFromDB,
    getOwnedPhotocards,
    getWishlistedPhotocards,
} from "@/actions";
import { Suspense } from "react";
import BinderClient from "./binder-client";

async function BinderContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [
        collectionsRes,
        cardTypesRes,
        cardSizesRes,
        ownedPhotocardsRes,
        wishlistedPhotocardsRes,
    ] = await Promise.all([
        getCollectionsFromDB(),
        getCardTypesFromDB(),
        getCardSizesFromDB(),
        getOwnedPhotocards(),
        getWishlistedPhotocards(),
    ]);

    if (
        collectionsRes.error ||
        cardTypesRes.error ||
        cardSizesRes.error
    ) {
        throw new Error("Failed to load data for binder page");
    }

    let ownedPhotocards = ownedPhotocardsRes.data || [];
    let wishlistedPhotocards = wishlistedPhotocardsRes.data || [];

    return (
        <BinderClient
            collections={collectionsRes.data!}
            cardTypes={cardTypesRes.data!}
            cardSizes={cardSizesRes.data!}
            ownedPhotocards={ownedPhotocards}
            wishlistedPhotocards={wishlistedPhotocards}
        />
    );
}

export default function BinderPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center p-12">Loading...</div>
            }
        >
            <BinderContent params={params} />
        </Suspense>
    );
}

export const metadata = {
    title: "Binder | BTS Flipthru",
    description: "Create and decorate your own, shareable virtual binder!",
};
