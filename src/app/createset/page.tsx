"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_HEIGHT_PX } from "@/constants";
import {
    addCardSizeToDB,
    addCardTypeToDB,
    addSetTypeToDB,
    getCardSizesFromDB,
    getCardTypesFromDB,
    getSetTypesFromDB,
} from "@/actions";
import {
    BACK_IMAGE_TYPES_WITH_NAMES,
    BackImageType,
    CardSize,
    CardType,
    Press,
    PRESSES_WITH_NAMES,
    SetType,
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
                <p style={{ color: "red" }}>
                    File size exceeds {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB
                    limit.
                </p>
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

// TODO: Filter out default type when uploading
const DEFAULT_ID = 0;
const DEFAULT_SET_TYPE: SetType = { id: DEFAULT_ID, name: "Select..." };
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
    const [showBackImageButton, setShowBackImageButton] =
        useState<boolean>(false);

    function handleFrontChange(f: File) {
        setFrontFile(f);
        onChange({ ...photocard, imageFile: f });
    }

    function handleBackChange(f: File) {
        onChange({ ...photocard, backImageFile: f });
        setShowBackImageButton(true);
    }

    function onChangeCardType(
        index: number,
        cardType: { id: number; name: string }
    ) {
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
                        onChange={() =>
                            onChange({ ...photocard, backImageType: value })
                        }
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
                    onChange={() =>
                        onChange({ ...photocard, rm: !photocard.rm })
                    }
                />
                RM
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.jimin}
                    onChange={() =>
                        onChange({ ...photocard, jimin: !photocard.jimin })
                    }
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
                    onChange={() =>
                        onChange({ ...photocard, jin: !photocard.jin })
                    }
                />
                Jin
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.suga}
                    onChange={() =>
                        onChange({ ...photocard, suga: !photocard.suga })
                    }
                />
                Suga
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={photocard.jhope}
                    onChange={() =>
                        onChange({ ...photocard, jhope: !photocard.jhope })
                    }
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
                <button
                    hidden={photocard.sizeId === DEFAULT_ID}
                    onClick={() => onSameCardSizeClick(photocard.sizeId)}
                >
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
                        <option
                            key={possibleCardType.id}
                            value={possibleCardType.id}
                        >
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
                hidden={
                    photocard.cardTypes.length === 1 &&
                    photocard.cardTypes[0].id === DEFAULT_ID
                }
                onClick={() => onSameCardTypesClick(photocard.cardTypes)}
            >
                Use this card type for all current photocards
            </button>
            <label>
                <input type="checkbox" checked={photocard.temporary} onChange={() => onChange({...photocard, temporary: !photocard.temporary})} />
                Mark as temporary
            </label>
        </div>
    );
}

export default function CreateSetComponent() {
    const [createSetClicked, setCreateSetClicked] = useState<boolean>(false);
    const [setCoverFile, setSetCoverFile] = useState<File | null>(null);
    const [press, setPress] = useState<Press>(Press.Unknown);
    const [photocards, setPhotocards] = useState<Array<LocalPhotocard>>([]);
    const [sameBackImageFile, setSameBackImageFile] = useState<File | null>(
        null
    );

    const [newSetTypeName, setNewSetTypeName] = useState<string>("");
    const [possibleSetTypes, setPossibleSetTypes] = useState<Array<SetType>>(
        []
    );

    const [setTypeIds, setSetTypeIds] = useState<Array<SetType>>([
        DEFAULT_SET_TYPE,
    ]);

    const [newCardTypeName, setNewCardTypeName] = useState<string>("");
    const [possibleCardTypes, setPossibleCardTypes] = useState<Array<CardType>>(
        []
    );

    const [newCardSizeName, setNewCardSizeName] = useState<string>("");
    const [newCardSizeWidth, setNewCardSizeWidth] = useState<number>(0);
    const [newCardSizeHeight, setNewCardSizeHeight] = useState<number>(0);
    const [possibleCardSizes, setPossibleCardSizes] = useState<Array<CardSize>>(
        []
    );

    async function onCreateSet() {
        if (createSetClicked) {
            return;
        }
        setCreateSetClicked(true);
        const serverSetTypes = await getSetTypesFromDB();
        setPossibleSetTypes([DEFAULT_SET_TYPE, ...serverSetTypes]);
        const serverCardTypes = await getCardTypesFromDB();
        setPossibleCardTypes([DEFAULT_CARD_TYPE, ...serverCardTypes]);
        const serverCardSizes = await getCardSizesFromDB();
        setPossibleCardSizes([DEFAULT_CARD_SIZE, ...serverCardSizes]);
    }

    async function onCreateSetType() {
        if (newSetTypeName.trim() === "") {
            return;
        }
        const result = await addSetTypeToDB({ name: newSetTypeName });
        if (!result) {
            alert("Error creating set type");
            return;
        }
        setPossibleSetTypes([
            ...possibleSetTypes,
            { id: Number(result), name: newSetTypeName },
        ]);
    }

    async function onAddSetType() {
        setSetTypeIds([...setTypeIds, DEFAULT_SET_TYPE]);
    }

    function onChangeSetType(
        index: number,
        setType: { id: number; name: string }
    ) {
        const updated = [...setTypeIds];
        updated[index] = setType;
        setSetTypeIds(updated);
    }

    async function onCreateCardType() {
        if (newCardTypeName.trim() === "") {
            return;
        }
        const result = await addCardTypeToDB({ name: newCardTypeName });
        if (!result) {
            alert("Error creating card type");
            return;
        }
        console.log(`Created card type ${newCardTypeName} with ID ${result}`);
        setPossibleCardTypes([
            ...possibleCardTypes,
            { id: Number(result), name: newCardTypeName },
        ]);
    }

    async function onCreateCardSize() {
        if (
            newCardSizeName.trim() === "" ||
            newCardSizeWidth <= 0 ||
            newCardSizeHeight <= 0
        ) {
            return;
        }
        const result = await addCardSizeToDB({
            name: newCardSizeName,
            width: newCardSizeWidth,
            height: newCardSizeHeight,
        });
        if (!result) {
            alert("Error creating card size");
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
        const members = [
            "rm",
            "jimin",
            "jungkook",
            "v",
            "jin",
            "suga",
            "jhope",
        ];
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

    function handlePhotocardChange(
        index: number,
        data: Partial<LocalPhotocard>
    ) {
        const updated = [...photocards];
        updated[index] = { ...updated[index], ...data };
        setPhotocards(updated);
    }

    function onUpload() {}

    return (
        <div>
            <button onClick={onCreateSet}>Create Set</button>
            {createSetClicked ? (
                <div>
                    <input type="text" placeholder="Set Name" />
                    Release date: <input type="date" />
                    <UploadImageButton
                        desc="Set Cover (e.g., album art, packaging)"
                        onFileChange={setSetCoverFile}
                    />
                    <div>
                        Set Types:
                        {setTypeIds.map((setType, index) => (
                            <select
                                name="setType"
                                onChange={(e) =>
                                    onChangeSetType(index, {
                                        id: Number(e.target.value),
                                        name: e.target.name,
                                    })
                                }
                                key={index}
                            >
                                {possibleSetTypes.map((setType) => (
                                    <option key={setType.id} value={setType.id}>
                                        {setType.name}
                                    </option>
                                ))}
                            </select>
                        ))}
                        <button onClick={onAddSetType}>Add Another</button>
                    </div>
                    <div>
                        Press:
                        {PRESSES_WITH_NAMES.map(([possiblePress, id]) => (
                            <label className="m-3" key={id}>
                                <input
                                    type="radio"
                                    name="press"
                                    onChange={() => setPress(id)}
                                    checked={press === id}
                                    className="mr-2"
                                />
                                {possiblePress}
                            </label>
                        ))}
                    </div>
                    <div>
                        Missing a set type?
                        <input
                            type="text"
                            placeholder="New Set Type"
                            onChange={(e) => setNewSetTypeName(e.target.value)}
                        />
                        <button onClick={onCreateSetType}>
                            Create a Set Type
                        </button>
                    </div>
                    <div>
                        Missing a card type?
                        <input
                            type="text"
                            placeholder="New Card Type"
                            onChange={(e) => setNewCardTypeName(e.target.value)}
                        />
                        <button onClick={onCreateCardType}>
                            Create a Card Type
                        </button>
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
                            onChange={(e) =>
                                setNewCardSizeWidth(Number(e.target.value))
                            }
                        />
                        <input
                            type="number"
                            placeholder="Height (in)"
                            onChange={(e) =>
                                setNewCardSizeHeight(Number(e.target.value))
                            }
                        />
                        <button onClick={onCreateCardSize}>
                            Create a Card Size
                        </button>
                    </div>
                    <button onClick={onAddPhotocard}>Add Photocard</button>
                    <button onClick={onAddPhotocardForEachMember}>
                        Add a Photocard for Each Member
                    </button>
                </div>
            ) : null}

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
