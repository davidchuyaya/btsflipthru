"use client";

import { getUserProfileDataFromDB } from "@/actions";
import { cardSizeToString } from "@/actions-client";
import PhotocardComponent from "@/app/photocard";
import { Effects, fullSizeUrl } from "@/constants";
import { useMetadata } from "@/metadata-context";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import PhotocardGrid from "@/app/photocard-grid";
import { Button } from "@/components/ui/button";
import { Selectable } from "kysely";
import { UserData } from "@/db";

function SocialsComponent({ logoSrc, id }: { logoSrc: string; id?: string | null }) {
    return (
        <div className="flex flex-row gap-2 items-center">
            <img src={logoSrc} className="size-8" />
            <p>{id ?? ""}</p>
        </div>
    );
}

export default function ProfilePage() {
    const { id } = useParams();
    const { session, sessionRefetch, setError } = useMetadata();
    const [userData, setUserData] = useState<Selectable<UserData> | null>(null);

    useEffect(() => {
        getUserProfileDataFromDB(String(id)).then((result) => {
            if (result.error) {
                setError(result.error);
            } else {
                setUserData(result.data!);
            }
        });
    }, [id]);

    return (
        <div className="flex flex-col gap-8 items-stretch justify-center">
            <div className="flex flex-row gap-8 m-12">
                <div className="flex flex-col gap-8 items-center w-1/4 shrink-0">
                    <PhotocardComponent
                        src={userData?.image_id ? fullSizeUrl(userData.image_id) : null}
                        effects={Effects.Matte}
                        large
                    />
                    <div className="flex flex-row gap-3 items-center">
                        <SocialsComponent logoSrc="/b-cd.png" id={userData?.bcd_id} />
                        <SocialsComponent logoSrc="/bluesky.svg" id={userData?.bluesky_id} />
                        <SocialsComponent logoSrc="/twitter.svg" id={userData?.twitter_id} />
                        <SocialsComponent logoSrc="/instagram.svg" id={userData?.instagram_id} />
                        <SocialsComponent logoSrc="/discord.svg" id={userData?.discord_id} />
                    </div>
                </div>
                <div className="flex flex-col gap-4 w-1/2">
                    <div className="flex flex-col gap">
                        <h2>{userData?.username ?? "Set a username"}</h2>
                        <p className="text-2xl">{userData?.description ?? "Set a description"}</p>
                    </div>
                    <div className="flex flex-row gap-8">
                        <div className="flex flex-col gap-4 rounded-2xl p-8 bg-accent-light grow">
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Army Since</h3>
                                <p>{userData?.army_since && new Date(userData.army_since).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Bias</h3>
                                <p>{userData?.bias ?? "Set a bias"}</p>
                            </div>
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Photocards Collected</h3>
                                <p>Coming soon!</p>
                            </div>
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Contributions</h3>
                                <p>{userData?.contributions ?? 0}</p>
                            </div>
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Role</h3>
                                <p>Coming soon!</p>
                                <Button onClick={sessionRefetch}>Activate Mod</Button>
                            </div>
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Following</h3>
                                <p>Coming soon!</p>
                            </div>
                            <div className="flex flex-row gap-4 items-center">
                                <h3>Followers</h3>
                                <p>Coming soon!</p>
                            </div>
                        </div>
                    </div>
                    <iframe
                        data-testid="embed-iframe"
                        style={{ borderRadius: "16px" }}
                        src="https://open.spotify.com/embed/playlist/43rCH6ObxLcq6d3bhg8J0l?utm_source=generator"
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                    ></iframe>
                </div>
                <div className="flex flex-col gap-4 w-1/4 items-left justify-center">
                    <p>Disable cursor</p>
                    <p>Disable card effects</p>
                    <p>Follow a user</p>
                </div>
            </div>
            <div className="flex flex-col gap-4 items-center justify-center">
                <h2>Binders</h2>
                <p>Coming soon!</p>
            </div>
            <div className="flex flex-col gap-4 items-center justify-center">
                <h2>Wishlist</h2>
                <p>Coming soon!</p>
            </div>
        </div>
    );
}
