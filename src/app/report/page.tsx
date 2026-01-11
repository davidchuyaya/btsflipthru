"use client";

import { ReportType } from "@/constants";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ReportForm from "./report";

export const metadata = {
    title: "Report Feedback | BTS Flipthru",
    description: "Let us know if something's wrong with BTS Flipthru.",
};

function ReportPageSuspenseWrapper() {
    const params = useSearchParams();
    const reportType = params.get("reportType") as ReportType;
    const title = params.get("title");
    const url = params.get("url");

    return <ReportForm reportType={reportType} title={title} url={url} />;
}

export default function ReportPageComponent() {
    return (
        <Suspense fallback={<div className="flex justify-center m-8">Loading...</div>}>
            <ReportPageSuspenseWrapper />
        </Suspense>
    );
}
