import { getUserProfileDataFromDB } from "@/actions";
import ProfileClient from "./profile-client";
import { notFound } from "next/navigation";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await getUserProfileDataFromDB(id);

    if (result.error) {
        notFound();
    }

    return <ProfileClient userData={result.data!} />;
}
