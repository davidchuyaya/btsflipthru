"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageDropzone } from "../image-dropzone";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { CLOUDFLARE_TURNSTILE_SITE_KEY, ReportType, reportTypeToFields } from "@/constants";
import { Suspense, useRef } from "react";
import Script from "next/script";
import useTurnstile from "@/hooks/useTurnstile";
import { Report } from "@/db";
import { useMetadata } from "../metadata-context";
import { addReportToDB } from "@/actions";
import { toast } from "sonner";

const reportSchema = z.object({
    description: z.string().max(5000, "Description must be at most 5000 characters"),
    image: z.any().nullable(),
    includeEmail: z.boolean(),
    turnstileToken: z.string().min(1, "Please verify that you are not a robot"),
});

function ReportForm() {
    const params = useSearchParams();
    const reportType = params.get("reportType") as ReportType;
    const title = params.get("title");
    const url = params.get("url");
    const { reportTitle, descriptionPlaceholder, descriptionSmallText } = reportTypeToFields(reportType);
    const { session } = useMetadata();

    const form = useForm<z.infer<typeof reportSchema>>({
        defaultValues: {
            description: "",
            image: null,
            includeEmail: true,
            turnstileToken: "",
        },
    });

    // cloudflare turnstile hook (provides way to update form state)
    const ref = useRef<HTMLDivElement>(null);
    const { buildTurnstile, resetTurnstile } = useTurnstile(ref, (token: string) =>
        form.setValue("turnstileToken", token),
    );

    async function onSubmit(data: z.infer<typeof reportSchema>) {
        const imageUUID = data.image ? crypto.randomUUID() : null;

        const report: Report = {
            title: title || "No title provided",
            description: data.description,
            imageId: imageUUID,
            userId: session?.user.id || null,
            userEmail: data.includeEmail && session?.user.email ? session.user.email : null,
            url: url || "",
            createdAt: new Date(),
        };

        const result = await addReportToDB(report, data.image, data.turnstileToken);
        if (result.error) {
            toast.error(`Error submitting report: ${result.error}`);
            resetTurnstile(ref);
            return;
        }

        form.reset();
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex justify-center">
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer onReady={buildTurnstile} />
            <FieldGroup className="max-w-2xl m-8">
                <FieldLabel className="text-4xl!">{reportTitle}</FieldLabel>
                <FieldDescription>
                    Your feedback will be reviewed by a moderator. The previous URL and your username will be included
                    in the report.
                </FieldDescription>

                <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Description</FieldLabel>
                            <Textarea {...field} placeholder={descriptionPlaceholder} rows={10} className="mb-2" />
                            <FieldDescription>{descriptionSmallText}</FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                            onImageConverted={field.onChange}
                            convertThumbnail={false}
                        />
                    )}
                />

                <Controller
                    name="includeEmail"
                    control={form.control}
                    render={({ field }) => (
                        <Field orientation="horizontal">
                            <FieldLabel>Follow-up via email</FieldLabel>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="turnstileToken"
                    render={({ field }) => (
                        <Field>
                            <div className="flex justify-center">
                                <div ref={ref} data-sitekey={CLOUDFLARE_TURNSTILE_SITE_KEY}></div>
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

export default function ReportComponent() {
    return (
        <Suspense fallback={<div className="flex justify-center m-8">Loading...</div>}>
            <ReportForm />
        </Suspense>
    );
}
