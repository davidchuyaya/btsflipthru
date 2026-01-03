import {
    BackImageType,
    CardSize,
    CardType,
    ExclusiveCountry,
} from "@/db";
import { ImageDropzone } from "@/app/image-dropzone";
import { useMetadata } from "@/metadata-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card";
import Combobox from "@/components/ui/combobox";
import {
    FieldGroup,
    FieldSeparator,
    Field,
    FieldLabel,
    FieldDescription,
    FieldContent,
    FieldError,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Trash2Icon } from "lucide-react";
import { useFormContext, Controller } from "react-hook-form";
import z from "zod";
import { NameToMember, MEMBERS } from "@/constants";

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
                exclusiveCountry: z.enum(ExclusiveCountry),
            }),
        )
        .min(1, "At least one photocard is required"),
});

function CreatePhotocardComponent({
    index,
    cardSizes: possibleCardSizes,
    cardTypes: possibleCardTypes,
    forceBackImage,
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
    forceBackImage: File | null;
    onSameBackImageClick: (file: File) => void;
    onSameCardTypeClick: (cardType: CardType) => void;
    onSameCardSizeClick: (cardSize: CardSize) => void;
    onCreateCardType: (name: string, index: number) => void;
    onCreateCardSize: (cardSize: CardSize, index: number) => void;
    onRemovePhotocard: () => void;
}) {
    const { setError } = useMetadata();
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
                        name={`photocards.${index}.frontImage`}
                        control={control}
                        render={({ field }) => (
                            <ImageDropzone
                                label="Front"
                                description="Upload a clear, high-quality scan of the front of your card."
                                onImageChanged={field.onChange}
                                onDelete={() => field.onChange(null)}
                            />
                        )}
                    />
                    <FieldSeparator />

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
                                                        {Object.entries(BackImageType).map(
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
                                                        onImageChanged={backField.onChange}
                                                        onDelete={() => backField.onChange(null)}
                                                        forceImage={
                                                            typeField.value === BackImageType.Image
                                                                ? forceBackImage
                                                                : frontField.value // TODO: The logic here (and in other parts of this file) is out-of-date
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
                        {Object.entries(NameToMember).map(([officialName, member]) => (
                            <Controller
                                key={member}
                                name={`photocards.${index}.${member}` as any}
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        text={officialName}
                                    />
                                )}
                            />
                        ))}
                        {(() => {
                            const photocard = watch(`photocards.${index}`);
                            const isOT7 = MEMBERS.every((m) => (photocard as any)?.[m]);
                            return (
                                <Checkbox
                                    checked={isOT7}
                                    onCheckedChange={() => {
                                        const newValue = !isOT7;
                                        MEMBERS.forEach((m) => setValue(`photocards.${index}.${m}` as any, newValue));
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
                                    photocard? <i>(Ex: “Standard 55x85”)</i>{" "}
                                </FieldDescription>
                                <Combobox
                                    items={possibleCardSizes.map((cs) => [`${cs.name} ${cs.width}x${cs.height}`, cs])}
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
                                    items={Object.entries(ExclusiveCountry)}
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
