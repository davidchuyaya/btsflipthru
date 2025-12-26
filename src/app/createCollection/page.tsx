"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_HEIGHT_PX } from "@/constants";
import {
    addCardSizeToDB,
    addCardTypeToDB,
    addCollectionTypeToDB,
    callPromiseOrError,
    createCollectionInDB,
    getCardSizesFromDB,
    getCardTypesFromDB,
    getCollectionTypesFromDB,
    uploadImage,
} from "@/actions";
import {
    BACK_IMAGE_TYPES_WITH_NAMES,
    BackImageType,
    CardSize,
    CardType,
    Collection,
    CollectionType,
    Photocard,
} from "@/db";

function UploadImageButton({
    desc,
    disableUpload,
    imgClassName,
    forceSetFile,
    onFileChange,
}: {
    desc: string;
    disableUpload?: boolean;
    imgClassName?: string;
    forceSetFile?: File | null;
    onFileChange: (f: File) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [showFileError, setShowFileError] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (forceSetFile && inputRef.current) {
            setFile(forceSetFile);
            // Programmatically set the file in the input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(forceSetFile);
            inputRef.current.files = dataTransfer.files;
        }
    }, [forceSetFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > MAX_IMAGE_SIZE_BYTES) {
                    setShowFileError(true);
                    return;
                }
                setFile(file);
                onFileChange(file);
            }
            setShowFileError(false);
        }
    };

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
            {file && !showFileError ? (
                <img
                    src={URL.createObjectURL(file)}
                    className={imgClassName}
                    alt="Preview"
                    height={THUMBNAIL_HEIGHT_PX}
                    width={THUMBNAIL_HEIGHT_PX}
                />
            ) : null}
            {showFileError ? (
                <p style={{ color: "red" }}>File size exceeds {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit.</p>
            ) : null}
        </div>
    );
}

interface LocalPhotocard {
    imageFile: File | null;
    backImageFile: File | null;
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
    cardTypes: Array<CardType>;
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
    forceSetFile,
    onChange,
    onSameBackImageClick,
    onSameCardTypesClick,
    onSameCardSizeClick,
}: {
    photocard: LocalPhotocard;
    possibleCardSizes: Array<CardSize>;
    possibleCardTypes: Array<CardType>;
    forceSetFile: File | null;
    onChange: (data: Partial<LocalPhotocard>) => void;
    onSameBackImageClick: (file: File) => void;
    onSameCardTypesClick: (cardType: CardType[]) => void;
    onSameCardSizeClick: (cardSizeId: number) => void;
}) {
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [showBackImageButton, setShowBackImageButton] = useState<boolean>(false);

    function handleFrontChange(f: File) {
        setFrontFile(f);
        onChange({ ...photocard, imageFile: f });
    }

    function handleBackChange(f: File) {
        onChange({ ...photocard, backImageFile: f });
        setShowBackImageButton(true);
    }

    function onChangeCardType(index: number, cardType: { id: number; name: string }) {
        const updated = [...photocard.cardTypes];
        updated[index] = cardType;
        onChange({ ...photocard, cardTypes: updated });
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
            <UploadImageButton desc="Front" onFileChange={handleFrontChange} />
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
                onFileChange={handleBackChange}
                forceSetFile={photocard.backImageType === BackImageType.Image ? forceSetFile : frontFile}
                imgClassName={backImageClassName(photocard.backImageType)}
            />
            <button
                onClick={() => {
                    if (photocard.backImageFile) {
                        onSameBackImageClick(photocard.backImageFile!);
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
            Card Types:
            {photocard.cardTypes.map((cardType, index) => (
                <select
                    name="cardType"
                    onChange={(e) =>
                        onChangeCardType(index, {
                            id: Number(e.target.value),
                            name: e.target.name,
                        })
                    }
                    value={cardType.id}
                    key={index}
                >
                    {possibleCardTypes.map((possibleCardType) => (
                        <option key={possibleCardType.id} value={possibleCardType.id}>
                            {possibleCardType.name}
                        </option>
                    ))}
                </select>
            ))}
            <button
                onClick={() =>
                    onChange({
                        ...photocard,
                        cardTypes: [...photocard.cardTypes, DEFAULT_CARD_TYPE],
                    })
                }
            >
                Add Another
            </button>
            <button
                hidden={photocard.cardTypes.length === 1 && photocard.cardTypes[0].id === DEFAULT_ID}
                onClick={() => onSameCardTypesClick(photocard.cardTypes)}
            >
                Use this card type for all current photocards
            </button>
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
        </div>
    );
}

export default function CreateCollectionComponent() {
    const [collectionName, setCollectionName] = useState<string>("");
    const [date, setDate] = useState<string>("");
    const [photocards, setPhotocards] = useState<Array<LocalPhotocard>>([]);
    const [sameBackImageFile, setSameBackImageFile] = useState<File | null>(null);

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

    async function onCreateCollection() {
        const serverCollectionTypes = await getCollectionTypesFromDB();
        setPossibleCollectionTypes([DEFAULT_COLLECTION_TYPE, ...serverCollectionTypes]);
        const serverCardTypes = await getCardTypesFromDB();
        setPossibleCardTypes([DEFAULT_CARD_TYPE, ...serverCardTypes]);
        const serverCardSizes = await getCardSizesFromDB();
        setPossibleCardSizes([DEFAULT_CARD_SIZE, ...serverCardSizes]);
    }

    async function onCreateCollectionType() {
        if (newCollectionTypeName.trim() === "") {
            return;
        }
        const result = await callPromiseOrError(addCollectionTypeToDB({ name: newCollectionTypeName }));
        if (!result) {
            alert("Error creating collection type");
            return;
        }
        if (typeof result === "object" && "error" in result) {
            alert(`Error creating collection type: ${result.error}`);
            return;
        }
        setPossibleCollectionTypes([...possibleCollectionTypes, { id: Number(result), name: newCollectionTypeName }]);
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
        const result = await callPromiseOrError(addCardTypeToDB({ name: newCardTypeName }));
        if (!result) {
            alert("Error creating card type");
            return;
        }
        if (typeof result === "object" && "error" in result) {
            alert(`Error creating card type: ${result.error}`);
            return;
        }
        setPossibleCardTypes([...possibleCardTypes, { id: Number(result), name: newCardTypeName }]);
    }

    async function onCreateCardSize() {
        if (newCardSizeName.trim() === "" || newCardSizeWidth <= 0 || newCardSizeHeight <= 0) {
            return;
        }
        const result = await callPromiseOrError(
            addCardSizeToDB({
                name: newCardSizeName,
                width: newCardSizeWidth,
                height: newCardSizeHeight,
            }),
        );
        if (!result) {
            alert("Error creating card size");
            return;
        }
        if (typeof result === "object" && "error" in result) {
            alert(`Error creating card size: ${result.error}`);
            return;
        }
        setPossibleCardSizes([
            ...possibleCardSizes,
            {
                id: Number(result),
                name: newCardSizeName,
                width: newCardSizeWidth,
                height: newCardSizeHeight,
            },
        ]);
    }

    function onAddPhotocard() {
        setPhotocards([
            ...photocards,
            {
                imageFile: null,
                backImageFile: null,
                backImageType: BackImageType.Image,
                rm: false,
                jimin: false,
                jungkook: false,
                v: false,
                jin: false,
                suga: false,
                jhope: false,
                temporary: false,
                sizeId: DEFAULT_ID,
                cardTypes: [DEFAULT_CARD_TYPE],
            },
        ]);
    }

    function onAddPhotocardForEachMember() {
        const members = ["rm", "jimin", "jungkook", "v", "jin", "suga", "jhope"];
        const newPhotocards = members.map((member) => ({
            imageFile: null,
            backImageFile: null,
            backImageType: BackImageType.Image,
            rm: member === "rm",
            jimin: member === "jimin",
            jungkook: member === "jungkook",
            v: member === "v",
            jin: member === "jin",
            suga: member === "suga",
            jhope: member === "jhope",
            temporary: false,
            sizeId: DEFAULT_ID,
            cardTypes: [DEFAULT_CARD_TYPE],
        }));
        setPhotocards([...photocards, ...newPhotocards]);
    }

    function onSameBackImageClick(file: File) {
        photocards.map((pc) => {
            pc.backImageFile = file;
        });
        setPhotocards([...photocards]);
        setSameBackImageFile(file);
    }

    function onSameCardSizeClick(cardSizeId: number) {
        photocards.map((pc) => {
            pc.sizeId = cardSizeId;
        });
        setPhotocards([...photocards]);
    }

    function onSameCardTypesClick(cardTypes: CardType[]) {
        photocards.map((pc) => {
            pc.cardTypes = cardTypes;
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
        // If any photocard doesn't have its size set yet, error
        for (const photocard of photocards) {
            if (photocard.sizeId === DEFAULT_ID) {
                alert("All photocards must have a size selected");
                return;
            }
        }

        uploadTransition(async () => {
            // Alias for Collection, avoid collision with Hash Set used below
            const collection: Collection = {
                name: collectionName,
                releaseDate: new Date(date).getTime(),
            };

            const collectionTypes = collectionTypeIds
                .filter((collectionType) => collectionType.id !== DEFAULT_ID)
                .map((collectionType) => collectionType.id!);

            // Find the number of unique images we have to upload
            // Use the image size as a proxy, since we don't want to compare ArrayBuffers
            // No 2 cropped images should have the exact size
            const uniqueImageSizes = new Set<number>();
            for (const photocard of photocards) {
                if (photocard.imageFile) {
                    uniqueImageSizes.add(photocard.imageFile.size);
                }
                if (photocard.backImageFile) {
                    uniqueImageSizes.add(photocard.backImageFile.size);
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
                imageId: localPhotocard.imageFile ? imageSizeToUUID.get(localPhotocard.imageFile.size)! : null,
                backImageId: localPhotocard.backImageFile
                    ? imageSizeToUUID.get(localPhotocard.backImageFile.size)!
                    : null,
                backImageType: localPhotocard.backImageType,
                sizeId: localPhotocard.sizeId,
                effects: null, // TODO: Allow effects
                temporary: localPhotocard.temporary,
                exclusiveCountry: null, // TODO: Allow exclusive country

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

            const cardTypes: number[][] = photocards.map((localPhotocard) =>
                localPhotocard.cardTypes.filter((type) => type.id !== DEFAULT_ID).map((type) => type.id!),
            );

            // Call the server and create DB entries
            const result = await callPromiseOrError(
                createCollectionInDB(collection, collectionTypes, photocardsToCreate, cardTypes),
            );
            if (result && result.error) {
                alert(`Error uploading: ${result.error}`);
                return;
            }

            // Upload each unique image individually
            // We do this by removing image sizes from the set after we've uploaded them, and checking the set before each upload
            for (const photocard of photocards) {
                if (photocard.imageFile && imageSizeToUUID.has(photocard.imageFile.size)) {
                    const imageId = imageSizeToUUID.get(photocard.imageFile.size)!;
                    const result = await callPromiseOrError(
                        uploadImage(await photocard.imageFile.arrayBuffer(), imageId),
                    );
                    if (result && result.error) {
                        alert(`Error uploading image for photocard: ${result.error}`);
                        return;
                    }

                    imageSizeToUUID.delete(photocard.imageFile.size);
                }
                if (photocard.backImageFile && imageSizeToUUID.has(photocard.backImageFile.size)) {
                    const backImageId = imageSizeToUUID.get(photocard.backImageFile.size)!;
                    const result = await callPromiseOrError(
                        uploadImage(await photocard.backImageFile.arrayBuffer(), backImageId),
                    );
                    if (result && result.error) {
                        alert(`Error uploading back image for photocard: ${result.error}`);
                        return;
                    }

                    imageSizeToUUID.delete(photocard.backImageFile.size);
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
        setSameBackImageFile(null);
        setNewCollectionTypeName("");
        setNewCardTypeName("");
        setNewCardSizeName("");
        setNewCardSizeWidth(0);
        setNewCardSizeHeight(0);
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
                        forceSetFile={sameBackImageFile}
                        onChange={(data) => handlePhotocardChange(index, data)}
                        onSameBackImageClick={onSameBackImageClick}
                        onSameCardSizeClick={onSameCardSizeClick}
                        onSameCardTypesClick={onSameCardTypesClick}
                        key={index}
                    />
                ))}
            </div>

            <button onClick={onUpload}>Upload</button>
        </div>
    );
}
