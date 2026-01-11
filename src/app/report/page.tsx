import { Metadata } from "next";
import ReportClientPage from "./report-client-page";

export const metadata: Metadata = {
    title: "Report Feedback | BTS Flipthru",
    description: "Let us know if something's wrong with BTS Flipthru.",
};

export default function ReportPage() {
    return <ReportClientPage />;
}
