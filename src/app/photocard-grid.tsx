import { Photocard } from "@/db";
import PhotocardComponent from "./photocard";
import { thumbnailUrl } from "@/constants";

export default function PhotocardGrid({ photocards }: { photocards: Photocard[] }) {
    return (
        <div className="flex flex-row flex-wrap gap-4 justify-center">
            {photocards.map((photocard) => (
                <PhotocardComponent
                    key={photocard.id}
                    src={photocard.imageId ? thumbnailUrl(photocard.imageId) : null}
                    effects={photocard.effects}
                />
            ))}
        </div>
    );
}
