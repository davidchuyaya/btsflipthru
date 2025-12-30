"use client";

import { useState } from "react";
import { NameToMember, ReportType, reportWindowURL, Result } from "@/constants";
import { DEFAULT_CARD_TYPE, useMetadata } from "@/metadata-context";
import { uploadFullPhotocard, uploadThumbnailPhotocard } from "@/actions";
import {
    BackImageType,
    CardSize,
    CardType,
    ExclusiveCountry,
    ParsedCollection,
    Photocard,
} from "@/db";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Combobox from "@/components/ui/combobox";
import { ExpandIcon, PlusIcon, ShrinkIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription, FieldContent } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImageDropzone } from "../image-dropzone";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TooltipComponent from "@/components/ui/tooltip";
import MultiCombobox from "@/components/ui/multi-combobox";

interface LocalPhotocard {
    frontImage: File | null;
    backImage: File | null;
    backImageType: BackImageType;
    members: NameToMember[];
    cardSize?: CardSize;
    temporary: boolean;
    cardType: CardType;
    exclusiveCountry: ExclusiveCountry;
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
                frontImage: z.instanceof(File).nullable(),
                backImage: z.instanceof(File).nullable(),
                backImageType: z.enum(BackImageType),
                members: z.array(z.enum(NameToMember)).min(1, "At least one member must be selected"),
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
                exclusiveCountry: z.enum(ExclusiveCountry),
            }),
        )
        .min(1, "At least one photocard is required"),
});

function CreatePhotocardRowComponent({
    index,
    cardSizes: possibleCardSizes,
    cardTypes: possibleCardTypes,
    forceBackImage,
    onSameBackImageClick,
    onCreateCardType,
    onCreateCardSize,
    onRemovePhotocard,
    expandImages,
}: {
    index: number;
    cardSizes: Array<CardSize>;
    cardTypes: Array<CardType>;
    forceBackImage: File | null;
    onSameBackImageClick: (backImage: File) => void;
    onCreateCardType: (name: string, index: number) => void;
    onCreateCardSize: (cardSize: CardSize, index: number) => void;
    onRemovePhotocard: () => void;
    expandImages: boolean;
}) {
    const { setError } = useMetadata();
    const { control } = useFormContext<z.infer<typeof formSchema>>();
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
        // Match format: "Name WidthxHeight" (e.g., "Standard 55x85")
        const match = sizeString.match(/^(.+?)\s+(\d+)\s*x\s*(\d+)$/i);
        if (!match) {
            setError('Please provide dimensions in the format "Name WidthxHeight" (e.g., "Standard 55x85")');
            return;
        }

        const name = match[1].trim();
        if (name === "") {
            setError("Name cannot be empty.");
            return;
        }

        const width = Number(match[2]);
        const height = Number(match[3]);
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            setError("Width and height must be positive numbers.");
            return;
        }
        onCreateCardSize({ name, width, height }, index);
    }

    return (
        <TableRow key={index}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>
                <Controller
                    name={`photocards.${index}.frontImage`}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <div className="flex justify-center w-full">
                                <ImageDropzone onImageChanged={field.onChange} expand={expandImages} shortDescription />
                            </div>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    name={`photocards.${index}.backImage`}
                    control={control}
                    render={({ field: backField }) => (
                        <Controller
                            name={`photocards.${index}.backImageType`}
                            control={control}
                            render={({ field: typeField }) => (
                                <Controller
                                    name={`photocards.${index}.frontImage`}
                                    control={control}
                                    render={({ field: frontField }) => (
                                        <Field className="flex flex-col items-center w-full">
                                            <ToggleGroup
                                                className="w-auto!"
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
                                                {Object.entries(BackImageType).map(
                                                    ([name, value]) => (
                                                        <ToggleGroupItem
                                                            key={value}
                                                            value={value.toString()}
                                                            className=" data-[state=on]:bg-main data-[state=on]:font-bold"
                                                        >
                                                            {name}
                                                        </ToggleGroupItem>
                                                    ),
                                                )}
                                            </ToggleGroup>

                                            <ImageDropzone
                                                disableUpload={typeField.value !== BackImageType.Image}
                                                onImageChanged={backField.onChange}
                                                forceImage={
                                                    typeField.value === BackImageType.Image
                                                        ? forceBackImage
                                                        : frontField.value
                                                }
                                                imgClassName={backImageClassName(typeField.value)}
                                                expand={expandImages}
                                                shortDescription
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    if (backField.value) {
                                                        onSameBackImageClick(backField.value);
                                                    }
                                                }}
                                                className="max-w-35 mt-0.5"
                                                hidden={backField.value === null || index !== 0}
                                            >
                                                Apply to all
                                            </Button>
                                        </Field>
                                    )}
                                />
                            )}
                        />
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    name={`photocards.${index}.members`}
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <div className="flex justify-center w-full">
                                <MultiCombobox
                                    items={Object.entries(NameToMember)}
                                    allItem="OT7"
                                    selectedItems={field.value}
                                    onSelect={(items) => field.onChange([...items])}
                                />
                            </div>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    control={control}
                    name={`photocards.${index}.cardSize`}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <div className="flex justify-center w-full">
                                <Combobox
                                    items={possibleCardSizes.map((cs) => [`${cs.name} ${cs.width}x${cs.height}`, cs])}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onCreate={createCardSizeFromString}
                                    isEqual={(a, b) => a?.id === b?.id && a?.name === b?.name}
                                />
                            </div>
                            {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    control={control}
                    name={`photocards.${index}.cardType`}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <div className="flex justify-center w-full">
                                <Combobox
                                    items={possibleCardTypes.map((ct) => [ct.name, ct])}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onCreate={(name) => onCreateCardType(name, index)}
                                    isEqual={(a, b) => a?.id === b?.id && a?.name === b?.name}
                                    className="min-w-30"
                                />
                            </div>
                        </Field>
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    name={`photocards.${index}.temporary`}
                    control={control}
                    render={({ field }) => (
                        <div className="flex justify-center w-full">
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    name={`photocards.${index}.exclusiveCountry`}
                    control={control}
                    render={({ field }) => (
                        <div className="flex justify-center w-full">
                            <Combobox
                                items={Object.entries(ExclusiveCountry)}
                                value={field.value}
                                onValueChange={field.onChange}
                            />
                        </div>
                    )}
                />
            </TableCell>
            <TableCell>
                <Button type="button" size="icon" onClick={onRemovePhotocard} hidden={index === 0}>
                    <Trash2Icon />
                </Button>
            </TableCell>
        </TableRow>
    );
}

export default function CreateCollectionComponent() {
    const {
        collectionTypes,
        cardTypes,
        cardSizes,
        addCollection,
        addCollectionType,
        addCardType,
        addCardSize,
        setError,
    } = useMetadata();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            collectionName: "",
            releaseDate: "",
            collectionTypes: [{ name: "", id: undefined }],
            photocards: [getDefaultPhotocard()],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "photocards",
    });

    const [sameBackImage, setSameBackImage] = useState<File | null>(null);
    const [expandImages, setExpandImages] = useState<boolean>(false);

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
            frontImage: null,
            backImage: null,
            backImageType: BackImageType.Image,
            members: [],
            temporary: false,
            cardType: DEFAULT_CARD_TYPE,
            exclusiveCountry: ExclusiveCountry.Global,
        };
    }

    function onAddPhotocard() {
        const newPhotocard = getDefaultPhotocard();
        const lastPhotocard = form.getValues("photocards")[fields.length - 1];
        // Copy over card size and type from last photocard if exists
        if (lastPhotocard) {
            newPhotocard.cardSize = lastPhotocard.cardSize;
            newPhotocard.cardType = lastPhotocard.cardType;
            newPhotocard.exclusiveCountry = lastPhotocard.exclusiveCountry;
        }
        append(newPhotocard);
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

    function onSameBackImageClick(backImage: File) {
        const currentPhotocards = form.getValues("photocards");
        currentPhotocards.forEach((_, index) => {
            form.setValue(`photocards.${index}.backImage`, backImage);
        });
        setSameBackImage(backImage);
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
        console.log("Submitting collection", data);
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
            if (photocard.frontImage) {
                uniqueImageSizes.add(photocard.frontImage.size);
            }
            if (photocard.backImage) {
                uniqueImageSizes.add(photocard.backImage.size);
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
            imageId: localPhotocard.frontImage ? imageSizeToUUID.get(localPhotocard.frontImage.size)! : null,
            backImageId: localPhotocard.backImage ? imageSizeToUUID.get(localPhotocard.backImage.size)! : null,
            backImageType: localPhotocard.backImageType as BackImageType,
            cardType: localPhotocard.cardType!.id!,
            sizeId: localPhotocard.cardSize!.id!,
            effects: null, // TODO: Allow effects
            temporary: localPhotocard.temporary,
            exclusiveCountry: localPhotocard.exclusiveCountry as ExclusiveCountry,

            rm: localPhotocard.members.includes(NameToMember.RM),
            jimin: localPhotocard.members.includes(NameToMember.Jimin),
            jungkook: localPhotocard.members.includes(NameToMember["Jung Kook"]),
            v: localPhotocard.members.includes(NameToMember.V),
            jin: localPhotocard.members.includes(NameToMember.Jin),
            suga: localPhotocard.members.includes(NameToMember.Suga),
            jhope: localPhotocard.members.includes(NameToMember["j-hope"]),

            imageContributorId: "", // Placeholder, will be set in `createSetInDB`
            updatedAt: Date.now(), // Placeholder, will be set in `createSetInDB`
        }));

        // Call the server and create DB entries
        const result = await addCollection(collection, photocardsToCreate);
        if (!result) {
            // Don't need to display toast here, `addCollection` already does
            return;
        }

        // Upload each unique image in parallel
        // Images are already converted to AVIF on selection, so we just upload them directly
        const uploadPromises: Promise<Result<boolean>>[] = [];
        const uploadedSizes = new Set<number>();

        for (const photocard of data.photocards) {
            if (photocard.frontImage && !uploadedSizes.has(photocard.frontImage.size)) {
                const imageId = imageSizeToUUID.get(photocard.frontImage.size)!;
                const image = photocard.frontImage;
                uploadedSizes.add(image.size);
                const imageForm = new FormData();
                imageForm.set("image", image);
                imageForm.set("imageId", imageId);
                uploadPromises.push(uploadFullPhotocard(imageForm));
                uploadPromises.push(uploadThumbnailPhotocard(imageForm));
            }
            if (photocard.backImage && !uploadedSizes.has(photocard.backImage.size)) {
                const imageId = imageSizeToUUID.get(photocard.backImage.size)!;
                const image = photocard.backImage;
                uploadedSizes.add(image.size);
                const imageForm = new FormData();
                imageForm.set("image", image);
                imageForm.set("imageId", imageId);
                uploadPromises.push(uploadFullPhotocard(imageForm));
                uploadPromises.push(uploadThumbnailPhotocard(imageForm));
            }
        }

        if (uploadPromises.length === 0) {
            toast.success("Collection created successfully!");
            form.reset();
            setSameBackImage(null);
            return;
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
                error: (error) => ({
                    message: "Error uploading images: " + error.message,
                    action: {
                        label: "Report",
                        onClick: () => {
                            const url = reportWindowURL(ReportType.Error, error.message);
                            window.open(url, "_blank");
                        },
                    },
                }),
            },
        );
    }

    return (
        <FormProvider {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.error("Form validation errors:", errors);
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
                            <Button type="button" size="icon" onClick={onAddCollectionType}>
                                <PlusIcon />
                            </Button>
                        </div>
                    </Field>
                </FieldGroup>

                <Table>
                    <TableHeader>
                        <TableRow className="table-header-row">
                            <TableHead>#</TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Front
                                    <TooltipComponent>
                                        Upload a clear, high-quality scan of the front of your card.
                                    </TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Back
                                    <TooltipComponent>
                                        Upload a clear, high-quality scan of the back of your card. Alternatively,
                                        select "white" if the card back is completely white; select "transparent" if
                                        your card is transparent and the front is visibly mirrored on the back.
                                    </TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Member(s)
                                    <TooltipComponent>Which member(s) is/are on this card?</TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Size
                                    <TooltipComponent>
                                        What is the size category and exact dimensions, in millimeters, of the physical
                                        photocard? <i>(Ex: "Standard 55x85")</i>
                                    </TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Type
                                    <TooltipComponent>
                                        Does your card have a special classification?{" "}
                                        <i>(Ex: Pre-order Benefit, Lucky Draw, Powerstation)</i> If not, select "N/A".
                                    </TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Temp
                                    <TooltipComponent>
                                        Is your image imperfect or your card clearly damaged? If so, select this to
                                        allow other users to upload alternatives.
                                    </TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="table-head-horizontal">
                                    Exclusive
                                    <TooltipComponent>
                                        Is your card only directly available in a specific country?{" "}
                                        <i>(Ex: Japan pop-up event cards)</i> If not, select "Global".
                                    </TooltipComponent>
                                </div>
                            </TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <CreatePhotocardRowComponent
                                key={field.id}
                                index={index}
                                cardSizes={cardSizes}
                                cardTypes={cardTypes}
                                forceBackImage={sameBackImage}
                                onSameBackImageClick={onSameBackImageClick}
                                onCreateCardSize={onCreateCardSize}
                                onCreateCardType={onCreateCardType}
                                onRemovePhotocard={() => onRemovePhotocard(index)}
                                expandImages={expandImages}
                            />
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={9} className="text-center bg-none!">
                                <Button size="icon" type="button" onClick={onAddPhotocard}>
                                    <PlusIcon className="inline-block" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>

                <Button type="submit" className="mb-16">
                    Upload
                </Button>
            </form>

            <Button
                type="button"
                className="fixed right-16 bottom-16 z-10 bg-third"
                onClick={() => setExpandImages(!expandImages)}
            >
                {expandImages ? (
                    <>
                        <ShrinkIcon /> Collapse pictures
                    </>
                ) : (
                    <>
                        <ExpandIcon /> Expand pictures
                    </>
                )}
            </Button>
        </FormProvider>
    );
}
