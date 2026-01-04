"use client";

import { getPhotocardsInDB } from "@/actions";
import { CardSize, CardType, ExclusiveCountry, ParsedCollection, Photocard } from "@/db";
import { useEffect, useState } from "react";
import { membersToBooleans, NameToMember, NUM_LOAD_COLLECTIONS, SearchQuery, SortType } from "@/constants";
import PhotocardGrid from "../photocard-grid";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { cardSizeToString, getTestPhotocards } from "@/actions-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, PlusIcon, SquareCheckBigIcon, SquareIcon } from "lucide-react";
import { useMetadata } from "@/metadata-context";
import React from "react";
import { Button } from "@/components/ui/button";
import BottomSpinnerComponent from "../bottom-spinner";
import Link from "next/link";
import { isAtLeastMod } from "@/auth-client";

function CollapsibleGroup({
    defaultOpen = true,
    label,
    children,
    checked,
    onChecked,
}: {
    defaultOpen?: boolean;
    label: string;
    children: React.ReactNode;
    checked: boolean;
    onChecked: (checked: boolean) => void;
}) {
    return (
        <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
            <SidebarGroup>
                <SidebarGroupLabel asChild>
                    <div>
                        <CollapsibleTrigger className="flex flex-row justify-between items-center grow">
                            {label}
                            <ChevronDown className="w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </CollapsibleTrigger>
                        <div className="ml-3" onClick={() => onChecked(!checked)}>
                            {checked ? <SquareCheckBigIcon className="w-4" /> : <SquareIcon className="w-4" />}
                        </div>
                    </div>
                </SidebarGroupLabel>
                <CollapsibleContent>
                    <SidebarGroupContent>
                        <SidebarMenu>{children}</SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

enum MenuType {
    Regular,
    Sub,
}

function CheckMenuButton({
    type,
    label,
    checked,
    onClick,
    children,
}: {
    type: MenuType;
    label: string;
    checked: boolean;
    onClick?: (checked: boolean) => void;
    children?: React.ReactNode;
}) {
    const content = (
        <>
            {label} {checked ? <SquareCheckBigIcon className="ml-auto" /> : <SquareIcon className="ml-auto" />}
        </>
    );

    function changeChecked() {
        onClick?.(!checked);
    }

    if (type === MenuType.Regular) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton onClick={changeChecked}>{content}</SidebarMenuButton>
                {children}
            </SidebarMenuItem>
        );
    } else {
        return (
            <SidebarMenuSubItem>
                <SidebarMenuSubButton onClick={changeChecked}>{content}</SidebarMenuSubButton>
                {children}
            </SidebarMenuSubItem>
        );
    }
}

type Filters = {
    query: string;
    collectionTypes: Set<number>;
    topCollections: Set<number>;
    subCollections: Set<number>;
    members: Set<NameToMember>;
    exclusiveCountries: Set<ExclusiveCountry>;
    cardTypes: Set<CardType>;
    cardSizes: Set<CardSize>;
    sort: SortType;
};

type VisibleOptions = {
    collectionTypes: Set<number>;
    topCollections: Set<number>;
    subCollections: Set<number>;
    members: Set<string>; // NameToMember values
    cardTypes: Set<CardType>;
    cardSizes: Set<CardSize>;
    exclusiveCountries: Set<ExclusiveCountry>;
};

export default function SearchComponent() {
    const { collections, collectionTypes, cardTypes, cardSizes, session, setError } = useMetadata();
    const [topCollections, setTopCollections] = useState<Array<{ collection: ParsedCollection; hasSub: boolean }>>([]); // Purely for display & ease of selecting children, doesn't affect search query
    const [subCollections, setSubCollections] = useState<ParsedCollection[]>([]);
    const [photocards, setPhotocards] = useState<Array<Photocard>>([]);
    const [filters, setFilters] = useState<Filters>({
        query: "",
        collectionTypes: new Set<number>(),
        topCollections: new Set<number>(),
        subCollections: new Set<number>(),
        members: new Set(Object.values(NameToMember)),
        exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
        cardTypes: new Set<CardType>(),
        cardSizes: new Set<CardSize>(),
        sort: SortType.DateAddedDesc,
    });
    // Stores the previous search, and "where we stopped" for pagination
    const [prevSearch, setPrevSearch] = useState<{
        fullQuery: SearchQuery;
        coveredCollectionIds: number[];
    } | null>(null);
    const [showFront, setShowFront] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [dontLoad, setDontLoad] = useState<boolean>(false);
    const [searchInput, setSearchInput] = useState<string>("");
    const [visibleOptions, setVisibleOptions] = useState<VisibleOptions>({
        collectionTypes: new Set(),
        topCollections: new Set(),
        subCollections: new Set(),
        members: new Set(Object.values(NameToMember)),
        exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
        cardTypes: new Set(),
        cardSizes: new Set(),
    });

    // Run on launch
    useEffect(() => {
        const { topColsSet, subColsSet } = calculateCollectionsHierarchy();
        const newFilters: Filters = {
            ...filters,
            collectionTypes: new Set(collectionTypes.map((type) => type.id!)),
            topCollections: topColsSet,
            subCollections: subColsSet,
            cardTypes: new Set(cardTypes),
            cardSizes: new Set(cardSizes),
            members: new Set(Object.values(NameToMember)),
            exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
        };
        setFilters(newFilters);
        setPrevSearch({
            fullQuery: filtersToQuery(newFilters),
            coveredCollectionIds: [],
        });
        console.log("Collections: ", collections);

        // Provide parameters to trySearch since it may not see the updated parameters in time
        trySearch(newFilters);
    }, [collections, collectionTypes, cardTypes, cardSizes]);

    useEffect(() => {
        if (!searchInput.trim()) {
            const topColsSet = new Set(topCollections.map((c) => c.collection.id!));
            const subColsSet = new Set(subCollections.map((c) => c.id!));
            setFilters((prev) => ({
                ...prev,
                collectionTypes: new Set(collectionTypes.map((type) => type.id!)),
                topCollections: topColsSet,
                subCollections: subColsSet,
                members: new Set(Object.values(NameToMember)),
                exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
                cardTypes: new Set(cardTypes),
                cardSizes: new Set(cardSizes),
            }));
            setVisibleOptions({
                collectionTypes: new Set(collectionTypes.map((type) => type.id!)),
                topCollections: topColsSet,
                subCollections: subColsSet,
                members: new Set(Object.values(NameToMember)),
                exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
                cardTypes: new Set(cardTypes),
                cardSizes: new Set(cardSizes),
            });
            return;
        }

        const allTerms = searchInput
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length > 0);

        function getWinnersFromTerms<T>(
            items: T[],
            textFn: (item: T) => string,
            availableTerms: string[],
        ): { winners: Set<T>; maxScore: number; matchedTerms: Set<string> } {
            let maxScore = 0;
            const scores = new Map<T, { score: number; matched: Set<string> }>();

            for (const item of items) {
                const { matches, matchedTerms } = countMatches(textFn(item), availableTerms);
                if (matches > 0) {
                    scores.set(item, { score: matches, matched: matchedTerms });
                    if (matches > maxScore) maxScore = matches;
                }
            }

            const winners = new Set<T>();
            const aggregatedMatchedTerms = new Set<string>();

            if (maxScore > 0) {
                for (const [item, data] of scores) {
                    if (data.score === maxScore) {
                        winners.add(item);
                        data.matched.forEach((t) => aggregatedMatchedTerms.add(t));
                    }
                }
            }
            return { winners, maxScore, matchedTerms: aggregatedMatchedTerms };
        }

        function countMatches(text: string, searchTerms: string[]): { matches: number; matchedTerms: Set<string> } {
            const lowerText = text.toLowerCase();
            let matches = 0;
            const matchedTerms = new Set<string>();
            for (const term of searchTerms) {
                if (lowerText.includes(term)) {
                    matches++;
                    matchedTerms.add(term);
                }
            }
            return { matches, matchedTerms };
        }

        // Logic for each category with Term Consumption
        // 1. Members (Priority 1)
        const memberEntries = Object.entries(NameToMember);
        const {
            winners: winningMembers,
            maxScore: memberScore,
            matchedTerms: memberMatchedTerms,
        } = getWinnersFromTerms(memberEntries, ([name, _]) => name, allTerms);

        // Filter out terms used by Members
        const termsAfterMembers = allTerms.filter((term) => !memberMatchedTerms.has(term));

        // 2. Collections (Priority 2)
        // Check Top Collections
        const {
            winners: winningTopCols,
            maxScore: topColScore,
            matchedTerms: topColMatchedTerms,
        } = getWinnersFromTerms(topCollections, (c) => c.collection.name, termsAfterMembers);

        // Check Sub Collections
        const {
            winners: winningSubCols,
            maxScore: subColScore,
            matchedTerms: subColMatchedTerms,
        } = getWinnersFromTerms(
            subCollections,
            (c) => (c.version ? `${c.name} ${c.version}` : c.name),
            termsAfterMembers,
        );

        // Filter out terms used by Collections
        const termsAfterCollections = termsAfterMembers.filter(
            (term) => !topColMatchedTerms.has(term) && !subColMatchedTerms.has(term),
        );

        // 3. Others (Priority 3)
        // Card Types
        const { winners: winningCardTypes, maxScore: cardTypeScore } = getWinnersFromTerms(
            cardTypes,
            (ct) => ct.name,
            termsAfterCollections,
        );

        // Card Sizes
        const { winners: winningCardSizes, maxScore: cardSizeScore } = getWinnersFromTerms(
            cardSizes,
            (cs) => cardSizeToString(cs),
            termsAfterCollections,
        );

        // Exclusive Countries
        const countryEntries = Object.entries(ExclusiveCountry);
        const { winners: winningCountries, maxScore: countryScore } = getWinnersFromTerms(
            countryEntries,
            ([name, _]) => name,
            termsAfterCollections,
        );

        let finalVisibleSubIds = new Set<number>();
        let finalVisibleTopIds = new Set<number>();

        if (topColScore > 0 || subColScore > 0) {
            // Filter mode
            if (topColScore > 0) {
                winningTopCols.forEach((c) => finalVisibleTopIds.add(c.collection.id!));
            }
            if (subColScore > 0) {
                winningSubCols.forEach((c) => finalVisibleSubIds.add(c.id!));
            }

            // Include parents of visible subs
            finalVisibleSubIds.forEach((subId) => {
                const sub = subCollections.find((c) => c.id === subId);
                if (sub) {
                    const parent = getTopCollectionForSub(sub);
                    if (parent) finalVisibleTopIds.add(parent.id!);
                }
            });
        } else {
            // Show all
            finalVisibleTopIds = new Set(topCollections.map((c) => c.collection.id!));
            finalVisibleSubIds = new Set(subCollections.map((c) => c.id!));
        }

        // Collection Types visibility
        const finalVisibleTypeIds = new Set<number>();
        for (const type of collectionTypes) {
            const topCols = getTopCollectionsForType(type.id!);
            for (const topId of topCols) {
                if (finalVisibleTopIds.has(topId)) {
                    finalVisibleTypeIds.add(type.id!);
                    break;
                }
            }
        }

        const nextVisibleMembers =
            memberScore > 0
                ? new Set(Array.from(winningMembers).map(([_, v]) => v))
                : new Set(Object.values(NameToMember));
        const nextVisibleCardTypes = cardTypeScore > 0 ? winningCardTypes : new Set(cardTypes);
        const nextVisibleCardSizes = cardSizeScore > 0 ? winningCardSizes : new Set(cardSizes);
        const nextVisibleCountries =
            countryScore > 0
                ? new Set(Array.from(winningCountries).map(([_, v]) => v))
                : new Set(Object.values(ExclusiveCountry));

        setVisibleOptions({
            members: nextVisibleMembers,
            cardTypes: nextVisibleCardTypes,
            cardSizes: nextVisibleCardSizes,
            exclusiveCountries: nextVisibleCountries,
            subCollections: finalVisibleSubIds,
            topCollections: finalVisibleTopIds,
            collectionTypes: finalVisibleTypeIds,
        });

        setFilters((prev) => ({
            ...prev,
            members: nextVisibleMembers,
            cardTypes: nextVisibleCardTypes,
            cardSizes: nextVisibleCardSizes,
            exclusiveCountries: nextVisibleCountries,
            topCollections: finalVisibleTopIds,
            subCollections: finalVisibleSubIds,
            collectionTypes: finalVisibleTypeIds,
        }));
    }, [searchInput, collections, collectionTypes, cardTypes, cardSizes, topCollections, subCollections]);

    function calculateCollectionsHierarchy(): { topColsSet: Set<number>; subColsSet: Set<number> } {
        const topCols: Array<{ collection: ParsedCollection; hasSub: boolean }> = [];
        const subCols: ParsedCollection[] = [];
        for (const col of collections) {
            if (col.version) {
                subCols.push(col);
            } else {
                topCols.push({ collection: col, hasSub: false });
            }
        }
        // Create top-level collections for any sub-collections that don't have a parent
        const topAndSubCols: ParsedCollection[] = [];
        for (const subCol of subCols) {
            const parentCol = topCols.find((c) => c.collection.name === subCol.name);
            if (!parentCol) {
                topCols.push({
                    collection: {
                        id: subCol.id!,
                        name: subCol.name,
                        releaseDate: new Date(subCol.releaseDate),
                        collectionTypes: [...subCol.collectionTypes],
                        version: null,
                        versionOrder: null,
                    },
                    hasSub: true,
                });
            } else if (parentCol && !parentCol.hasSub) {
                // If parent already exists, clone parent as a sub collection as well
                topAndSubCols.push({ ...parentCol.collection });
                parentCol.hasSub = true;
            }
        }

        subCols.push(...topAndSubCols);

        setTopCollections(
            topCols.sort(
                (a, b) => new Date(b.collection.releaseDate).getTime() - new Date(a.collection.releaseDate).getTime(),
            ),
        );
        setSubCollections(
            subCols.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()),
        );

        const topColsSet = new Set(topCols.map((col) => col.collection.id!));
        const subColsSet = new Set(subCols.map((col) => col.id!));

        return { topColsSet, subColsSet };
    }

    function onSelectAll() {
        const newFilters = {
            ...filters,
            collectionTypes: new Set(collectionTypes.map((type) => type.id!)),
            topCollections: new Set(topCollections.map((col) => col.collection.id!)),
            subCollections: new Set(subCollections.map((col) => col.id!)),
            members: new Set(Object.values(NameToMember)),
            cardTypes: new Set(cardTypes),
            cardSizes: new Set(cardSizes),
            exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
        };
        setFilters(newFilters);
    }

    function onCheckedAllCollectionTypes(checked: boolean) {
        if (checked) {
            const newFilters = {
                ...filters,
                collectionTypes: new Set(collectionTypes.map((type) => type.id!)),
                topCollections: new Set(topCollections.map((col) => col.collection.id!)),
                subCollections: new Set(subCollections.map((col) => col.id!)),
            };
            setFilters(newFilters);
        } else {
            setFilters({
                ...filters,
                collectionTypes: new Set(),
                topCollections: new Set(),
                subCollections: new Set(),
            });
        }
    }

    function onCheckedAllMembers(checked: boolean) {
        if (checked) {
            const newFilters = {
                ...filters,
                members: new Set(Object.values(NameToMember)),
            };
            setFilters(newFilters);
        } else {
            setFilters({ ...filters, members: new Set() });
        }
    }

    function onCheckedAllCardTypes(checked: boolean) {
        if (checked) {
            const newFilters = {
                ...filters,
                cardTypes: new Set(cardTypes),
            };
            setFilters(newFilters);
        } else {
            setFilters({ ...filters, cardTypes: new Set() });
        }
    }

    function onCheckedAllCardSizes(checked: boolean) {
        if (checked) {
            const newFilters = {
                ...filters,
                cardSizes: new Set(cardSizes),
            };
            setFilters(newFilters);
        } else {
            setFilters({ ...filters, cardSizes: new Set() });
        }
    }

    function onCheckedAllExclusiveCountries(checked: boolean) {
        if (checked) {
            const newFilters = {
                ...filters,
                exclusiveCountries: new Set(Object.values(ExclusiveCountry)),
            };
            setFilters(newFilters);
        } else {
            setFilters({ ...filters, exclusiveCountries: new Set() });
        }
    }

    function onSortChange(sort: SortType) {
        const newFilters = { ...filters, sort };
        setFilters(newFilters);
        trySearch(newFilters);
    }

    function getSubCollectionsForTop(topCollectionName: string): Set<number> {
        return new Set(
            subCollections.filter((subCol) => subCol.name === topCollectionName).map((subCol) => subCol.id!),
        );
    }

    function getTopCollectionForSub(subCollection: ParsedCollection): ParsedCollection | undefined {
        return topCollections.find(({ collection }) => collection.name === subCollection.name)?.collection;
    }

    function getTopCollectionsForType(typeId: number): Set<number> {
        return new Set(
            topCollections
                .filter(({ collection }) => collection.collectionTypes.includes(typeId))
                .map(({ collection }) => collection.id!),
        );
    }

    function getSubCollectionsForType(typeId: number): Set<number> {
        return new Set(
            subCollections
                .filter((collection) => collection.collectionTypes.includes(typeId))
                .map((collection) => collection.id!),
        );
    }

    function getNewCollectionTypes(newSelectedTopCollections: Set<number>): Set<number> {
        const newSelectedTypes = new Set<number>();
        for (const type of collectionTypes) {
            const topColsForType = getTopCollectionsForType(type.id!);
            const hasChecked = Array.from(topColsForType).some((id) => newSelectedTopCollections.has(id));
            if (hasChecked) {
                newSelectedTypes.add(type.id!);
            }
        }
        return newSelectedTypes;
    }

    function onSelectedCollectionType(typeId: number, checked: boolean) {
        const newSelectedCollectionTypes = new Set(filters.collectionTypes);
        const topColsForType = getTopCollectionsForType(typeId);
        const subColsForType = getSubCollectionsForType(typeId);
        let newSelectedTopCollections: Set<number>;
        let newSelectedSubCollections: Set<number>;

        if (checked) {
            newSelectedCollectionTypes.add(typeId);
            newSelectedTopCollections = new Set([...filters.topCollections, ...topColsForType]);
            newSelectedSubCollections = new Set([...filters.subCollections, ...subColsForType]);
        } else {
            newSelectedCollectionTypes.delete(typeId);
            newSelectedTopCollections = new Set([...filters.topCollections].filter((id) => !topColsForType.has(id)));
            newSelectedSubCollections = new Set([...filters.subCollections].filter((id) => !subColsForType.has(id)));
        }
        const newFilters = {
            ...filters,
            collectionTypes: newSelectedCollectionTypes,
            topCollections: newSelectedTopCollections,
            subCollections: newSelectedSubCollections,
        };
        setFilters(newFilters);
    }

    function onSelectedTopCollection(collection: ParsedCollection, hasSub: boolean, checked: boolean) {
        const newSelectedTopCollections = new Set(filters.topCollections);
        let newSelectedSubCollections = new Set(filters.subCollections);
        const subColsForTop = hasSub ? getSubCollectionsForTop(collection.name) : new Set<number>();
        let newSelectedCollectionTypes = filters.collectionTypes;

        if (checked) {
            newSelectedTopCollections.add(collection.id!);

            if (hasSub) {
                newSelectedSubCollections = newSelectedSubCollections.union(subColsForTop);
            }

            // Check collection types if not already checked
            newSelectedCollectionTypes = getNewCollectionTypes(newSelectedTopCollections);
        } else {
            newSelectedTopCollections.delete(collection.id!);

            if (hasSub) {
                newSelectedSubCollections = new Set(
                    [...newSelectedSubCollections].filter((id) => !subColsForTop.has(id)),
                );
            }

            // Uncheck collection types if no more top collections are checked
            newSelectedCollectionTypes = getNewCollectionTypes(newSelectedTopCollections);
        }

        const newFilters = {
            ...filters,
            topCollections: newSelectedTopCollections,
            subCollections: newSelectedSubCollections,
            collectionTypes: newSelectedCollectionTypes,
        };
        setFilters(newFilters);
    }

    function onSelectedSubCollection(collection: ParsedCollection, checked: boolean) {
        const topCollection = getTopCollectionForSub(collection);
        const newSelectedSubCollections = new Set(filters.subCollections);

        if (checked) {
            newSelectedSubCollections.add(collection.id!);

            // Check the top collection
            if (topCollection) {
                const newSelectedTopCollections = new Set([...filters.topCollections, topCollection.id!]);
                const newSelectedCollectionTypes = getNewCollectionTypes(newSelectedTopCollections);
                setFilters({
                    ...filters,
                    topCollections: newSelectedTopCollections,
                    subCollections: newSelectedSubCollections,
                    collectionTypes: newSelectedCollectionTypes,
                });
            } else {
                setFilters({ ...filters, subCollections: newSelectedSubCollections });
            }
        } else {
            newSelectedSubCollections.delete(collection.id!);

            // Uncheck top collection if no more sub collections are checked for it
            if (topCollection) {
                const remainingSubsForTop = getSubCollectionsForTop(topCollection.name);
                const hasOtherChecked = Array.from(remainingSubsForTop).some(
                    (id) => id !== collection.id && newSelectedSubCollections.has(id),
                );

                if (!hasOtherChecked) {
                    const newSelectedTopCollections = new Set(filters.topCollections);
                    newSelectedTopCollections.delete(topCollection.id!);
                    const newSelectedCollectionTypes = getNewCollectionTypes(newSelectedTopCollections);
                    setFilters({
                        ...filters,
                        topCollections: newSelectedTopCollections,
                        subCollections: newSelectedSubCollections,
                        collectionTypes: newSelectedCollectionTypes,
                    });
                } else {
                    setFilters({ ...filters, subCollections: newSelectedSubCollections });
                }
            } else {
                setFilters({ ...filters, subCollections: newSelectedSubCollections });
            }
        }
    }

    function onSelectedMember(member: NameToMember, checked: boolean) {
        const newSelectedMembers = new Set(filters.members);
        if (checked) {
            newSelectedMembers.add(member);
        } else {
            newSelectedMembers.delete(member);
        }
        const newFilters = { ...filters, members: newSelectedMembers };
        setFilters(newFilters);
    }

    function onSelectedCardType(cardType: CardType, checked: boolean) {
        const newSelectedCardTypes = new Set(filters.cardTypes);
        if (checked) {
            newSelectedCardTypes.add(cardType);
        } else {
            newSelectedCardTypes.delete(cardType);
        }
        const newFilters = { ...filters, cardTypes: newSelectedCardTypes };
        setFilters(newFilters);
    }

    function onSelectedCardSize(cardSize: CardSize, checked: boolean) {
        const newSelectedCardSizes = new Set(filters.cardSizes);
        if (checked) {
            newSelectedCardSizes.add(cardSize);
        } else {
            newSelectedCardSizes.delete(cardSize);
        }
        const newFilters = { ...filters, cardSizes: newSelectedCardSizes };
        setFilters(newFilters);
    }

    function onSelectedExclusiveCountry(country: ExclusiveCountry, checked: boolean) {
        const newSelectedExclusiveCountries = new Set(filters.exclusiveCountries);
        if (checked) {
            newSelectedExclusiveCountries.add(country);
        } else {
            newSelectedExclusiveCountries.delete(country);
        }
        const newFilters = { ...filters, exclusiveCountries: newSelectedExclusiveCountries };
        setFilters(newFilters);
    }

    function canSearch(filters: Filters, selectedCollections: Set<number>): boolean {
        return (
            // Ensure context has been loaded
            collectionTypes.length > 0 &&
            collections.length > 0 &&
            cardSizes.length > 0 &&
            cardTypes.length > 0 &&
            // Ensure the user selected things
            selectedCollections.size > 0 &&
            filters.members.size > 0 &&
            filters.cardTypes.size > 0 &&
            filters.cardSizes.size > 0 &&
            filters.exclusiveCountries.size > 0
        );
    }

    function topAndSubToSelectedCollections(
        selectedTopCollections: Set<number>,
        selectedSubCollections: Set<number>,
    ): Set<number> {
        const selectedCollectionsSet = new Set<number>(selectedSubCollections);
        for (const topColId of selectedTopCollections) {
            if (topCollections.find(({ collection }) => collection.id === topColId)?.hasSub) {
                continue; // Skip top collections that have sub-collections
            }
            selectedCollectionsSet.add(topColId);
        }
        return selectedCollectionsSet;
    }

    function dontFilterIfAllSelected<T, U>(selectedSet: Set<T>, allItems: U[]): T[] {
        if (selectedSet.size === allItems.length) {
            return []; // No filtering
        }
        return Array.from(selectedSet);
    }

    /**
     *
     * @returns Collections that were selected, in the SortType order, before/after the previously covered (searched) collections, up to NUM_LOAD_COLLECTIONS, if sorting by release date
     */
    function limitSearchCollections(
        currentFilters: Filters,
        selectedCollections: Set<number>,
        ignorePrevSearch: boolean,
    ): number[] {
        const prevCollections =
            prevSearch && !ignorePrevSearch
                ? collections.filter((col) => prevSearch.coveredCollectionIds.includes(col.id!))
                : [];
        let sortedAndFilteredCollections: ParsedCollection[] = [];
        switch (currentFilters.sort) {
            case SortType.ReleaseDateAsc:
                const maxReleaseDate =
                    prevCollections.length === 0
                        ? null
                        : prevCollections.reduce((prev, curr) => {
                              return new Date(curr.releaseDate) > new Date(prev.releaseDate) ? curr : prev;
                          });
                sortedAndFilteredCollections = collections
                    .filter(
                        (col) =>
                            prevCollections.length === 0 ||
                            new Date(col.releaseDate) > new Date(maxReleaseDate!.releaseDate),
                    )
                    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
                break;
            case SortType.ReleaseDateDesc:
                const minReleaseDate =
                    prevCollections.length === 0
                        ? null
                        : prevCollections.reduce((prev, curr) => {
                              return new Date(curr.releaseDate) < new Date(prev.releaseDate) ? curr : prev;
                          });
                sortedAndFilteredCollections = collections
                    .filter(
                        (col) =>
                            prevCollections.length === 0 ||
                            new Date(col.releaseDate) < new Date(minReleaseDate!.releaseDate),
                    )
                    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
                break;
            default:
                return dontFilterIfAllSelected(selectedCollections, collections);
        }

        // Return the NUM_LOAD_COLLECTIONS first collections that were selected
        return sortedAndFilteredCollections
            .filter((col) => selectedCollections.has(col.id!))
            .map((col) => col.id!)
            .slice(0, NUM_LOAD_COLLECTIONS);
    }

    function limitSearchDate(): Date | null {
        if (!prevSearch) {
            return null;
        }

        switch (filters.sort) {
            case SortType.DateAddedAsc:
            case SortType.DateAddedDesc:
                const lastPhotocard = photocards[photocards.length - 1];
                return lastPhotocard ? new Date(lastPhotocard.updatedAt) : null;
            default:
                return null;
        }
    }

    function filtersToQuery(currentFilters: Filters): SearchQuery {
        const selectedCollections = topAndSubToSelectedCollections(
            currentFilters.topCollections,
            currentFilters.subCollections,
        );
        const searchQuery: SearchQuery = {
            collectionIds: dontFilterIfAllSelected(selectedCollections, collections),
            cardTypeIds: dontFilterIfAllSelected(currentFilters.cardTypes, cardTypes).map((ct) => ct.id!),
            sizeIds: dontFilterIfAllSelected(currentFilters.cardSizes, cardSizes).map((cs) => cs.id!),
            exclusiveCountryIds: dontFilterIfAllSelected(
                currentFilters.exclusiveCountries,
                Object.values(ExclusiveCountry),
            ),
            ...membersToBooleans(currentFilters.members),
            sortBy: currentFilters.sort,
        };
        return searchQuery;
    }

    function hasFiltersChanged(searchQuery: SearchQuery, prevQuery?: SearchQuery) {
        if (prevQuery === undefined) {
            // If there was no previous search, then we should always allow the search to proceed
            return true;
        }
        return JSON.stringify(searchQuery) !== JSON.stringify(prevQuery);
    }

    /**
     * Attempt a brand new search query
     */
    async function trySearch(currentFilters: Filters) {
        const selectedCollections = topAndSubToSelectedCollections(
            currentFilters.topCollections,
            currentFilters.subCollections,
        );
        if (!canSearch(currentFilters, selectedCollections)) {
            console.log("Cannot search yet, missing parameters.");
            return;
        }

        const searchQuery = filtersToQuery(currentFilters);
        // Avoid duplicate searches
        if (!hasFiltersChanged(searchQuery)) {
            console.log("Duplicate search query, aborting.");
            return;
        }

        // If selectedSort is by release date, modify the actual search query so we don't fetch more than NUM_LOAD_COLLECTIONS collections
        let newCollectionIds = searchQuery.collectionIds;
        switch (currentFilters.sort) {
            case SortType.ReleaseDateAsc:
            case SortType.ReleaseDateDesc:
                newCollectionIds = limitSearchCollections(currentFilters, selectedCollections, true);
                console.log("Limited collection IDs for release date sort:", newCollectionIds);
                break;
        }

        // If selectedSort is by updated date, then fetch the next NUM_LOAD_PHOTOCARDS photocards (using the updateDate parameter)
        // Nothing to do here because we don't have ANY photocards yet

        // Insert the unmodified search (so we can compare)
        setPrevSearch({ fullQuery: searchQuery, coveredCollectionIds: newCollectionIds });

        const queryToSend = {
            ...searchQuery,
            collectionIds: newCollectionIds,
        };

        await sendQuery(queryToSend, null, false);
    }

    /**
     * Extend the previous search query
     */
    async function trySearchNext() {
        console.log("Trying to search next...");
        const selectedCollections = topAndSubToSelectedCollections(filters.topCollections, filters.subCollections);
        if (!canSearch(filters, selectedCollections) || !prevSearch) {
            return;
        }

        // Tell the database how much more we want to search
        const searchQuery = prevSearch.fullQuery;
        searchQuery.collectionIds = limitSearchCollections(filters, selectedCollections, false);
        const updateDate = limitSearchDate();
        console.log("Limit collection IDs for next search:", searchQuery.collectionIds);
        console.log("Limit update date for next search:", updateDate);

        // Stop when there is nothing left to search
        switch (filters.sort) {
            case SortType.ReleaseDateAsc:
            case SortType.ReleaseDateDesc:
                if (searchQuery.collectionIds.length === 0) {
                    return;
                }
        }

        // Update the prevSearch to include the newly covered collections
        setPrevSearch({
            fullQuery: prevSearch.fullQuery, // Unchanged
            coveredCollectionIds: prevSearch.coveredCollectionIds.concat(searchQuery.collectionIds),
        });

        await sendQuery(searchQuery, updateDate, true);
    }

    async function sendQuery(searchQuery: SearchQuery, updateDate: Date | null, append: boolean) {
        setIsLoading(true);

        const results = await getPhotocardsInDB(searchQuery, updateDate);
        if (results.error) {
            setError(results.error);
            return;
        }

        console.log("Search results:", results.data);
        // If no results, stop auto-loading more
        setDontLoad(results.data!.cards.length === 0);

        if (!append) {
            setPhotocards(results.data!.cards);
        } else {
            setPhotocards([...photocards, ...results.data!.cards]);
        }

        setIsLoading(false);
    }

    // Selection Mode Logic
    const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
    const [selectedPhotocardIds, setSelectedPhotocardIds] = useState<Set<number>>(new Set());

    function enterSelectionMode() {
        setIsSelectionMode(true);
        setSelectedPhotocardIds(new Set());
    }

    function exitSelectionMode() {
        setIsSelectionMode(false);
        setSelectedPhotocardIds(new Set());
    }

    function toggleSelection(id: number) {
        const newSelected = new Set(selectedPhotocardIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedPhotocardIds(newSelected);
    }

    function addToOwned() {
        console.log("Add to owned:", Array.from(selectedPhotocardIds));
        // Placeholder for future logic
        exitSelectionMode();
    }

    function addToWishlist() {
        console.log("Add to wishlist:", Array.from(selectedPhotocardIds));
        // Placeholder for future logic
        exitSelectionMode();
    }

    return (
        <div className="mr-4">
            <SidebarProvider>
                <Sidebar className="w-[25vw] h-screen sticky! mr-4">
                    <SidebarHeader>
                        <SidebarMenu className="ml-2 mr-2 w-auto">
                            <SidebarMenuItem>
                                <Label>Sort By</Label>
                                <Select value={filters.sort} onValueChange={(value) => onSortChange(value as SortType)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {Object.values(SortType).map((sortOption) => (
                                                <SelectItem key={sortOption} value={sortOption}>
                                                    {sortOption}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </SidebarMenuItem>
                        </SidebarMenu>
                        <SidebarMenu className="ml-2 mr-2 w-auto">
                            <SidebarMenuItem className="flex flex-col gap-2">
                                <Label>Search</Label>

                                <Input
                                    disabled={isSelectionMode}
                                    type="text"
                                    placeholder="Love Yourself: Answer RM"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            trySearch(filters);
                                        }
                                    }}
                                />
                                <Button disabled={isSelectionMode} onClick={() => trySearch(filters)}>
                                    Search
                                </Button>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarHeader>
                    <SidebarContent>
                        <CollapsibleGroup
                            key={searchInput ? "col-search-active" : "col-search-inactive"}
                            label="Collections"
                            checked={filters.collectionTypes.size > 0}
                            onChecked={onCheckedAllCollectionTypes}
                        >
                            {collectionTypes
                                .filter((type) => visibleOptions.collectionTypes.has(type.id!))
                                .map((type) => {
                                    return (
                                        <CheckMenuButton
                                            key={type.id!}
                                            type={MenuType.Regular}
                                            label={type.name}
                                            checked={filters.collectionTypes.has(type.id!)}
                                            onClick={(checked) => onSelectedCollectionType(type.id!, checked)}
                                        >
                                            <SidebarMenuSub>
                                                {topCollections
                                                    .filter(
                                                        ({ collection, hasSub }) =>
                                                            collection.collectionTypes.includes(type.id!) &&
                                                            visibleOptions.topCollections.has(collection.id!),
                                                    )
                                                    .map(({ collection, hasSub }) => (
                                                        <CheckMenuButton
                                                            key={collection.id!}
                                                            type={MenuType.Sub}
                                                            label={collection.name}
                                                            checked={filters.topCollections.has(collection.id!)}
                                                            onClick={(checked) => {
                                                                onSelectedTopCollection(collection, hasSub, checked);
                                                            }}
                                                        >
                                                            {hasSub && (
                                                                <SidebarMenuSub>
                                                                    {subCollections
                                                                        .filter(
                                                                            (subCol) =>
                                                                                subCol.name === collection.name &&
                                                                                visibleOptions.subCollections.has(
                                                                                    subCol.id!,
                                                                                ),
                                                                        )
                                                                        .map((subCol) => (
                                                                            <CheckMenuButton
                                                                                key={subCol.id!}
                                                                                type={MenuType.Sub}
                                                                                label={
                                                                                    subCol.version
                                                                                        ? `${subCol.name} (${subCol.version})`
                                                                                        : subCol.name
                                                                                }
                                                                                checked={filters.subCollections.has(
                                                                                    subCol.id!,
                                                                                )}
                                                                                onClick={(checked) => {
                                                                                    onSelectedSubCollection(
                                                                                        subCol,
                                                                                        checked,
                                                                                    );
                                                                                }}
                                                                            />
                                                                        ))}
                                                                </SidebarMenuSub>
                                                            )}
                                                        </CheckMenuButton>
                                                    ))}
                                            </SidebarMenuSub>
                                        </CheckMenuButton>
                                    );
                                })}
                        </CollapsibleGroup>

                        <CollapsibleGroup
                            key={searchInput ? "mem-search-active" : "mem-search-inactive"}
                            label="Members"
                            checked={filters.members.size > 0}
                            onChecked={onCheckedAllMembers}
                        >
                            {Object.entries(NameToMember)
                                .filter(([_, memberKey]) => visibleOptions.members.has(memberKey))
                                .map(([name, memberKey]) => (
                                    <CheckMenuButton
                                        key={memberKey}
                                        type={MenuType.Regular}
                                        label={name}
                                        checked={filters.members.has(memberKey)}
                                        onClick={(checked) => {
                                            onSelectedMember(memberKey, checked);
                                        }}
                                    />
                                ))}
                        </CollapsibleGroup>
                        <CollapsibleGroup
                            key={searchInput ? "ct-search-active" : "ct-search-inactive"}
                            label="Card Types"
                            defaultOpen={!!searchInput}
                            checked={filters.cardTypes.size > 0}
                            onChecked={onCheckedAllCardTypes}
                        >
                            {cardTypes
                                .filter((cardType) => visibleOptions.cardTypes.has(cardType))
                                .map((cardType) => (
                                    <CheckMenuButton
                                        key={cardType.id ?? 0}
                                        type={MenuType.Regular}
                                        label={cardType.name}
                                        checked={filters.cardTypes.has(cardType)}
                                        onClick={(checked) => {
                                            onSelectedCardType(cardType, checked);
                                        }}
                                    />
                                ))}
                        </CollapsibleGroup>
                        <CollapsibleGroup
                            key={searchInput ? "cs-search-active" : "cs-search-inactive"}
                            label="Card Sizes (mm)"
                            defaultOpen={!!searchInput}
                            checked={filters.cardSizes.size > 0}
                            onChecked={onCheckedAllCardSizes}
                        >
                            {cardSizes
                                .filter((cardSize) => visibleOptions.cardSizes.has(cardSize))
                                .map((cardSize) => (
                                    <CheckMenuButton
                                        key={cardSize.id!}
                                        type={MenuType.Regular}
                                        label={cardSizeToString(cardSize)}
                                        checked={filters.cardSizes.has(cardSize)}
                                        onClick={(checked) => {
                                            onSelectedCardSize(cardSize, checked);
                                        }}
                                    />
                                ))}
                        </CollapsibleGroup>
                        <CollapsibleGroup
                            key={searchInput ? "ec-search-active" : "ec-search-inactive"}
                            label="Exclusive Countries"
                            defaultOpen={!!searchInput}
                            checked={filters.exclusiveCountries.size > 0}
                            onChecked={onCheckedAllExclusiveCountries}
                        >
                            {Object.entries(ExclusiveCountry)
                                .filter(([_, id]) => visibleOptions.exclusiveCountries.has(id))
                                .map(([country, id]) => (
                                    <CheckMenuButton
                                        key={id}
                                        type={MenuType.Regular}
                                        label={country}
                                        checked={filters.exclusiveCountries.has(id)}
                                        onClick={(checked) => {
                                            onSelectedExclusiveCountry(id, checked);
                                        }}
                                    />
                                ))}
                        </CollapsibleGroup>
                    </SidebarContent>
                    <SidebarFooter>
                        <div className="flex justify-evenly gap-2">
                            <button
                                onClick={onSelectAll}
                                className="px-4 py-1 text-sm rounded-base border-2 border-transparent hover:border-border hover:bg-main"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setShowFront(!showFront)}
                                className="px-4 py-1 text-sm rounded-base border-2 border-transparent hover:border-border hover:bg-main"
                            >
                                Show {showFront ? "Back" : "Front"}
                            </button>
                            <button
                                disabled={
                                    isSelectionMode ||
                                    (prevSearch?.fullQuery !== undefined &&
                                        !hasFiltersChanged(filtersToQuery(filters), prevSearch.fullQuery))
                                }
                                onClick={() => trySearch(filters)}
                                className="px-4 py-1 text-sm rounded-base border-2 bg-third-light border-transparent hover:border-border hover:bg-third disabled:opacity-50"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </SidebarFooter>
                </Sidebar>
                <div className="flex flex-col mt-4 mb-4 gap-4 grow">
                    <Button hidden={!isAtLeastMod(session)} className="w-[30%] self-center" asChild>
                        <Link href="/createCollection">Add a Missing Collection</Link>
                    </Button>
                    <PhotocardGrid
                        photocards={photocards}
                        collections={collections.sort((a, b) =>
                            filters.sort === SortType.ReleaseDateAsc
                                ? new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
                                : new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
                        )}
                        displayCollections={
                            filters.sort === SortType.ReleaseDateAsc || filters.sort === SortType.ReleaseDateDesc
                        }
                        showFront={showFront}
                        isSelectionMode={isSelectionMode}
                        selectedIds={selectedPhotocardIds}
                        onToggleSelection={toggleSelection}
                        showEditButton={isAtLeastMod(session)}
                    />
                    <BottomSpinnerComponent dontLoad={dontLoad} loadMore={trySearchNext} isLoading={isLoading} />
                </div>
            </SidebarProvider>

            <div className="fixed bottom-8 right-8 flex gap-2 items-center z-50" hidden={session === null}>
                {!isSelectionMode ? (
                    <Button onClick={enterSelectionMode} className="rounded-full w-12 h-12 shadow-lg">
                        <PlusIcon />
                    </Button>
                ) : (
                    <>
                        <div className="bg-background border rounded-md px-4 py-2 shadow-lg font-bold">
                            Num selected: {selectedPhotocardIds.size}
                        </div>
                        <Button onClick={addToOwned} className="shadow-lg">
                            Add to owned
                        </Button>
                        <Button onClick={addToWishlist} className="shadow-lg">
                            Add to wishlist
                        </Button>
                        <Button onClick={exitSelectionMode} variant="neutral" className="shadow-lg">
                            Exit selection mode
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
