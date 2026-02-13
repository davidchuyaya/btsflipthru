"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

function SocialButton({
    href,
    imgSrc,
    altText,
    size,
}: {
    href: string;
    imgSrc: string;
    altText: string;
    size: number;
}) {
    return (
        <Button variant="imageShadow" asChild>
            <Link href={href} className="px-2!">
                <img
                    src={imgSrc}
                    alt={altText}
                    className={`h-${size} max-w-none`}
                />
            </Link>
        </Button>
    );
}

export default function SocialButtonsComponent({
    size = 8,
    className,
}: {
    size?: number;
    className?: string;
}) {
    return (
        <div className={`flex flex-row ${className}`}>
            <SocialButton
                href="https://discord.gg/KtT6Zsfz"
                imgSrc="/discord.svg"
                altText="Discord Icon"
                size={size}
            />
            <SocialButton
                href="https://www.instagram.com/btsflipthru/"
                imgSrc="/instagram.svg"
                altText="Instagram Icon"
                size={size}
            />
            <SocialButton
                href="https://bsky.app/profile/btsflipthru.bsky.social"
                imgSrc="/bluesky.svg"
                altText="Bluesky Icon"
                size={size}
            />
            <SocialButton
                href="https://twitter.com/btsflipthru"
                imgSrc="/twitter.svg"
                altText="Twitter Icon"
                size={size}
            />
            <SocialButton
                href="https://ko-fi.com/btsflipthru"
                imgSrc="/kofi_symbol.svg"
                altText="Ko-fi Icon"
                size={size}
            />
        </div>
    );
}
