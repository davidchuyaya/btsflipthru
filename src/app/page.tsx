"use client";

import PhotocardGrid from "./photocard-grid";
import { CardTypes, Collections, Photocards, UserData } from "@/db";
import { useEffect, useState } from "react";
import Link from "next/link";
import BigProgressBar from "./big-progress-bar";
import PhotocardComponent from "./photocard";
import CountdownClock from "./countdown-clock";
import { useMetadata } from "@/metadata-context";
import { Button } from "@/components/ui/button";
import { Effects, memberIntsToName } from "@/constants";
import { Selectable } from "kysely";
import { getHomeStats } from "@/actions";

function HomeButton({ text, href }: { text: string; href: string }) {
    return (
        <Button variant="big" asChild>
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

function photocardToName(photocard: Selectable<Photocards>, collections: Selectable<Collections>[], cardTypes: Selectable<CardTypes>[]): string {
    const name = memberIntsToName(photocard.members!);
    const collectionName = collections.find((col) => col.id === photocard.collection_id)?.name ?? "Unknown Collection";
    const cardType = cardTypes.find((ct) => ct.id === photocard.card_type) ?? "Unknown Type";
    return `(${name}) ${collectionName} ${cardType}`;
}

export default function Home() {
    const [photocards, setPhotocards] = useState<Array<Selectable<Photocards>>>([]);
    const [mostContributionsUser, setMostContributionsUser] = useState<Selectable<UserData> | null>(null);
    const [mostOwnedPhotocard, setMostOwnedPhotocard] = useState<Selectable<Photocards> | null>(null);
    const [mostWishlistedPhotocard, setMostWishlistedPhotocard] = useState<Selectable<Photocards> | null>(null);
    const [totalPhotocards, setTotalPhotocards] = useState<number>(0);
    const [photocardsWithoutImages, setPhotocardsWithoutImages] = useState<number>(0);
    const { setError, collections, cardTypes } = useMetadata();

    useEffect(() => {
        getHomeStats().then((stats) => {
            if (stats.error) {
                setError(stats.error);
                return;
            }

            setPhotocards(stats.data!.recentlyAddedPhotocards);
            setMostContributionsUser(stats.data!.mostContributionsUser);
            setTotalPhotocards(stats.data!.totalPhotocards!);
            setPhotocardsWithoutImages(stats.data!.totalPhotocardsWithoutImages!);
        });
    }, []);

    return (
        <div className="page gap-4">
            <div className="flex flex-row gap-8 items-stretch">
                <BigProgressBar progress={80} description="% V1 features implemented" />
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
                        photoSrc={mostContributionsUser?.image_id ?? null}
                        fallbackSrc={mostContributionsUser?.image_id ?? null}
                        description={
                            mostContributionsUser?.username ? `@${mostContributionsUser.username}` : "Loading..."
                        }
                    />
                    <PhotocardLeaderboard
                        title="Most Owned"
                        photoSrc={mostOwnedPhotocard?.image_id ?? null}
                        fallbackSrc={mostOwnedPhotocard?.back_image_id ?? null}
                        description={
                            mostOwnedPhotocard
                                ? photocardToName(mostOwnedPhotocard, collections, cardTypes)
                                : "Coming soon!"
                        }
                        // TODO: Change to Loading... once feature implemented
                    />
                    <PhotocardLeaderboard
                        title="Most Wishlisted"
                        photoSrc={mostWishlistedPhotocard?.image_id ?? null}
                        fallbackSrc={mostWishlistedPhotocard?.back_image_id ?? null}
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
