import { Suspense, cache } from "react";
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
import { collectionDisplayName, memberIntsToName, thumbnailUrl } from "@/constants";
import { Metadata } from "next";

const getPhotocard = cache(getPhotocardFromDB);
const getCollections = cache(getCollectionsFromDB);

async function PhotocardContent({ idPromise }: { idPromise: Promise<{ id: string }> }) {
    const { id: idStr } = await idPromise;
    const id = Number(idStr);
    if (isNaN(id)) {
        notFound();
    }

    const photocardResult = await getPhotocard(id);
    if (photocardResult.error || !photocardResult.data) {
        notFound();
    }
    const photocard = photocardResult.data!;

    const [relatedResult, collectionsResult, cardTypesResult, cardSizesResult, contributorResult] = await Promise.all([
        getPhotocardsInCollection(photocard.collection_id),
        getCollections(),
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const photocardResult = await getPhotocard(Number(id));
    const description = "Find other BTS photocards at BTS Flipthru.";
    if (photocardResult.error || !photocardResult.data) {
        return {
            title: "Photocard | BTS Flipthru",
            description,
        };
    }
    const collectionsResult = await getCollections();
    const collection = collectionsResult.data?.find((c) => c.id === photocardResult.data!.collection_id);
    const title = `${memberIntsToName(photocardResult.data.members)} - ${collectionDisplayName(collection)} | BTS Flipthru`;
    const image = photocardResult.data.image_id
        ? thumbnailUrl(photocardResult.data.image_id)
        : "https://btsflipthru.com/icon.png";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: image,
                },
            ],
        },
        twitter: {
            title,
            description,
            card: "summary_large_image",
            images: [
                {
                    url: image,
                },
            ],
        },
    };
}
