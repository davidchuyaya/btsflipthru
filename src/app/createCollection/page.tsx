"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_COMPRESSION_HEIGHT_PX, THUMBNAIL_DISPLAY_HEIGHT_PX } from "@/constants";
import { useMetadata } from "../metadata-context";
import { uploadImage } from "@/actions";
import {
    BACK_IMAGE_TYPES_WITH_NAMES,
    BackImageType,
    CardSize,
    CardType,
    CollectionType,
    EXCLUSIVE_COUNTRIES_WITH_NAMES,
    ExclusiveCountry,
    ParsedCollection,
    Photocard,
} from "@/db";
import { convertToAvif, formatBytes, invokeOrError } from "../actions-client";

interface ConvertedImage {
    fullSize: ArrayBuffer;
    thumbnail: ArrayBuffer;
    previewUrl: string; // Object URL for preview
}

async function convertFileToImages(file: File): Promise<ConvertedImage> {
    const fullSize = await convertToAvif(file);
    const thumbnail = await convertToAvif(file, THUMBNAIL_COMPRESSION_HEIGHT_PX);
    const previewBlob = new Blob([thumbnail], { type: "image/webp" });
    const previewUrl = URL.createObjectURL(previewBlob);
    return { fullSize, thumbnail, previewUrl };
}

function UploadImageButton({
    desc,
    disableUpload,
    imgClassName,
    forceConvertedImage,
    onImageConverted,
}: {
    desc: string;
    disableUpload?: boolean;
    imgClassName?: string;
    forceConvertedImage?: ConvertedImage | null;
    onImageConverted: (converted: ConvertedImage) => void;
}) {
    const [convertedImage, setConvertedImage] = useState<ConvertedImage | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [showFileError, setShowFileError] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (forceConvertedImage) {
            setConvertedImage(forceConvertedImage);
        }
    }, [forceConvertedImage]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > MAX_IMAGE_SIZE_BYTES) {
                    setShowFileError(true);
                    return;
                }
                setShowFileError(false);
                setIsConverting(true);
                try {
                    const converted = await convertFileToImages(file);
                    setConvertedImage(converted);
                    onImageConverted(converted);
                } catch (err) {
                    console.error("Conversion failed:", err);
                    setShowFileError(true);
                } finally {
                    setIsConverting(false);
                }
            }
        }
    };

    const displayImage = convertedImage;

    return (
        <div>
            <p>{desc}</p>
            <input
                hidden={disableUpload}
                ref={inputRef}
                type="file"
                name="uploadImage"
                accept="image/png, image/jpeg, image/avif, image/webp"
                onChange={handleFileChange}
            />
            {isConverting && <p>Converting...</p>}
            {displayImage && !showFileError ? (
                <div>
                    <img
                        src={displayImage.previewUrl}
                        className={imgClassName}
                        alt="Preview"
                        height={THUMBNAIL_DISPLAY_HEIGHT_PX}
                        width={THUMBNAIL_DISPLAY_HEIGHT_PX}
                    />
                    <p>
                        Full: {formatBytes(displayImage.fullSize.byteLength)} | Thumb:{" "}
                        {formatBytes(displayImage.thumbnail.byteLength)}
                    </p>
                </div>
            ) : null}
            {showFileError ? (
                <p style={{ color: "red" }}>
                    File size exceeds {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit or conversion failed.
                </p>
            ) : null}
        </div>
    );
}

interface LocalPhotocard {
    convertedImage: ConvertedImage | null;
    convertedBackImage: ConvertedImage | null;
    backImageType: BackImageType;

    rm: boolean;
    jimin: boolean;
    jungkook: boolean;
    v: boolean;
    jin: boolean;
    suga: boolean;
    jhope: boolean;

    sizeId: number;
    temporary: boolean;
    cardType: CardType;
    exclusiveCountry: ExclusiveCountry;
}

const DEFAULT_ID = -1;
const DEFAULT_COLLECTION_TYPE: CollectionType = { id: DEFAULT_ID, name: "Select..." };
const DEFAULT_CARD_TYPE: CardType = { id: DEFAULT_ID, name: "Select..." };
const DEFAULT_CARD_SIZE: CardSize = {
    id: DEFAULT_ID,
    name: "Select...",
    width: 0,
    height: 0,
};

function CreatePhotocardComponent({
    photocard,
    possibleCardSizes,
    possibleCardTypes,
    forceConvertedBackImage,
    onChange,
    onSameBackImageClick,
    onSameCardTypeClick,
    onSameCardSizeClick,
}: {
    photocard: LocalPhotocard;
    possibleCardSizes: Array<CardSize>;
    possibleCardTypes: Array<CardType>;
    forceConvertedBackImage: ConvertedImage | null;
    onChange: (data: Partial<LocalPhotocard>) => void;
    onSameBackImageClick: (converted: ConvertedImage) => void;
    onSameCardTypeClick: (cardType: CardType) => void;
    onSameCardSizeClick: (cardSizeId: number) => void;
}) {
    const [showBackImageButton, setShowBackImageButton] = useState<boolean>(false);

    function handleFrontChange(converted: ConvertedImage) {
        onChange({ ...photocard, convertedImage: converted });
    }

    function handleBackChange(converted: ConvertedImage) {
        onChange({ ...photocard, convertedBackImage: converted });
        setShowBackImageButton(true);
    }

    function onChangeCardType(cardType: CardType) {
        onChange({ ...photocard, cardType: cardType });
    }

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

    return (
        <div>
            <UploadImageButton desc="Front" onImageConverted={handleFrontChange} />
            Back of card:
            {BACK_IMAGE_TYPES_WITH_NAMES.map(([name, value]) => (
                <label key={value}>
                    <input
                        type="radio"
                        name="backImageType"
                        checked={photocard.backImageType === value}
                        onChange={() => onChange({ ...photocard, backImageType: value })}
                    />
                    {name}
                </label>
            ))}
            <UploadImageButton
                desc="Back"
                disableUpload={photocard.backImageType !== BackImageType.Image}
                onImageConverted={handleBackChange}
                forceConvertedImage={
                    photocard.backImageType === BackImageType.Image ? forceConvertedBackImage : photocard.convertedImage
                }
                imgClassName={backImageClassName(photocard.backImageType)}
            />
            <button
                onClick={() => {
                    if (photocard.convertedBackImage) {
                        onSameBackImageClick(photocard.convertedBackImage);
                    }
                }}
                hidden={!showBackImageButton}
            >
                Use this back image for all current photocards
            </button>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.rm}
                    onChange={() => onChange({ ...photocard, rm: !photocard.rm })}
                />
                RM
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.jimin}
                    onChange={() => onChange({ ...photocard, jimin: !photocard.jimin })}
                />
                Jimin
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.jungkook}
                    onChange={() =>
                        onChange({
                            ...photocard,
                            jungkook: !photocard.jungkook,
                        })
                    }
                />
                Jungkook
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.v}
                    onChange={() => onChange({ ...photocard, v: !photocard.v })}
                />
                V
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.jin}
                    onChange={() => onChange({ ...photocard, jin: !photocard.jin })}
                />
                Jin
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.suga}
                    onChange={() => onChange({ ...photocard, suga: !photocard.suga })}
                />
                Suga
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.jhope}
                    onChange={() => onChange({ ...photocard, jhope: !photocard.jhope })}
                />
                J-Hope
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={
                        photocard.rm &&
                        photocard.jimin &&
                        photocard.jungkook &&
                        photocard.v &&
                        photocard.jin &&
                        photocard.suga &&
                        photocard.jhope
                    }
                    onChange={() => {
                        const ot7 =
                            photocard.rm &&
                            photocard.jimin &&
                            photocard.jungkook &&
                            photocard.v &&
                            photocard.jin &&
                            photocard.suga &&
                            photocard.jhope;
                        onChange({
                            ...photocard,
                            rm: !ot7,
                            jimin: !ot7,
                            jungkook: !ot7,
                            v: !ot7,
                            jin: !ot7,
                            suga: !ot7,
                            jhope: !ot7,
                        });
                    }}
                />
                OT7
            </label>
            <div>
                Card Size:
                <select
                    name="cardSize"
                    onChange={(e) =>
                        onChange({
                            ...photocard,
                            sizeId: Number(e.target.value),
                        })
                    }
                    value={photocard.sizeId}
                >
                    {possibleCardSizes.map((cardSize) => (
                        <option
                            key={cardSize.id}
                            value={cardSize.id}
                        >{`${cardSize.name} (${cardSize.width}x${cardSize.height})`}</option>
                    ))}
                </select>
                <button hidden={photocard.sizeId === DEFAULT_ID} onClick={() => onSameCardSizeClick(photocard.sizeId)}>
                    Use this card size for all current photocards
                </button>
            </div>
            <div></div>
            <div>
                Card Type:
                <select
                    name="cardType"
                    onChange={(e) =>
                        onChangeCardType({
                            id: Number(e.target.value),
                            name: e.target.name,
                        })
                    }
                >
                    {possibleCardTypes.map((possibleCardType) => (
                        <option key={possibleCardType.id} value={possibleCardType.id}>
                            {possibleCardType.name}
                        </option>
                    ))}
                </select>
                <button
                    hidden={photocard.cardType.id === DEFAULT_ID}
                    onClick={() => onSameCardTypeClick(photocard.cardType)}
                >
                    Use this card type for all current photocards
                </button>
            </div>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.temporary}
                    onChange={() =>
                        onChange({
                            ...photocard,
                            temporary: !photocard.temporary,
                        })
                    }
                />
                Mark as temporary
            </label>
            {
                <div>
                    Exclusive to country:
                    <select
                        name="exclusiveCountry"
                        onChange={(e) =>
                            onChange({
                                ...photocard,
                                exclusiveCountry: e.target.value as ExclusiveCountry,
                            })
                        }
                        value={photocard.exclusiveCountry}
                    >
                        {EXCLUSIVE_COUNTRIES_WITH_NAMES.map(([countryEnum, countryDisplayName]) => (
                            <option key={countryEnum} value={countryEnum}>
                                {countryDisplayName}
                            </option>
                        ))}
                    </select>
                </div>
            }
        </div>
    );
}

export default function CreateCollectionComponent() {
    const {
        collectionTypes,
        cardTypes,
        cardSizes,
        isLoading,
        error,
        addCollection,
        addCollectionType,
        addCardType,
        addCardSize,
    } = useMetadata();

    const [collectionName, setCollectionName] = useState<string>("");
    const [date, setDate] = useState<string>("");
    const [photocards, setPhotocards] = useState<Array<LocalPhotocard>>([]);
    const [sameBackImage, setSameBackImage] = useState<ConvertedImage | null>(null);

    const [newCollectionTypeName, setNewCollectionTypeName] = useState<string>("");
    const [possibleCollectionTypes, setPossibleCollectionTypes] = useState<Array<CollectionType>>([]);

    const [collectionTypeIds, setCollectionTypeIds] = useState<Array<CollectionType>>([DEFAULT_COLLECTION_TYPE]);

    const [newCardTypeName, setNewCardTypeName] = useState<string>("");
    const [possibleCardTypes, setPossibleCardTypes] = useState<Array<CardType>>([]);

    const [newCardSizeName, setNewCardSizeName] = useState<string>("");
    const [newCardSizeWidth, setNewCardSizeWidth] = useState<number>(0);
    const [newCardSizeHeight, setNewCardSizeHeight] = useState<number>(0);
    const [possibleCardSizes, setPossibleCardSizes] = useState<Array<CardSize>>([]);

    const [isUploading, uploadTransition] = useTransition();

    // Sync metadata from context to local state
    useEffect(() => {
        if (!isLoading) {
            setPossibleCollectionTypes([DEFAULT_COLLECTION_TYPE, ...collectionTypes]);
            setPossibleCardTypes([DEFAULT_CARD_TYPE, ...cardTypes]);
            setPossibleCardSizes([DEFAULT_CARD_SIZE, ...cardSizes]);
        }
    }, [isLoading, collectionTypes, cardTypes, cardSizes]);

    async function onCreateCollectionType() {
        if (newCollectionTypeName.trim() === "") {
            return;
        }
        await addCollectionType({ name: newCollectionTypeName });
        setNewCollectionTypeName("");
    }

    async function onAddCollectionType() {
        setCollectionTypeIds([...collectionTypeIds, DEFAULT_COLLECTION_TYPE]);
    }

    function onChangeCollectionType(index: number, collectionType: { id: number; name: string }) {
        const updated = [...collectionTypeIds];
        updated[index] = collectionType;
        setCollectionTypeIds(updated);
    }

    async function onCreateCardType() {
        if (newCardTypeName.trim() === "") {
            return;
        }
        await addCardType({ name: newCardTypeName });
        setNewCardTypeName("");
    }

    async function onCreateCardSize() {
        if (newCardSizeName.trim() === "" || newCardSizeWidth <= 0 || newCardSizeHeight <= 0) {
            return;
        }
        addCardSize({
            name: newCardSizeName,
            width: newCardSizeWidth,
            height: newCardSizeHeight,
        });
        setNewCardSizeName("");
        setNewCardSizeWidth(0);
        setNewCardSizeHeight(0);
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
            sizeId: possibleCardSizes[0].id!,
            cardType: possibleCardTypes[0],
            exclusiveCountry: ExclusiveCountry.NotExclusive,
        };
    }

    function onAddPhotocard() {
        setPhotocards([...photocards, getDefaultPhotocard()]);
    }

    function onAddPhotocardForEachMember() {
        const members = ["rm", "jimin", "jungkook", "v", "jin", "suga", "jhope"];
        const newPhotocards = members.map((member) => {
            const photocard = getDefaultPhotocard();
            (photocard as any)[member] = true;
            return photocard;
        });
        setPhotocards([...photocards, ...newPhotocards]);
    }

    function onSameBackImageClick(converted: ConvertedImage) {
        photocards.map((pc) => {
            pc.convertedBackImage = converted;
        });
        setPhotocards([...photocards]);
        setSameBackImage(converted);
    }

    function onSameCardSizeClick(cardSizeId: number) {
        photocards.map((pc) => {
            pc.sizeId = cardSizeId;
        });
        setPhotocards([...photocards]);
    }

    function onSameCardTypesClick(cardType: CardType) {
        photocards.map((pc) => {
            pc.cardType = cardType;
        });
        setPhotocards([...photocards]);
    }

    function handlePhotocardChange(index: number, data: Partial<LocalPhotocard>) {
        const updated = [...photocards];
        updated[index] = { ...updated[index], ...data };
        setPhotocards(updated);
    }

    /**
     * Upload the collection and photocards.
     * Note that the upload is not transactional; writes to the DB will happen before the photos are uploaded, to reduce the chance of straggling images.
     *
     * Converts `LocalPhotocard` to `Photocard` and call `createCollectionInDB`.
     */
    async function onUpload() {
        if (collectionName.trim() === "") {
            alert("Collection name is required");
            return;
        }
        const collectionTypes = collectionTypeIds
            .filter((collectionType) => collectionType.id !== DEFAULT_ID)
            .map((collectionType) => collectionType.id!);
        if (collectionTypes.length === 0) {
            alert("At least one collection category must be selected");
            return;
        }
        // If any photocard doesn't have its size set yet, error
        for (const photocard of photocards) {
            if (photocard.sizeId === DEFAULT_ID) {
                alert("All photocards must have a size selected");
                return;
            }
            if (photocard.cardType.id === DEFAULT_ID) {
                alert("All photocards must have a card type selected");
                return;
            }
        }
        // Check release date
        if (date.trim() === "") {
            alert("Release date is required");
            return;
        }

        uploadTransition(async () => {
            const collection: ParsedCollection = {
                name: collectionName,
                releaseDate: new Date(date),
                collectionTypes: collectionTypes,
            };

            // Find the number of unique images we have to upload
            // Use the fullSize byteLength as a proxy, since we don't want to compare ArrayBuffers
            // No 2 converted images should have the exact size
            const uniqueImageSizes = new Set<number>();
            for (const photocard of photocards) {
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
            const photocardsToCreate: Photocard[] = photocards.map((localPhotocard) => ({
                collectionId: 0, // Placeholder, will be set in `createCollectionInDB`
                imageId: localPhotocard.convertedImage
                    ? imageSizeToUUID.get(localPhotocard.convertedImage.fullSize.byteLength)!
                    : null,
                backImageId: localPhotocard.convertedBackImage
                    ? imageSizeToUUID.get(localPhotocard.convertedBackImage.fullSize.byteLength)!
                    : null,
                backImageType: localPhotocard.backImageType,
                cardType: localPhotocard.cardType.id!,
                sizeId: localPhotocard.sizeId,
                effects: null, // TODO: Allow effects
                temporary: localPhotocard.temporary,
                exclusiveCountry: localPhotocard.exclusiveCountry,

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
                alert(`Error uploading collection to server: ${error}`);
                return;
            }

            // Upload each unique image in parallel
            // Images are already converted to AVIF on selection, so we just upload them directly
            const uploadPromises: Promise<boolean | { error: string }>[] = [];
            const uploadedSizes = new Set<number>();

            for (const photocard of photocards) {
                if (photocard.convertedImage && !uploadedSizes.has(photocard.convertedImage.fullSize.byteLength)) {
                    const imageId = imageSizeToUUID.get(photocard.convertedImage.fullSize.byteLength)!;
                    const converted = photocard.convertedImage;
                    uploadedSizes.add(converted.fullSize.byteLength);
                    uploadPromises.push(invokeOrError(uploadImage(converted.fullSize, converted.thumbnail, imageId)));
                }
                if (
                    photocard.convertedBackImage &&
                    !uploadedSizes.has(photocard.convertedBackImage.fullSize.byteLength)
                ) {
                    const backImageId = imageSizeToUUID.get(photocard.convertedBackImage.fullSize.byteLength)!;
                    const converted = photocard.convertedBackImage;
                    uploadedSizes.add(converted.fullSize.byteLength);
                    uploadPromises.push(
                        invokeOrError(uploadImage(converted.fullSize, converted.thumbnail, backImageId)),
                    );
                }
            }
            const results = await Promise.all(uploadPromises);
            for (const res of results) {
                if (typeof res === "object" && "error" in res) {
                    alert(`Error uploading images to server: ${res.error}`);
                    return;
                }
            }

            clearLocalState();
            alert("Upload successful!");
        });
    }

    /**
     * Only clears the state of variables that won't be useful for the next album
     */
    function clearLocalState() {
        setCollectionName("");
        setDate("");
        setPhotocards([]);
        setSameBackImage(null);
    }

    return (
        <div className={isUploading ? "loading" : ""}>
            <div>
                <input type="text" placeholder="Collection Name" onChange={(e) => setCollectionName(e.target.value)} />
                Release date: <input type="date" onChange={(e) => setDate(e.target.value)} />
                <div>
                    Collection category:
                    {collectionTypeIds.map((collectionType, index) => (
                        <select
                            name="collectionType"
                            onChange={(e) =>
                                onChangeCollectionType(index, {
                                    id: Number(e.target.value),
                                    name: e.target.name,
                                })
                            }
                            key={index}
                        >
                            {possibleCollectionTypes.map((collectionType) => (
                                <option key={collectionType.id} value={collectionType.id}>
                                    {collectionType.name}
                                </option>
                            ))}
                        </select>
                    ))}
                    <button onClick={onAddCollectionType}>Add Another</button>
                </div>
                <div>
                    Missing a collection category?
                    <input
                        type="text"
                        placeholder="New Collection Category"
                        onChange={(e) => setNewCollectionTypeName(e.target.value)}
                    />
                    <button onClick={onCreateCollectionType}>Create a Collection Category</button>
                </div>
                <div>
                    Missing a card type?
                    <input
                        type="text"
                        placeholder="New Card Type"
                        onChange={(e) => setNewCardTypeName(e.target.value)}
                    />
                    <button onClick={onCreateCardType}>Create a Card Type</button>
                </div>
                <div>
                    Missing a card size?
                    <input
                        type="text"
                        placeholder="New Card Size Name"
                        onChange={(e) => setNewCardSizeName(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Width (in)"
                        onChange={(e) => setNewCardSizeWidth(Number(e.target.value))}
                    />
                    <input
                        type="number"
                        placeholder="Height (in)"
                        onChange={(e) => setNewCardSizeHeight(Number(e.target.value))}
                    />
                    <button onClick={onCreateCardSize}>Create a Card Size</button>
                </div>
                <button onClick={onAddPhotocard}>Add Photocard</button>
                <button onClick={onAddPhotocardForEachMember}>Add a Photocard for Each Member</button>
            </div>

            <div className="flex flex-wrap gap-8">
                {photocards.map((photocard, index) => (
                    <CreatePhotocardComponent
                        photocard={photocard}
                        possibleCardSizes={possibleCardSizes}
                        possibleCardTypes={possibleCardTypes}
                        forceConvertedBackImage={sameBackImage}
                        onChange={(data) => handlePhotocardChange(index, data)}
                        onSameBackImageClick={onSameBackImageClick}
                        onSameCardSizeClick={onSameCardSizeClick}
                        onSameCardTypeClick={onSameCardTypesClick}
                        key={index}
                    />
                ))}
            </div>

            <button onClick={onUpload}>Upload</button>
        </div>
    );
}
