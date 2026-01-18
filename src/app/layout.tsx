import type { Metadata } from "next";
import "./globals.css";
import { MetadataProvider } from "@/metadata-context";
import { Toaster } from "@/components/ui/sonner";
import CursorGlow from "./cursor-glow";
import NavigationComponent from "@/components/ui/navigation-menu";
import FooterComponent from "./footer";
import { GoogleAnalytics } from "@next/third-parties/google";
import BodyWrapper from "./body-wrapper";

const title = "BTS Flipthru";
const description =
    "Flipthru is a BTS photocard archive, binder planning tool, and personal wishlist tracker all in one!";
const image = "https://btsflipthru.com/icon.png";
const url = "https://btsflipthru.com";

export const metadata: Metadata = {
    title,
    description,
    metadataBase: new URL(url),
    applicationName: title,
    appleWebApp: {
        title,
    },
    openGraph: {
        title,
        description,
        siteName: title,
        images: [
            {
                url: image,
            },
        ],
    },
    twitter: {
        title,
        description,
        card: "summary_large_image",
        images: [
            {
                url: image,
            },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="stylesheet" href="https://use.typekit.net/gpm8jeo.css"></link>
                <link rel="icon" href="/icon.png"></link>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            name: title,
                            description,
                            url,
                            image,
                        }).replace(/</g, '\\u003c'),
                    }}
                />
            </head>
            <body className="antialiased">
                <MetadataProvider>
                    <BodyWrapper>
                        <CursorGlow />
                        <NavigationComponent />
                        {children}
                        <FooterComponent />
                    </BodyWrapper>
                </MetadataProvider>
                <Toaster />
            </body>
            <GoogleAnalytics gaId="G-CCW8KV9SSY" />
        </html>
    );
}
