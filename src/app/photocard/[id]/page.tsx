import { Suspense } from "react";
import {
    getCardSizesFromDB,
    getCardTypesFromDB,
    getCollectionsFromDB,
    getPhotocardFromDB,
    getPhotocardsInCollection,
    getUserDataFromDB,
} from "@/actions";
import PhotocardClient from "./photocard-client";
import { notFound } from "next/navigation";

async function PhotocardContent({ idPromise }: { idPromise: Promise<{ id: string }> }) {
    const { id: idStr } = await idPromise;
    const id = Number(idStr);
    if (isNaN(id)) {
        notFound();
    }

    const photocardResult = await getPhotocardFromDB(id);
    if (photocardResult.error || !photocardResult.data) {
        notFound();
    }
    const photocard = photocardResult.data!;

    const [relatedResult, collectionsResult, cardTypesResult, cardSizesResult, contributorResult] = await Promise.all([
        getPhotocardsInCollection(photocard.collection_id),
        getCollectionsFromDB(),
        getCardTypesFromDB(),
        getCardSizesFromDB(),
        getUserDataFromDB(photocard.image_contributor_id),
    ]);

    if (contributorResult.error || collectionsResult.error || cardTypesResult.error || cardSizesResult.error) {
        notFound();
    }

    const relatedPhotocards = (relatedResult.data || []).filter((pc) => pc.id !== id);

    return (
        <PhotocardClient
            photocard={photocard}
            collection={collectionsResult.data!.find((c) => c.id === photocard.collection_id)!}
            cardType={cardTypesResult.data!.find((c) => c.id === photocard.card_type)!}
            cardSize={cardSizesResult.data!.find((c) => c.id === photocard.size_id)!}
            imageContributor={contributorResult.data!}
            relatedPhotocards={relatedPhotocards}
        />
    );
}

export default function PhotocardPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="flex justify-center p-12">Loading...</div>}>
            <PhotocardContent idPromise={params} />
        </Suspense>
    );
}
