"use client";

import { Button } from "@/components/ui/button";
import { ReportType, reportWindowURL } from "@/constants";
import Link from "next/link";
import { useEffect, useState } from "react";
import SocialButtonsComponent from "./social-buttons";

function FooterButton({ text, href }: { text: string; href: string }) {
    return (
        <Button variant="textShadow" className="text-accent-light text-2xl py-0" asChild>
            <Link href={href}>{text}</Link>
        </Button>
    );
}

export default function FooterComponent() {
    const [url, setUrl] = useState("");

    useEffect(() => {
        setUrl(window.location.href);
    }, []);

    return (
        <div className="w-svw flex flex-row justify-center items-center p-4 bg-main font-heading">
            <div className="flex flex-col justify-start items-start">
                <FooterButton text="Sitemap" href="/sitemap.xml" />
                <FooterButton text="Error Report Form" href={reportWindowURL(ReportType.Error, url, "Generic error")} />
                <FooterButton
                    text="Feature Request Form"
                    href={reportWindowURL(ReportType.FeatureRequest, url, "Feature request")}
                />
                <FooterButton text="Resources & How-To Guides" href="/" />
            </div>
            <Link href="/" className="grow-10">
                <img src="logo_border.svg" alt="Logo" className="h-26 w-auto m-auto" />
            </Link>

            <div className="flex flex-col justify-start items-end grow">
                <FooterButton text="Terms of Service" href="/" />
                <FooterButton text="Privacy Policy" href="/" />
                <FooterButton text="Contact" href="/contact" />
                <SocialButtonsComponent size={6} className="mr-2" />
            </div>
        </div>
    );
}
