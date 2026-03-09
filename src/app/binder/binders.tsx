"use client";

import { createBinder } from "@/actions";
import SignInRequiredDialog from "@/components/sign-in-required-dialog";
import { Button } from "@/components/ui/button";
import { UserBinders } from "@/db";
import { Selectable } from "kysely";
import { FolderPlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BindersComponent({
    binders,
    isSelf,
    isSignedIn,
}: {
    binders: Selectable<UserBinders>[];
    isSelf: boolean;
    isSignedIn: boolean;
}) {
    const router = useRouter();

    async function onCreateBinder() {
        toast.promise(
            async () => {
                const result = await createBinder();

                if (result.error) {
                    throw new Error(result.error);
                }

                router.refresh();
            },
            {
                loading: "Creating binder...",
                success: "Binder created",
                error: (error) => error.message,
            },
        );
    }

    return (
        <div className="flex flex-row items-center justify-center gap-8">
            {binders
                .sort((a, b) => a.updated_at.getTime() - b.updated_at.getTime())
                .map((binder) => (
                    <Link
                        key={binder.id}
                        href={`/binder/${binder.id}`}
                        className="flex flex-col items-center gap-4"
                    >
                        <Image
                            src="/binder_done.svg"
                            className="size-32"
                            width="216"
                            height="214"
                            alt="Binder Icon"
                        />
                        <h4 className="text-3xl">{binder.name}</h4>
                    </Link>
                ))}
            {binders.length === 0 && <p>No binders yet!</p>}
            {!isSignedIn ? (
                <SignInRequiredDialog callbackURL="/binder">
                    <Button size="icon" className="px-3" hidden={!isSelf}>
                        <FolderPlusIcon />
                    </Button>
                </SignInRequiredDialog>
            ) : (
                <Button
                    size="icon"
                    className="px-3"
                    hidden={!isSelf}
                    onClick={onCreateBinder}
                >
                    <FolderPlusIcon />
                </Button>
            )}
        </div>
    );
}
