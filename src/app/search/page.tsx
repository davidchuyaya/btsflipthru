"use client";

import { getPhotocardsInDB } from "@/actions";
import { CardSize, CardType, ExclusiveCountry, ParsedCollection, Photocard } from "@/db";
import { useEffect, useState } from "react";
import { NameToMember, NUM_LOAD_COLLECTIONS, SearchQuery, SortType } from "@/constants";
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
import { ChevronDown, SquareCheckBigIcon, SquareIcon } from "lucide-react";
import { useMetadata } from "@/metadata-context";
import React from "react";
import { Button } from "@/components/ui/button";
import BottomSpinnerComponent from "../bottom-spinner";

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

export default function SearchComponent() {
    const { collections, collectionTypes, cardTypes, cardSizes, setError } = useMetadata();
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
        console.log("Collections: ", collections);

        // Provide parameters to trySearch since it may not see the updated parameters in time
        trySearch(newFilters);
    }, [collections, collectionTypes, cardTypes, cardSizes]);

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
                (a, b) => new Date(a.collection.releaseDate).getTime() - new Date(b.collection.releaseDate).getTime(),
            ),
        );
        setSubCollections(
            subCols.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()),
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
        trySearch(newFilters);
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
            trySearch(newFilters);
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
            trySearch(newFilters);
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
            trySearch(newFilters);
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
            trySearch(newFilters);
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
            trySearch(newFilters);
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

    function refreshCollectionTypes(newSelectedTopCollections: Set<number>) {
        const newSelectedTypes = new Set<number>();
        for (const type of collectionTypes) {
            const topColsForType = getTopCollectionsForType(type.id!);
            const hasChecked = Array.from(topColsForType).some((id) => newSelectedTopCollections.has(id));
            if (hasChecked) {
                newSelectedTypes.add(type.id!);
            }
        }
        setFilters({ ...filters, collectionTypes: newSelectedTypes });
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
        trySearch(newFilters);
    }

    function onSelectedTopCollection(collection: ParsedCollection, hasSub: boolean, checked: boolean) {
        const newSelectedTopCollections = new Set(filters.topCollections);
        let newSelectedSubCollections = new Set(filters.subCollections);
        const subColsForTop = hasSub ? getSubCollectionsForTop(collection.name) : new Set<number>();

        if (checked) {
            newSelectedTopCollections.add(collection.id!);

            if (hasSub) {
                newSelectedSubCollections = newSelectedSubCollections.union(subColsForTop);
            }

            // Check collection types if not already checked
            refreshCollectionTypes(newSelectedTopCollections);
        } else {
            newSelectedTopCollections.delete(collection.id!);

            if (hasSub) {
                newSelectedSubCollections = new Set(
                    [...newSelectedSubCollections].filter((id) => !subColsForTop.has(id)),
                );
            }

            // Uncheck collection types if no more top collections are checked
            refreshCollectionTypes(newSelectedTopCollections);
        }

        const newFilters = {
            ...filters,
            topCollections: newSelectedTopCollections,
            subCollections: newSelectedSubCollections,
        };
        setFilters(newFilters);
        trySearch(newFilters);
    }

    function onSelectedSubCollection(collection: ParsedCollection, checked: boolean) {
        const topCollection = getTopCollectionForSub(collection);
        const newSelectedSubCollections = new Set(filters.subCollections);

        if (checked) {
            newSelectedSubCollections.add(collection.id!);

            // Check the top collection
            if (topCollection) {
                const newSelectedTopCollections = new Set([...filters.topCollections, topCollection.id!]);
                setFilters({
                    ...filters,
                    topCollections: newSelectedTopCollections,
                    subCollections: newSelectedSubCollections,
                });
                refreshCollectionTypes(newSelectedTopCollections);
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
                    setFilters({
                        ...filters,
                        topCollections: newSelectedTopCollections,
                        subCollections: newSelectedSubCollections,
                    });
                    refreshCollectionTypes(newSelectedTopCollections);
                } else {
                    setFilters({ ...filters, subCollections: newSelectedSubCollections });
                }
            } else {
                setFilters({ ...filters, subCollections: newSelectedSubCollections });
            }
        }
        trySearch(filters);
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
        trySearch(newFilters);
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
        trySearch(newFilters);
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
        trySearch(newFilters);
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
        trySearch(newFilters);
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

    /**
     * Attempt a brand new search query
     */
    async function trySearch(currentFilters: Filters) {
        console.log(
            `Trying search...\nselectedTopCollections: ${Array.from(currentFilters.topCollections).join(", ")}\nselectedSubCollections: ${Array.from(currentFilters.subCollections).join(", ")}\nselectedCollections: ${Array.from(topAndSubToSelectedCollections(currentFilters.topCollections, currentFilters.subCollections)).join(", ")}\nselectedCardTypes: ${Array.from(currentFilters.cardTypes).join(", ")}\nselectedCardSizes: ${Array.from(currentFilters.cardSizes).join(", ")}\nselectedMembers: ${Array.from(currentFilters.members).join(", ")}\nselectedExclusiveCountries: ${Array.from(currentFilters.exclusiveCountries).join(", ")}`,
        );
        const selectedCollections = topAndSubToSelectedCollections(
            currentFilters.topCollections,
            currentFilters.subCollections,
        );
        if (!canSearch(currentFilters, selectedCollections)) {
            console.log("Cannot search yet, missing parameters.");
            return;
        }

        const searchQuery: SearchQuery = {
            collectionIds: dontFilterIfAllSelected(selectedCollections, collections),
            cardTypeIds: dontFilterIfAllSelected(currentFilters.cardTypes, cardTypes).map((ct) => ct.id!),
            sizeIds: dontFilterIfAllSelected(currentFilters.cardSizes, cardSizes).map((cs) => cs.id!),
            exclusiveCountryIds: dontFilterIfAllSelected(
                currentFilters.exclusiveCountries,
                Object.values(ExclusiveCountry),
            ),
            rm: currentFilters.members.has(NameToMember.RM),
            jin: currentFilters.members.has(NameToMember.Jin),
            suga: currentFilters.members.has(NameToMember.Suga),
            jhope: currentFilters.members.has(NameToMember["j-hope"]),
            jimin: currentFilters.members.has(NameToMember.Jimin),
            v: currentFilters.members.has(NameToMember.V),
            jungkook: currentFilters.members.has(NameToMember["Jung Kook"]),
            sortBy: currentFilters.sort,
            updateDate: null,
        };
        console.log("Search Query:", searchQuery);

        // Avoid duplicate searches
        if (JSON.stringify(searchQuery) === JSON.stringify(prevSearch?.fullQuery)) {
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
        searchQuery.collectionIds = newCollectionIds;

        await sendQuery(searchQuery, false);
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
        searchQuery.updateDate = limitSearchDate();
        console.log("Limit collection IDs for next search:", searchQuery.collectionIds);
        console.log("Limit update date for next search:", searchQuery.updateDate);

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

        await sendQuery(searchQuery, true);
    }

    async function sendQuery(searchQuery: SearchQuery, append: boolean) {
        setIsLoading(true);

        const results = await getPhotocardsInDB(searchQuery);
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
                                <Input type="text" placeholder="Love Yourself: Answer RM" />
                                <Button>Search</Button>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarHeader>
                    <SidebarContent>
                        <CollapsibleGroup
                            label="Collections"
                            checked={filters.collectionTypes.size > 0}
                            onChecked={onCheckedAllCollectionTypes}
                        >
                            {collectionTypes.map((type) => {
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
                                                .filter(({ collection, hasSub }) =>
                                                    collection.collectionTypes.includes(type.id!),
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
                                                                    .filter((subCol) => subCol.name === collection.name)
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
                            label="Members"
                            checked={filters.members.size > 0}
                            onChecked={onCheckedAllMembers}
                        >
                            {Object.entries(NameToMember).map(([name, memberKey]) => (
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
                            label="Card Types"
                            defaultOpen={false}
                            checked={filters.cardTypes.size > 0}
                            onChecked={onCheckedAllCardTypes}
                        >
                            {cardTypes.map((cardType) => (
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
                            label="Card Sizes (mm)"
                            defaultOpen={false}
                            checked={filters.cardSizes.size > 0}
                            onChecked={onCheckedAllCardSizes}
                        >
                            {cardSizes.map((cardSize) => (
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
                            label="Exclusive Countries"
                            defaultOpen={false}
                            checked={filters.exclusiveCountries.size > 0}
                            onChecked={onCheckedAllExclusiveCountries}
                        >
                            {Object.entries(ExclusiveCountry).map(([country, id]) => (
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
                        </div>
                    </SidebarFooter>
                </Sidebar>
                <div className="flex flex-col mt-4 mb-4 gap-4 grow">
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
                    />
                    <BottomSpinnerComponent dontLoad={dontLoad} loadMore={trySearchNext} isLoading={isLoading} />
                </div>
            </SidebarProvider>
        </div>
    );
}
