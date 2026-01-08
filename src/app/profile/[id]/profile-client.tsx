"use client";

import PhotocardComponent from "@/app/photocard";
import {
    collectionDisplayName,
    dateToString,
    Effects,
    fullSizeUrl,
    MAX_DESCRIPTION_LENGTH,
    MAX_EXTERNAL_SITE_USERNAME_LENGTH,
    MAX_USERNAME_LENGTH,
    MemberToInt,
    Role,
} from "@/constants";
import { useMetadata } from "@/metadata-context";
import { Button } from "@/components/ui/button";
import { Selectable } from "kysely";
import { UserData } from "@/db";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
    username: z.string().min(1).max(MAX_USERNAME_LENGTH).nullable(),
    description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH).nullable(),
    army_since: z.number().nullable(),
    bias: z.enum(MemberToInt).nullable(),
    bcd_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    bluesky_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    twitter_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    instagram_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    discord_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    spotify_playlist: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    image: z.instanceof(File).nullable(),
});

export default function ProfileClient({ userData }: { userData: Selectable<UserData> }) {
    const {
        collections,
        cursorDisabled,
        updateCursorDisabled,
        effectsDisabled,
        updateEffectsDisabled,
        session,
        sessionRefetch,
        setError,
    } = useMetadata();
    const isSelf = session?.user.id === userData.user_id;
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
        const id = userData[fieldName];
        let url = "";
        switch (fieldName) {
            case "instagram_id":
                url = "https://www.instagram.com/" + id;
                break;
            case "twitter_id":
                url = "https://x.com/" + id;
                break;
            case "bluesky_id":
                url = "https://bsky.app/profile/" + id;
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
            <div className="flex flex-col items-center" hidden={!id && !isEditing}>
                <div className="flex flex-row items-center justify-center gap-4">
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
                        <Button variant="imageShadow" asChild>
                            <Link href={url}>{id}</Link>
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values);
    }

    return (
        <div className="flex flex-col gap-8 items-stretch justify-center">
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex flex-row gap-8 m-12">
                    <div className="flex flex-col gap-8 items-center w-1/4 shrink-0">
                        <PhotocardComponent
                            src={userData.image_id ? fullSizeUrl(userData.image_id) : null}
                            effects={Effects.Matte}
                            large
                        />
                        <div className={`flex ${isEditing ? "flex-col" : "flex-row"} gap-3 items-center`}>
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
                                            <Input value={field.value?.toUpperCase() ?? ""} onChange={field.onChange} />
                                        )}
                                    />
                                ) : (
                                    <h2 className="grow">{userData.username ?? "N/A"}</h2>
                                )}
                                {isSelf && (
                                    <Button
                                        type={isEditing ? "submit" : "button"}
                                        onClick={() => setIsEditing(!isEditing)}
                                    >
                                        {isEditing ? "Save Profile" : "Edit Profile"}
                                    </Button>
                                )}
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
                                                    defaultValue={
                                                        field.value
                                                            ? collectionDisplayName(
                                                                  collections.find(
                                                                      (col) => col.id === userData.army_since,
                                                                  ),
                                                              )
                                                            : ""
                                                    }
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
                                                    defaultValue={
                                                        field.value ? Object.keys(MemberToInt)[field.value] : ""
                                                    }
                                                    onValueChange={(value) =>
                                                        field.onChange(Object.keys(MemberToInt)[Number(value)])
                                                    }
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
                                        <p>{userData.bias ?? "N/A"}</p>
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
                        <iframe
                            data-testid="embed-iframe"
                            style={{ borderRadius: "16px" }}
                            src="https://open.spotify.com/embed/playlist/43rCH6ObxLcq6d3bhg8J0l?utm_source=generator"
                            width="100%"
                            height="152"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        ></iframe>
                    </div>
                    <div className="flex flex-col gap-4 w-1/4 items-left justify-center">
                        <Label className="flex flex-row">
                            <Switch
                                defaultChecked={!cursorDisabled}
                                onCheckedChange={(checked) => {
                                    updateCursorDisabled(!checked);
                                }}
                            />
                            Custom cursor
                        </Label>
                        <Label className="flex flex-row">
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
