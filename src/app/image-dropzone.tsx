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
        image?: File | string | null;
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
            image: imageProp,
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
        // URL created with URL.createObjectURL or string URL.
        const [displayUrl, setDisplayUrl] = useState<string | null>(null);
        // Keep track if we created the object URL to revoke it
        const objectUrlRef = useRef<string | null>(null);

        useEffect(() => {
            if (imageProp instanceof File) {
                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                const url = URL.createObjectURL(imageProp);
                objectUrlRef.current = url;
                setDisplayUrl(url);
                setFileName(imageProp.name);
            } else if (typeof imageProp === "string") {
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }
                setDisplayUrl(imageProp);
                setFileName("Existing Image");
            } else {
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                }
                setDisplayUrl(null);
                setFileName(null);
            }
        }, [imageProp]);

        // Cleanup on unmount
        useEffect(() => {
            return () => {
                if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                }
            };
        }, []);

        // Expose delete method
        useImperativeHandle(ref, () => ({
            delete() {
                onDeleteClicked();
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
                onImageChanged(file);
            },
        });

        function onDeleteClicked() {
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
                    {displayUrl && !disableUpload && (
                        <Button type="button" onClick={onDeleteClicked} size="icon">
                            <Trash2Icon />
                        </Button>
                    )}
                </div>
                {expand ? ( // Don't show unless expanded
                    photocard ? ( // If photocard
                        <PhotocardComponent
                            src={displayUrl}
                            fallbackSrc={null}
                            className={imgClassName}
                            effects={effects!}
                        />
                    ) : displayUrl ? ( // If not photocard, show normal image
                        <img
                            src={displayUrl}
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
