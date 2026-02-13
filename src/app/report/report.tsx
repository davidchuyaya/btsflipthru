"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageDropzone } from "../image-dropzone";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import {
    CLOUDFLARE_TURNSTILE_SITE_KEY,
    ReportType,
    reportTypeToFields,
} from "@/constants";
import { useRef } from "react";
import Script from "next/script";
import useTurnstile from "@/hooks/useTurnstile";
import { useMetadata } from "@/metadata-context";
import { addReportToDB } from "@/actions";
import { UAParser } from "ua-parser-js";
import { uploadImage } from "@/actions-client";
import { Reports } from "@/db";
import { Insertable } from "kysely";

const reportSchema = z.object({
    description: z
        .string()
        .max(5000, "Description must be at most 5000 characters"),
    image: z.instanceof(File).nullable(),
    includeEmail: z.boolean(),
    turnstileToken: z.string().min(1, "Please verify that you are not a robot"),
});

export default function ReportForm({
    reportType,
    title,
    url,
}: {
    reportType: ReportType;
    title: string | null;
    url: string | null;
}) {
    const { reportTitle, descriptionPlaceholder, descriptionSmallText } =
        reportTypeToFields(reportType);
    const { session, setError } = useMetadata();
    const { browser, device, os } = UAParser();

    const form = useForm<z.infer<typeof reportSchema>>({
        defaultValues: {
            description: "",
            image: null,
            includeEmail: false,
            turnstileToken: "",
        },
    });

    // cloudflare turnstile hook (provides way to update form state)
    const ref = useRef<HTMLDivElement>(null);
    const { buildTurnstile, resetTurnstile } = useTurnstile(
        ref,
        (token: string) => form.setValue("turnstileToken", token),
    );

    async function onSubmit(data: z.infer<typeof reportSchema>) {
        const report: Insertable<Reports> = {
            title: title || "No title provided",
            description: data.description,
            user_id: session?.user.id || null,
            user_email:
                data.includeEmail && session?.user.email
                    ? session.user.email
                    : null,
            url: url || "",
            user_agent: `Browser: ${browser.name || "Unknown"} ${browser.version || ""}, OS: ${os.name || "Unknown"} ${os.version || ""}, Device: (${device.vendor || "Unknown Device"} ${device.model || ""})`,
        };

        const result = await addReportToDB(
            report,
            data.image !== null,
            data.turnstileToken,
        );
        if (result.error) {
            setError(`Error submitting report: ${result.error}`);
            resetTurnstile(ref);
            return;
        }

        if (result.data) {
            const uploadResult = await uploadImage(result.data, data.image!);
            if (uploadResult.error) {
                setError(`Error uploading image: ${uploadResult.error}`);
                return;
            }
        }

        form.reset();
    }

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex justify-center"
        >
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                async
                defer
                onReady={buildTurnstile}
            />
            <FieldGroup className="max-w-2xl m-8">
                <FieldLabel className="text-4xl!">{reportTitle}</FieldLabel>
                <FieldDescription>
                    Your feedback will be reviewed by a moderator. The previous
                    URL {session && "and your username "}will be included in the
                    report.
                </FieldDescription>

                <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Description</FieldLabel>
                            <Textarea
                                {...field}
                                placeholder={descriptionPlaceholder}
                                rows={10}
                                className="mb-2"
                            />
                            <FieldDescription>
                                {descriptionSmallText}
                            </FieldDescription>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                <Controller
                    name="image"
                    control={form.control}
                    render={({ field }) => (
                        <ImageDropzone
                            label="Upload an image (optional)"
                            description="Please remove any sensitive information from the image."
                            className="mb-2"
                            onImageChanged={field.onChange}
                            onDelete={() => field.onChange(null)}
                            photocard={false}
                        />
                    )}
                />

                <Controller
                    name="includeEmail"
                    control={form.control}
                    render={({ field }) => (
                        <Field orientation="horizontal">
                            <FieldContent>
                                <FieldLabel>Follow-up via email</FieldLabel>
                                <FieldDescription>
                                    Disabled for non-users.
                                </FieldDescription>
                            </FieldContent>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={session === null}
                            />
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="turnstileToken"
                    render={({ field }) => (
                        <Field>
                            <div className="flex justify-center">
                                <div
                                    ref={ref}
                                    data-sitekey={CLOUDFLARE_TURNSTILE_SITE_KEY}
                                ></div>
                            </div>
                        </Field>
                    )}
                />

                <Button type="submit" className="max-w-20 self-center">
                    Submit
                </Button>
            </FieldGroup>
        </form>
    );
}
