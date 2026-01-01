"use client";

import { searchPhotocardsInDB } from "@/actions";
import { Effects, Photocard } from "@/db";
import { useEffect, useState } from "react";
import PhotocardComponent from "../photocard";
import { thumbnailUrl } from "@/constants";

export default function SearchComponent() {
    const [photocards, setPhotocards] = useState<Array<Photocard>>([]);

    // Run on launch
    useEffect(() => {
        searchPhotocardsInDB().then((cards) => {
            setPhotocards(cards);
        });
    }, []);

    return (
        <div className="flex flex-row justify-center">
            <h1 className="text-center">Coming soon!</h1>
            {/* {photocards.map((card) => (
                <PhotocardComponent key={card.id!} src={card.imageId ? thumbnailUrl(card.imageId) : null} effects={card.effects} />
            ))} */}
            {/* <PhotocardComponent src={null} effects={Effects.Matte} />
            <PhotocardComponent src={thumbnailUrl("ed6cd127-85c6-432a-96b5-789b4e9f0a18")} effects={Effects.Glossy} />
            <PhotocardComponent src={thumbnailUrl("48cbd0c7-de70-4738-9420-7cfc23dbba39")} effects={Effects.Matte} />
            <PhotocardComponent src={thumbnailUrl("48cbd0c7-de70-4738-9420-7cfc23dbba39")} effects={Effects.Glossy} />
            <PhotocardComponent src={thumbnailUrl("48cbd0c7-de70-4738-9420-7cfc23dbba39")} effects={Effects.Shiny} /> */}
        </div>
    );
}
