import { Suspense } from "react";
import BinderClient from "./binder-client";

async function BinderContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return <BinderClient />;
}

export default function BinderPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="flex justify-center p-12">Loading...</div>}>
            <BinderContent params={params} />
        </Suspense>
    );
}

export const metadata = {
    title: "Binder | BTS Flipthru",
    description: "Create and decorate your own, shareable virtual binder!",
};
