import {
    getUserBindersFromDB,
    getCollectionsFromDB,
    getCardTypesFromDB,
    getCardSizesFromDB,
    getOwnedPhotocards,
    getWishlistedPhotocards,
    getBinderPagesFromDB,
    getPhotocardsFromDB,
} from "@/actions";
import BinderClient from "./binder-client";
import { notFound } from "next/navigation";
import { getSession } from "@/auth";

export async function BinderContent({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [
        userBinders,
        collectionsRes,
        cardTypesRes,
        cardSizesRes,
        session,
    ] = await Promise.all([
        getUserBindersFromDB([id]),
        getCollectionsFromDB(),
        getCardTypesFromDB(),
        getCardSizesFromDB(),
        getSession(),
    ]);

    if (
        collectionsRes.error ||
        cardTypesRes.error ||
        cardSizesRes.error ||
        userBinders.error ||
        userBinders.data!.length === 0
    ) {
        notFound();
    }

    let userBinder = userBinders.data![0];
    const isOwner =
        !session.error && !!session.data && session.data.user.id === userBinder.user_id;
    const binderPages =
        userBinder.binder_pages.length === 0
            ? { data: [] }
            : await getBinderPagesFromDB(userBinder.binder_pages);

    if (binderPages.error) {
        notFound();
    }

    const [ownedPhotocardsRes, wishlistedPhotocardsRes] = isOwner
        ? await Promise.all([getOwnedPhotocards(), getWishlistedPhotocards()])
        : [{ data: [] }, { data: [] }];
    const ownedPhotocards = ownedPhotocardsRes.data || [];
    const wishlistedPhotocards = wishlistedPhotocardsRes.data || [];
    const savedPhotocardIds = [
        ...new Set(
            binderPages.data!.flatMap((page) => page.photocard_ids),
        ),
    ];
    const savedPhotocardsRes = await getPhotocardsFromDB(savedPhotocardIds);
    if (savedPhotocardsRes.error) {
        notFound();
    }

    return (
        <BinderClient
            userBinder={userBinder}
            binderPages={binderPages.data!}
            collections={collectionsRes.data!}
            cardTypes={cardTypesRes.data!}
            cardSizes={cardSizesRes.data!}
            ownedPhotocards={ownedPhotocards}
            wishlistedPhotocards={wishlistedPhotocards}
            savedPhotocards={savedPhotocardsRes.data!}
            isOwner={isOwner}
        />
    );
}
