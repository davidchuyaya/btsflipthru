import { didUserWishlistPhotocard, doesUserOwnPhotocard, getPhotocardFromDB, getPhotocardsInCollection, getUserDataFromDB } from "@/actions";
import PhotocardClient from "./photocard-client";
import { notFound } from "next/navigation";

export default async function PhotocardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (isNaN(id)) {
        notFound();
    }

    const photocardResult = await getPhotocardFromDB(id);
    if (photocardResult.error || !photocardResult.data) {
        notFound();
    }
    const photocard = photocardResult.data!;

    const [relatedResult, contributorResult, isOwnedResult, isWishlistedResult] = await Promise.all([
        getPhotocardsInCollection(photocard.collection_id),
        getUserDataFromDB(photocard.image_contributor_id),
        doesUserOwnPhotocard(id),
        didUserWishlistPhotocard(id),
    ]);

    if (contributorResult.error) {
        notFound();
    }

    const relatedPhotocards = (relatedResult.data || []).filter((pc) => pc.id !== id);

    return (
        <PhotocardClient
            photocard={photocard}
            imageContributor={contributorResult.data!}
            relatedPhotocards={relatedPhotocards}
            wasOwned={isOwnedResult.data ?? false}
            wasWishlisted={isWishlistedResult.data ?? false}
        />
    );
}
