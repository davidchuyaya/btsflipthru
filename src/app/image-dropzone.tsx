import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_DISPLAY_HEIGHT_PX } from "@/constants";
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useDropzone } from "react-dropzone";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { de } from "zod/v4/locales";
import PhotocardComponent from "./photocard";
import { Effects } from "@/db";

export interface ImageDropzoneRef {
    delete: () => void;
}

export const ImageDropzone = forwardRef<
    ImageDropzoneRef,
    {
        label?: string;
        description?: string;
        disableUpload?: boolean;
        className?: string;
        imgClassName?: string;
        forceImage?: File | null;
        onImageChanged: (image: File) => void;
        onDelete: () => void;
        shortDescription?: boolean;
        expand?: boolean;
        photocard?: boolean;
        effects?: Effects;
    }
>(
    (
        {
            label,
            description,
            disableUpload,
            className,
            imgClassName,
            forceImage,
            onImageChanged,
            onDelete,
            shortDescription = false,
            expand = true,
            photocard = true,
            effects,
        },
        ref,
    ) => {
        const [fileName, setFileName] = useState<string | null>(null);
        // URL created with URL.createObjectURL. Should garbage collect when not used
        const [image, setImage] = useState<string | null>(null);

        useEffect(() => {
            if (forceImage) {
                renderImage(forceImage);
            }
        }, [forceImage]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                if (image) {
                    URL.revokeObjectURL(image);
                }
            };
        }, [image]);

        // Expose delete method
        useImperativeHandle(ref, () => ({
            delete() {
                deleteImage();
            },
        }));

        const { fileRejections, getRootProps, getInputProps } = useDropzone({
            accept: {
                "image/*": [],
            },
            maxFiles: 1,
            maxSize: MAX_IMAGE_SIZE_BYTES,
            onDropAccepted(files, event) {
                const file = files[0];
                renderImage(file);
                onImageChanged(file);
            },
        });

        function renderImage(file: File) {
            if (image) {
                // Garbage collect existing image
                URL.revokeObjectURL(image);
            }
            const url = URL.createObjectURL(file);
            setImage(url);
            setFileName(file.name);
        }

        function deleteImage() {
            if (image) {
                URL.revokeObjectURL(image);
            }
            setImage(null);
            setFileName(null);
        }

        function onDeleteClicked() {
            deleteImage();
            // Tell the parent
            onDelete();
        }

        return (
            <Field className={className}>
                {label && <FieldLabel>{label}</FieldLabel>}
                {description && <FieldDescription>{description}</FieldDescription>}
                <div className="flex flex-row items-center gap-4">
                    <div
                        {...getRootProps({ className: "dropzone" })}
                        className={`bg-white grow ${shortDescription ? "p-1 rounded-md" : "p-5 rounded-xl"} text-center `}
                        hidden={disableUpload}
                    >
                        <input {...getInputProps()} />
                        {shortDescription ? (
                            <p className="p-4">{fileName ?? "Choose image"}</p>
                        ) : (
                            <>
                                <p>Drop images here.</p>
                                <p>Only images under {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB are allowed.</p>
                            </>
                        )}
                    </div>
                    {image && !disableUpload && (
                        <Button type="button" onClick={onDeleteClicked} size="icon">
                            <Trash2Icon />
                        </Button>
                    )}
                </div>
                {expand ? ( // Don't show unless expanded
                    photocard ? ( // If photocard
                        <PhotocardComponent src={image} fallbackSrc={null} className={imgClassName} effects={effects!} />
                    ) : image ? ( // If not photocard, show normal image
                        <img
                            src={image}
                            className={`${imgClassName} object-scale-down w-auto! max-w-none flex-auto`}
                            alt="Preview"
                            height={THUMBNAIL_DISPLAY_HEIGHT_PX}
                            style={{
                                height: `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`,
                            }}
                        />
                    ) : null
                ) : null}
                {fileRejections.map(({ file, errors }) => (
                    <p className="text-center" style={{ color: "red" }} key={file.size}>
                        {
                            errors.map((e) => {
                                switch (e.code) {
                                    case "file-too-large":
                                        return `File ${file.name} is too large. Maximum size is ${
                                            MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
                                        }MB.`;
                                    case "file-invalid-type":
                                        return `File ${file.name} has an invalid file type.`;
                                    default:
                                        return e.message;
                                }
                            })[0]
                        }
                    </p>
                ))}
            </Field>
        );
    },
);
