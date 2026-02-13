import { ReportType } from "@/constants";
import ReportForm from "../report/report";

export const metadata = {
    title: "Contact Us | BTS Flipthru",
    description: "Reach out to BTS Flipthru with any suggestions or feedback!",
};

export default function ContactComponent() {
    return (
        <ReportForm
            reportType={ReportType.Contact}
            title={"Contact Us"}
            url="/contact"
        />
    );
}
