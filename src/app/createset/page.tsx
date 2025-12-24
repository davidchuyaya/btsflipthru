"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_SIZE_BYTES } from "@/constants";
import { addCardTypeToDB, addSetTypeToDB, getCardTypesFromDB, getSetTypesFromDB } from "@/actions";

function UploadImageButton({ desc, forceSetFile, onFileChange }: { desc: string; forceSetFile?: File | null; onFileChange: (f: File) => void }) {
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
    }

    return <div>
        <p>{desc}</p>
        <input ref={inputRef} type="file" name="uploadImage" accept="image/png, image/jpeg, image/avif, image/webp" onChange={handleFileChange} />
        {file && !showFileError ? <img src={URL.createObjectURL(file)} alt="Preview" width={200} height={200} /> : null}
        {showFileError ? <p style={{ color: "red" }}>File size exceeds {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit.</p> : null}
    </div>;
}

interface LocalPhotocard {
    imageFile: File | null;
    backImageFile: File | null;
    rm: boolean;
    jimin: boolean;
    jungkook: boolean;
    v: boolean;
    jin: boolean;
    suga: boolean;
    jhope: boolean;
    cardTypeIds: Array<{ id: string; name: string }>;
}

// TODO: Filter out default type when uploading
const DEFAULT_TYPE = { id: "", name: "Select..." };

function CreatePhotocardComponent({ photocard, possibleCardTypes, forceSetFile, onChange, onSameBackImageClick }: { photocard: LocalPhotocard; possibleCardTypes: Array<{ id: string; name: string }>; forceSetFile: File | null; onChange: (data: Partial<LocalPhotocard>) => void; onSameBackImageClick: (file: File) => void }) {
    const [showBackImageButton, setShowBackImageButton] = useState<boolean>(false);

    function handleFrontChange(f: File) {
        onChange({ ...photocard, imageFile: f });
    };

    function handleBackChange(f: File) {
        onChange({ ...photocard, backImageFile: f });
        setShowBackImageButton(true);
    };

    function onChangeCardType(index: number, cardType: { id: string; name: string }) {
        const updated = [...photocard.cardTypeIds];
        updated[index] = cardType;
        onChange({ ...photocard, cardTypeIds: updated });
    }

    return <div>
        <UploadImageButton desc="Front" onFileChange={handleFrontChange} />
        <UploadImageButton desc="Back" onFileChange={handleBackChange} forceSetFile={forceSetFile} />
        <button onClick={() => onSameBackImageClick(photocard?.backImageFile!)} hidden={!showBackImageButton}>Use this back image for all current photocards</button>
        <input type="checkbox" checked={photocard.rm} onChange={() => onChange({ ...photocard, rm: !photocard.rm })} /> RM
        <input type="checkbox" checked={photocard.jimin} onChange={() => onChange({ ...photocard, jimin: !photocard.jimin })} /> Jimin
        <input type="checkbox" checked={photocard.jungkook} onChange={() => onChange({ ...photocard, jungkook: !photocard.jungkook })} /> Jungkook
        <input type="checkbox" checked={photocard.v} onChange={() => onChange({ ...photocard, v: !photocard.v })} /> V
        <input type="checkbox" checked={photocard.jin} onChange={() => onChange({ ...photocard, jin: !photocard.jin })} /> Jin
        <input type="checkbox" checked={photocard.suga} onChange={() => onChange({ ...photocard, suga: !photocard.suga })} /> Suga
        <input type="checkbox" checked={photocard.jhope} onChange={() => onChange({ ...photocard, jhope: !photocard.jhope })} /> J-Hope
        <input type="checkbox" checked={photocard.rm && photocard.jimin && photocard.jungkook && photocard.v && photocard.jin && photocard.suga && photocard.jhope} onChange={() => {
            const ot7 = photocard.rm && photocard.jimin && photocard.jungkook && photocard.v && photocard.jin && photocard.suga && photocard.jhope;
            onChange({ ...photocard, rm: !ot7, jimin: !ot7, jungkook: !ot7, v: !ot7, jin: !ot7, suga: !ot7, jhope: !ot7 });
        }} /> OT7
        Card Types:
        {
            photocard.cardTypeIds.map((cardType, index) => (
                <select name="cardType" onChange={(e) => onChangeCardType(index, { id: e.target.value, name: e.target.name })} key={index}>
                    {possibleCardTypes.map((cardType) => (
                        <option key={cardType.id} value={cardType.id}>{cardType.name}</option>
                    ))}
                </select>
            ))
        }
        <button onClick={() => onChange({ ...photocard, cardTypeIds: [...photocard.cardTypeIds, DEFAULT_TYPE] })}>Add a Card Type</button>
    </div>;
}

export default function CreateSetComponent() {
    
    const [createSetClicked, setCreateSetClicked] = useState<boolean>(false);
    const [setCoverFile, setSetCoverFile] = useState<File | null>(null);
    const [photocards, setPhotocards] = useState<Array<LocalPhotocard>>([]);
    const [sameBackImageFile, setSameBackImageFile] = useState<File | null>(null);
    const [newSetTypeName, setNewSetTypeName] = useState<string>("");
    const [possibleSetTypes, setPossibleSetTypes] = useState<Array<{ id: string; name: string }>>([]);
    const [setTypeIds, setSetTypeIds] = useState<Array<{ id: string; name: string }>>([DEFAULT_TYPE]);
    const [newCardTypeName, setNewCardTypeName] = useState<string>("");
    const [possibleCardTypes, setPossibleCardTypes] = useState<Array<{ id: string; name: string }>>([]);

    async function onCreateSet() {
        if (createSetClicked) {
            return;
        }
        setCreateSetClicked(true);
        const serverSetTypes = await getSetTypesFromDB();
        setPossibleSetTypes([DEFAULT_TYPE, ...serverSetTypes]);
        const serverCardTypes = await getCardTypesFromDB();
        setPossibleCardTypes([DEFAULT_TYPE, ...serverCardTypes]);
    }

    async function onCreateSetType() {
        if (newSetTypeName.trim() === "") {
            return;
        }
        const result = await addSetTypeToDB(newSetTypeName);
        if (result.error) {
            alert(result.error);
            return;
        }
        setPossibleSetTypes([...possibleSetTypes, { id: result.id, name: newSetTypeName }]);
    }

    async function onAddSetType() {
        setSetTypeIds([...setTypeIds, DEFAULT_TYPE]);
    }

    function onChangeSetType(index: number, setType: { id: string; name: string }) {
        const updated = [...setTypeIds];
        updated[index] = setType;
        setSetTypeIds(updated);
    }

    async function onCreateCardType() {
        if (newSetTypeName.trim() === "") {
            return;
        }
        const result = await addCardTypeToDB(newCardTypeName);
        if (result.error) {
            alert(result.error);
            return;
        }
        setPossibleCardTypes([...possibleCardTypes, { id: result.id, name: newCardTypeName }]);
    }

    function onAddPhotocard() {
        setPhotocards([...photocards, {
            imageFile: null,
            backImageFile: null,
            rm: false,
            jimin: false,
            jungkook: false,
            v: false,
            jin: false,
            suga: false,
            jhope: false,
            cardTypeIds: [DEFAULT_TYPE],
        }]);
    }

    function onAddPhotocardForEachMember() {
        const members = ['rm', 'jimin', 'jungkook', 'v', 'jin', 'suga', 'jhope'];
        const newPhotocards = members.map(member => ({
            imageFile: null,
            backImageFile: null,
            rm: member === 'rm',
            jimin: member === 'jimin',
            jungkook: member === 'jungkook',
            v: member === 'v',
            jin: member === 'jin',
            suga: member === 'suga',
            jhope: member === 'jhope',
            cardTypeIds: [DEFAULT_TYPE],
        }));
        setPhotocards([...photocards, ...newPhotocards]);
    }

    function onSameBackImageClick(file: File) {
        photocards.map(pc => {
            pc.backImageFile = file;
        });
        setPhotocards([...photocards]);
        setSameBackImageFile(file);
    }

    function handlePhotocardChange(index: number, data: Partial<LocalPhotocard>) {
        const updated = [...photocards];
        updated[index] = { ...updated[index], ...data };
        setPhotocards(updated);
    }

    function onUpload() {
    }

    return <div>
        <button onClick={onCreateSet}>Create Set</button>
        {
            createSetClicked ? (<div>
                <input type="text" placeholder="Set Name" />
                Release date: <input type="date" />
                <UploadImageButton desc="Set Cover" onFileChange={setSetCoverFile} />

                Set Types:
                {
                    setTypeIds.map((setType, index) => (
                        <select name="setType" onChange={(e) => onChangeSetType(index, { id: e.target.value, name: e.target.name })} key={index}>
                            {possibleSetTypes.map((setType) => (
                                <option key={setType.id} value={setType.id}>{setType.name}</option>
                            ))}
                        </select>
                    ))
                }
                <button onClick={onAddSetType}>Add a Set Type</button>

                <div>
                    Missing a set type?
                    <input type="text" placeholder="New Set Type" onChange={(e) => setNewSetTypeName(e.target.value)} />
                    <button onClick={onCreateSetType}>Create a Set Type</button>
                </div>

                <div>
                    Missing a card type?
                    <input type="text" placeholder="New Card Type" onChange={(e) => setNewCardTypeName(e.target.value)} />
                    <button onClick={onCreateCardType}>Create a Card Type</button>
                </div>


                <button onClick={onAddPhotocard}>Add Photocard</button>
                <button onClick={onAddPhotocardForEachMember}>Add a Photocard for Each Member</button>
            </div>) : null
        }

        <div className="flex flex-wrap gap-8">
            {photocards.map((photocard, index) => (
                <CreatePhotocardComponent
                    photocard={photocard}
                    possibleCardTypes={possibleCardTypes}
                    onChange={(data) => handlePhotocardChange(index, data)}
                    onSameBackImageClick={onSameBackImageClick}
                    forceSetFile={sameBackImageFile}
                    key={index}
                />
            ))}
        </div>

        <button onClick={onUpload}>Upload</button>
    </div>;
}