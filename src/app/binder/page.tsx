import { Suspense } from "react";
import { getUserBindersFromDB, getUserDataFromDB } from "@/actions";
import { getSession } from "@/auth";
import BindersComponent from "./binders";
import { Selectable } from "kysely";
import { UserBinders } from "@/db";

function renderPage(
    binders: Selectable<UserBinders>[] = [],
    isSignedIn: boolean = false,
) {
    return (
        <div className="page max-w-7/10!">
            <h1>Tutorial on making binders coming soon!</h1>
            <BindersComponent
                binders={binders}
                isSelf={true}
                isSignedIn={isSignedIn}
            />
        </div>
    );
}

async function BinderPageContent() {
    const session = await getSession();
    if (session.error || !session.data) {
        return renderPage();
    }

    const userData = await getUserDataFromDB(session.data.user.id);
    if (userData.error) {
        return renderPage();
    }

    const binders = await getUserBindersFromDB(userData.data!.binders);
    if (binders.error) {
        return renderPage([], true);
    }

    return renderPage(binders.data ?? [], true);
}

export default function BinderPage() {
    return (
        <Suspense fallback={renderPage()}>
            <BinderPageContent />
        </Suspense>
    );
}
