"use client";

import { Effects } from "@/constants";
import PhotocardComponent, { PlaceholderType } from "../photocard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportType, reportWindowURL } from "@/constants";

export default function AboutComponent() {
    return (
        <div className="page max-w-7/10!">
            <div className="page-body">
                <h1>What We Do</h1>
                <p>
                    Flipthru is a home-grown BTS photocard archive, binder planning tool, and personal wishlist tracker
                    all in one!
                </p>

                <p>
                    Our goal is to serve as a BTS-exclusive community hub for collectors and creators worldwide.
                    Equally, we aim to support the past, present, and future activities of BTS - especially as we count
                    down to the 2026 comeback! See more about our mission and what we stand for in the “How We Do It”
                    section below.
                </p>

                <p>
                    Ultimately, Flipthru is built by and for ARMY. You can learn about the creators via our profiles
                    below! We aim to contribute to the fan community by making it easier, more accessible, and more fun
                    to participate in photocard collecting, virtually or otherwise.
                </p>
                <p>
                    Whether you’re an avid collector or a visitor looking up one particular card, we’re glad to have you
                    here!
                </p>
            </div>
            
            <div className="page-body gap-8!">
                <h1 className="">How We Do it</h1>
                <div className="page-section">
                    <h2>Flipthru is community-focused</h2>
                    <p>
                        We support BTS, ARMY, artists, designers, and creators of all kinds, since we are small-scale
                        ARMY creators ourselves. If you’d like to be featured on Flipthru, please reach out to us via
                        the{" "}
                        <Button variant="underline" size="noPadding" asChild>
                            <Link href="/contact">Contact</Link>
                        </Button>{" "}
                        tab!
                    </p>
                    <p>We are steadfastly anti-AI, anti-NFT, and anti-ads.</p>
                    <p>
                        Flipthru will never run ads, nor will we sell your data, promote generative AI,
                        steal/sell/scrape content from other creators, or otherwise undercut the hard work that our
                        community does to show their talent and love for BTS.
                    </p>
                    <p>
                        To this end, we expect that all of our scans are submitted by someone who owns that card IRL;
                        Kate and David, our site admins, have scanned hundreds of them by hand themselves from their own
                        collection already (now you see why it took so long to launch)!
                    </p>
                    <Button className="mt-4" asChild>
                        <Link href="/">See Our Process (Coming soon!)</Link>
                    </Button>
                    <Button className="mt-4" asChild>
                        <Link href="/search">Contribute Your Own Cards</Link>
                    </Button>
                    <Button className="mt-4" asChild>
                        <Link href={reportWindowURL(ReportType.AIStolenContent, "/about", "AI/Stolen Content")}>
                            Report AI/Stolen Content
                        </Link>
                    </Button>
                </div>
                <div className="page-section">
                    <h2>Flipthru is free for everyone, forever</h2>
                    <p>
                        We are fans of BTS first, and we don’t want to make money for ourselves off of their success.
                        We’re also keeping site costs low to make sure we can run this site for ARMY forever.
                    </p>
                    <p>
                        We plan to eventually set up a Ko-fi purely to offset the cost of operating the site, but it’s
                        completely optional, and we are able to comfortably run the site out-of-pocket without any
                        financial contributions from ARMY whatsoever. If our proceeds from Ko-fi ever exceed the cost of
                        running the site, it will be rolled over to cover the release of more costly features (we have
                        lots of ideas!).
                    </p>
                    <p className="mb-4">
                        You can see exactly how much it costs to run Flipthru and how we use our Ko-fi funds here.
                    </p>
                    <Table className="max-w-150 m-auto">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Cost/Month</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-left">URL</TableCell>
                                <TableCell className="text-right">$0.87</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-left">Server (Contabo)</TableCell>
                                <TableCell className="text-right">$5.57</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-left">
                                    Image Hosting/Compression (Cloudinary Free Tier)
                                </TableCell>
                                <TableCell className="text-right">$0</TableCell>
                            </TableRow>
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell className="text-left">Total</TableCell>
                                <TableCell className="text-right">$6.44</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
                <div className="page-section">
                    <h2>Flipthru’s code is open-source</h2>
                    <p>
                        This means our code is public for anyone to use, so you can reproduce a site just like this one
                        themed for your favorite group(s). If you want to make, say, a Twice version of Flipthru, please
                        feel free to do so! We’d love to see people making use of all the work that went into this site
                        over the first three years of development. We have two repositories - one that we scrapped due
                        to code inefficiency, and the one that contains the code that we use now, linked below for your
                        perusal and usage.
                    </p>
                    <Button className="m-4" asChild>
                        <Link href="https://github.com/davidchuyaya/btsflipthru">
                            <img
                                src="/github.svg"
                                alt="GitHub Logo"
                                width={28}
                                height={28}
                                className="w-5 max-w-none"
                            />
                            View Flipthru's Code on Github
                        </Link>
                    </Button>
                    <p>
                        The code being open-source also means that Flipthru will be safe from take-downs no matter what
                        happens to Kate & David, because anyone can bring it back to life exactly as it is right now.
                        But don’t worry, we’ll stick around - this is a fan project, so we’re not beholden to the whims
                        of a company or shareholders.
                    </p>
                </div>
            </div>
            <div className="page-body">
                <h1>Who We Are</h1>
                <h2>BTS & Army</h2>
                <div className="relative w-65 h-40 mt-2 mb-20">
                    <PhotocardComponent
                        src={null}
                        fallbackSrc={null}
                        effects={Effects.Matte}
                        className="absolute! top-0 left-0 -rotate-15"
                    />
                    <PhotocardComponent
                        src={null}
                        fallbackSrc={null}
                        placeholderType={PlaceholderType.ARMY}
                        effects={Effects.Matte}
                        className="absolute! top-6 right-0 rotate-13 z-10"
                    />
                </div>
                <p>
                    BTS is our “why.” Through every fan project, ARMY broadens our global impact as a multitalented,
                    driven, and organized force of support for BTS.
                </p>
                <p>Let’s continue to support BTS as they prepare new releases (and new photocards)!</p>
            </div>
            <div className="page-section">
                <h2>Kate</h2>
                <div className="flex flex-row gap-8 items-start">
                    <PhotocardComponent src="/aboutkate.png" fallbackSrc={null} effects={Effects.Glossy} manualRadius />
                    <div className="page-body text-start items-start!">
                        <p>
                            After pulling my first photocard in 2020, I became an avid collector, concert-goer, and
                            all-around BTS enthusiast. The idea for Flipthru came to me in 2022 when I realized that
                            there was no comprehensive database for photocards, nor was there a way for me to plan out
                            my binder’s layout without lots of trial and error. At Flipthru, I’m responsible for project
                            direction, graphic design, asset creation, written content, and scanning tons of photocards!
                            I’m really thankful to get to work on this project with my husband, David.
                        </p>
                        <p>
                            <b>Bias:</b> Suga
                        </p>
                        <p>
                            <b>Favorite Song:</b> “Spine Breaker”
                        </p>
                        <p>
                            <b>Favorite BTS experience:</b> Belting “Life Goes On” with the rest of the Day 1 LA crowd
                            during the Permission to Dance tour in 2021. Having newly emerged from the isolation of
                            lockdown to sing, dance, and jump in place for three hours straight with 50,000+ other fans,
                            I recognized then that life really does go on in spite of hardship, and that building
                            community in the face of it is the most important thing in the world.
                        </p>
                    </div>
                </div>
            </div>
            <div className="page-section">
                <h2>David</h2>
                <div className="flex flex-row gap-8 items-start">
                    <PhotocardComponent src="/aboutdavid.png" fallbackSrc={null} effects={Effects.Shiny} manualRadius />
                    <div className="page-body text-start items-start!">
                        <p>
                            I've only pulled a few photocards in my time, but thanks to my marriage to Kate, together we
                            own multiple binders of them. With the launch of Flipthru's virtual binder feature, we'll
                            soon be stewards of many virtual binders as well! Kate introduced me to BTS in 2021, and I
                            found that I enjoy Jin's singing, RM's earnestness, and watching wholesome Run BTS content.
                            Outside of Flipthru, I'm a distributed systems and databases PhD student at Berkeley; you
                            can check out my research
                            <Button variant="underline" size="noPadding" asChild>
                                <Link href="https://davidchuyaya.github.io/">here</Link>
                            </Button>
                            . I'm in charge of implementing the vision of Flipthru and ensuring that it all runs
                            smoothly.
                        </p>
                        <p>
                            <b>Bias:</b> RM
                        </p>
                        <p>
                            <b>Favorite Song:</b> “The Astronaut”
                        </p>
                        <p>
                            <b>Favorite BTS experience:</b> Watching the
                            <Button variant="underline" size="noPadding" asChild>
                                <Link href="https://www.youtube.com/watch?v=D09aWA_lhG4">
                                    BTS Christmas Carol Medley
                                </Link>
                            </Button>
                            from the 2019 SBS Gayo Daejeon Music Festival about twenty times every winter with Kate. My
                            favorite song is Jingle Bell Rock!
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="page-body">
                <h1>Major Contributors</h1>
                <p>
                    While our site is built and maintained by countless ARMYs, we’d like to give a special thanks to our
                    named contributors.
                </p>
                <div className="page-section">
                    <h2>Generalists</h2>
                    <p>Aeryn</p>
                    <p>Laura</p>
                    <p>Conor</p>
                    <p>AJ</p>
                    <p>Beth</p>
                    <p>Leonid</p>
                    <p>Lucky</p>
                    <p>Shadaj</p>
                </div>
            </div>
        </div>
    );
}
