import type { Metadata } from "next";
import "./globals.css";
import { MetadataProvider } from "./metadata-context";
import { Toaster } from "@/components/ui/sonner";
import CursorGlow from "./cursor-glow";

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
            </head>
            <body className="antialiased">
                <CursorGlow />
                <MetadataProvider>{children}</MetadataProvider>
                <Toaster />
            </body>
        </html>
    );
}
