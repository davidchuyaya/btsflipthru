import { ParsedCollection, Photocard } from "@/db";
import PhotocardComponent from "./photocard";
import { memberBooleanNumbersToName, thumbnailUrl } from "@/constants";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function PhotocardGridWithoutCollections({
    photocards,
    className,
    showFront,
    collections,
    isSelectionMode,
    selectedIds,
    onToggleSelection,
}: {
    photocards: Photocard[];
    className?: string;
    showFront?: boolean;
    collections?: ParsedCollection[];
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
                            ? photocard.imageId
                                ? thumbnailUrl(photocard.imageId)
                                : null
                            : photocard.backImageId
                              ? thumbnailUrl(photocard.backImageId)
                              : null
                    }
                    fallbackSrc={
                        showFront
                            ? photocard.backImageId
                                ? thumbnailUrl(photocard.backImageId)
                                : null
                            : photocard.imageId
                              ? thumbnailUrl(photocard.imageId)
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
                            <p>{collections?.find((c) => c.id === photocard.collectionId)?.name}</p>
                            <p>{memberBooleanNumbersToName(photocard)}</p>
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
    photocards: Photocard[]; // Will be displayed in order provided
    collections?: ParsedCollection[]; // Will be displayed in order provided
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
                const children = photocards.filter((pc) => pc.collectionId === collection.id);
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
