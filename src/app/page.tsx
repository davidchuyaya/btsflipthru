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
import { Button } from "@/components/ui/button";
import { booleansToMembers, MEMBER_CODE_TO_DISPLAY } from "@/constants";

function HomeButton({ text, href }: { text: string; href: string }) {
    return (
        <Button
            className="font-heading text-accent-light text-5xl! pt-4 pb-4 px-6 w-50 h-auto whitespace-normal text-center bg-main-light"
            asChild
        >
            <Link href={href}>{text}</Link>
        </Button>
    );
}

function PhotocardLeaderboard({
    title,
    photoSrc,
    fallbackSrc,
    description,
}: {
    title: string;
    photoSrc: string | null;
    fallbackSrc: string | null;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center">
            <PhotocardComponent src={photoSrc} fallbackSrc={fallbackSrc} effects={Effects.Matte} />
            <h3 className="mt-4">{title}</h3>
            <p>{description}</p>
        </div>
    );
}

function photocardToName(photocard: Photocard, collections: ParsedCollection[], cardTypes: CardType[]): string {
    const activeMembers = booleansToMembers(photocard);
    const members = activeMembers.map((m) => MEMBER_CODE_TO_DISPLAY[m]);
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
            setTotalPhotocards(total.data!);
        });
        getTotalPhotocardsWithoutImages().then((withoutImages) => {
            if (withoutImages.error) {
                setError(withoutImages.error);
                return;
            }
            setPhotocardsWithoutImages(withoutImages.data!);
        });
    }, []);

    return (
        <div className="page gap-4">
            <div className="flex flex-row gap-8 items-stretch">
                <BigProgressBar progress={70} description="% V1 features implemented" />
                <div className="flex flex-col gap-8">
                    <CountdownClock />
                    <div className="flex flex-row gap-4 justify-center">
                        <HomeButton text="About Flipthru" href="/about" />
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
                <BigProgressBar
                    progress={
                        totalPhotocards === 0 || photocardsWithoutImages === 0
                            ? 0
                            : Math.round(((totalPhotocards - photocardsWithoutImages) / totalPhotocards) * 100)
                    }
                    description="% of photocards with images uploaded on Flipthru"
                />
            </div>
            <div className="bg-third-lightest rounded-2xl pt-4 pb-8 pl-8 pr-8 self-stretch text-left">
                <h2>Leaderboard</h2>
                <div className="flex flex-row gap-16 justify-center mt-2">
                    <PhotocardLeaderboard
                        title="Most Contributions"
                        photoSrc={mostContributionsUser?.imageId ?? null}
                        fallbackSrc={mostContributionsUser?.imageId ?? null}
                        description={
                            mostContributionsUser?.username ? `@${mostContributionsUser.username}` : "Loading..."
                        }
                    />
                    <PhotocardLeaderboard
                        title="Most Owned"
                        photoSrc={mostOwnedPhotocard?.imageId ?? null}
                        fallbackSrc={mostOwnedPhotocard?.backImageId ?? null}
                        description={
                            mostOwnedPhotocard
                                ? photocardToName(mostOwnedPhotocard, collections, cardTypes)
                                : "Coming soon!"
                        }
                        // TODO: Change to Loading... once feature implemented
                    />
                    <PhotocardLeaderboard
                        title="Most Wishlisted"
                        photoSrc={mostWishlistedPhotocard?.imageId ?? null}
                        fallbackSrc={mostWishlistedPhotocard?.backImageId ?? null}
                        description={
                            mostWishlistedPhotocard
                                ? photocardToName(mostWishlistedPhotocard, collections, cardTypes)
                                : "Coming soon!"
                        }
                        // TODO: Change to Loading... once feature implemented
                    />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4">Recently Added</h2>
                <PhotocardGrid photocards={photocards} />
            </div>
        </div>
    );
}
