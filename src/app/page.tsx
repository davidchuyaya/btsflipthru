"use server";

import { notFound } from "next/navigation";
import HomeClient from "./home-client";
import { getDate, getHomeStats } from "@/actions";

export default async function Home() {
    const homeStats = await getHomeStats();
    if (homeStats.error) {
        notFound();
    }
    return <HomeClient homeStats={homeStats.data!} today={await getDate()} />;
}