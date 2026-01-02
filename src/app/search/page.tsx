"use client";

import { getPhotocardsInDB } from "@/actions";
import { CardSize, CardType, ExclusiveCountry, ParsedCollection, Photocard } from "@/db";
import { useEffect, useState } from "react";
import { NameToMember, SearchQuery, SortType } from "@/constants";
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, SquareCheckBigIcon, SquareIcon } from "lucide-react";
import { DEFAULT_CARD_TYPE, useMetadata } from "@/metadata-context";
import React from "react";
import { Button } from "@/components/ui/button";

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

export default function SearchComponent() {
    const { collections, collectionTypes, cardTypes, cardSizes, setError } = useMetadata();
    const [topCollections, setTopCollections] = useState<Array<{ collection: ParsedCollection; hasSub: boolean }>>([]); // Purely for display & ease of selecting children, doesn't affect search query
    const [subCollections, setSubCollections] = useState<ParsedCollection[]>([]);
    const [photocards, setPhotocards] = useState<Array<Photocard>>([]);
    const [selectedSort, setSelectedSort] = useState<SortType>(SortType.DateAddedDesc);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedCollectionTypes, setSelectedCollectionTypes] = useState<Set<number>>(new Set());
    const [selectedTopCollections, setSelectedTopCollections] = useState<Set<number>>(new Set());
    const [selectedSubCollections, setSelectedSubCollections] = useState<Set<number>>(new Set());
    const [selectedMembers, setSelectedMembers] = useState<Set<NameToMember>>(new Set(Object.values(NameToMember)));
    const [selectedExclusiveCountries, setSelectedExclusiveCountries] = useState<Set<number>>(
        new Set(Object.values(ExclusiveCountry)),
    );
    const [selectedCardTypes, setSelectedCardTypes] = useState<Set<CardType>>(new Set());
    const [selectedCardSizes, setSelectedCardSizes] = useState<Set<CardSize>>(new Set());

    // Run on launch
    useEffect(() => {
        // getRecentlyAddedPhotocardsInDB().then((cards) => {
        //     setPhotocards(cards);
        // });
        setPhotocards(getTestPhotocards(50));
        setSelectedCollectionTypes(new Set(collectionTypes.map((type) => type.id!)));
        calculateCollectionsHierarchy();
        setSelectedCardTypes(new Set(cardTypes));
        setSelectedCardSizes(new Set(cardSizes));
        setSelectedExclusiveCountries(new Set(Object.values(ExclusiveCountry)));
    }, [collections, collectionTypes, cardTypes, cardSizes]);

    function calculateCollectionsHierarchy() {
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
        setSelectedTopCollections(new Set(topCols.map((col) => col.collection.id!)));
        setSelectedSubCollections(new Set(subCols.map((col) => col.id!)));
    }

    function onSelectAll() {
        setSearchQuery("");
        setSelectedCollectionTypes(new Set(collectionTypes.map((type) => type.id!)));
        setSelectedTopCollections(new Set(topCollections.map((col) => col.collection.id!)));
        setSelectedSubCollections(new Set(subCollections.map((col) => col.id!)));
        setSelectedMembers(new Set(Object.values(NameToMember)));
        setSelectedCardTypes(new Set(cardTypes));
        setSelectedCardSizes(new Set(cardSizes));
        setSelectedExclusiveCountries(new Set(Object.values(ExclusiveCountry)));
    }

    function onCheckedAllCollectionTypes(checked: boolean) {
        if (checked) {
            setSelectedCollectionTypes(new Set(collectionTypes.map((type) => type.id!)));
            setSelectedTopCollections(new Set(topCollections.map((col) => col.collection.id!)));
            setSelectedSubCollections(new Set(subCollections.map((col) => col.id!)));
        } else {
            setSelectedCollectionTypes(new Set());
            setSelectedTopCollections(new Set());
            setSelectedSubCollections(new Set());
        }
    }

    function onCheckedAllMembers(checked: boolean) {
        if (checked) {
            setSelectedMembers(new Set(Object.values(NameToMember)));
        } else {
            setSelectedMembers(new Set());
        }
    }

    function onCheckedAllCardTypes(checked: boolean) {
        if (checked) {
            setSelectedCardTypes(new Set(cardTypes));
        } else {
            setSelectedCardTypes(new Set());
        }
    }

    function onCheckedAllCardSizes(checked: boolean) {
        if (checked) {
            setSelectedCardSizes(new Set(cardSizes));
        } else {
            setSelectedCardSizes(new Set());
        }
    }

    function onCheckedAllExclusiveCountries(checked: boolean) {
        if (checked) {
            setSelectedExclusiveCountries(new Set(Object.values(ExclusiveCountry)));
        } else {
            setSelectedExclusiveCountries(new Set());
        }
    }

    function onShowBack() {}

    function onSortChange(sort: SortType) {
        setSelectedSort(sort);
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
        setSelectedCollectionTypes(newSelectedTypes);
    }

    function onSelectedCollectionType(typeId: number, checked: boolean) {
        const newSelectedCollectionTypes = new Set(selectedCollectionTypes);
        const topColsForType = getTopCollectionsForType(typeId);
        const subColsForType = getSubCollectionsForType(typeId);

        if (checked) {
            newSelectedCollectionTypes.add(typeId);
            setSelectedTopCollections(new Set([...selectedTopCollections, ...topColsForType]));
            setSelectedSubCollections(new Set([...selectedSubCollections, ...subColsForType]));
        } else {
            newSelectedCollectionTypes.delete(typeId);
            setSelectedTopCollections(new Set([...selectedTopCollections].filter((id) => !topColsForType.has(id))));
            setSelectedSubCollections(new Set([...selectedSubCollections].filter((id) => !subColsForType.has(id))));
        }
        setSelectedCollectionTypes(newSelectedCollectionTypes);
    }

    function onSelectedTopCollection(collection: ParsedCollection, hasSub: boolean, checked: boolean) {
        const newSelectedTopCollections = new Set(selectedTopCollections);
        const subColsForTop = hasSub ? getSubCollectionsForTop(collection.name) : new Set<number>();

        if (checked) {
            newSelectedTopCollections.add(collection.id!);
            setSelectedTopCollections(newSelectedTopCollections);

            if (hasSub) {
                setSelectedSubCollections(new Set([...selectedSubCollections, ...subColsForTop]));
            }

            // Check collection types if not already checked
            refreshCollectionTypes(newSelectedTopCollections);
        } else {
            newSelectedTopCollections.delete(collection.id!);
            setSelectedTopCollections(newSelectedTopCollections);

            if (hasSub) {
                setSelectedSubCollections(new Set([...selectedSubCollections].filter((id) => !subColsForTop.has(id))));
            }

            // Uncheck collection types if no more top collections are checked
            refreshCollectionTypes(newSelectedTopCollections);
        }
    }

    function onSelectedSubCollection(collection: ParsedCollection, checked: boolean) {
        const topCollection = getTopCollectionForSub(collection);
        const newSelectedSubCollections = new Set(selectedSubCollections);

        if (checked) {
            newSelectedSubCollections.add(collection.id!);
            setSelectedSubCollections(newSelectedSubCollections);

            // Check the top collection
            if (topCollection) {
                const newSelectedTopCollections = new Set([...selectedTopCollections, topCollection.id!]);
                setSelectedTopCollections(newSelectedTopCollections);
                refreshCollectionTypes(newSelectedTopCollections);
            }
        } else {
            newSelectedSubCollections.delete(collection.id!);
            setSelectedSubCollections(newSelectedSubCollections);

            // Uncheck top collection if no more sub collections are checked for it
            if (topCollection) {
                const remainingSubsForTop = getSubCollectionsForTop(topCollection.name);
                const hasOtherChecked = Array.from(remainingSubsForTop).some(
                    (id) => id !== collection.id && newSelectedSubCollections.has(id),
                );

                if (!hasOtherChecked) {
                    const newSelectedTopCollections = new Set(selectedTopCollections);
                    newSelectedTopCollections.delete(topCollection.id!);
                    setSelectedTopCollections(newSelectedTopCollections);
                    refreshCollectionTypes(newSelectedTopCollections);
                }
            }
        }
    }

    function onSelectedMember(member: NameToMember, checked: boolean) {
        const newSelectedMembers = new Set(selectedMembers);
        if (checked) {
            newSelectedMembers.add(member);
        } else {
            newSelectedMembers.delete(member);
        }
        setSelectedMembers(newSelectedMembers);
    }

    function onSelectedCardType(cardType: CardType, checked: boolean) {
        const newSelectedCardTypes = new Set(selectedCardTypes);
        if (checked) {
            newSelectedCardTypes.add(cardType);
        } else {
            newSelectedCardTypes.delete(cardType);
        }
        setSelectedCardTypes(newSelectedCardTypes);
    }

    function onSelectedCardSize(cardSize: CardSize, checked: boolean) {
        const newSelectedCardSizes = new Set(selectedCardSizes);
        if (checked) {
            newSelectedCardSizes.add(cardSize);
        } else {
            newSelectedCardSizes.delete(cardSize);
        }
        setSelectedCardSizes(newSelectedCardSizes);
    }

    function onSelectedExclusiveCountry(country: ExclusiveCountry, checked: boolean) {
        const newSelectedExclusiveCountries = new Set(selectedExclusiveCountries);
        if (checked) {
            newSelectedExclusiveCountries.add(country);
        } else {
            newSelectedExclusiveCountries.delete(country);
        }
        setSelectedExclusiveCountries(newSelectedExclusiveCountries);
    }

    function canSearch(): boolean {
        return (
            selectedCollectionTypes.size > 0 &&
            selectedSubCollections.size > 0 &&
            selectedMembers.size > 0 &&
            selectedCardTypes.size > 0 &&
            selectedCardSizes.size > 0 &&
            selectedExclusiveCountries.size > 0
        );
    }

    function dontFilterIfAllSelected<T, U>(selectedSet: Set<T>, allItems: U[]): T[] {
        if (selectedSet.size === allItems.length) {
            return []; // No filtering
        }
        return Array.from(selectedSet);
    }

    async function onSearch() {
        if (!canSearch()) {
            return;
        }

        const searchQuery: SearchQuery = {
            collectionIds: dontFilterIfAllSelected(selectedSubCollections, collections),
            cardTypeIds: dontFilterIfAllSelected(selectedCardTypes, cardTypes).filter((ct) => ct.id !== undefined).map((ct) => ct.id!),
            defaultCardType: selectedCardTypes.has(DEFAULT_CARD_TYPE), // Special handling for DEFAULT_CARD_TYPE, which has no ID
            sizeIds: dontFilterIfAllSelected(selectedCardSizes, cardSizes).map((cs) => cs.id!),
            exclusiveCountryIds: dontFilterIfAllSelected(selectedExclusiveCountries, Object.values(ExclusiveCountry)),
            rm: selectedMembers.has(NameToMember.RM),
            jin: selectedMembers.has(NameToMember.Jin),
            suga: selectedMembers.has(NameToMember.Suga),
            jhope: selectedMembers.has(NameToMember["j-hope"]),
            jimin: selectedMembers.has(NameToMember.Jimin),
            v: selectedMembers.has(NameToMember.V),
            jungkook: selectedMembers.has(NameToMember["Jung Kook"]),
            sortBy: selectedSort,
        };

        const results = await getPhotocardsInDB(searchQuery);
        if (results.error) {
            setError(results.error);
            return;
        }
        setPhotocards(results.data!);
    }

    return (
        <div className="mr-4">
            <SidebarProvider>
                <Sidebar className="w-[25vw] h-screen sticky! mr-4">
                    <SidebarHeader>
                        <SidebarMenu className="ml-2 mr-2 w-auto">
                            <SidebarMenuItem>
                                <Label>Sort By</Label>
                                <Select value={selectedSort} onValueChange={(value) => onSortChange(value as SortType)}>
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
                            checked={selectedCollectionTypes.size > 0}
                            onChecked={onCheckedAllCollectionTypes}
                        >
                            {collectionTypes.map((type) => {
                                return (
                                    <CheckMenuButton
                                        key={type.id!}
                                        type={MenuType.Regular}
                                        label={type.name}
                                        checked={selectedCollectionTypes.has(type.id!)}
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
                                                        checked={selectedTopCollections.has(collection.id!)}
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
                                                                            checked={selectedSubCollections.has(
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
                            checked={selectedMembers.size > 0}
                            onChecked={onCheckedAllMembers}
                        >
                            {Object.entries(NameToMember).map(([name, memberKey]) => (
                                <CheckMenuButton
                                    key={memberKey}
                                    type={MenuType.Regular}
                                    label={name}
                                    checked={selectedMembers.has(memberKey)}
                                    onClick={(checked) => {
                                        onSelectedMember(memberKey, checked);
                                    }}
                                />
                            ))}
                        </CollapsibleGroup>
                        <CollapsibleGroup
                            label="Card Types"
                            defaultOpen={false}
                            checked={selectedCardTypes.size > 0}
                            onChecked={onCheckedAllCardTypes}
                        >
                            {cardTypes.map((cardType) => (
                                <CheckMenuButton
                                    key={cardType.id ?? 0}
                                    type={MenuType.Regular}
                                    label={cardType.name}
                                    checked={selectedCardTypes.has(cardType)}
                                    onClick={(checked) => {
                                        onSelectedCardType(cardType, checked);
                                    }}
                                />
                            ))}
                        </CollapsibleGroup>
                        <CollapsibleGroup
                            label="Card Sizes (mm)"
                            defaultOpen={false}
                            checked={selectedCardSizes.size > 0}
                            onChecked={onCheckedAllCardSizes}
                        >
                            {cardSizes.map((cardSize) => (
                                <CheckMenuButton
                                    key={cardSize.id!}
                                    type={MenuType.Regular}
                                    label={cardSizeToString(cardSize)}
                                    checked={selectedCardSizes.has(cardSize)}
                                    onClick={(checked) => {
                                        onSelectedCardSize(cardSize, checked);
                                    }}
                                />
                            ))}
                        </CollapsibleGroup>
                        <CollapsibleGroup
                            label="Exclusive Countries"
                            defaultOpen={false}
                            checked={selectedExclusiveCountries.size > 0}
                            onChecked={onCheckedAllExclusiveCountries}
                        >
                            {Object.entries(ExclusiveCountry).map(([country, id]) => (
                                <CheckMenuButton
                                    key={id}
                                    type={MenuType.Regular}
                                    label={country}
                                    checked={selectedExclusiveCountries.has(id)}
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
                                onClick={onShowBack}
                                className="px-4 py-1 text-sm rounded-base border-2 border-transparent hover:border-border hover:bg-main"
                            >
                                Show Back
                            </button>
                        </div>
                    </SidebarFooter>
                </Sidebar>
                <PhotocardGrid photocards={photocards} className="mt-4 mb-4" />
            </SidebarProvider>
        </div>
    );
}
