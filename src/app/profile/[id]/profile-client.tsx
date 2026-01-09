"use client";

import PhotocardComponent, { PlaceholderType } from "@/app/photocard";
import {
    collectionDisplayName,
    Effects,
    fullSizeUrl,
    MAX_DESCRIPTION_LENGTH,
    MAX_EXTERNAL_SITE_USERNAME_LENGTH,
    MAX_USERNAME_LENGTH,
    memberIntsToName,
    MemberToInt,
    ReportType,
    reportWindowURL,
    Role,
    SPOTIFY_PLAYLIST_ID_LENGTH,
    USERNAME_ERROR_TEXT,
    USERNAME_REGEX,
} from "@/constants";
import { useMetadata } from "@/metadata-context";
import { Button } from "@/components/ui/button";
import { Selectable, Updateable } from "kysely";
import { UserData } from "@/db";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";
import { ImageDropzone } from "@/app/image-dropzone";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { uploadImage } from "@/actions-client";
import { toast } from "sonner";

const formSchema = z.object({
    username: z.string().min(1).max(MAX_USERNAME_LENGTH).regex(USERNAME_REGEX, USERNAME_ERROR_TEXT).nullable(),
    description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH).nullable(),
    army_since: z.number().nullable(),
    bias: z.enum(MemberToInt).nullable(),
    bcd_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    bluesky_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    twitter_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    instagram_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    discord_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    spotify_playlist: z.string().length(SPOTIFY_PLAYLIST_ID_LENGTH).nullable(),
    image: z.instanceof(File).nullish(),
});

export default function ProfileClient({ userData: serverUserData }: { userData: Selectable<UserData> }) {
    const {
        userData: freshestUserData,
        collections,
        cursorDisabled,
        updateCursorDisabled,
        effectsDisabled,
        updateEffectsDisabled,
        session,
        updateUserData,
        sessionRefetch,
        setError,
    } = useMetadata();
    const isSelf = session?.user.id === serverUserData.user_id;
    const userData = isSelf && freshestUserData ? freshestUserData : serverUserData;
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ...userData,
            bias: userData.bias as MemberToInt,
            image: undefined,
        },
    });

    function SocialsComponent({
        fieldName,
    }: {
        fieldName: "bcd_id" | "bluesky_id" | "twitter_id" | "instagram_id" | "discord_id";
    }) {
        let logo = "";
        switch (fieldName) {
            case "instagram_id":
                logo = "/instagram.svg";
                break;
            case "twitter_id":
                logo = "/twitter.svg";
                break;
            case "bluesky_id":
                logo = "/bluesky.svg";
                break;
            case "bcd_id":
                logo = "/b-cd.png";
                break;
            case "discord_id":
                logo = "/discord.svg";
                break;
        }
        let id = userData[fieldName];
        // Strip the beginning @ if it exists
        if (id?.startsWith("@")) {
            id = id.substring(1);
        }
        let url = "";
        switch (fieldName) {
            case "instagram_id":
                url = "https://www.instagram.com/";
                break;
            case "twitter_id":
                url = "https://x.com/";
                break;
            case "bluesky_id":
                url = "https://bsky.app/profile/";
                break;
            case "bcd_id":
            case "discord_id":
                // Can't link
                url = "";
                break;
        }
        let placeholder = "";
        switch (fieldName) {
            case "bluesky_id":
                placeholder = "@btsflipthru.bsky.social";
                break;
            case "bcd_id":
            case "twitter_id":
            case "instagram_id":
            case "discord_id":
                placeholder = "@btsflipthru";
                break;
        }
        return (
            <div className="flex flex-row items-center justify-center gap-4" hidden={!id && !isEditing}>
                <Image src={logo} alt={fieldName} width={32} height={32} className="size-8" />
                {isEditing ? (
                    <Controller
                        control={form.control}
                        name={fieldName}
                        render={({ field }) => (
                            <Input value={field.value ?? ""} onChange={field.onChange} placeholder={placeholder} />
                        )}
                    />
                ) : (
                    <Button variant="underline" className="-ml-4" asChild>
                        {url === "" || id === null ? (
                            <p>@{id}</p>
                        ) : (
                            <Link href={`${url}${encodeURIComponent(id)}`} target="_blank">
                                @{id}
                            </Link>
                        )}
                    </Button>
                )}
            </div>
        );
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const hasImage = values.image !== undefined && values.image !== null;
        toast.promise(
            async () => {
                const { image, ...rest } = values;
                let newUserData: Updateable<UserData> = {
                    user_id: userData.user_id,
                };
                for (const [key, value] of Object.entries(rest)) {
                    if (value !== null) {
                        // @ts-expect-error - key is string, but we know it matches UserData keys
                        newUserData[key as keyof UserData] = value;
                    }
                }
                // If the user explicitly wants to delete the image, delete it
                if (values.image === null) {
                    newUserData.image_id = null;
                }

                const result = await updateUserData(newUserData, hasImage);
                if (result.error) {
                    throw new Error(result.error);
                }
                if (result.data) {
                    const uploadResult = await uploadImage(result.data, image!);
                    if (uploadResult.error) {
                        throw new Error(`Error uploading image: ${uploadResult.error}`);
                    }
                }
            },
            {
                loading: "Updating profile...",
                success: () => {
                    setIsEditing(false);
                    return hasImage
                        ? "Profile updated successfully! If you updated your image, it may take a moment to load."
                        : "Profile updated successfully!";
                },
                error: (error) => {
                    return {
                        message: "Error updating profile: " + error.message,
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
        <div className="flex flex-col gap-8 items-stretch justify-center mb-8">
            <form
                onSubmit={form.handleSubmit(onSubmit, (error) => {
                    console.log(error);
                })}
            >
                <div className="flex flex-row gap-8 m-12">
                    <div className="flex flex-col gap-4 items-center w-1/4 shrink-0">
                        {isEditing ? (
                            <Controller
                                control={form.control}
                                name="image"
                                render={({ field }) => (
                                    <ImageDropzone
                                        label="Profile image"
                                        image={
                                            field.value === undefined
                                                ? userData.image_id
                                                    ? fullSizeUrl(userData.image_id)
                                                    : null
                                                : field.value
                                        }
                                        onImageChanged={field.onChange}
                                        onDelete={() => field.onChange(null)}
                                        expand={true}
                                        placeholderType={PlaceholderType.ARMY}
                                    />
                                )}
                            />
                        ) : (
                            <PhotocardComponent
                                src={userData.image_id ? fullSizeUrl(userData.image_id) : null}
                                effects={Effects.Matte}
                                placeholderType={PlaceholderType.ARMY}
                                large
                            />
                        )}
                        <div className="flex flex-col gap-2 items-center">
                            <SocialsComponent fieldName="bcd_id" />
                            <SocialsComponent fieldName="bluesky_id" />
                            <SocialsComponent fieldName="instagram_id" />
                            <SocialsComponent fieldName="twitter_id" />
                            <SocialsComponent fieldName="discord_id" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 w-1/2">
                        <div className="flex flex-col gap">
                            <div className="flex flex-row gap-2">
                                {isEditing ? (
                                    <Controller
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <Input
                                                value={field.value?.toUpperCase() ?? ""}
                                                onChange={field.onChange}
                                                placeholder="Username"
                                            />
                                        )}
                                    />
                                ) : (
                                    <h2 className="grow">{userData.username ?? "N/A"}</h2>
                                )}
                                {isSelf &&
                                    (isEditing ? (
                                        <Button key="save-button" type="submit">
                                            Save Profile
                                        </Button>
                                    ) : (
                                        <Button
                                            key="edit-button"
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(true);
                                            }}
                                        >
                                            Edit Profile
                                        </Button>
                                    ))}
                            </div>
                            {isEditing ? (
                                <Controller
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <InputGroup className="mt-2">
                                            <InputGroupTextarea
                                                placeholder="Enter your description"
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                            />
                                            <InputGroupAddon align="block-end">
                                                <InputGroupText className="text-muted-foreground text-xs">
                                                    {MAX_DESCRIPTION_LENGTH - (field.value?.length ?? 0)} characters
                                                    left
                                                </InputGroupText>
                                            </InputGroupAddon>
                                        </InputGroup>
                                    )}
                                />
                            ) : (
                                <p className="text-2xl">{userData.description ?? "No description"}</p>
                            )}
                        </div>
                        <div className="flex flex-row gap-8">
                            <div className="flex flex-col gap-4 rounded-2xl p-8 bg-accent-light grow">
                                <div className="flex flex-row gap-4 items-center">
                                    <h3>Army Since</h3>
                                    {isEditing ? (
                                        <Controller
                                            control={form.control}
                                            name="army_since"
                                            render={({ field }) => (
                                                <Select
                                                    defaultValue={field.value?.toString() ?? ""}
                                                    onValueChange={(value) => field.onChange(Number(value))}
                                                >
                                                    <SelectTrigger className="w-fit bg-accent-light">
                                                        <SelectValue placeholder="Select a collection" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-accent-light">
                                                        <SelectGroup>
                                                            {collections
                                                                // Sort newest to oldest
                                                                .sort(
                                                                    (a, b) =>
                                                                        new Date(b.release_date).getTime() -
                                                                        new Date(a.release_date).getTime(),
                                                                )
                                                                .map((col) => (
                                                                    <SelectItem key={col.id} value={col.id.toString()}>
                                                                        {collectionDisplayName(col)}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    ) : (
                                        <p>
                                            {userData.army_since
                                                ? collectionDisplayName(
                                                      collections.find((col) => col.id === userData.army_since),
                                                  )
                                                : "N/A"}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-row gap-4 items-center">
                                    <h3>Bias</h3>
                                    {isEditing ? (
                                        <Controller
                                            control={form.control}
                                            name="bias"
                                            render={({ field }) => (
                                                <Select
                                                    defaultValue={field.value ? field.value.toString() : ""}
                                                    onValueChange={(value) => field.onChange(Number(value))}
                                                >
                                                    <SelectTrigger className="w-fit bg-accent-light">
                                                        <SelectValue placeholder="Select your bias" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-accent-light">
                                                        <SelectGroup>
                                                            {Object.entries(MemberToInt).map(([key, value]) => (
                                                                <SelectItem key={key} value={value.toString()}>
                                                                    {key}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    ) : (
                                        <p>{userData.bias ? memberIntsToName([userData.bias]) : "N/A"}</p>
                                    )}
                                </div>
                                <div className="flex flex-row gap-4 items-center">
                                    <h3>Photocards Collected</h3>
                                    <p>{userData.saved_photocards_count ?? 0}</p>
                                </div>
                                <div className="flex flex-row gap-4 items-center">
                                    <h3>Contributions</h3>
                                    <p>{userData.contributions ?? 0}</p>
                                </div>
                                <div className="flex flex-row gap-4 items-center">
                                    <h3>Role</h3>
                                    <p>{session && Object.keys(Role)[session.user.role]}</p>
                                    {session && session.user.role === Role.USER && (
                                        <Button onClick={sessionRefetch} type="button">
                                            Activate Mod
                                        </Button>
                                    )}
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
                        {isEditing ? (
                            <Controller
                                control={form.control}
                                name="spotify_playlist"
                                render={({ field }) => (
                                    <Field className="gap-2">
                                        <FieldLabel>Spotify Playlist ID</FieldLabel>
                                        <Input
                                            type="text"
                                            placeholder="43rCH6ObxLcq6d3bhg8J0l"
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                        />
                                        <FieldDescription>
                                            Go to your Spotify playlist in the browser. Copy the text that comes after
                                            "https://open.spotify.com/playlist/" in the URL.
                                        </FieldDescription>
                                    </Field>
                                )}
                            />
                        ) : (
                            <iframe
                                data-testid="embed-iframe"
                                style={{ borderRadius: "16px" }}
                                src={`https://open.spotify.com/embed/playlist/${userData.spotify_playlist ?? "43rCH6ObxLcq6d3bhg8J0l"}?utm_source=generator`}
                                width="100%"
                                height="152"
                                allowFullScreen
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                            ></iframe>
                        )}
                    </div>
                    <div className="flex flex-col gap-4 w-1/4 items-left justify-center">
                        <Label className="flex flex-row" hidden={!isSelf}>
                            <Switch
                                defaultChecked={!cursorDisabled}
                                onCheckedChange={(checked) => {
                                    updateCursorDisabled(!checked);
                                }}
                            />
                            Custom cursor
                        </Label>
                        <Label className="flex flex-row" hidden={!isSelf}>
                            <Switch
                                defaultChecked={!effectsDisabled}
                                onCheckedChange={(checked) => {
                                    updateEffectsDisabled(!checked);
                                }}
                            />
                            Card effects
                        </Label>
                        <p>Follow a user</p>
                    </div>
                </div>
            </form>
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
