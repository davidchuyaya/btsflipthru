import { ParsedCollection, Photocard } from "@/db";
import PhotocardComponent from "./photocard";
import { NameToMember, thumbnailUrl } from "@/constants";
import React, { useMemo } from "react";

function PhotocardGridWithoutCollections({
    photocards,
    className,
    showFront,
    collections,
}: {
    photocards: Photocard[];
    className?: string;
    showFront?: boolean;
    collections?: Record<number, string>;
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
                >
                    {(() => {
                        const albumName = collections?.[photocard.collectionId];
                        const memberKey = Object.entries(NameToMember).find(([_, key]) => photocard[key as keyof Photocard]);
                        const memberName = memberKey ? memberKey[0] : null;

                        return (
                            <>
                                {albumName && <p>{albumName}</p>}
                                {memberName && <p>{memberName}</p>}
                            </>
                        );
                    })()}
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
                const collectionMap = { [collection.id!]: collection.name };

                return (
                    <React.Fragment key={collection.id!}>
                        <h2 hidden={hidden} className="mt-4">{collection.version ? `${collection.name} (${collection.version})` : collection.name}</h2>
                        <PhotocardGridWithoutCollections
                            photocards={children}
                            showFront={showFront}
                            className={hidden ? "hidden" : ""}
                            collections={collectionMap}
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
            collections={useMemo(() => collections?.reduce(
                    (acc, c) => {
                        acc[c.id!] = c.name;
                        return acc;
                    },
                    {} as Record<number, string>
                ), [collections])}
        />
    );
}
