"use client";

import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useMetadata } from "@/metadata-context";
import { signInGoogle } from "@/auth-client";
import Image from "next/image";
import { isAtLeastMod } from "@/auth-client";
import { Button } from "./button";
import Link from "next/link";
import SocialButtonsComponent from "@/app/social-buttons";

function NavigationMenu({
    className,
    children,
    viewport = true,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
    viewport?: boolean;
}) {
    return (
        <NavigationMenuPrimitive.Root
            data-slot="navigation-menu"
            data-viewport={viewport}
            className={cn(
                "relative z-10 flex w-full font-heading p-1 bg-main flex-1 items-center justify-center [&>div]:w-full",
                className,
            )}
            {...props}
        >
            {children}
            {viewport && <NavigationMenuViewport />}
        </NavigationMenuPrimitive.Root>
    );
}

function NavigationMenuList({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
    return (
        <NavigationMenuPrimitive.List
            data-slot="navigation-menu-list"
            className={cn(
                "group flex w-full list-none items-center font-heading justify-center space-x-1",
                className,
            )}
            {...props}
        />
    );
}

function NavigationMenuItem({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
    return (
        <NavigationMenuPrimitive.Item
            data-slot="navigation-menu-item"
            className={cn("relative", className)}
            {...props}
        />
    );
}

const navigationMenuTriggerStyle = cva(
    "group inline-flex h-10 w-max items-center justify-center rounded-base bg-main px-4 py-2 text-sm font-heading text-accent transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
);

function NavigationMenuTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
    return (
        <NavigationMenuPrimitive.Trigger
            data-slot="navigation-menu-trigger"
            className={cn(navigationMenuTriggerStyle(), "group", className)}
            {...props}
        >
            {children}{" "}
            <ChevronDown
                className="relative top-[1px] ml-2 size-4 font-heading transition duration-200 group-data-[state=open]:rotate-180"
                aria-hidden="true"
            />
        </NavigationMenuPrimitive.Trigger>
    );
}

function NavigationMenuContent({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
    return (
        <NavigationMenuPrimitive.Content
            data-slot="navigation-menu-content"
            className={cn(
                "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
                "group-data-[viewport=false]/navigation-menu:bg-main group-data-[viewport=false]/navigation-menu:text-main-foreground group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
                className,
            )}
            {...props}
        />
    );
}

function NavigationMenuLink({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
    return (
        <NavigationMenuPrimitive.Link
            data-slot="navigation-menu-link"
            className={cn(
                "block select-none space-y-1 rounded-base p-2 leading-none no-underline outline-none transition-colors focus-visible:ring-4 focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        />
    );
}

function NavigationMenuViewport({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
    return (
        <div
            className={cn(
                "absolute top-full left-0 isolate z-50 flex justify-center",
            )}
        >
            <NavigationMenuPrimitive.Viewport
                data-slot="navigation-menu-viewport"
                className={cn(
                    "origin-top-center relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-base border-2 border-border bg-main text-main-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-(--radix-navigation-menu-viewport-width)",
                    className,
                )}
                {...props}
            />
        </div>
    );
}

function NavigationMenuIndicator({
    className,
    ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
    return (
        <NavigationMenuPrimitive.Indicator
            data-slot="navigation-menu-indicator"
            className={cn(
                "top-full z-1 flex h-1.5 items-end font-heading justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
                className,
            )}
            {...props}
        >
            <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-white" />
        </NavigationMenuPrimitive.Indicator>
    );
}

type NavItem = {
    title: string;
    href: string;
    middle: boolean;
    onClick?: never;
};

const navItems: NavItem[] = [
    { title: "About", href: "/about", middle: false },
    { title: "FAQ", href: "/faq", middle: false },
    { title: "Contact", href: "/contact", middle: false },
    { title: "Photocard Archive", href: "/search", middle: true },
    { title: "My Binders", href: "/binder", middle: false },
];

function MenuItemComponent({
    title,
    href,
    middle,
    onClick,
}: {
    title: string;
    href?: string;
    middle: boolean;
    onClick?: () => void;
}) {
    return (
        <NavigationMenuItem className={middle ? "grow text-center" : ""}>
            <NavigationMenuLink asChild>
                {href ? (
                    <Button variant="textShadow" asChild>
                        <Link
                            href={href}
                            className={navigationMenuTriggerStyle()}
                        >
                            {title}
                        </Link>
                    </Button>
                ) : (
                    <Button
                        variant="textShadow"
                        onClick={onClick}
                        className={navigationMenuTriggerStyle()}
                    >
                        {title}
                    </Button>
                )}
            </NavigationMenuLink>
        </NavigationMenuItem>
    );
}

export default function NavigationComponent() {
    const { session } = useMetadata();

    return (
        <>
            <div className="flex flex-row m-4 items-center justify-between">
                <Link href="/" className="flex flex-row items-center">
                    <Image
                        src="/logo_border.svg"
                        alt="Flip Thru Logo"
                        width={200}
                        height={200}
                        className="size-20 lg:size-50"
                    />
                    <p className="text-3xl lg:text-5xl! font-heading text-main-light px-4 lg:px-8">
                        For <span className="text-main">BTS</span> Photocard
                        Collectors
                    </p>
                </Link>
                <SocialButtonsComponent className="max-lg:hidden" />
            </div>
            <NavigationMenu className="z-5 w-svw max-w-svw">
                <NavigationMenuList className="flex-wrap">
                    {navItems.map((item, index) => (
                        <MenuItemComponent
                            key={index}
                            title={item.title}
                            href={item.href}
                            middle={item.middle}
                        />
                    ))}
                    {session === null ? (
                        <MenuItemComponent
                            title="Sign In"
                            onClick={() => signInGoogle(window.location.href)}
                            middle={false}
                        />
                    ) : (
                        <MenuItemComponent
                            title="Profile"
                            href={`/profile/${session.user.id}`}
                            middle={false}
                        />
                    )}
                </NavigationMenuList>
            </NavigationMenu>
        </>
    );
}
