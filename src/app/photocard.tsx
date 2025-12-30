"use client";

import { thumbnailUrl } from "@/constants";
import "hover-tilt/web-component";

export default function PhotocardComponent({ imageId }: { imageId: string | null }) {
    // TODO: If image is broken, show different placeholder
    // TODO: Change imageId type to allow null, show placeholder 
    return (
        <div>
            <hover-tilt tilt-factor="0.5" scale-factor="1" className="inline-block [&::part(container)]:rounded-3xl [&::part(tilt)]:overflow-hidden">
                {imageId ? <img src={thumbnailUrl(imageId)} alt="Photocard front" /> : null}
            </hover-tilt>
        </div>
    );
}