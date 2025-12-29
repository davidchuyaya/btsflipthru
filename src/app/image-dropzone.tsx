import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_COMPRESSION_HEIGHT_PX, THUMBNAIL_DISPLAY_HEIGHT_PX } from "@/constants";
import { convertToAvif, formatBytes } from "./actions-client";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

export interface ConvertedImage {
    fullSize: ArrayBuffer;
    thumbnail?: ArrayBuffer;
    previewUrl: string; // Object URL for preview
}

export function ImageDropzone({
    label,
    description,
    disableUpload,
    className,
    imgClassName,
    forceConvertedImage,
    onImageConverted,
    convertThumbnail = true,
}: {
    label?: string;
    description?: string;
    disableUpload?: boolean;
    className?: string;
    imgClassName?: string;
    forceConvertedImage?: ConvertedImage | null;
    onImageConverted: (converted: ConvertedImage) => void;
    convertThumbnail?: boolean;
}) {
    const [convertedImage, setConvertedImage] = useState<ConvertedImage | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [showFileError, setShowFileError] = useState<boolean>(false);

    useEffect(() => {
        if (forceConvertedImage) {
            setConvertedImage(forceConvertedImage);
        }
    }, [forceConvertedImage]);

    const { fileRejections, getRootProps, getInputProps } = useDropzone({
        accept: {
            "image/*": [],
        },
        maxFiles: 1,
        maxSize: MAX_IMAGE_SIZE_BYTES,
        onDrop: async (files) => {
            setIsConverting(true);
            try {
                const converted = await convertFileToImages(files[0]);
                setConvertedImage(converted);
                onImageConverted(converted);
                setShowFileError(false);
            } catch (err) {
                setShowFileError(true);
            } finally {
                setIsConverting(false);
            }
        },
    });

    async function convertFileToImages(file: File): Promise<ConvertedImage> {
        const fullSize = await convertToAvif(file);
        const thumbnail = convertThumbnail ? await convertToAvif(file, THUMBNAIL_COMPRESSION_HEIGHT_PX) : undefined;
        const previewBlob = new Blob([thumbnail ?? fullSize], { type: "image/webp" });
        const previewUrl = URL.createObjectURL(previewBlob);
        return { fullSize, thumbnail, previewUrl };
    }

    return (
        <Field className={className}>
            {label && <FieldLabel>{label}</FieldLabel>}
            {description && <FieldDescription>{description}</FieldDescription>}
            <div
                {...getRootProps({ className: "dropzone" })}
                className=" bg-white resize-none p-5 text-center rounded-xl"
                hidden={disableUpload}
            >
                <input {...getInputProps()} />
                <p>Drop images here.</p>
                <p>Only images under {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB are allowed.</p>
            </div>
            {isConverting && <p className="text-center">Converting...</p>}
            {convertedImage && !showFileError ? (
                <div className="mt-2 flex flex-col items-center gap-3">
                    <img
                        src={convertedImage.previewUrl}
                        className={imgClassName}
                        alt="Preview"
                        height={THUMBNAIL_DISPLAY_HEIGHT_PX}
                        width={THUMBNAIL_DISPLAY_HEIGHT_PX}
                    />
                    <p>
                        Full: {formatBytes(convertedImage.fullSize.byteLength)}{" "}
                        {convertedImage.thumbnail ? (
                            <>| Thumbnail: {formatBytes(convertedImage.thumbnail!.byteLength)}</>
                        ) : null}
                    </p>
                </div>
            ) : null}
            {showFileError ? (
                <p className="text-center" style={{ color: "red" }}>
                    File size exceeds {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit or conversion failed.
                </p>
            ) : null}
        </Field>
    );
}
