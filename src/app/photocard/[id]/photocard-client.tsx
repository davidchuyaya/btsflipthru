"use client";

import PhotocardComponent from "@/app/photocard";
import { AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Effects,
    ExclusiveCountry,
    fullSizeUrl,
    memberIntsToName,
    ReportType,
    reportWindowURL,
    Role,
} from "@/constants";
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
import { useState, cloneElement } from "react";
import { ClientSession, signInGoogle } from "@/auth-client";
import PhotocardGrid from "@/app/photocard-grid";
import { Selectable } from "kysely";
import { Photocards, UserData } from "@/db";
import { cardSizeToString, uploadImage } from "@/actions-client";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import z from "zod";
import { ImageDropzone } from "@/app/image-dropzone";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError } from "@/components/ui/field";
import {
    addPhotocardToOwned,
    addPhotocardToWishlist,
    generateSignedUploadUrlForPhotocards,
    removePhotocardFromOwned,
    removePhotocardFromWishlist,
    updatePhotocardInDB,
} from "@/actions";
import { toast } from "sonner";

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

const formSchema = z.object({
    frontImage: z
        .instanceof(File)
        .nullable()
        .refine((file) => file !== null, {
            message: "Front image is required",
        }),
    backImage: z
        .instanceof(File)
        .nullable()
        .refine((file) => file !== null, {
            message: "Back image is required",
        }),
});

function SubmitAltImageDialog({ id }: { id: number }) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            frontImage: null,
            backImage: null,
        },
    });

    async function onSubmit(data: z.infer<typeof formSchema>) {
        toast.promise(
            async () => {
                const presignedUrls = await generateSignedUploadUrlForPhotocards(2);
                if (presignedUrls.error) {
                    throw new Error("Failed to generate presigned URLs: " + presignedUrls.error);
                }
                const databaseUpdated = await updatePhotocardInDB(
                    id,
                    presignedUrls.data![0].params.public_id,
                    presignedUrls.data![1].params.public_id,
                );
                if (databaseUpdated.error) {
                    throw new Error("Failed to update database: " + databaseUpdated.error);
                }

                await Promise.all([
                    uploadImage(presignedUrls.data![0], data.frontImage!),
                    uploadImage(presignedUrls.data![1], data.backImage!),
                ]).then((results) => {
                    const error = results.find((res) => res.error);
                    if (error) {
                        throw new Error(error.error!);
                    }
                });
            },
            {
                loading: "Uploading...",
                success: () => {
                    form.reset();
                    return "Uploaded successfully! Refresh the page to see your changes.";
                },
                error: (error) => {
                    return {
                        message: "Error uploading: " + error.message,
                        action: {
                            label: "Report",
                            onClick: () => {
                                const url = reportWindowURL(ReportType.Error, window.location.href, error.message);
                                window.open(url, "_blank");
                            },
                        },
                    };
                },
            },
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Submit Alt Image</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[60%]">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Submit an Image</DialogTitle>
                        <DialogDescription>
                            Contribute to our database by submitting the front and back image of the photocard! Please
                            only use images that you've taken yourself and refer to the steps in the
                            <Button variant="underline" asChild>
                                <Link href="/faq#how-do-i-upload-cards">FAQ</Link>
                            </Button>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-row gap-4 mb-2">
                        <div className="flex flex-col gap-2">
                            <Label>Front Image</Label>
                            <Controller
                                name="frontImage"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <ImageDropzone
                                            onImageChanged={field.onChange}
                                            onDelete={() => {
                                                field.onChange(null);
                                            }}
                                            expand={true}
                                            image={field.value}
                                        />
                                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                                    </>
                                )}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Back Image</Label>
                            <Controller
                                name="backImage"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <ImageDropzone
                                            onImageChanged={field.onChange}
                                            onDelete={() => {
                                                field.onChange(null);
                                            }}
                                            expand={true}
                                            image={field.value}
                                        />
                                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                                    </>
                                )}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="neutral">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Submit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function PhotocardClient({
    photocard,
    imageContributor,
    relatedPhotocards,
    wasOwned,
    wasWishlisted,
}: {
    photocard: Selectable<Photocards>;
    imageContributor: Selectable<UserData>;
    relatedPhotocards: Selectable<Photocards>[];
    wasOwned: boolean;
    wasWishlisted: boolean;
}) {
    const { collections, cardTypes, cardSizes, userData, updateUserData, session } = useMetadata();
    const [flipped, setFlipped] = useState(false);
    const collection = collections.find((c) => c.id === photocard.collection_id);
    const cardType = cardTypes.find((c) => c.id === photocard.card_type);
    const cardSize = cardSizes.find((c) => c.id === photocard.size_id);
    const [owned, setOwned] = useState(wasOwned);
    const [wishlisted, setWishlisted] = useState(wasWishlisted);

    function OptionalDialog(
        show: boolean,
        children: React.ReactNode,
        title: string,
        description: string,
        submit: string,
        onSubmit: () => void,
    ) {
        if (show) {
            return (
                <AlertDialogTriggerButton title={title} description={description} submit={submit} onSubmit={onSubmit}>
                    {children}
                </AlertDialogTriggerButton>
            );
        }
        return children;
    }

    function DialogIfNotSignedIn(children: React.ReactNode) {
        return OptionalDialog(
            session === null,
            children,
            "Sign In Required",
            "Please sign in to access this feature.",
            "Sign In",
            () => {
                signInGoogle("/photocard/" + photocard.id);
            },
        );
    }

    function MarkFavoriteDialog(children: React.ReactNode) {
        if (session === null) {
            return DialogIfNotSignedIn(children);
        }
        if (userData?.profile_photocard_id !== null && userData?.profile_photocard_id !== photocard.id) {
            return OptionalDialog(
                true,
                children,
                "Mark as Favorite",
                "You already have a favorite card. Are you sure you want to overwrite it?",
                "Yes",
                () => {
                    updateUserData({ profile_photocard_id: photocard.id });
                },
            );
        } else {
            return cloneElement(children as React.ReactElement<{ onClick: () => void }>, {
                onClick: () => {
                    if (userData?.profile_photocard_id === photocard.id) {
                        updateUserData({ profile_photocard_id: null });
                    } else {
                        updateUserData({ profile_photocard_id: photocard.id });
                    }
                },
            });
        }
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
                {photocard?.mod_temporary && <SubmitAltImageDialog id={photocard.id} />}
                <Button asChild className="w-fit">
                    <Link href={reportWindowURL(ReportType.Error, "/photocard/" + photocard.id, "Photocard error")}>
                        Report an Error
                    </Link>
                </Button>
            </div>
            <div className="flex flex-col gap-4 w-2/3">
                <div className="flex flex-col gap">
                    <div className="flex flex-row justify-between">
                        <h2>{collection?.name}</h2>
                        <Button hidden={session?.user.role === Role.USER}>
                            <Link href={`/createCollection?collectionId=${collection?.id}`}>Edit Collection</Link>
                        </Button>
                    </div>
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
                                <Link href={"/profile/" + imageContributor.user_id}>@{imageContributor.username}</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 items-end justify-center">
                        {DialogIfNotSignedIn(
                            <Button
                                onClick={() => {
                                    if (owned) {
                                        removePhotocardFromOwned(photocard.id);
                                        setOwned(false);
                                    } else {
                                        addPhotocardToOwned(photocard.id);
                                        setOwned(true);
                                        // Also removes it from the wishlist
                                        setWishlisted(false);
                                    }
                                }}
                                className={`${owned ? "bg-third" : ""} pl-2 pr-3 w-fit`}
                            >
                                <img src="/flipthru_addtobinder.svg" className="size-8" />
                                {owned ? "Remove from Owned" : "Add to Owned"}
                            </Button>,
                        )}
                        {DialogIfNotSignedIn(
                            <Button
                                onClick={() => {
                                    if (wishlisted) {
                                        removePhotocardFromWishlist(photocard.id);
                                        setWishlisted(false);
                                    } else {
                                        addPhotocardToWishlist(photocard.id);
                                        setWishlisted(true);
                                    }
                                }}
                                disabled={owned}
                                className={`${wishlisted ? "bg-third" : ""} pl-2 pr-3 w-fit`}
                            >
                                <img src="/flipthru_addtowishlist.svg" className="size-8" />
                                {wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                            </Button>,
                        )}
                        {MarkFavoriteDialog(
                            <Button
                                className={`pl-2 pr-3 w-fit ${userData?.profile_photocard_id === photocard.id ? "bg-third" : ""}`}
                            >
                                <img src="/flipthru_addtocollection.svg" className="size-8" />
                                {userData?.profile_photocard_id === photocard.id
                                    ? "Remove as Favorite"
                                    : "Mark as Favorite"}
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
