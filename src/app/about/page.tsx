"use client";

import { Effects } from "@/db";
import PhotocardComponent from "../photocard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutComponent() {
    return (
        <div className="page">
            <h1>What We Do</h1>
            <div className="page-body">
                <p>
                    Flipthru is a <b>BTS photocard archive, binder planning tool, and personal wishlist tracker</b> all
                    in one!
                </p>

                <p>
                    Our goal is to become <b>the most comprehensive BTS photocard archive on the internet.</b> In doing
                    so, we plan to serve as an informational and social hub for ARMY around the world while promoting
                    BTS’s ongoing activities.
                </p>

                <p>
                    <b>Flipthru is built by and for ARMY.</b> We aim to contribute to the fan community by making it
                    easier, more accessible, and even more fun than it already is to participate in photocard
                    collecting, virtually or otherwise.
                </p>
                <p>
                    Whether you’re an avid collector or a visitor looking up one particular card,{" "}
                    <b>we’re glad to have you here!</b>
                </p>
            </div>
            <h1>Who We Are</h1>
            <div className="page-body">
                <h2>BTS & Army</h2>
                <div className="relative w-65 h-40 mb-20">
                    <PhotocardComponent
                        src={null}
                        effects={Effects.Matte}
                        className="absolute top-0 left-0 -rotate-15"
                    />
                    <PhotocardComponent
                        src={null}
                        effects={Effects.Matte}
                        className="absolute top-6 right-0 rotate-13 z-10"
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
                    <PhotocardComponent src="/aboutkate.png" effects={Effects.Glossy} manualRadius />
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
                    <PhotocardComponent src="/aboutdavid.png" effects={Effects.Shiny} manualRadius />
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
            <h1>Major Contributors</h1>
            <div className="page-body">
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
                </div>
            </div>
        </div>
    );
}
