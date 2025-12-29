"use client";

import { useState } from "react";
import {
    MEMBER_TO_OFFICIAL_NAME,
    Result,
} from "@/constants";
import { DEFAULT_CARD_TYPE, useMetadata } from "../metadata-context";
import { uploadImage } from "@/actions";
import {
    BACK_IMAGE_TYPES_NAME_TO_ENUM,
    BackImageType,
    CardSize,
    CardType,
    EXCLUSIVE_COUNTRIES_NAME_TO_ENUM,
    ExclusiveCountry,
    ParsedCollection,
    Photocard,
} from "@/db";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Combobox from "@/components/ui/combobox";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldSeparator,
    FieldGroup,
    FieldDescription,
    FieldContent,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConvertedImage, ImageDropzone } from "../image-dropzone";

interface LocalPhotocard {
    convertedImage: ConvertedImage | null;
    convertedBackImage: ConvertedImage | null;
    backImageType: number;

    rm: boolean;
    jimin: boolean;
    jungkook: boolean;
    v: boolean;
    jin: boolean;
    suga: boolean;
    jhope: boolean;

    cardSize?: CardSize;
    temporary: boolean;
    cardType: CardType;
    exclusiveCountry: number;
}

const formSchema = z.object({
    collectionName: z.string().min(1, "Collection name is required"),
    releaseDate: z.string().min(1, "Release date is required"),
    collectionTypes: z
        .array(
            z.object({
                id: z
                    .number()
                    .optional()
                    .refine((id) => id !== undefined, {
                        message: "Please select a collection category",
                    }),
                name: z.string(),
            }),
        )
        .min(1, "At least one collection category must be selected"),
    photocards: z
        .array(
            z.object({
                convertedImage: z.any().nullable(),
                convertedBackImage: z.any().nullable(),
                backImageType: z.number(),
                rm: z.boolean(),
                jimin: z.boolean(),
                jungkook: z.boolean(),
                v: z.boolean(),
                jin: z.boolean(),
                suga: z.boolean(),
                jhope: z.boolean(),
                cardSize: z
                    .object({
                        id: z.number().optional(),
                        name: z.string(),
                        width: z.number(),
                        height: z.number(),
                    })
                    .optional()
                    .refine((val) => val !== undefined, { message: "Card size is required" }),
                temporary: z.boolean(),
                cardType: z.object({
                    id: z.number().optional(),
                    name: z.string(),
                }),
                exclusiveCountry: z.number(),
            }),
        )
        .min(1, "At least one photocard is required"),
});

function CreatePhotocardComponent({
    index,
    cardSizes: possibleCardSizes,
    cardTypes: possibleCardTypes,
    forceConvertedBackImage,
    onSameBackImageClick,
    onSameCardTypeClick,
    onSameCardSizeClick,
    onCreateCardType,
    onCreateCardSize,
    onRemovePhotocard,
}: {
    index: number;
    cardSizes: Array<CardSize>;
    cardTypes: Array<CardType>;
    forceConvertedBackImage: ConvertedImage | null;
    onSameBackImageClick: (converted: ConvertedImage) => void;
    onSameCardTypeClick: (cardType: CardType) => void;
    onSameCardSizeClick: (cardSize: CardSize) => void;
    onCreateCardType: (name: string, index: number) => void;
    onCreateCardSize: (cardSize: CardSize, index: number) => void;
    onRemovePhotocard: () => void;
}) {
    const { control, setValue, watch } = useFormContext<z.infer<typeof formSchema>>();
    function backImageClassName(backImageType: BackImageType) {
        switch (backImageType) {
            case BackImageType.White:
                return "white-filter";
            case BackImageType.Transparent:
                return "flip-horizontal";
            default:
                return "";
        }
    }

    function createCardSizeFromString(sizeString: string) {
        const parts = sizeString.split("-");
        if (parts.length !== 2) {
            toast.error('Please provide dimensions in the format "Name - Width x Height mm"');
            return;
        }
        const name = parts[0].trim();
        if (name === "") {
            toast.error("Name cannot be empty.");
            return;
        }

        const dimensionPart = parts[1].trim().replace(/\s*mm\s*$/i, "");
        const dimensions = dimensionPart.split("x");
        if (dimensions.length !== 2) {
            toast.error('Please provide dimensions in the format "Name - Width x Height mm"');
            return;
        }
        const width = Number(dimensions[0].trim());
        const height = Number(dimensions[1].trim());
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            toast.error("Width and height must be positive numbers.");
            return;
        }
        onCreateCardSize({ name, width, height }, index);
    }

    return (
        <Card className="min-w-115">
            <CardHeader>
                <CardTitle>Photocard #{index + 1}</CardTitle>
                <CardDescription>Leave the front and back images blank if you do not have them.</CardDescription>
                <CardAction>
                    <Button type="button" size="icon" onClick={onRemovePhotocard}>
                        <Trash2Icon />
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <FieldGroup>
                    <Controller
                        name={`photocards.${index}.convertedImage`}
                        control={control}
                        render={({ field }) => (
                            <ImageDropzone
                                label="Front"
                                description="Upload a clear, high-quality scan of the front of your card."
                                onImageConverted={field.onChange}
                            />
                        )}
                    />
                    <FieldSeparator />

                    <Controller
                        name={`photocards.${index}.convertedBackImage`}
                        control={control}
                        render={({ field: backField }) => (
                            <Controller
                                name={`photocards.${index}.backImageType`}
                                control={control}
                                render={({ field: typeField }) => (
                                    <Controller
                                        name={`photocards.${index}.convertedImage`}
                                        control={control}
                                        render={({ field: frontField }) => (
                                            <Field>
                                                <FieldLabel>Back</FieldLabel>
                                                <FieldDescription>
                                                    Upload a clear, high-quality scan of the back of your card.
                                                    Alternatively, select “white” if the card back is completely white;
                                                    select “transparent” if your card is transparent and the front is
                                                    visibly mirrored on the back.
                                                </FieldDescription>
                                                <FieldContent>
                                                    <ToggleGroup
                                                        type="single"
                                                        variant="outline"
                                                        value={typeField.value.toString()}
                                                        onValueChange={(value) => {
                                                            if (value) {
                                                                const selectedType = Number(value);
                                                                typeField.onChange(selectedType);
                                                                // If changing to non-image type, clear back image
                                                                if (selectedType !== BackImageType.Image) {
                                                                    backField.onChange(null);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {BACK_IMAGE_TYPES_NAME_TO_ENUM.map(
                                                            ([backImageTypeName, backImageTypeEnum]) => (
                                                                <ToggleGroupItem
                                                                    key={backImageTypeEnum}
                                                                    value={backImageTypeEnum.toString()}
                                                                    className=" data-[state=on]:bg-main data-[state=on]:font-bold"
                                                                >
                                                                    {backImageTypeName}
                                                                </ToggleGroupItem>
                                                            ),
                                                        )}
                                                    </ToggleGroup>

                                                    <ImageDropzone
                                                        className="mt-3"
                                                        disableUpload={typeField.value !== BackImageType.Image}
                                                        onImageConverted={backField.onChange}
                                                        forceConvertedImage={
                                                            typeField.value === BackImageType.Image
                                                                ? forceConvertedBackImage
                                                                : frontField.value
                                                        }
                                                        imgClassName={backImageClassName(typeField.value)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={() => {
                                                            if (backField.value) {
                                                                onSameBackImageClick(backField.value);
                                                            }
                                                        }}
                                                        className="max-w-35"
                                                        hidden={backField.value === null}
                                                    >
                                                        Apply to all
                                                    </Button>
                                                </FieldContent>
                                            </Field>
                                        )}
                                    />
                                )}
                            />
                        )}
                    />
                    <FieldSeparator />

                    <Field>
                        <FieldLabel>Member</FieldLabel>
                        <FieldDescription>Which member(s) is/are on this card?</FieldDescription>
                        {["rm", "jin", "suga", "jhope", "jimin", "v", "jungkook"].map((member) => (
                            <Controller
                                key={member}
                                name={`photocards.${index}.${member}` as any}
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        text={MEMBER_TO_OFFICIAL_NAME[member as keyof typeof MEMBER_TO_OFFICIAL_NAME]}
                                    />
                                )}
                            />
                        ))}
                        {(() => {
                            const photocard = watch(`photocards.${index}`);
                            const isOT7 =
                                photocard?.rm &&
                                photocard?.jimin &&
                                photocard?.jungkook &&
                                photocard?.v &&
                                photocard?.jin &&
                                photocard?.suga &&
                                photocard?.jhope;
                            return (
                                <Checkbox
                                    checked={isOT7}
                                    onCheckedChange={() => {
                                        const newValue = !isOT7;
                                        setValue(`photocards.${index}.rm`, newValue);
                                        setValue(`photocards.${index}.jimin`, newValue);
                                        setValue(`photocards.${index}.jungkook`, newValue);
                                        setValue(`photocards.${index}.v`, newValue);
                                        setValue(`photocards.${index}.jin`, newValue);
                                        setValue(`photocards.${index}.suga`, newValue);
                                        setValue(`photocards.${index}.jhope`, newValue);
                                    }}
                                    text="OT7"
                                />
                            );
                        })()}
                    </Field>

                    <FieldSeparator />

                    <Controller
                        control={control}
                        name={`photocards.${index}.cardSize`}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Card Size</FieldLabel>
                                <FieldDescription>
                                    What is the size category and exact dimensions in millimeters of the physical
                                    photocard? <i>(Ex: “Standard - 55 x 85 mm”)</i>{" "}
                                </FieldDescription>
                                <Combobox
                                    items={possibleCardSizes.map((cs) => [
                                        `${cs.name} - ${cs.width} x ${cs.height} mm`,
                                        cs,
                                    ])}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onCreate={createCardSizeFromString}
                                    isEqual={(a, b) => a?.id === b?.id && a?.name === b?.name}
                                />
                                {fieldState.error && <FieldError errors={[fieldState.error]} />}
                                <Button
                                    type="button"
                                    hidden={field.value === undefined}
                                    className="max-w-35"
                                    onClick={() => onSameCardSizeClick(field.value!)}
                                >
                                    Apply to all
                                </Button>
                            </Field>
                        )}
                    />

                    <FieldSeparator />

                    <Controller
                        control={control}
                        name={`photocards.${index}.cardType`}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel>Card Type</FieldLabel>
                                <FieldDescription>
                                    Does your card have a special classification?{" "}
                                    <i>(Ex: Pre-order Benefit, Lucky Draw, Powerstation)</i> If not, select “N/A”.
                                </FieldDescription>
                                <Combobox
                                    items={possibleCardTypes.map((ct) => [ct.name, ct])}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onCreate={(name) => onCreateCardType(name, index)}
                                    isEqual={(a, b) => a?.id === b?.id && a?.name === b?.name}
                                />
                                <Button
                                    type="button"
                                    hidden={field.value === undefined}
                                    className="max-w-35"
                                    onClick={() => onSameCardTypeClick(field.value!)}
                                >
                                    Apply to all
                                </Button>
                            </Field>
                        )}
                    />

                    <FieldSeparator />

                    <Controller
                        name={`photocards.${index}.temporary`}
                        control={control}
                        render={({ field }) => (
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel>Mark as temporary</FieldLabel>
                                    <FieldDescription>
                                        Is your image imperfect or your card clearly damaged? If so, select this to
                                        allow other users to upload alternatives.
                                    </FieldDescription>
                                </FieldContent>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </Field>
                        )}
                    />

                    <FieldSeparator />

                    <Controller
                        name={`photocards.${index}.exclusiveCountry`}
                        control={control}
                        render={({ field }) => (
                            <Field>
                                <FieldContent>
                                    <FieldLabel>Exclusive Country</FieldLabel>
                                    <FieldDescription>
                                        Is your card only directly available in a specific country?{" "}
                                        <i>(Ex: Japan pop-up event cards)</i> If not, select “Global”.
                                    </FieldDescription>
                                </FieldContent>
                                <Combobox
                                    items={EXCLUSIVE_COUNTRIES_NAME_TO_ENUM}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                />
                            </Field>
                        )}
                    />
                </FieldGroup>
            </CardContent>
        </Card>
    );
}

export default function CreateCollectionComponent() {
    const { collectionTypes, cardTypes, cardSizes, addCollection, addCollectionType, addCardType, addCardSize } =
        useMetadata();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            collectionName: "",
            releaseDate: "",
            collectionTypes: [{ name: "", id: undefined }],
            photocards: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "photocards",
    });

    const [sameBackImage, setSameBackImage] = useState<ConvertedImage | null>(null);

    function onAddCollectionType() {
        const currentTypes = form.getValues("collectionTypes");
        // Don't add if there's already an empty one
        if (currentTypes.some((ct) => ct.id === undefined)) return;
        form.setValue("collectionTypes", [...currentTypes, { name: "", id: undefined }]);
    }

    function onRemoveCollectionType(index: number) {
        const currentTypes = form.getValues("collectionTypes");
        // Don't remove the only one
        if (currentTypes.length <= 1) return;
        currentTypes.splice(index, 1);
        form.setValue("collectionTypes", currentTypes);
    }

    async function onCreateCollectionType(name: string, index: number) {
        const id = await addCollectionType({ name });
        if (id !== undefined) {
            // Update the form field with the newly created collection type
            form.setValue(`collectionTypes.${index}`, { name, id });
        }
    }

    async function onCreateCardType(name: string, index: number) {
        const id = await addCardType({ name });
        if (id !== undefined) {
            // Update the form field with the newly created card type
            form.setValue(`photocards.${index}.cardType`, { name, id });
        }
    }

    async function onCreateCardSize(cardSize: CardSize, index: number) {
        const id = await addCardSize(cardSize);
        if (id !== undefined) {
            // Update the form field with the newly created card size
            form.setValue(`photocards.${index}.cardSize`, { ...cardSize, id });
        }
    }

    function getDefaultPhotocard(): LocalPhotocard {
        return {
            convertedImage: null,
            convertedBackImage: null,
            backImageType: BackImageType.Image,
            rm: false,
            jimin: false,
            jungkook: false,
            v: false,
            jin: false,
            suga: false,
            jhope: false,
            temporary: false,
            cardType: DEFAULT_CARD_TYPE,
            exclusiveCountry: ExclusiveCountry.Global,
        };
    }

    function onAddPhotocard() {
        append(getDefaultPhotocard());
    }

    function onRemovePhotocard(index: number) {
        remove(index);
    }

    function onAddPhotocardForEachMember() {
        const members = ["rm", "jimin", "jungkook", "v", "jin", "suga", "jhope"];
        const newPhotocards = members.map((member) => {
            const photocard = getDefaultPhotocard();
            (photocard as any)[member] = true;
            return photocard;
        });
        newPhotocards.forEach((pc) => append(pc));
    }

    function onSameBackImageClick(converted: ConvertedImage) {
        const currentPhotocards = form.getValues("photocards");
        currentPhotocards.forEach((_, index) => {
            form.setValue(`photocards.${index}.convertedBackImage`, converted);
        });
        setSameBackImage(converted);
    }

    function onSameCardSizeClick(cardSize: CardSize) {
        const currentPhotocards = form.getValues("photocards");
        currentPhotocards.forEach((_, index) => {
            form.setValue(`photocards.${index}.cardSize`, cardSize);
        });
    }

    function onSameCardTypesClick(cardType: CardType) {
        const currentPhotocards = form.getValues("photocards");
        currentPhotocards.forEach((_, index) => {
            form.setValue(`photocards.${index}.cardType`, cardType);
        });
    }

    /**
     * Upload the collection and photocards.
     * Note that the upload is not transactional; writes to the DB will happen before the photos are uploaded, to reduce the chance of straggling images.
     *
     * Converts `LocalPhotocard` to `Photocard` and call `createCollectionInDB`.
     */
    async function onSubmit(data: z.infer<typeof formSchema>) {
        const collectionTypesIds = data.collectionTypes
            .filter((collectionType) => collectionType.id !== undefined)
            .map((collectionType) => collectionType.id!);

            const collection: ParsedCollection = {
                name: data.collectionName,
                releaseDate: new Date(data.releaseDate),
                collectionTypes: collectionTypesIds,
            };

            // Find the number of unique images we have to upload
            // Use the fullSize byteLength as a proxy, since we don't want to compare ArrayBuffers
            // No 2 converted images should have the exact size
            const uniqueImageSizes = new Set<number>();
            for (const photocard of data.photocards) {
                if (photocard.convertedImage) {
                    uniqueImageSizes.add(photocard.convertedImage.fullSize.byteLength);
                }
                if (photocard.convertedBackImage) {
                    uniqueImageSizes.add(photocard.convertedBackImage.fullSize.byteLength);
                }
            }

            // Create UUIDs
            // This is safe to do on the client side because any (malicious) collisions will just result in:
            // 1. Pointers to the wrong image, or
            // 2. Broken images
            // (We don't allow overwriting existing images when uploading, see `actions/uploadImage`)
            const imageSizeToUUID = new Map<number, string>();
            uniqueImageSizes.forEach((size) => {
                imageSizeToUUID.set(size, crypto.randomUUID());
            });

            // Create Photocard objects
            const photocardsToCreate: Photocard[] = data.photocards.map((localPhotocard) => ({
                collectionId: 0, // Placeholder, will be set in `createCollectionInDB`
                imageId: localPhotocard.convertedImage
                    ? imageSizeToUUID.get(localPhotocard.convertedImage.fullSize.byteLength)!
                    : null,
                backImageId: localPhotocard.convertedBackImage
                    ? imageSizeToUUID.get(localPhotocard.convertedBackImage.fullSize.byteLength)!
                    : null,
                backImageType: localPhotocard.backImageType as BackImageType,
                cardType: localPhotocard.cardType!.id!,
                sizeId: localPhotocard.cardSize!.id!,
                effects: null, // TODO: Allow effects
                temporary: localPhotocard.temporary,
                exclusiveCountry: localPhotocard.exclusiveCountry as ExclusiveCountry,

                rm: localPhotocard.rm,
                jimin: localPhotocard.jimin,
                jungkook: localPhotocard.jungkook,
                v: localPhotocard.v,
                jin: localPhotocard.jin,
                suga: localPhotocard.suga,
                jhope: localPhotocard.jhope,

                imageContributorId: "", // Placeholder, will be set in `createSetInDB`
                updatedAt: Date.now(), // Placeholder, will be set in `createSetInDB`
            }));

            // Call the server and create DB entries
            const result = await addCollection(collection, photocardsToCreate);
            if (!result) {
                toast.error("Error uploading collection to server");
                return;
            }

            // Upload each unique image in parallel
            // Images are already converted to AVIF on selection, so we just upload them directly
            const uploadPromises: Promise<Result<boolean>>[] = [];
            const uploadedSizes = new Set<number>();

            for (const photocard of data.photocards) {
                if (photocard.convertedImage && !uploadedSizes.has(photocard.convertedImage.fullSize.byteLength)) {
                    const imageId = imageSizeToUUID.get(photocard.convertedImage.fullSize.byteLength)!;
                    const converted = photocard.convertedImage;
                    uploadedSizes.add(converted.fullSize.byteLength);
                    uploadPromises.push(uploadImage(converted.fullSize, converted.thumbnail, imageId));
                }
                if (
                    photocard.convertedBackImage &&
                    !uploadedSizes.has(photocard.convertedBackImage.fullSize.byteLength)
                ) {
                    const backImageId = imageSizeToUUID.get(photocard.convertedBackImage.fullSize.byteLength)!;
                    const converted = photocard.convertedBackImage;
                    uploadedSizes.add(converted.fullSize.byteLength);
                    uploadPromises.push(uploadImage(converted.fullSize, converted.thumbnail, backImageId));
                }
            }

            toast.promise(
                Promise.all(uploadPromises).then((results) => {
                    const error = results.find((res) => res.error);
                    if (error) {
                        throw new Error(error.error);
                    }
                }),
                {
                    loading: "Uploading images...",
                    success: (data) => {
                        form.reset();
                        setSameBackImage(null);
                        return "All images uploaded successfully!";
                    },
                    error: (error) => `Error uploading images: ${error.message}`,
                },
            );
    }

    return (
        <FormProvider {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    // Only show toast for errors not associated with a specific visible field
                    if (errors.photocards && !Array.isArray(errors.photocards)) {
                        toast.error(errors.photocards.message);
                    }
                })}
                className="flex flex-col gap-4 m-4 items-center"
            >
                <FieldGroup className="max-w-200">
                    <Controller
                        control={form.control}
                        name="collectionName"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel>Collection Name</FieldLabel>
                                    <FieldDescription>
                                        What release title is your card associated with, not including the year?{" "}
                                        <i>(Ex: Proof; Map of the Soul ON:E; Season’s Greetings)</i>
                                    </FieldDescription>
                                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                                </FieldContent>
                                <Input
                                    {...field}
                                    id={field.name}
                                    aria-invalid={fieldState.invalid}
                                    className="max-w-100"
                                    placeholder="Love Yourself: Answer"
                                />
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="releaseDate"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel htmlFor={field.name}>Release date</FieldLabel>
                                    <FieldDescription>
                                        When was this card first released? <i>(Ex: 09/14/2018)</i>
                                    </FieldDescription>
                                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                                </FieldContent>
                                <Input
                                    {...field}
                                    id={field.name}
                                    type="date"
                                    aria-invalid={fieldState.invalid}
                                    className="max-w-40"
                                />
                            </Field>
                        )}
                    />

                    <Field orientation="horizontal">
                        <FieldContent>
                            <FieldLabel>Collection Category</FieldLabel>
                            <FieldDescription>
                                What type of release is this? <i>(Ex: Album, DVD, Annual Package)</i>
                            </FieldDescription>
                            {form.formState.errors.collectionTypes?.message && (
                                <FieldError>{form.formState.errors.collectionTypes.message}</FieldError>
                            )}
                        </FieldContent>
                        <div className="flex flex-col gap-2 flex-1 items-end">
                            {form.watch("collectionTypes").map((collectionType, index) => (
                                <Controller
                                    key={index}
                                    name={`collectionTypes.${index}`}
                                    control={form.control}
                                    render={({ field, fieldState }) => {
                                        const error = (fieldState.error as any)?.id || fieldState.error;
                                        return (
                                            <>
                                                <Combobox
                                                    value={field.value}
                                                    items={collectionTypes.map((ct) => [ct.name, ct])}
                                                    onValueChange={field.onChange}
                                                    onCreate={(name) => onCreateCollectionType(name, index)}
                                                    onDelete={
                                                        index > 0 ? () => onRemoveCollectionType(index) : undefined
                                                    }
                                                    isEqual={(a, b) => a?.id === b?.id && a?.name === b?.name}
                                                    className="min-w-40"
                                                />
                                                {error && <FieldError errors={[error]} />}
                                            </>
                                        );
                                    }}
                                />
                            ))}
                            <Button type="button" className="max-w-35" onClick={onAddCollectionType}>
                                <PlusIcon /> Add Another
                            </Button>
                        </div>
                    </Field>

                    <div className="flex flex-row gap-4 justify-center">
                        <Button type="button" onClick={onAddPhotocard}>
                            Add Photocard
                        </Button>
                        <Button type="button" onClick={onAddPhotocardForEachMember}>
                            Add a Photocard for Each Member
                        </Button>
                    </div>
                </FieldGroup>

                <div className="flex flex-wrap gap-4 justify-center">
                    {fields.map((field, index) => (
                        <CreatePhotocardComponent
                            key={field.id}
                            index={index}
                            cardSizes={cardSizes}
                            cardTypes={cardTypes}
                            forceConvertedBackImage={sameBackImage}
                            onSameBackImageClick={onSameBackImageClick}
                            onSameCardSizeClick={onSameCardSizeClick}
                            onSameCardTypeClick={onSameCardTypesClick}
                            onCreateCardSize={onCreateCardSize}
                            onCreateCardType={onCreateCardType}
                            onRemovePhotocard={() => onRemovePhotocard(index)}
                        />
                    ))}
                </div>

                <Button type="submit">Upload</Button>
            </form>
        </FormProvider>
    );
}
