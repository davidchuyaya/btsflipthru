import { ParsedCollection, Photocard } from "@/db";
import PhotocardComponent from "./photocard";
import { thumbnailUrl } from "@/constants";
import React from "react";

function PhotocardGridWithoutCollections({
    photocards,
    className,
    showFront,
}: {
    photocards: Photocard[];
    className?: string;
    showFront?: boolean;
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
                />
            ))}
        </div>
    );
}

export default function PhotocardGrid({
    photocards,
    collections,
    displayCollections = false,
    className,
    showFront,
}: {
    photocards: Photocard[]; // Will be displayed in order provided
    collections?: ParsedCollection[]; // Will be displayed in order provided
    displayCollections?: boolean;
    className?: string;
    showFront?: boolean;
}) {
    return displayCollections ? (
        <div className="flex flex-col gap-4 justify-center items-center ${className}">
            {collections!.map((collection) => {
                const children = photocards.filter((pc) => pc.collectionId === collection.id);
                const hidden = children.length === 0;
                return (
                    <React.Fragment key={collection.id!}>
                        <h2 hidden={hidden} className="mt-4">{collection.version ? `${collection.name} (${collection.version})` : collection.name}</h2>
                        <PhotocardGridWithoutCollections
                            photocards={children}
                            showFront={showFront}
                            className={hidden ? "hidden" : ""}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    ) : (
        <PhotocardGridWithoutCollections photocards={photocards} className={className} showFront={showFront} />
    );
}
