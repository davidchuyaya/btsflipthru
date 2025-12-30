"use client";

import { isAtLeastMod, signInGoogle } from "@/auth-client";
import Link from "next/link";
import { useMetadata } from "@/metadata-context";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import NavigationComponent, { NavItem } from "@/components/ui/navigation-menu";
import { useEffect, useState } from "react";

export default function Home() {
    const { session } = useMetadata();
    const [navItems, setNavItems] = useState<NavItem[]>([]);

    useEffect(() => {
        let profileItem: NavItem;
        if (session === null) {
            profileItem = { title: "Sign in", onClick: signInGoogle, middle: false };
        } else {
            profileItem = { title: "Profile", href: "/profile", middle: false };
        }
        const items: NavItem[] = [
            { title: "About", href: "/about", middle: false },
            { title: "FAQ", href: "/faq", middle: false },
            { title: "Contact", href: "/contact", middle: false },
            { title: "Photocards Archive", href: "/search", middle: true },
            { title: "My Binders", href: "/binder", middle: false },
            profileItem,
        ];
        setNavItems(items);
    }, [session]);

    return (
        <div>
            <Image src="/logo_border.svg" alt="Flip Thru Logo" width={200} height={200} />
            <NavigationComponent navItems={navItems} />

            <Button hidden={!isAtLeastMod(session)} asChild>
                <Link href="/createCollection">Add to Archive</Link>
            </Button>
            <Button asChild>
                <Link href="/search">Search</Link>
            </Button>
        </div>
    );
}
