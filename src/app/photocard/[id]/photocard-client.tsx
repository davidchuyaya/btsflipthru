"use client";

import PhotocardComponent from "@/app/photocard";
import { AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Effects, ExclusiveCountry, fullSizeUrl, memberIntsToName, ReportType, reportWindowURL } from "@/constants";
import { useMetadata } from "@/metadata-context";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useState } from "react";
import { ClientSession, signInGoogle } from "@/auth-client";
import PhotocardGrid from "@/app/photocard-grid";
import { Selectable } from "kysely";
import { Photocards, UserData } from "@/db";
import { cardSizeToString } from "@/actions-client";

function AlertDialogTriggerButton({
    title,
    description,
    submit,
    onSubmit,
    children,
}: {
    title: string;
    description: string;
    submit: string;
    onSubmit: () => void;
    children: React.ReactNode;
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onSubmit}>{submit}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function PhotocardClient({
    photocard,
    imageContributor,
    relatedPhotocards,
}: {
    photocard: Selectable<Photocards>;
    imageContributor: Selectable<UserData>;
    relatedPhotocards: Selectable<Photocards>[];
}) {
    const { collections, cardTypes, cardSizes, session } = useMetadata();
    const [flipped, setFlipped] = useState(false);
    const collection = collections.find((c) => c.id === photocard.collection_id);
    const cardType = cardTypes.find((c) => c.id === photocard.card_type);
    const cardSize = cardSizes.find((c) => c.id === photocard.size_id);

    function DialogIfNotSignedIn(session: ClientSession | null, children: React.ReactNode) {
        if (!session) {
            return (
                <AlertDialogTriggerButton
                    title="Sign In Required"
                    description="Please sign in to access this feature."
                    submit="Sign In"
                    onSubmit={() => {
                        signInGoogle("/photocard/" + photocard.id);
                    }}
                >
                    {children}
                </AlertDialogTriggerButton>
            );
        }
        return children;
    }

    return (
        <div className="flex flex-row gap-8 m-12">
            <div className="flex flex-col gap-2 items-center w-1/3 shrink-0">
                <PhotocardComponent
                    src={
                        flipped
                            ? photocard?.back_image_id
                                ? fullSizeUrl(photocard.back_image_id)
                                : null
                            : photocard?.image_id
                              ? fullSizeUrl(photocard.image_id)
                              : null
                    }
                    fallbackSrc={
                        flipped
                            ? photocard?.image_id
                                ? fullSizeUrl(photocard.image_id)
                                : null
                            : photocard?.back_image_id
                              ? fullSizeUrl(photocard.back_image_id)
                              : null
                    }
                    effects={photocard?.effects ?? Effects.Matte}
                    large
                />
                <Button className="w-fit mt-4" onClick={() => setFlipped(!flipped)}>
                    Flip
                </Button>
                <Button hidden={!photocard?.mod_temporary} className="w-fit">
                    Submit Alt Image
                </Button>
                <Button asChild className="w-fit">
                    <Link href={reportWindowURL(ReportType.Error, "/photocard/" + photocard.id, "Photocard error")}>
                        Report an Error
                    </Link>
                </Button>
            </div>
            <div className="flex flex-col gap-4 w-2/3">
                <div className="flex flex-col gap">
                    <h2>{collection?.name}</h2>
                    <p className="text-2xl">{photocard && memberIntsToName(photocard.members)}</p>
                </div>
                <div className="flex flex-row gap-8">
                    <div className="flex flex-col gap-4 rounded-2xl p-8 bg-accent-light grow">
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Release Date</h3>
                            <p>{collection && new Date(collection.release_date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Dimensions</h3>
                            <p>{cardSize && cardSizeToString(cardSize)}</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Appearance</h3>
                            <p>{Object.keys(Effects)[photocard?.effects ?? Effects.Matte]}</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Type</h3>
                            <p>{cardType?.name}</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Country</h3>
                            <p>
                                {Object.keys(ExclusiveCountry)[photocard?.exclusive_country ?? ExclusiveCountry.Global]}
                            </p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Image Submission</h3>
                            <Button variant="underline" asChild>
                                <Link href={"/profile/" + imageContributor.user_id}>
                                    @{imageContributor.username}
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 items-left justify-center">
                        {DialogIfNotSignedIn(
                            session,
                            <Button>
                                <img src="/flipthru_addtobinder.svg" className="size-8 -ml-8" />
                                Add to Owned
                            </Button>,
                        )}
                        {DialogIfNotSignedIn(
                            session,
                            <Button>
                                <img src="/flipthru_addtowishlist.svg" className="size-8 -ml-2" />
                                Add to Wishlist
                            </Button>,
                        )}
                        {DialogIfNotSignedIn(
                            session,
                            <Button>
                                <img src="/flipthru_addtocollection.svg" className="size-8 -ml-6" />
                                Mark Favorite
                            </Button>,
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-4 mt-4">
                    <h2>Related Photocards</h2>
                    <PhotocardGrid
                        photocards={relatedPhotocards}
                        collections={collection ? [collection] : []}
                        className="justify-start"
                    />
                </div>
            </div>
        </div>
    );
}
