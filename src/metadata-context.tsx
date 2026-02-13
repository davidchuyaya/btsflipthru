"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { updateUserDataInDB } from "@/actions";
import { ReportType, reportWindowURL, PresignedUrl, Result } from "@/constants";
import { authClient, ClientSession } from "@/auth-client";
import { toast } from "sonner";
import { UserData } from "./db";
import { Selectable, Updateable } from "kysely";

const STORAGE_KEYS = {
    userData: "metadata_userData",
    cursorDisabled: "metadata_cursorDisabled",
    effectsDisabled: "metadata_effectsDisabled",
} as const;

interface MetadataContextType {
    session: ClientSession;
    sessionRefetch: () => Promise<void>;
    userData: Selectable<UserData> | null;
    cursorDisabled: boolean;
    effectsDisabled: boolean;
    updateUserData: (
        userData: Updateable<UserData>,
        withImage: boolean,
    ) => Promise<Result<PresignedUrl | null>>;
    updateCursorDisabled: (cursorDisabled: boolean) => void;
    updateEffectsDisabled: (effectsDisabled: boolean) => void;
    setError: (message: string) => void;
}

const MetadataContext = createContext<MetadataContextType | undefined>(
    undefined,
);

function getFromStorage<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
}

function setToStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage might be full or unavailable
    }
}

export function MetadataProvider({ children }: { children: ReactNode }) {
    const [userData, setUserData] = useState<Selectable<UserData> | null>(null);
    const [cursorDisabled, setCursorDisabled] = useState(false);
    const [effectsDisabled, setEffectsDisabled] = useState(false);

    const {
        data: session,
        isPending: sessionIsPending, //loading state
        error: sessionError, //error object
        refetch: sessionRefetch, //refetch the session
    } = authClient.useSession();

    useEffect(() => {
        fetchMetadata();
    }, []);

    // Listen for storage changes from other tabs
    useEffect(() => {
        function handleStorageChange(event: StorageEvent) {
            if (
                !event.key ||
                !Object.values(STORAGE_KEYS).includes(
                    event.key as (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS],
                )
            ) {
                return;
            }

            // Reload all metadata from storage when any metadata key changes
            fetchMetadata();
        }

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    async function fetchMetadata() {
        const storageUserData = getFromStorage<Selectable<UserData>>(
            STORAGE_KEYS.userData,
        );
        const storageCursorDisabled = getFromStorage<boolean>(
            STORAGE_KEYS.cursorDisabled,
        );
        const storageEffectsDisabled = getFromStorage<boolean>(
            STORAGE_KEYS.effectsDisabled,
        );
        if (storageUserData) setUserData(storageUserData);
        setCursorDisabled(storageCursorDisabled || false);
        setEffectsDisabled(storageEffectsDisabled || false);
    }

    function setError(message: string) {
        toast.error(message, {
            action: {
                label: "Report",
                onClick: () => {
                    const url = reportWindowURL(
                        ReportType.Error,
                        window.location.href,
                        message,
                    );
                    window.open(url, "_blank");
                },
            },
        });
    }

    async function updateUserData(
        newUserData: Updateable<UserData>,
        withImage: boolean,
    ) {
        const result = await updateUserDataInDB(newUserData, withImage);
        if (!result.error && userData) {
            let updatedUserData: Selectable<UserData> = {
                ...userData,
                ...newUserData,
            } as Selectable<UserData>;
            if (withImage) {
                updatedUserData.image_id = result.data!.params.public_id;
            }
            setUserData(updatedUserData);
            setToStorage(STORAGE_KEYS.userData, updatedUserData);
        }
        return result;
    }

    function updateCursorDisabled(disabled: boolean) {
        setCursorDisabled(disabled);
        setToStorage(STORAGE_KEYS.cursorDisabled, disabled);
    }

    function updateEffectsDisabled(disabled: boolean) {
        setEffectsDisabled(disabled);
        setToStorage(STORAGE_KEYS.effectsDisabled, disabled);
    }

    return (
        <MetadataContext.Provider
            value={{
                session,
                sessionRefetch: async () => {
                    await sessionRefetch({
                        query: {
                            disableCookieCache: true,
                        },
                    });
                },
                userData,
                cursorDisabled,
                effectsDisabled,
                updateUserData,
                updateCursorDisabled,
                updateEffectsDisabled,
                setError,
            }}
        >
            {children}
        </MetadataContext.Provider>
    );
}

export function useMetadata() {
    const context = useContext(MetadataContext);
    if (context === undefined) {
        throw new Error("useMetadata must be used within a MetadataProvider");
    }
    return context;
}
