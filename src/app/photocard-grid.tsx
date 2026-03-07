import PhotocardComponent, { DraggablePhotocard } from "./photocard";
import {
    collectionDisplayName,
    memberIntsToName,
    thumbnailUrl,
} from "@/constants";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Collections, Photocards } from "@/db";
import { Selectable } from "kysely";
import { Trash2Icon } from "lucide-react";
import { AlertDialogWithButton } from "@/components/ui/alert-dialog";
import { deleteCollection } from "@/actions";

function PhotocardGridWithoutCollections({
    photocards,
    className,
    scrollable,
    showFront,
    collections,
    isSelectionMode,
    selectedIds,
    onToggleSelection,
    draggable,
    ownedIds,
    wishlistedIds,
    draggablePhotocardWidth,
    draggablePhotocardHeight,
}: {
    photocards: Selectable<Photocards>[];
    className?: string;
    scrollable?: boolean;
    showFront: boolean;
    collections?: Selectable<Collections>[];
    isSelectionMode?: boolean;
    selectedIds?: Set<number>;
    onToggleSelection?: (id: number) => void;
    draggable?: boolean;
    ownedIds?: Set<number>;
    wishlistedIds?: Set<number>;
    draggablePhotocardWidth?: React.CSSProperties["width"];
    draggablePhotocardHeight?: React.CSSProperties["height"];
}) {
    const content = (
        <div
            className={`flex flex-row flex-wrap gap-4 justify-center ${className}`}
        >
            {photocards.map((photocard) =>
                draggable ? (
                    <DraggablePhotocard
                        key={photocard.id}
                        photocard={photocard}
                        showFront={showFront}
                        width={draggablePhotocardWidth}
                        height={draggablePhotocardHeight}
                    />
                ) : (
                    <PhotocardComponent
                        key={photocard.id}
                        src={
                            showFront
                                ? photocard.image_id
                                    ? thumbnailUrl(photocard.image_id)
                                    : null
                                : photocard.back_image_id
                                    ? thumbnailUrl(photocard.back_image_id)
                                    : null
                        }
                        fallbackSrc={
                            showFront
                                ? photocard.back_image_id
                                    ? thumbnailUrl(photocard.back_image_id)
                                    : null
                                : photocard.image_id
                                    ? thumbnailUrl(photocard.image_id)
                                    : null
                        }
                        effects={photocard.effects}
                        selectable={isSelectionMode}
                        isSelected={selectedIds?.has(photocard.id!)}
                        isOwned={ownedIds?.has(photocard.id!)}
                        isWishlisted={wishlistedIds?.has(photocard.id!)}
                        onToggle={() => onToggleSelection?.(photocard.id!)}
                        onClick={() =>
                            window.open(`/photocard/${photocard.id}`, "_blank")
                        }
                    >
                        {collections && (
                            <>
                                <p>
                                    {collectionDisplayName(
                                        collections?.find(
                                            (c) =>
                                                c.id ===
                                                photocard.collection_id,
                                        ),
                                    )}
                                </p>
                                <p>
                                    {photocard.members &&
                                        memberIntsToName(photocard.members)}
                                </p>
                            </>
                        )}
                    </PhotocardComponent>
                ),
            )}
        </div>
    );

    if (scrollable) {
        return <div className="min-h-0 overflow-y-auto">{content}</div>;
    }

    return content;
}

export default function PhotocardGrid({
    photocards,
    collections,
    displayCollections = false,
    className,
    scrollable = false,
    showFront = true,
    isSelectionMode = false,
    selectedIds,
    onToggleSelection,
    showEditButton = false,
    draggable = false,
    ownedIds,
    wishlistedIds,
    draggablePhotocardWidth,
    draggablePhotocardHeight,
}: {
    photocards: Selectable<Photocards>[]; // Will be displayed in order provided
    collections?: Selectable<Collections>[]; // Will be displayed in order provided
    displayCollections?: boolean;
    className?: string;
    scrollable?: boolean;
    showFront?: boolean;
    isSelectionMode?: boolean;
    selectedIds?: Set<number>;
    onToggleSelection?: (id: number) => void;
    showEditButton?: boolean;
    draggable?: boolean;
    ownedIds?: Set<number>;
    wishlistedIds?: Set<number>;
    draggablePhotocardWidth?: React.CSSProperties["width"];
    draggablePhotocardHeight?: React.CSSProperties["height"];
}) {
    return displayCollections ? (
        <div
            className={`flex flex-col gap-4 justify-center items-center ${className}`}
        >
            {collections!.map((collection) => {
                const children = photocards.filter(
                    (pc) => pc.collection_id === collection.id,
                );
                const hidden = children.length === 0;

                return (
                    <React.Fragment key={collection.id!}>
                        <h2 hidden={hidden} className="mt-4">
                            {collection.version
                                ? `${collection.name} (${collection.version})`
                                : collection.name}
                        </h2>
                        <div
                            className="flex flex-row gap-2"
                            hidden={!showEditButton || hidden}
                        >
                            <Button className="self-center" asChild>
                                <Link
                                    href={`/createCollection?collectionId=${collection.id}`}
                                >
                                    Edit Collection
                                </Link>
                            </Button>
                            <AlertDialogWithButton
                                title="Delete Collection"
                                description="Are you sure you want to delete this collection? This will also delete all photocards in this collection."
                                submit="Delete"
                                onSubmit={() =>
                                    deleteCollection(collection.id!)
                                }
                            >
                                <Button
                                    className="self-center bg-third"
                                    size="icon"
                                >
                                    <Trash2Icon />
                                </Button>
                            </AlertDialogWithButton>
                        </div>
                        <PhotocardGridWithoutCollections
                            photocards={children}
                            showFront={showFront}
                            className={hidden ? "hidden" : ""}
                            scrollable={scrollable}
                            collections={collections}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelection={onToggleSelection}
                            draggable={draggable}
                            ownedIds={ownedIds}
                            wishlistedIds={wishlistedIds}
                            draggablePhotocardWidth={draggablePhotocardWidth}
                            draggablePhotocardHeight={draggablePhotocardHeight}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    ) : (
        <PhotocardGridWithoutCollections
            photocards={photocards}
            className={className}
            scrollable={scrollable}
            showFront={showFront}
            collections={collections}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
            draggable={draggable}
            ownedIds={ownedIds}
            wishlistedIds={wishlistedIds}
            draggablePhotocardWidth={draggablePhotocardWidth}
            draggablePhotocardHeight={draggablePhotocardHeight}
        />
    );
}
