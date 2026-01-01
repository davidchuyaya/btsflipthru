"use client";

import { ReportType } from "@/constants";
import ReportForm from "../report/report";

export default function ContactComponent() {
    return <ReportForm reportType={ReportType.Contact} title={"Contact Us"} url="/contact" />;
}