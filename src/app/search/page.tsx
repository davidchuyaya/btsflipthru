"use client";

import { searchPhotocardsInDB } from "@/actions";
import { thumbnailUrl } from "@/app/actions-client";
import { Photocard } from "@/db";
import { useEffect, useState } from "react";

function PhotocardItem({ card }: { card: Photocard }) {
    const frontImageUrl = card.imageId ? thumbnailUrl(card.imageId) : null;
    const backImageUrl = card.backImageId ? thumbnailUrl(card.backImageId) : null;

    return (
        <div key={card.id}>
            Front:
            {frontImageUrl ? <img src={frontImageUrl} alt={`Photocard ${card.id} front`} /> : null}
            Back:
            {backImageUrl ? <img src={backImageUrl} alt={`Photocard ${card.id} back`} /> : null}
            <p>Collection ID: {card.collectionId}</p>
        </div>
    );
}

export default function SearchComponent() {
    const [photocards, setPhotocards] = useState<Array<Photocard>>([]);

    // Run on launch
    useEffect(() => {
        searchPhotocardsInDB().then((cards) => {
            setPhotocards(cards);
        });
    }, []);

    return (
        <div>
            {photocards.map((card) => (
                <PhotocardItem key={card.id} card={card} />
            ))}
        </div>
    );
}
