"use client";

import { signInGoogle } from "@/auth-client";
import { AlertDialogWithButton } from "@/components/ui/alert-dialog";
import { ReactNode } from "react";

export default function SignInRequiredDialog({
    callbackURL,
    children,
}: {
    callbackURL: string;
    children: ReactNode;
}) {
    return (
        <AlertDialogWithButton
            title="Sign In Required"
            description="Please sign in to access this feature."
            submit="Sign In"
            onSubmit={() => {
                signInGoogle(callbackURL);
            }}
        >
            {children}
        </AlertDialogWithButton>
    );
}
