"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import {
    membersToBooleans,
    booleansToMembers,
    NameToMember,
    PresignedUrl,
    ReportType,
    reportWindowURL,
    Result,
    fullSizeUrl,
    thumbnailUrl,
} from "@/constants";
import { useMetadata } from "@/metadata-context";
import { generateSignedUploadUrlForPhotocards, getCollectionForEdit, updateCollectionInDB } from "@/actions";
import {
    BackImageType,
    CardSize,
    CardType,
    DEFAULT_CARD_TYPE,
    Effects,
    ExclusiveCountry,
    ParsedCollection,
    Photocard,
    Role,
} from "@/db";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Combobox from "@/components/ui/combobox";
import { ExpandIcon, PlusIcon, ShrinkIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription, FieldContent } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImageDropzone, ImageDropzoneRef } from "../image-dropzone";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TooltipComponent from "@/components/ui/tooltip";
import MultiCombobox from "@/components/ui/multi-combobox";
import { cardSizeToString, createCardSizeFromString, uploadImage } from "@/actions-client";
import { isAtLeastMod } from "@/auth-client";

interface LocalPhotocard {
    id?: number;
    frontImage: File | null;
    frontImageId?: string | null;
    effects: Effects;
    backImage: File | null;
    backImageId?: string | null;
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
    version: z.string(),
    versionOrder: z.number().min(1, "Version order must be at least 1").optional(),
    photocards: z
        .array(
            z.object({
                id: z.number().optional(),
                frontImage: z.instanceof(File).nullable(),
                frontImageId: z.string().optional().nullable(),
                effects: z.enum(Effects),
                backImage: z.instanceof(File).nullable(),
                backImageId: z.string().optional().nullable(),
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
    isLocked,
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
    isLocked: boolean;
}) {
    const { setError } = useMetadata();
    const { control, getValues, setValue } = useFormContext<z.infer<typeof formSchema>>();
    const backImageRef = useRef<ImageDropzoneRef>(null);

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

    function createCardSizeFromInputs(sizeString: string) {
        // Match format: "Name WidthxHeight" (e.g., "Standard 55x85")
        const result = createCardSizeFromString(sizeString);
        if (result.error) {
            setError(result.error);
            return;
        }
        onCreateCardSize(result.data!, index);
    }

    const frontImage = useWatch({ control, name: `photocards.${index}.frontImage` });
    const frontImageId = useWatch({ control, name: `photocards.${index}.frontImageId` });
    const backImage = useWatch({ control, name: `photocards.${index}.backImage` });
    const backImageId = useWatch({ control, name: `photocards.${index}.backImageId` });
    const backImageType = useWatch({ control, name: `photocards.${index}.backImageType` });

    const bothFrontAndBackUploaded = useMemo(() => {
        const frontSelected = frontImage != null || !!frontImageId;
        const backSelected = backImage != null || !!backImageId || forceBackImage != null;
        const backTypeAcceptable = backImageType === BackImageType.White || backImageType === BackImageType.Transparent;

        return frontSelected && (backSelected || backTypeAcceptable);
    }, [frontImage, frontImageId, backImage, backImageId, forceBackImage, backImageType]);

    const prevBothRef = useRef<boolean>(bothFrontAndBackUploaded);

    useEffect(() => {
        if (isLocked) return; // Don't auto-update if locked
        if (bothFrontAndBackUploaded && !prevBothRef.current) {
            setValue(`photocards.${index}.temporary`, false);
        } else if (!bothFrontAndBackUploaded && prevBothRef.current) {
            setValue(`photocards.${index}.temporary`, true);
        }
        prevBothRef.current = bothFrontAndBackUploaded;
    }, [bothFrontAndBackUploaded, index, setValue, isLocked]);

    return (
        <TableRow key={index}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>
                <Controller
                    name={`photocards.${index}.frontImage`}
                    control={control}
                    render={({ field: frontField, fieldState: frontFieldState }) => (
                        <Controller
                            name={`photocards.${index}.effects`}
                            control={control}
                            render={({ field: effectsField }) => (
                                <Field
                                    data-invalid={frontFieldState.invalid}
                                    className="flex flex-col items-center w-full"
                                >
                                    <ToggleGroup
                                        className="w-auto!"
                                        type="single"
                                        variant="outline"
                                        disabled={isLocked}
                                        value={effectsField.value.toString()}
                                        onValueChange={(v) => effectsField.onChange(Number(v))}
                                    >
                                        {Object.entries(Effects).map(([name, value]) => (
                                            <ToggleGroupItem
                                                key={value}
                                                value={value.toString()}
                                                className=" data-[state=on]:bg-main data-[state=on]:font-bold"
                                            >
                                                {name}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                    <div className="flex justify-center w-full">
                                        <ImageDropzone
                                            onImageChanged={frontField.onChange}
                                            onDelete={() => {
                                                // If the back image depends on the front image, clear it too
                                                if (
                                                    getValues().photocards[index].backImageType !== BackImageType.Image
                                                ) {
                                                    setValue(`photocards.${index}.backImageType`, BackImageType.Image);
                                                    setValue(`photocards.${index}.backImage`, null);
                                                    backImageRef.current?.delete();
                                                }
                                                frontField.onChange(null);
                                                // If we had a cloud ID, clear it too
                                                if (frontImageId) {
                                                    setValue(`photocards.${index}.frontImageId`, null);
                                                }
                                            }}
                                            expand={expandImages}
                                            effects={effectsField.value}
                                            shortDescription
                                            disableUpload={isLocked}
                                            image={
                                                frontField.value ?? (frontImageId ? fullSizeUrl(frontImageId) : null)
                                            }
                                        />
                                    </div>
                                    {frontFieldState.error && <FieldError errors={[frontFieldState.error]} />}
                                </Field>
                            )}
                        />
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
                                                disabled={isLocked}
                                                value={typeField.value.toString()}
                                                onValueChange={(value) => {
                                                    if (value) {
                                                        const selectedType = Number(value);
                                                        // If changing from image to non-image type or vice versa, clear back image
                                                        if (
                                                            (selectedType !== BackImageType.Image &&
                                                                typeField.value === BackImageType.Image) ||
                                                            (selectedType === BackImageType.Image &&
                                                                typeField.value !== BackImageType.Image)
                                                        ) {
                                                            backField.onChange(null);
                                                            setValue(`photocards.${index}.backImageId`, null);
                                                            backImageRef.current?.delete();
                                                        }
                                                        typeField.onChange(selectedType);
                                                    }
                                                }}
                                            >
                                                {Object.entries(BackImageType).map(([name, value]) => (
                                                    <ToggleGroupItem
                                                        key={value}
                                                        value={value.toString()}
                                                        className=" data-[state=on]:bg-main data-[state=on]:font-bold"
                                                    >
                                                        {name}
                                                    </ToggleGroupItem>
                                                ))}
                                            </ToggleGroup>

                                            <ImageDropzone
                                                ref={backImageRef}
                                                disableUpload={typeField.value !== BackImageType.Image || isLocked}
                                                onImageChanged={backField.onChange}
                                                onDelete={() => {
                                                    backField.onChange(null);
                                                    if (backImageId) {
                                                        setValue(`photocards.${index}.backImageId`, null);
                                                    }
                                                }}
                                                image={
                                                    typeField.value === BackImageType.Image
                                                        ? (backField.value ??
                                                          (backImageId ? thumbnailUrl(backImageId) : null))
                                                        : (frontField.value ??
                                                          (frontImageId ? thumbnailUrl(frontImageId) : null))
                                                }
                                                imgClassName={backImageClassName(typeField.value)}
                                                expand={expandImages}
                                                effects={Effects.Matte} // Back is always matte
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
                                                hidden={backField.value === null || index !== 0 || isLocked}
                                                disabled={isLocked}
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
                                    disabled={isLocked}
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
                                    items={possibleCardSizes.map((cs) => [cardSizeToString(cs), cs])}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onCreate={createCardSizeFromInputs}
                                    isEqual={(a, b) => a?.id === b?.id && a?.name === b?.name}
                                    disabled={isLocked}
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
                                    disabled={isLocked}
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
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!bothFrontAndBackUploaded || isLocked}
                            />
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
                                disabled={isLocked}
                            />
                        </div>
                    )}
                />
            </TableCell>
            <TableCell>
                <Button type="button" size="icon" onClick={onRemovePhotocard} hidden={index === 0} disabled={isLocked}>
                    <Trash2Icon />
                </Button>
            </TableCell>
        </TableRow>
    );
}

function CreateCollectionInner() {
    const {
        collectionTypes,
        cardTypes,
        cardSizes,
        addCollection,
        addCollectionType,
        addCardType,
        addCardSize,
        setError,
        session,
    } = useMetadata();

    const searchParams = useSearchParams();
    const router = useRouter();
    const collectionId = searchParams.get("collectionId");
    const isAdmin = session?.user?.role === Role.ADMIN;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            collectionName: "",
            releaseDate: "",
            version: "",
            versionOrder: undefined,
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [photocardLocked, setPhotocardLocked] = useState<boolean[]>([]);

    useEffect(() => {
        const fetchCollection = async () => {
            if (!collectionId) return;

            setIsLoading(true);
            const result = await getCollectionForEdit(Number(collectionId));
            if (result.error) {
                setError(result.error);
                setIsLoading(false);
                return;
            }

            if (!result.data) {
                setError("Collection not found");
                setIsLoading(false);
                return;
            }

            const { collection, photocards } = result.data;
            setPhotocardLocked(
                photocards.map((p) => {
                    switch (session?.user.role) {
                        case Role.ADMIN:
                            return false;
                        case Role.MOD:
                            return !p.adminTemporary;
                        default:
                            return !p.modTemporary;
                    }
                }),
            );
            const formPhotocards: LocalPhotocard[] = photocards.map((p, index) => ({
                id: p.id,
                frontImage: null,
                frontImageId: p.imageId,
                effects: p.effects as Effects,
                backImage: null,
                backImageId: p.backImageId,
                backImageType: p.backImageType as BackImageType,
                members: booleansToMembers(p),
                cardSize: cardSizes.find((s) => s.id === p.sizeId)!,
                temporary: isAdmin ? p.adminTemporary : p.modTemporary,
                cardType: cardTypes.find((t) => t.id === p.cardType)!,
                exclusiveCountry: p.exclusiveCountry as ExclusiveCountry,
            }));

            const formCollectionTypes = collection.collectionTypes.map((id) => {
                const ct = collectionTypes.find((t) => t.id === id);
                return ct ? { name: ct.name, id: ct.id } : { name: "", id };
            });

            form.reset({
                collectionName: collection.name,
                releaseDate: collection.releaseDate.toISOString().split("T")[0],
                version: collection.version || "",
                versionOrder: collection.versionOrder ?? undefined,
                collectionTypes: formCollectionTypes.length > 0 ? formCollectionTypes : [{ name: "", id: undefined }],
                photocards: formPhotocards,
            });
            setIsLoading(false);
        };

        if (collectionId && cardSizes.length > 0 && collectionTypes.length > 0 && cardTypes.length > 0) {
            fetchCollection();
        }
    }, [collectionId, cardSizes, collectionTypes, cardTypes, form, setError, isAdmin]);

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
            effects: Effects.Matte,
            backImage: null,
            backImageType: BackImageType.Image,
            members: [],
            temporary: true, // True unless both front & back are uploaded
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

    function onSameBackImageClick(backImage: File) {
        const currentPhotocards = form.getValues("photocards");
        currentPhotocards.forEach((_, index) => {
            form.setValue(`photocards.${index}.backImage`, backImage);
        });
        setSameBackImage(backImage);
    }

    /**
     * Upload the collection and photocards.
     * Note that the upload is not transactional; writes to the DB will happen before the photos are uploaded, to reduce the chance of straggling images.
     *
     * Converts `LocalPhotocard` to `Photocard` and call `createCollectionInDB`.
     */
    async function onSubmit(data: z.infer<typeof formSchema>) {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Separate photocards into those with new images and those without
        const photocardsWithFiles = data.photocards.filter((p) => p.frontImage != null || p.backImage != null);

        // Identify unique files to upload based on file size
        const uniqueFilesToUpload = new Map<number, File>();
        for (const p of photocardsWithFiles) {
            if (p.frontImage) uniqueFilesToUpload.set(p.frontImage.size, p.frontImage);
            if (p.backImage) uniqueFilesToUpload.set(p.backImage.size, p.backImage);
        }

        let signedUrls: PresignedUrl[] = [];
        const fileToPresignedUrl = new Map<number, PresignedUrl>();

        if (uniqueFilesToUpload.size > 0) {
            const uploadResult = await generateSignedUploadUrlForPhotocards(uniqueFilesToUpload.size);
            if (uploadResult.error) {
                setError(uploadResult.error);
                setIsSubmitting(false);
                return;
            }
            signedUrls = uploadResult.data!;

            // Map each unique file to a signed URL
            let urlIndex = 0;
            for (const [size, _] of uniqueFilesToUpload) {
                fileToPresignedUrl.set(size, signedUrls[urlIndex]);
                urlIndex++;
            }
        }

        const uploadedPhotocards: Photocard[] = [];

        for (const p of data.photocards) {
            let frontImageId = p.frontImageId || null;
            let backImageId = p.backImageId || null;

            // Assign IDs for new images
            if (p.frontImage) {
                frontImageId = fileToPresignedUrl.get(p.frontImage.size)?.params.public_id || null;
            }

            if (p.backImage) {
                backImageId = fileToPresignedUrl.get(p.backImage.size)?.params.public_id || null;
            }

            const members = membersToBooleans(new Set(p.members));
            const photocard: Photocard = {
                ...(p.id ? { id: p.id } : {}),
                collectionId: Number(collectionId) || 0, // Will be ignored if creating new
                imageId: frontImageId,
                backImageId: backImageId,
                backImageType: p.backImageType,
                cardType: p.cardType.id || null,
                sizeId: p.cardSize!.id!, // Must exist
                effects: p.effects,
                exclusiveCountry: Number(p.exclusiveCountry),
                modTemporary: p.temporary, // Backend sets this
                adminTemporary: p.temporary, // Backend sets this
                ...members,
                imageContributorId: "", // Backend sets this
                updatedAt: Date.now(), // Backend sets this
            };
            uploadedPhotocards.push(photocard);
        }

        const collectionTypesIds = data.collectionTypes
            .filter((collectionType) => collectionType.id !== undefined)
            .map((collectionType) => collectionType.id!);

        const collection: ParsedCollection = {
            name: data.collectionName,
            releaseDate: new Date(data.releaseDate),
            collectionTypes: collectionTypesIds,
            version: data.version === "" ? null : data.version,
            versionOrder: data.versionOrder ?? null,
        };

        if (collectionId) {
            const result = await updateCollectionInDB(Number(collectionId), collection, uploadedPhotocards);
            if (result.error) {
                setError(result.error);
                setIsSubmitting(false);
                return;
            }
        } else {
            const success = await addCollection(collection, uploadedPhotocards);
            if (!success) {
                setError("Failed to add collection");
                setIsSubmitting(false);
                return;
            }
        }

        // Upload each unique image in parallel
        const uploadPromises: Promise<Result<boolean>>[] = [];
        for (const file of uniqueFilesToUpload.values()) {
            uploadPromises.push(uploadImage(fileToPresignedUrl.get(file.size)!, file));
        }

        if (uploadPromises.length > 0) {
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
                        if (!collectionId) {
                            form.reset();
                            setSameBackImage(null);
                        }
                        setIsSubmitting(false);
                        return "All images uploaded successfully!";
                    },
                    error: (error) => {
                        setIsSubmitting(false);
                        return {
                            message: "Error uploading images: " + error.message,
                            action: {
                                label: "Report",
                                onClick: () => {
                                    const url = reportWindowURL(ReportType.Error, "/createCollection", error.message);
                                    window.open(url, "_blank");
                                },
                            },
                        };
                    },
                },
            );
            return; // Let toast handle completion
        } else {
            if (!collectionId) {
                form.reset();
                setSameBackImage(null);
            }
        }
        setIsSubmitting(false);
    }

    return (
        <FormProvider {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.error("Form validation errors:", errors);
                })}
                className="flex flex-col gap-4 m-4 items-center"
                hidden={!isAtLeastMod(session)}
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
                        name="version"
                        render={({ field }) => (
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel>Version Name (Optional)</FieldLabel>
                                    <FieldDescription>
                                        Is this release title one of multiple versions?{" "}
                                        <i>(Ex: Love Yourself: Answer has 4 versions: S, E, L, and F.)</i>
                                    </FieldDescription>
                                </FieldContent>
                                <Input {...field} id={field.name} className="max-w-50" placeholder="S" />
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="versionOrder"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} orientation="horizontal">
                                <FieldContent>
                                    <FieldLabel>Version Order (Optional)</FieldLabel>
                                    <FieldDescription>
                                        If there are multiple versions, what order should this be in?{" "}
                                        <i>(Ex: S, E, L, F are ordered 1, 2, 3, 4 respectively.)</i>
                                    </FieldDescription>
                                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                                </FieldContent>
                                <Input
                                    {...field}
                                    id={field.name}
                                    type="number"
                                    value={field.value ?? ""}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                                    }
                                    className="max-w-20"
                                    placeholder="1"
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

                <Table className="mt-8">
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
                                    Size (mm)
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
                                isLocked={photocardLocked[index] ?? false}
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

export default function CreateCollectionPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateCollectionInner />
        </Suspense>
    );
}
