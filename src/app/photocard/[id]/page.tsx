"use client";

import { getPhotocardFromDB, getPhotocardsInCollection, getPhotocardsInDB, getUsernameFromDB } from "@/actions";
import { cardSizeToString } from "@/actions-client";
import PhotocardComponent from "@/app/photocard";
import { AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { fullSizeUrl, memberBooleanNumbersToName, memberBooleansToName, ReportType, reportWindowURL } from "@/constants";
import { DEFAULT_CARD_TYPE, Effects, ParsedCollection, Photocard, CardSize, CardType, ExclusiveCountry } from "@/db";
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
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ClientSession, signInGoogle } from "@/auth-client";
import PhotocardGrid from "@/app/photocard-grid";

function DialogTriggerButton({
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

export default function PhotocardPage() {
    const { id } = useParams();
    const { collections, cardSizes, cardTypes, session, setError } = useMetadata();
    const [photocard, setPhotocard] = useState<Photocard | null>(null);
    const [collection, setCollection] = useState<ParsedCollection | null>(null);
    const [cardSize, setCardSize] = useState<CardSize | null>(null);
    const [cardType, setCardType] = useState<CardType | null>(null);
    const [imageContributor, setImageContributor] = useState<string>("");
    const [flipped, setFlipped] = useState(false);
    const [relatedPhotocards, setRelatedPhotocards] = useState<Photocard[]>([]);

    useEffect(() => {
        getPhotocardFromDB(Number(id)).then((result) => {
            if (result.error) {
                setError(result.error);
            } else {
                setPhotocard(result.data!);
                const foundCollection = collections?.find((c) => c.id === result.data?.collectionId);
                if (foundCollection) {
                    setCollection(foundCollection);

                    // Find other photocards in this collection
                    getPhotocardsInCollection(foundCollection.id!).then((result) => {
                        if (result.error) {
                            setError(result.error);
                        } else {
                            setRelatedPhotocards(result.data!.filter(pc => pc.id !== Number(id)));
                        }
                    });
                }
                const foundCardSize = cardSizes?.find((s) => s.id === result.data?.sizeId);
                if (foundCardSize) {
                    setCardSize(foundCardSize);
                }
                const foundCardType = cardTypes?.find((s) => s.id === result.data?.cardType);
                if (foundCardType) {
                    setCardType(foundCardType);
                }
                getUsernameFromDB(result.data!.imageContributorId).then((result) => {
                    if (result.error) {
                        setError(result.error);
                    } else {
                        setImageContributor(result.data!);
                    }
                });
            }
        });
    }, [id, collections, cardSizes, cardTypes]);

    function DialogIfNotSignedIn(session: ClientSession | null, children: React.ReactNode) {
        if (!session) {
            return (
                <DialogTriggerButton
                    title="Sign In Required"
                    description="Please sign in to access this feature."
                    submit="Sign In"
                    onSubmit={() => {
                        signInGoogle("/photocard/" + id);
                    }}
                >
                    {children}
                </DialogTriggerButton>
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
                            ? photocard?.backImageId
                                ? fullSizeUrl(photocard.backImageId)
                                : null
                            : photocard?.imageId
                              ? fullSizeUrl(photocard.imageId)
                              : null
                    }
                    fallbackSrc={
                        flipped
                            ? photocard?.imageId
                                ? fullSizeUrl(photocard.imageId)
                                : null
                            : photocard?.backImageId
                              ? fullSizeUrl(photocard.backImageId)
                              : null
                    }
                    effects={photocard?.effects ?? Effects.Matte}
                    large
                />
                <Button className="w-fit mt-4" onClick={() => setFlipped(!flipped)}>
                    Flip
                </Button>
                <Button hidden={!photocard?.modTemporary} className="w-fit">
                    Submit Alt Image
                </Button>
                <Button asChild className="w-fit">
                    <Link href={reportWindowURL(ReportType.Error, "/photocard/" + id, "Photocard error")}>
                        Report an Error
                    </Link>
                </Button>
            </div>
            <div className="flex flex-col gap-4 w-2/3">
                <div className="flex flex-col gap">
                    <h2>{collection?.name}</h2>
                    <p className="text-2xl">{photocard && memberBooleanNumbersToName(photocard)}</p>
                </div>
                <div className="flex flex-row gap-8">
                    <div className="flex flex-col gap-4 rounded-2xl p-8 bg-accent-light grow">
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Release Date</h3>
                            <p>{collection && new Date(collection.releaseDate).toLocaleDateString()}</p>
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
                            <p>{cardType?.name ?? DEFAULT_CARD_TYPE.name}</p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Country</h3>
                            <p>
                                {Object.keys(ExclusiveCountry)[photocard?.exclusiveCountry ?? ExclusiveCountry.Global]}
                            </p>
                        </div>
                        <div className="flex flex-row gap-4 items-center">
                            <h3>Image Submission</h3>
                            <p>@{imageContributor}</p>
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
