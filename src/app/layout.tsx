import type { Metadata } from "next";
import "./globals.css";
import { MetadataProvider } from "@/metadata-context";
import { Toaster } from "@/components/ui/sonner";
import CursorGlow from "./cursor-glow";
import NavigationComponent from "@/components/ui/navigation-menu";
import FooterComponent from "./footer";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata: Metadata = {
    title: "BTS Flipthru",
    description: "Flipthru is a BTS photocard archive, binder planning tool, and personal wishlist tracker all in one!",
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
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"></link>
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"></link>
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"></link>
            </head>
            <body className="antialiased">
                <CursorGlow />
                <MetadataProvider>
                    <NavigationComponent />
                    {children}
                    <FooterComponent />
                </MetadataProvider>
                <Toaster />
            </body>
            <GoogleAnalytics gaId="G-CCW8KV9SSY" />
        </html>
    );
}
