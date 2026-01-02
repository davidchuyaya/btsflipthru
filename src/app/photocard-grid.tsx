import { Photocard } from "@/db";
import PhotocardComponent from "./photocard";
import { thumbnailUrl } from "@/constants";

export default function PhotocardGrid({ photocards, className, showFront }: { photocards: Photocard[]; className?: string; showFront?: boolean }) {
    // TODO Display collection names if prompted
    return (
        <div className={`flex flex-row flex-wrap gap-4 justify-center ${className}`}>
            {photocards.map((photocard) => (
                <PhotocardComponent
                    key={photocard.id}
                    src={showFront ? (photocard.imageId ? thumbnailUrl(photocard.imageId) : null) : (photocard.backImageId ? thumbnailUrl(photocard.backImageId) : null)}
                    fallbackSrc={showFront ? (photocard.backImageId ? thumbnailUrl(photocard.backImageId) : null) : (photocard.imageId ? thumbnailUrl(photocard.imageId) : null)}
                    effects={photocard.effects}
                />
            ))}
        </div>
    );
}
