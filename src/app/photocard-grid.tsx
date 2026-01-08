import PhotocardComponent from "./photocard";
import { collectionDisplayName, memberIntsToName, thumbnailUrl } from "@/constants";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Collections, Photocards } from "@/db";
import { Selectable } from "kysely";

function PhotocardGridWithoutCollections({
    photocards,
    className,
    showFront,
    collections,
    isSelectionMode,
    selectedIds,
    onToggleSelection,
}: {
    photocards: Selectable<Photocards>[];
    className?: string;
    showFront?: boolean;
    collections?: Selectable<Collections>[];
    isSelectionMode?: boolean;
    selectedIds?: Set<number>;
    onToggleSelection?: (id: number) => void;
}) {
    return (
        <div className={`flex flex-row flex-wrap gap-4 justify-center ${className}`}>
            {photocards.map((photocard) => (
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
                    onToggle={() => onToggleSelection?.(photocard.id!)}
                    onClick={() => window.open(`/photocard/${photocard.id}`, "_blank")}
                >
                    {collections && (
                        <>
                            <p>{collectionDisplayName(collections?.find((c) => c.id === photocard.collection_id))}</p>
                            <p>{photocard.members && memberIntsToName(photocard.members)}</p>
                        </>
                    )}
                </PhotocardComponent>
            ))}
        </div>
    );
}

export default function PhotocardGrid({
    photocards,
    collections,
    displayCollections = false,
    className,
    showFront = true,
    isSelectionMode = false,
    selectedIds,
    onToggleSelection,
    showEditButton = false,
}: {
    photocards: Selectable<Photocards>[]; // Will be displayed in order provided
    collections?: Selectable<Collections>[]; // Will be displayed in order provided
    displayCollections?: boolean;
    className?: string;
    showFront?: boolean;
    isSelectionMode?: boolean;
    selectedIds?: Set<number>;
    onToggleSelection?: (id: number) => void;
    showEditButton?: boolean;
}) {
    return displayCollections ? (
        <div className={`flex flex-col gap-4 justify-center items-center ${className}`}>
            {collections!.map((collection) => {
                const children = photocards.filter((pc) => pc.collection_id === collection.id);
                const hidden = children.length === 0;

                return (
                    <React.Fragment key={collection.id!}>
                        <h2 hidden={hidden} className="mt-4">
                            {collection.version ? `${collection.name} (${collection.version})` : collection.name}
                        </h2>
                        <Button hidden={!showEditButton || hidden} className="self-center" asChild>
                            <Link href={`/createCollection?collectionId=${collection.id}`}>Edit Collection</Link>
                        </Button>
                        <PhotocardGridWithoutCollections
                            photocards={children}
                            showFront={showFront}
                            className={hidden ? "hidden" : ""}
                            collections={collections}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelection={onToggleSelection}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    ) : (
        <PhotocardGridWithoutCollections
            photocards={photocards}
            className={className}
            showFront={showFront}
            collections={collections}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedIds}
            onToggleSelection={onToggleSelection}
        />
    );
}
