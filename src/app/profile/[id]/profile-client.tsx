"use client";

import PhotocardComponent from "@/app/photocard";
import {
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
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";

function SocialsComponent({ logoSrc, id }: { logoSrc: string; id?: string | null }) {
    return (
        <div className="flex flex-row gap-2 items-center">
            <img src={logoSrc} className="size-8" />
            <p>{id ?? ""}</p>
        </div>
    );
}

const formSchema = z.object({
    username: z.string().min(1).max(MAX_USERNAME_LENGTH).nullable(),
    description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH).nullable(),
    army_since: z.date().nullable(),
    bias: z.enum(MemberToInt).nullable(),
    bcd_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    bluesky_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    twitter_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    instagram_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    discord_id: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    spotify_playlist: z.string().min(1).max(MAX_EXTERNAL_SITE_USERNAME_LENGTH).nullable(),
    image: z.instanceof(File).nullable(),
    disable_cursor: z.boolean().nullable(),
    disable_effects: z.boolean().nullable(),
});

export default function ProfileClient({ userData }: { userData: Selectable<UserData> }) {
    const { session, sessionRefetch, setError } = useMetadata();
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

    function onEdit() {
        if (isEditing) {
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
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
                        <div className="flex flex-row gap-3 items-center">
                            <SocialsComponent logoSrc="/b-cd.png" id={userData.bcd_id} />
                            <SocialsComponent logoSrc="/bluesky.svg" id={userData.bluesky_id} />
                            <SocialsComponent logoSrc="/twitter.svg" id={userData.twitter_id} />
                            <SocialsComponent logoSrc="/instagram.svg" id={userData.instagram_id} />
                            <SocialsComponent logoSrc="/discord.svg" id={userData.discord_id} />
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
                                    <Button type={isEditing ? "submit" : "button"} onClick={onEdit}>
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
                                                <Input
                                                    type="date"
                                                    value={field.value?.toISOString().split("T")[0] ?? ""}
                                                    onChange={field.onChange}
                                                    className="w-fit"
                                                />
                                            )}
                                        />
                                    ) : (
                                        <p>
                                            {userData.army_since
                                                ? dateToString(userData.army_since)
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
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        ></iframe>
                    </div>
                    <div className="flex flex-col gap-4 w-1/4 items-left justify-center">
                        <Switch defaultChecked={!userData.disable_cursor} />
                        <p>Custom cursor</p>
                        <Switch defaultChecked={!userData.disable_effects} />
                        <p>Card effects</p>
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
