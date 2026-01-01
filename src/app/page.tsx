"use client";

import {
    getMostContributionsUser,
    getMostOwnedPhotocard,
    getMostWishlistedPhotocard,
    getRecentlyAddedPhotocardsInDB,
    getTotalPhotocards,
    getTotalPhotocardsWithoutImages,
} from "@/actions";
import PhotocardGrid from "./photocard-grid";
import { CardType, Effects, ParsedCollection, Photocard, UserData } from "@/db";
import { useEffect, useState } from "react";
import Link from "next/link";
import BigProgressBar from "./big-progress-bar";
import PhotocardComponent from "./photocard";
import CountdownClock from "./countdown-clock";
import { useMetadata } from "@/metadata-context";

function HomeButton({ text, href }: { text: string; href: string }) {
    return (
        <Link href={href} className="font-heading p-8 bg-main-light text-accent-light rounded-2xl text-5xl! max-w-60">
            {text}
        </Link>
    );
}

function PhotocardLeaderboard({
    title,
    photoSrc,
    description,
}: {
    title: string;
    photoSrc: string | null;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center">
            <PhotocardComponent src={photoSrc} effects={Effects.Matte} />
            <h3 className="mt-4">{title}</h3>
            <p>{description}</p>
        </div>
    );
}

function photocardToName(photocard: Photocard, collections: ParsedCollection[], cardTypes: CardType[]): string {
    const members: string[] = [];
    if (photocard.rm) members.push("RM");
    if (photocard.jin) members.push("Jin");
    if (photocard.suga) members.push("Suga");
    if (photocard.jhope) members.push("j-hope");
    if (photocard.jimin) members.push("Jimin");
    if (photocard.v) members.push("V");
    if (photocard.jungkook) members.push("Jung Kook");
    const name = members.length === 7 ? "Group" : members.join(", ");

    const collection = collections.find((col) => col.id === photocard.collectionId);
    const collectionName = collection ? collection.name : "Unknown Collection";

    const cardType = photocard.cardType ? cardTypes.find((ct) => ct.id === photocard.cardType) : "Unknown Type";

    return `(${name}) ${collectionName} ${cardType}`;
}

export default function Home() {
    const [photocards, setPhotocards] = useState<Array<Photocard>>([]);
    const [mostContributionsUser, setMostContributionsUser] = useState<UserData | null>(null);
    const [mostOwnedPhotocard, setMostOwnedPhotocard] = useState<Photocard | null>(null);
    const [mostWishlistedPhotocard, setMostWishlistedPhotocard] = useState<Photocard | null>(null);
    const [totalPhotocards, setTotalPhotocards] = useState<number>(0);
    const [photocardsWithoutImages, setPhotocardsWithoutImages] = useState<number>(0);
    const { setError, collections, cardTypes } = useMetadata();

    // Testing code
    // function getTestPhotocards(): Photocard[] {
    //     const photocard: Photocard = {
    //         collectionId: 1,
    //         imageId: null,
    //         backImageId: null,
    //         backImageType: BackImageType.Image,
    //         cardType: 1,
    //         sizeId: 1,
    //         effects: Effects.Matte,
    //         exclusiveCountry: ExclusiveCountry.Global,
    //         modTemporary: false,
    //         adminTemporary: false,
    //         rm: false,
    //         jimin: false,
    //         jungkook: false,
    //         v: false,
    //         jin: false,
    //         suga: false,
    //         jhope: false,
    //         imageContributorId: "test",
    //         updatedAt: Date.now(),
    //     };
    //     const imageIds = ["801c7740-f720-4897-b810-d3b4b2efb8f0",
    //         "360d3a45-d43f-45f9-817a-2ac6bf3682c4", "53fbde39-2797-40fb-a429-dca37ce276fe", "d7343d88-af69-4f8b-a0b4-b999899a8209", "fc859e3a-d173-46c5-8860-f3af8a6493c3", "ed6cd127-85c6-432a-96b5-789b4e9f0a18"
    //     ];
    //     const photocards: Photocard[] = [];
    //     for (let i = 0; i < 50; i++) {
    //         photocard.id = i + 1;
    //         photocard.imageId = imageIds[i % imageIds.length];
    //         photocards.push({ ...photocard });
    //     }
    //     return photocards;
    // }

    useEffect(() => {
        getRecentlyAddedPhotocardsInDB().then((cards) => {
            setPhotocards(cards);
        });
        getMostContributionsUser().then((user) => {
            if (user.error) {
                setError(user.error);
                return;
            }
            setMostContributionsUser(user.data!);
        });
        // TODO: Uncomment once feature implemented
        // getMostOwnedPhotocard().then((photocard) => {
        //     if (photocard.error) {
        //         setError(photocard.error);
        //         return;
        //     }
        //     setMostOwnedPhotocard(photocard.data!);
        // });
        // getMostWishlistedPhotocard().then((photocard) => {
        //     if (photocard.error) {
        //         setError(photocard.error);
        //         return;
        //     }
        //     setMostWishlistedPhotocard(photocard.data!);
        // });
        getTotalPhotocards().then((total) => {
            if (total.error) {
                setError(total.error);
                return;
            }
            console.log("Total photocards: ", total.data);
            setTotalPhotocards(total.data!);
        });
        getTotalPhotocardsWithoutImages().then((withoutImages) => {
            if (withoutImages.error) {
                setError(withoutImages.error);
                return;
            }
            console.log("Photocards without images: ", withoutImages.data);
            setPhotocardsWithoutImages(withoutImages.data!);
        });
    }, []);

    return (
        <div className="page gap-4">
            <div className="flex flex-row gap-8 items-stretch">
                <BigProgressBar progress={70} description="% v1 features implemented" />
                <div className="flex flex-col gap-8">
                    <CountdownClock />
                    <div className="flex flex-row gap-4 justify-center">
                        <HomeButton text="Search Archive" href="/search" />
                        <HomeButton text="Make a Binder" href="/binder" />
                    </div>
                    <div className="bg-accent-light rounded-2xl pt-4 pb-4 pl-8 pr-8 text-left">
                        <h2 className="mb-4">News</h2>
                        <ul className="ul-spaced">
                            <li>BTS announced their comeback set for March 20, 2026!</li>
                            <li>We launched fundamental pages of the site (About, Contact, etc.).</li>
                            <li>
                                Our next priority is pushing interactive features currently in the pipeline (Binder,
                                Profile, etc.)
                            </li>
                        </ul>
                    </div>
                </div>
                <BigProgressBar progress={totalPhotocards === 0 ? 0 : Math.round((totalPhotocards - photocardsWithoutImages) / totalPhotocards * 100)} description="% of photocards with images uploaded on Flipthru" />
            </div>
            <div className="bg-third-lightest rounded-2xl pt-4 pb-8 pl-8 pr-8 self-stretch text-left">
                <h2>Leaderboard</h2>
                <div className="flex flex-row gap-16 justify-center mt-2">
                    <PhotocardLeaderboard
                        title="Most Contributions"
                        photoSrc={mostContributionsUser?.imageId ?? null}
                        description={mostContributionsUser?.username ?? "Loading..."}
                    />
                    <PhotocardLeaderboard
                        title="Most Owned"
                        photoSrc={mostOwnedPhotocard?.imageId ?? null}
                        description={mostOwnedPhotocard ? photocardToName(
                            mostOwnedPhotocard,
                            collections,
                            cardTypes,
                        ) : "Coming soon!"}
                        // TODO: Change to Loading... once feature implemented
                    />
                    <PhotocardLeaderboard
                        title="Most Wishlisted"
                        photoSrc={mostWishlistedPhotocard?.imageId ?? null}
                        description={mostWishlistedPhotocard ? photocardToName(
                            mostWishlistedPhotocard,
                            collections,
                            cardTypes,
                        ) : "Coming soon!"}
                        // TODO: Change to Loading... once feature implemented
                    />
                </div>
            </div>
            <div>
                <h2 className="text-center">Recently Added</h2>
                <PhotocardGrid photocards={photocards} />
            </div>
        </div>
    );
}
