"use client";

import { Button } from "@/components/ui/button";
import { MAX_IMAGE_SIZE_BYTES, ReportType, reportWindowURL } from "@/constants";
import Link from "next/link";
import SocialButtonsComponent from "../social-buttons";

export default function FaqComponent() {
    return (
        <div className="page max-w-7/10!">
            <div className="page-body">
                <h1>What is Flipthru?</h1>
                <p>
                    Flipthru is an interactive site for BTS photocard collectors. It’s a place for ARMY to gather and
                    support BTS!
                </p>
                <p>
                    <i>
                        12/31/25: Please note that all features mentioned below will launch shortly. We’re pushing
                        things one at a time to ensure smooth integration of features with the rest of the site. We will
                        have all features available before the BTS comeback on 3/20/26.
                    </i>
                </p>
                <p>
                    This fan project aims to <b>catalogue all BTS photocards</b> in one place. Users are encouraged to{" "}
                    <b>add to the archive</b> (we’ll credit you for every image!) so that we can achieve this goal with
                    help from ARMY worldwide.
                </p>
                <p>
                    It’s also a <b>virtual binder</b> - the cards added by users can be organized into an online
                    photocard binder builder and <b>organize, decorate, and share</b> these binders with friends quickly
                    and easily. We’ll also assist you with creating your real-life binders - more on that later!
                </p>
                <p>
                    Users can also add cards they don’t yet have to a <b>wishlist</b>, which can be exported as a
                    template for social media posts.
                </p>
                <p>
                    Check out the
                    <Button variant="underline" asChild>
                        <Link href="/about">About</Link>
                    </Button>
                    page for more information on the ARMYs behind Flipthru and how we got started.
                </p>
            </div>
            <div className="page-body">
                <h1>What make Flipthru unique?</h1>
                <p>
                    Flipthru is a space made by ARMY for other ARMY. First and foremost, we are dedicated to BTS only,
                    and all of our energy and effort on this site goes into supporting them. We’re doing this entirely
                    out of a love for BTS, so we’ll never cut corners.
                </p>
                <p>
                    We also particularly prioritize our relationships with ARMY creators, and want to provide a platform
                    for them to promote and share their work in a way that actually helps them in a tangible way
                    (especially in this unfortunate era of AI). We’ve reached out to many creators already, and we’re
                    always looking for more - there’s no limit, so if you want to be featured on Flipthru, fill out a
                    <Button variant="underline" asChild>
                        <Link href="/contact">Contact</Link>
                    </Button>
                    form and we’ll send you more information about what that looks like!
                </p>
                <p>
                    We’ll also never charge for any of our services, and all of our code is completely open-source. This
                    means you could use our site code to make a Flipthru page for your favorite group too! It also means
                    that this site will stick around forever, since we’re not reliant on a company for support.
                </p>
                <p>
                    Learn more about our purpose on our
                    <Button variant="underline" asChild>
                        <Link href="/about">About</Link>
                    </Button>
                    page.
                </p>
            </div>
            <div className="page-body">
                <h1>How do I contribute to Flipthru?</h1>
                <p>
                    We would love to have you contribute! There’s no task too big or too small for Flipthru admins, but
                    we simply don’t have access to all the photocards that exist in the world (we’re all on a budget!).
                    To make Flipthru the best it can be, we welcome the support of ARMYs everywhere to build a tool that
                    all of us can rely on.
                </p>
                <p>
                    And, luckily, ARMY is known for being a talented bunch! Given this, there are many ways to
                    participate in the project. If you’re interested in helping out, take a look at the following list
                    and use the
                    <Button variant="underline" asChild>
                        <Link href="/contact">Contact</Link>
                    </Button>
                    tab to reach out and let us know which tasks you’re most excited about. You can also join our
                    Discord and follow us on social media (see our header for those links).
                </p>
                <p>
                    Some tasks require moderator access, which we are happy to grant to a few interested parties after
                    showing them the ropes.
                </p>

                <h2 className="mt-10">Moderator Capabilities</h2>
                <div className="page-section">
                    <p>
                        <b>Blood, Sweat, & Tears</b>
                    </p>
                    <p>
                        Create tagged entries with metadata for photocards that you know exist, with or without scans
                        (we’ll list them with a placeholder image if you don’t have scans).
                    </p>
                    <p>
                        <i>
                            “I don’t have a way to scan cards, but I could create listings of all the ones I know about,
                            and others can add photos later.”
                        </i>
                    </p>
                </div>

                <div className="page-section">
                    <p>
                        <b>House of Cards</b>
                    </p>
                    <p>Provide high-quality photocard scans in bulk; upload and tag them for searchability.</p>
                    <p>
                        <i>“I have a ton of photocard scans from various collections that I could contribute!”</i>
                    </p>
                </div>

                <div className="page-section">
                    <p>
                        <b>Make It Right</b>
                    </p>
                    <p>
                        Review uploads and tags for accuracy and flag incorrect or low-quality scans for admin review.
                    </p>
                </div>

                <div className="page-section">
                    <p>
                        <b>Paldogangsan</b>
                    </p>
                    <p>Translate Flipthru into additional languages.</p>
                </div>

                <h2 className="mt-10">Standard User Capabilities</h2>
                <div className="page-section">
                    <p>
                        <b>Best of Me</b>
                    </p>
                    <p>
                        Upload high-quality scans or photos to an existing photocard listing. If the image given is a
                        placeholder, your contribution will become the default photo. If there are images of the card
                        itself already, but they are low quality or misrepresent a card’s true appearance, you can
                        upload additional images, and mods will review them for replacement.
                    </p>
                    <p>
                        <i>
                            “I noticed that Flipthru is missing a photo for this particular card - I’ll upload a scan of
                            mine!”
                        </i>
                    </p>
                    <p>
                        <i>
                            “This photo is blurry and low-resolution, and the card shown has visible damage. I can
                            provide a more high-quality version.”
                        </i>
                    </p>
                </div>
                <div className="page-section">
                    <p>
                        <b>Mikrokosmos</b>
                    </p>
                    <p>
                        Direct admins to relevant information, trusted resources, or other ARMYs with significant
                        knowledge or interest (check the bottom of our “About” page for our current ARMY network).
                    </p>
                </div>
                <div className="page-section">
                    <p>
                        <b>Look Here</b>
                    </p>
                    <p>Share Flipthru with your ARMY friends.</p>
                </div>
                <div className="page-section">
                    <p>
                        <b>Spine Breaker</b>
                    </p>
                    <p>Support Flipthru’s maintenance costs on Ko-fi (coming soon).</p>
                </div>

                <p>
                    Whenever a user uploads an image, their username will be displayed below the image to provide
                    credit. The top contributor at any given time will be featured on our front page!
                </p>
            </div>
            <div className="page-body" id="how-do-i-upload-cards">
                <h1>How do I upload cards? Do they have to be scans, or are photos acceptable?</h1>
                <p>
                    Thank you for contributing to the site! We know that not everyone has access to a scanner, and we
                    believe that any photo is better than no photo as we build the archive. Here are a few best
                    practices you can follow as you start uploading.
                </p>
                <p>
                    Our ideal upload would be a <b>high-quality color scan</b> (600dpi) that is <b>close-cropped</b>{" "}
                    with a transparent background. For it to upload successfully and display the transparent background
                    correctly, your upload should be no more than <b>{MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB</b> and in{" "}
                    <b>PNG</b>
                    format.
                </p>
                <p>
                    If you don’t have scanning equipment, we recommend that you follow this protocol for taking and
                    uploading photos:
                </p>
                <ul className="list-decimal text-left">
                    <li>
                        <b>Dry wipe</b> your photocard to avoid dust spots
                    </li>
                    <li>
                        Place it down on a <b>high-contrast surface</b> (e.g. light card on a dark surface)
                    </li>
                    <li>
                        Ensure that the card is <b>well-lit</b> (no phone shadows), <b>well-positioned</b> (camera is
                        aligned “straight on” and captures the full card) and <b>unobstructed</b> (no thumbs or lens
                        flares)
                    </li>
                    <li>
                        <b>Take the photo</b> with the best camera you have available to you (recommended: smartphone
                        camera or dSLR).
                    </li>
                    <ul className="list-[lower-latin] ml-8">
                        <li>
                            Tip: <b>Don’t use flash!</b>
                        </li>
                    </ul>
                    <li>
                        <b>Rotate</b> the photo so that it appears right-side up. If you have the ability,{" "}
                        <b>straighten</b> it and cleanly <b>remove the background</b> as well. Finally, <b>crop</b> it
                        to leave as little room between the edges of the card and the edges of the image as possible
                        without cutting off parts of the card. You can do this easily in Adobe Photoshop 2026 (How-To
                        Guide coming soon), and you can do the basics (rotating, straightening, and cropping) in other
                        programs or your phone’s native photo app.
                    </li>
                    <li>
                        If you are unable to perform all of these edits due to program restrictions (or even a lack of
                        confidence in your tech savviness), that’s no problem! Administrators and moderators will be
                        able to correct any issues post-upload, and zero editing is always better than botched editing
                        that may or may not be fixable on the back end. Use your best judgment, and know that ARMY will
                        be thankful for your contribution no matter what!
                    </li>
                    <li>
                        <b>Upload</b> in PNG format.
                    </li>
                    <li>
                        All done! <b>Thank you</b> so much for contributing to Flipthru!
                    </li>
                </ul>
                <p>
                    If you are experiencing an error when uploading that is not explained above, please send us an
                    <Button variant="underline" asChild>
                        <Link href={reportWindowURL(ReportType.Error, "/faq", "Upload error")}>Error Report</Link>
                    </Button>
                    and we will reach out to assist you.
                </p>
            </div>
            <div className="page-body">
                <h1>What’s a virtual binder and how do I make one?</h1>
                <p>Check back later for a how-to video!</p>
            </div>
            <div className="page-body">
                <h1>Can I use Flipthru to authenticate my cards?</h1>
                <p>
                    Because it’s hard to judge authenticity from scans, we recommend checking out external resource
                    guides made by ARMY about how to authenticate your cards. You may view some of these on our
                    Resources page (coming soon).
                </p>
            </div>
            <div className="page-body">
                <h1>Can I buy, sell, or trade BTS photocards on Flipthru?</h1>
                <p>
                    While many of us buy, sell, and trade our cards as a natural extension of our collecting, Flipthru
                    is not a marketplace. We are not responsible for authenticating, reviewing, approving/denying, or in
                    any way moderating purchases, sales, or trades, nor are we liable if a buyer, seller, or trader does
                    not follow through appropriately.
                </p>
                <p>
                    We expect that some users may utilize Flipthru to organize and display the cards they own for the
                    purposes of buying, selling, or trading (ex: creating a wishlist to share on Instagram). That said,{" "}
                    <b>we do not allow direct buying, selling, or trading on Flipthru itself</b>. Any related activity
                    is undertaken entirely at a user’s own risk, and must happen externally.
                </p>
                <p>
                    To that end, we recommend that buyers, sellers, and traders use trusted marketplace sites like eBay
                    or Mercari that can protect and often insure users against scams, non-payment, product damage or
                    loss, and shipping issues.
                </p>
                <p>Please be cautious when buying, selling, and trading!</p>
            </div>
            <div className="page-body">
                <h1>Will you be adding additional features? How do I suggest a feature?</h1>
                <p>
                    Yes! We are always working to improve Flipthru, and love getting feedback on the functionality of
                    our site from ARMY. If there’s something you’d like to see, please fill out a
                    <Button variant="underline" asChild>
                        <Link href={reportWindowURL(ReportType.FeatureRequest, "/faq", "Feature request")}>
                            Feature Request
                        </Link>
                    </Button>
                    form and our administrators will take your idea into consideration.
                </p>
                <p>
                    You may check our
                    <Button variant="underline" asChild>
                        <Link href="/">News</Link>
                    </Button>
                    section on the home page for our latest updates. We also post in-progress features on our social
                    media [Bluesky, Twitter/X, Instagram] with more in-depth updates and discussion in our Discord.
                    Anyone is welcome to join and interact with us on those forums!
                </p>
                <SocialButtonsComponent />
            </div>
            <div className="page-body mb-16">
                <h1>I’m having an issue with a site feature. How can I resolve this?</h1>
                <p>
                    Please fill out an
                    <Button variant="underline" asChild>
                        <Link href={reportWindowURL(ReportType.Error, "/faq", "Issue with site feature")}>
                            Error Report
                        </Link>
                    </Button>
                    . We will be in touch with you soon to resolve the issue! In the meantime, you may try using a
                    different browser (Chrome, Firefox, Safari, Brave, etc.) to see if that fixes your issue.
                </p>
                <p>
                    If you have filled out an error report and have not received a response within 3 business days,
                    please email btsflipthru@gmail.com with your username and the details of the issue you are
                    experiencing. It may be that we did not receive the report for some reason, but rest assured that we
                    will resolve your issue as soon as possible.
                </p>
            </div>
        </div>
    );
}
