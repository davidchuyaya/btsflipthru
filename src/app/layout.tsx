import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MetadataProvider } from "./metadata-context";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "BTS Flipthru",
    description: "TODO", // TODO: add description
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/LOGO.png" type="image/png"></link>
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <MetadataProvider>{children}</MetadataProvider>
                <Toaster />
            </body>
        </html>
    );
}
