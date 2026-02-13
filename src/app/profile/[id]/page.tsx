import { getCollectionsFromDB, getUserProfileDataFromDB } from "@/actions";
import ProfileClient from "./profile-client";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";

const getUserProfileData = cache(getUserProfileDataFromDB);

async function ProfileContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const userData = await getUserProfileData(id);
    const collections = await getCollectionsFromDB();

    if (userData.error || collections.error) {
        notFound();
    }

    return (
        <ProfileClient
            userData={userData.data!}
            collections={collections.data!}
        />
    );
}

export default function ProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center p-12">Loading...</div>
            }
        >
            <ProfileContent params={params} />
        </Suspense>
    );
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const userData = await getUserProfileData(id);
    if (userData.error) {
        return {
            title: "Profile | BTS Flipthru",
        };
    }
    return {
        title: `@${userData.data?.username} | BTS Flipthru`,
    };
}
