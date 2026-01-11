"use client";

import PhotocardGrid from "./photocard-grid";
import { CardTypes, Collections, Photocards } from "@/db";
import Link from "next/link";
import BigProgressBar from "./big-progress-bar";
import PhotocardComponent from "./photocard";
import CountdownClock from "./countdown-clock";
import { Button } from "@/components/ui/button";
import { Effects, fullSizeUrl, HomeStats, memberIntsToName } from "@/constants";
import { Selectable } from "kysely";

function HomeButton({ text, href, className }: { text: string; href: string; className?: string }) {
    return (
        <Button variant="big" asChild className={className}>
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
        <div className="flex flex-col items-center justify-center text-center">
            <PhotocardComponent src={photoSrc} fallbackSrc={fallbackSrc} effects={Effects.Matte} />
            <h3 className="mt-4">{title}</h3>
            <p>{description}</p>
        </div>
    );
}

function photocardToName(
    photocard: Selectable<Photocards>,
    collections: Selectable<Collections>[],
    cardTypes: Selectable<CardTypes>[],
): string {
    const name = memberIntsToName(photocard.members!);
    const collectionName = collections.find((col) => col.id === photocard.collection_id)?.name ?? "Unknown Collection";
    const cardType = cardTypes.find((ct) => ct.id === photocard.card_type) ?? "Unknown Type";
    return `(${name}) ${collectionName} ${cardType}`;
}

export default function HomeClient({ homeStats, today }: { homeStats: HomeStats; today: Date }) {
    return (
        <div className="page gap-4">
            <div className="flex flex-row gap-8 items-stretch">
                <BigProgressBar progress={80} description="% V1 features implemented" className="max-xl:hidden" />
                <div className="flex flex-col gap-8">
                    <CountdownClock today={today} />
                    <div className="flex flex-row gap-4 justify-center">
                        <HomeButton text="About Flipthru" href="/about" className="max-lg:hidden" />
                        <HomeButton text="Search Archive" href="/search" />
                        <HomeButton text="Make a Binder" href="/binder" className="max-lg:hidden" />
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
                        homeStats.totalPhotocards === 0 || homeStats.totalPhotocardsWithoutImages === 0
                            ? 0
                            : Math.round(
                                  ((homeStats.totalPhotocards - homeStats.totalPhotocardsWithoutImages) /
                                      homeStats.totalPhotocards) *
                                      100,
                              )
                    }
                    description="% of photocards with images uploaded on Flipthru"
                    className="max-xl:hidden"
                />
            </div>
            <div className="bg-third-lightest rounded-2xl pt-4 pb-8 px-8 self-stretch text-center lg:text-left">
                <h2>Leaderboard</h2>
                <div className="flex flex-row flex-wrap gap-16 justify-center mt-2">
                    <PhotocardLeaderboard
                        title="Most Contributions"
                        photoSrc={
                            homeStats.mostContributionsUser.image_id
                                ? fullSizeUrl(homeStats.mostContributionsUser.image_id)
                                : null
                        }
                        fallbackSrc={
                            homeStats.mostContributionsUser.image_id
                                ? fullSizeUrl(homeStats.mostContributionsUser.image_id)
                                : null
                        }
                        description={`@${homeStats.mostContributionsUser.username}`}
                    />
                    <PhotocardLeaderboard
                        title="Most Owned"
                        photoSrc={null}
                        fallbackSrc={null}
                        description={"Coming soon!"}
                    />
                    <PhotocardLeaderboard
                        title="Most Wishlisted"
                        photoSrc={null}
                        fallbackSrc={null}
                        description={"Coming soon!"}
                    />
                </div>
            </div>
            <div>
                <h2 className="text-center mb-4">Recently Added</h2>
                <PhotocardGrid photocards={homeStats.recentlyAddedPhotocards} />
            </div>
        </div>
    );
}
