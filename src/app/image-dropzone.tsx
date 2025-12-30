import { MAX_IMAGE_SIZE_BYTES, THUMBNAIL_DISPLAY_HEIGHT_PX } from "@/constants";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

export function ImageDropzone({
    label,
    description,
    disableUpload,
    className,
    imgClassName,
    forceImage,
    onImageChanged,
    shortDescription = false,
    expand = true,
}: {
    label?: string;
    description?: string;
    disableUpload?: boolean;
    className?: string;
    imgClassName?: string;
    forceImage?: File | null;
    onImageChanged: (image: File) => void;
    shortDescription?: boolean;
    expand?: boolean;
}) {
    const [fileName, setFileName] = useState<string | null>(null);
    const [image, setImage] = useState<string | null>(null);

    useEffect(() => {
        if (forceImage) {
            renderImage(forceImage);
        }
    }, [forceImage]);

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
            // Free up memory
            URL.revokeObjectURL(image);
        }
        setImage(URL.createObjectURL(file));
        setFileName(file.name);
    }

    return (
        <Field className={className}>
            {label && <FieldLabel>{label}</FieldLabel>}
            {description && <FieldDescription>{description}</FieldDescription>}
            <div
                {...getRootProps({ className: "dropzone" })}
                className={`bg-white resize-none ${shortDescription ? "p-1 rounded-md" : "p-5 rounded-xl"} text-center `}
                hidden={disableUpload}
            >
                <input {...getInputProps()} />
                {shortDescription ? (
                    <p>{fileName ?? "Choose image"}</p>
                ) : (
                    <>
                        <p>Drop images here.</p>
                        <p>Only images under {MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB are allowed.</p>
                    </>
                )}
            </div>
            {image && expand ? (
                <img
                    src={image}
                    className={`${imgClassName} object-scale-down w-auto! max-w-none flex-auto`}
                    alt="Preview"
                    height={THUMBNAIL_DISPLAY_HEIGHT_PX}
                    style={{
                        height: `${THUMBNAIL_DISPLAY_HEIGHT_PX}px`,
                    }}
                />
            ) : null}
            {fileRejections.map(({ file, errors }) => (
                <p className="text-center" style={{ color: "red" }}>
                    {errors.map((e) => e.message).join(", ")}
                </p>
            ))}
        </Field>
    );
}
