"use client";

import { ReportType } from "@/constants";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ReportForm from "./report";

export default function ReportPageComponent() {
    const params = useSearchParams();
    const reportType = params.get("reportType") as ReportType;
    const title = params.get("title");
    const url = params.get("url");

    return (
        <Suspense fallback={<div className="flex justify-center m-8">Loading...</div>}>
            <ReportForm reportType={reportType} title={title} url={url} />
        </Suspense>
    );
}
