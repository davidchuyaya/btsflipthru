"use client";

import { searchPhotocardsInDB } from "@/actions";
import { thumbnailUrl } from "@/constants";
import { Photocard } from "@/db";
import { useEffect, useState } from "react";
import PhotocardComponent from "../photocard";

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
                <PhotocardComponent key={card.id!} imageId={card.imageId} />
            ))}
        </div>
    );
}
