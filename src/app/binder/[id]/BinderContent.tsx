import { getUserBindersFromDB, getCollectionsFromDB, getCardTypesFromDB, getCardSizesFromDB, getOwnedPhotocards, getWishlistedPhotocards } from "@/actions";
import BinderClient from "./binder-client";

export async function BinderContent({ params }: { params: Promise<{ id: string; }>; }) {
    const { id } = await params;
    const [
        userBinder, collectionsRes, cardTypesRes, cardSizesRes, ownedPhotocardsRes, wishlistedPhotocardsRes,
    ] = await Promise.all([
        getUserBindersFromDB([id]),
        getCollectionsFromDB(),
        getCardTypesFromDB(),
        getCardSizesFromDB(),
        getOwnedPhotocards(),
        getWishlistedPhotocards(),
    ]);

    if (collectionsRes.error ||
        cardTypesRes.error ||
        cardSizesRes.error ||
        userBinder.error) {
        throw new Error("Failed to load data for binder page");
    }

    let ownedPhotocards = ownedPhotocardsRes.data || [];
    let wishlistedPhotocards = wishlistedPhotocardsRes.data || [];

    return (
        <BinderClient
      userBinder={userBinder.data![0]}
            collections={collectionsRes.data!}
            cardTypes={cardTypesRes.data!}
            cardSizes={cardSizesRes.data!}
            ownedPhotocards={ownedPhotocards}
            wishlistedPhotocards={wishlistedPhotocards} />
    );
}

