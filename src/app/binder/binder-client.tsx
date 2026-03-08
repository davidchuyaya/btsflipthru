"use client";

import { cardSizeToString } from "@/actions-client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    BINDER_MAX_RENDERING_PAGE_DEPTH,
    BINDER_PERFORATION_DOT_SIZE,
    BinderPage,
    BinderType,
    collectionDisplayName,
    ExclusiveCountry,
    MemberToIntWithOT7,
} from "@/constants";
import { CardSizes, CardTypes, Collections, Photocards } from "@/db";
import { executeSearchLogic } from "@/natural-language-search";
import { zodResolver } from "@hookform/resolvers/zod";
import { Selectable } from "kysely";
import {
    AlignCenterVerticalIcon,
    AlignEndVerticalIcon,
    AlignStartVerticalIcon,
    ArrowDownToLineIcon,
    ArrowUpToLineIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    FilePlusIcon,
    FlipHorizontalIcon,
    PointerIcon,
    RotateCcwIcon,
    SaveIcon,
    SearchIcon,
    Share2Icon,
    Trash2Icon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    Controller,
    FormProvider,
    useFieldArray,
    useForm,
    useFormContext,
    useWatch,
} from "react-hook-form";
import z from "zod";

import PhotocardGrid from "../photocard-grid";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useDroppable,
    useDraggable,
    DragStartEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
    SortableContext,
    useSortable,
} from "@dnd-kit/sortable";
import { PhotocardWithSize } from "../photocard";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

type BinderSlotCard = {
    photocard: Selectable<Photocards>;
    snap: SnapToGrid;
    showFront: boolean;
    rotation: number;
    width: number;
    height: number;
    x: number;
    y: number;
    z: number;
};

function sortSlotCards(cards: BinderSlotCard[] = []): BinderSlotCard[] {
    return [...cards].sort((a, b) => a.z - b.z);
}

function getVisibleSlotCard(
    cards: BinderSlotCard[] | undefined,
    flipped: boolean,
): BinderSlotCard | undefined {
    if (!cards || cards.length === 0) {
        return undefined;
    }
    const sorted = sortSlotCards(cards);
    return flipped ? sorted[0] : sorted[sorted.length - 1];
}

function updateSlotCardByZ(
    cards: BinderSlotCard[] | undefined,
    z: number,
    update: (card: BinderSlotCard) => BinderSlotCard,
): BinderSlotCard[] {
    const sorted = sortSlotCards(cards);
    const index = sorted.findIndex((card) => card.z === z);
    if (index === -1) {
        return sorted;
    }
    sorted[index] = update(sorted[index]);
    return sortSlotCards(sorted);
}

function removeSlotCardByZ(
    cards: BinderSlotCard[] | undefined,
    z: number,
): { cards: BinderSlotCard[]; removed?: BinderSlotCard } {
    const sorted = sortSlotCards(cards);
    const index = sorted.findIndex((card) => card.z === z);
    if (index === -1) {
        return { cards: sorted };
    }
    const [removed] = sorted.splice(index, 1);
    return { cards: sorted, removed };
}

function translateTransformToString(
    transform: {
        x: number;
        y: number;
        scaleX?: number;
        scaleY?: number;
    } | null,
): string | undefined {
    if (!transform) {
        return undefined;
    }
    const { x, y, scaleX = 1, scaleY = 1 } = transform;
    return `translate3d(${x}px, ${y}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
}

function getSlotCardsFromSlotsRecord(
    slots: Record<string, BinderSlotCard[]> | undefined,
    pageNum: number,
    slotId: string,
): BinderSlotCard[] | undefined {
    if (!slots) {
        return undefined;
    }
    return slots[slotId] ?? slots[`${pageNum}-${slotId}`];
}

function BinderCoverComponent({
    binderType,
    leftPage,
    rightPage,
    binderRef,
}: {
    binderType: BinderType;
    leftPage?: React.ReactNode;
    rightPage?: React.ReactNode;
    binderRef: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div className="w-full flex flex-row" ref={binderRef}>
            <div
                className="rounded-lg bg-main flex flex-col justify-center"
                style={{
                    aspectRatio: `${binderType.coverWidth}/${binderType.coverHeight}`,
                    flex: binderType.coverWidth,
                }}
            >
                {leftPage}
            </div>
            <div
                className="rounded-lg bg-main border-2"
                style={{
                    aspectRatio: `${binderType.spineWidth}/${binderType.coverHeight}`,
                    flex: binderType.spineWidth,
                    borderColor: "var(--primary-dark)",
                }}
            ></div>
            <div
                className="rounded-lg bg-main flex flex-col justify-center"
                style={{
                    aspectRatio: `${binderType.coverWidth}/${binderType.coverHeight}`,
                    flex: binderType.coverWidth,
                }}
            >
                {rightPage}
            </div>
        </div>
    );
}

function BinderPageComponent({
    binderType,
    index,
    pageFieldId,
    flipped,
    stackPages = [],
    photocardRenderAnchorIndex = index,
    onSelectSlot,
    selectedSlotId,
    disabled = false,
    fixedHeight,
    mainScale = 1,
}: {
    binderType: BinderType;
    index: number;
    pageFieldId: string;
    flipped: boolean;
    stackPages?: Array<{ index: number; pageFieldId: string }>;
    photocardRenderAnchorIndex?: number;
    onSelectSlot: (id: string, width: number, height: number) => void;
    selectedSlotId?: string;
    disabled?: boolean;
    fixedHeight?: string;
    mainScale?: number;
}) {
    const layers = [
        ...stackPages.map((stackPage, stackIndex) => ({
            key: `stack-${stackPage.pageFieldId}`,
            index: stackPage.index,
            pageFieldId: stackPage.pageFieldId,
            disabled: true,
            offsetX: (stackPages.length - stackIndex) * (flipped ? -4 : 4),
            offsetY: 0,
            pointerEvents: "none" as const,
        })),
        {
            key: `page-${pageFieldId}`,
            index,
            pageFieldId,
            disabled,
            offsetX: 0,
            offsetY: 0,
            pointerEvents: "auto" as const,
        },
    ];

    return (
        <div className="relative overflow-visible">
            {layers.map((layer) => (
                <div
                    key={layer.key}
                    aria-hidden={layer.disabled}
                    className="absolute inset-0"
                    style={{
                        transform:
                            layer.offsetX !== 0 || layer.offsetY !== 0
                                ? `translate(${layer.offsetX}px, ${layer.offsetY}px)`
                                : undefined,
                        pointerEvents: layer.pointerEvents,
                    }}
                >
                    <BinderPageLayer
                        binderType={binderType}
                        index={layer.index}
                        pageFieldId={layer.pageFieldId}
                        flipped={flipped}
                        renderPhotocards={
                            Math.abs(
                                layer.index - photocardRenderAnchorIndex,
                            ) <= BINDER_MAX_RENDERING_PAGE_DEPTH
                        }
                        onSelectSlot={onSelectSlot}
                        selectedSlotId={selectedSlotId}
                        disabled={layer.disabled}
                        fixedHeight={fixedHeight}
                        mainScale={mainScale}
                    />
                </div>
            ))}
            <div className="invisible">
                <BinderPageLayer
                    binderType={binderType}
                    index={index}
                    pageFieldId={pageFieldId}
                    flipped={flipped}
                    renderPhotocards={
                        Math.abs(index - photocardRenderAnchorIndex) <=
                        BINDER_MAX_RENDERING_PAGE_DEPTH
                    }
                    onSelectSlot={onSelectSlot}
                    selectedSlotId={selectedSlotId}
                    disabled={true}
                    fixedHeight={fixedHeight}
                    mainScale={mainScale}
                />
            </div>
        </div>
    );
}

function BinderPageLayer({
    binderType,
    index,
    pageFieldId,
    flipped,
    renderPhotocards = true,
    onSelectSlot,
    selectedSlotId,
    disabled = false,
    fixedHeight,
    mainScale = 1,
}: {
    binderType: BinderType;
    index: number;
    pageFieldId: string;
    flipped: boolean;
    renderPhotocards?: boolean;
    onSelectSlot: (id: string, width: number, height: number) => void;
    selectedSlotId?: string;
    disabled?: boolean;
    fixedHeight?: string;
    mainScale?: number;
}) {
    const { control } = useFormContext<z.infer<typeof formSchema>>();
    const page = useWatch({ control, name: `pages.${index}` });
    const pageRef = useRef<HTMLDivElement>(null);
    const [renderedWidth, setRenderedWidth] = useState(0);

    useLayoutEffect(() => {
        if (!fixedHeight || !pageRef.current) {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setRenderedWidth(entry.contentRect.width);
            }
        });
        observer.observe(pageRef.current);
        return () => observer.disconnect();
    }, [fixedHeight]);

    if (index < 0 || !page) {
        return null;
    }

    const width =
        page.pageType.xPerforations[page.pageType.xPerforations.length - 1] +
        BINDER_PERFORATION_DOT_SIZE;
    const height =
        page.pageType.yPerforations[page.pageType.yPerforations.length - 1] +
        BINDER_PERFORATION_DOT_SIZE;
    const widthPercent = (width / binderType.coverWidth) * 100;

    const xPerfs = [0, ...page.pageType.xPerforations];
    const yPerfs = [0, ...page.pageType.yPerforations];

    const colWidths = xPerfs.slice(1).map((x, i) => {
        // Last column gets needs extra space to draw the rightmost perforations
        if (i === xPerfs.length - 1) {
            return x - xPerfs[i] + BINDER_PERFORATION_DOT_SIZE;
        }
        return x - xPerfs[i];
    });
    const rowHeights = yPerfs.slice(1).map((y, i) => y - yPerfs[i]);

    const gradient =
        "radial-gradient(circle, transparent 40%, white 40%, white 50%, transparent 50%)";
    const previewScale =
        fixedHeight && mainScale > 0
            ? renderedWidth > 0
                ? renderedWidth / width / mainScale
                : 0
            : 1;
    const pageStyle: React.CSSProperties = {
        width: fixedHeight ? "auto" : `${widthPercent}%`,
        height: fixedHeight,
        aspectRatio: `${width}/${height}`,
        gridTemplateColumns: colWidths.map((w) => `${w}fr`).join(" "),
        gridTemplateRows: rowHeights.map((h) => `${h}fr`).join(" "),
    };
    const pageClassName = `relative bg-white/20 border border-black/10 ${flipped ? "ml-auto flip-horizontal" : ""} grid`;

    function renderPageContent() {
        return rowHeights.map((h, rIndex) =>
            colWidths.map((w, cIndex) => {
                const dotPctX = (BINDER_PERFORATION_DOT_SIZE / w) * 100;
                const dotPctY = (BINDER_PERFORATION_DOT_SIZE / h) * 100;
                const isLastCol = cIndex === colWidths.length - 1;
                const key = `${rIndex}-${cIndex}`;
                const slotProps = {
                    id: key,
                    pageNum: index,
                    pageFieldId,
                    width: w,
                    height: h,
                    gradient,
                    isLastCol,
                    dotPctX,
                    dotPctY,
                    onSelectSlot,
                    isSelected: selectedSlotId === key,
                    flipped,
                    disabled,
                    renderPhotocards,
                    valueScale: previewScale,
                };
                return <BinderSlot key={key} {...slotProps} />;
            }),
        );
    }

    return (
        <div ref={pageRef} className={pageClassName} style={pageStyle}>
            {renderPageContent()}
        </div>
    );
}

function BinderSlot({
    gradient,
    isLastCol,
    dotPctX,
    dotPctY,
    width,
    height,
    id,
    pageNum,
    pageFieldId,
    onSelectSlot,
    isSelected,
    flipped,
    disabled,
    renderPhotocards,
    valueScale,
}: {
    gradient: string;
    isLastCol: boolean;
    width: number;
    height: number;
    dotPctX: number;
    dotPctY: number;
    id: string;
    pageNum: number;
    pageFieldId: string;
    onSelectSlot: (id: string, width: number, height: number) => void;
    isSelected: boolean;
    flipped: boolean;
    disabled: boolean;
    renderPhotocards: boolean;
    valueScale: number;
}) {
    const { control } = useFormContext();
    const logicalWidth =
        width -
        (isLastCol
            ? BINDER_PERFORATION_DOT_SIZE * 2
            : BINDER_PERFORATION_DOT_SIZE) -
        1;
    const logicalHeight = height - BINDER_PERFORATION_DOT_SIZE - 1;

    const pageSlots = useWatch({
        control,
        name: `pages.${pageNum}.slots`,
    }) as Record<string, BinderSlotCard[]> | undefined;
    const slotCards = getSlotCardsFromSlotsRecord(pageSlots, pageNum, id);
    const visibleCard = getVisibleSlotCard(slotCards, flipped);
    const slotStyle = {
        backgroundImage: `${gradient}, ${gradient} ${isLastCol ? ", " + gradient : ""}`,
        backgroundPosition: `left bottom, left top ${isLastCol ? ", right top" : ""}`,
        backgroundSize: `${dotPctX}% ${dotPctY}%, ${dotPctX}% ${dotPctY}% ${isLastCol ? `, ${dotPctX}% ${dotPctY}%` : ""}`,
        backgroundRepeat: `repeat-x, repeat-y ${isLastCol ? ", repeat-y" : ""}`,
    };

    if (disabled) {
        return (
            <div className="relative" style={slotStyle}>
                {renderPhotocards && visibleCard && valueScale > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: `calc(${visibleCard.y * valueScale}px + ${dotPctY}%)`,
                            left: `calc(${visibleCard.x * valueScale}px + ${dotPctX}%)`,
                            opacity: isSelected ? 1 : 0.6,
                        }}
                    >
                        <PhotocardWithSize
                            photocard={visibleCard.photocard}
                            showFront={visibleCard.showFront !== flipped}
                            width={visibleCard.width * valueScale}
                            height={visibleCard.height * valueScale}
                            className={flipped ? "flip-horizontal!" : ""}
                            style={{
                                transform: `rotate(${visibleCard.rotation}deg)`,
                                transformOrigin: "center center",
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <InteractiveSlotContent
            slotId={id}
            pageNum={pageNum}
            pageFieldId={pageFieldId}
            logicalWidth={logicalWidth}
            logicalHeight={logicalHeight}
            flipped={flipped}
            slotCards={slotCards}
            onSelectSlot={onSelectSlot}
            slotStyle={slotStyle}
        >
            {renderPhotocards && visibleCard && valueScale > 0 && (
                <PhotocardWithDragContent
                    photocard={visibleCard.photocard}
                    slotId={id}
                    pageNum={pageNum}
                    pageFieldId={pageFieldId}
                    showFront={visibleCard.showFront !== flipped}
                    width={visibleCard.width}
                    height={visibleCard.height}
                    slotWidth={logicalWidth}
                    slotHeight={logicalHeight}
                    z={visibleCard.z}
                    disabled={flipped}
                    className={flipped ? "flip-horizontal!" : ""}
                    style={{
                        position: "absolute",
                        bottom: `calc(${visibleCard.y}px + ${dotPctY}%)`,
                        left: `calc(${visibleCard.x}px + ${dotPctX}%)`,
                        opacity: isSelected ? 1 : 0.6,
                        transform: `rotate(${visibleCard.rotation}deg)`,
                    }}
                />
            )}
        </InteractiveSlotContent>
    );
}

function InteractiveSlotContent({
    slotId,
    pageNum,
    pageFieldId,
    logicalWidth,
    logicalHeight,
    flipped,
    slotCards,
    onSelectSlot,
    slotStyle,
    children,
}: {
    slotId: string;
    pageNum: number;
    pageFieldId: string;
    logicalWidth: number;
    logicalHeight: number;
    flipped: boolean;
    slotCards?: BinderSlotCard[];
    onSelectSlot: (id: string, width: number, height: number) => void;
    slotStyle: React.CSSProperties;
    children?: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `page-slot-${pageFieldId}-${slotId}`,
        disabled: flipped,
        data: {
            slotId,
            pageNum,
            pageFieldId,
            width: logicalWidth,
            height: logicalHeight,
        },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={() => {
                if (slotCards && slotCards.length > 0 && !flipped) {
                    onSelectSlot(slotId, logicalWidth, logicalHeight);
                }
            }}
            className={`${isOver && !flipped ? "bg-third" : ""} relative`}
            style={slotStyle}
        >
            {children}
        </div>
    );
}

function PhotocardWithDragContent({
    photocard,
    slotId,
    pageNum,
    pageFieldId,
    showFront,
    width,
    height,
    slotWidth,
    slotHeight,
    z,
    style,
    className,
    disabled,
}: {
    photocard: Selectable<Photocards>;
    slotId: string;
    pageNum: number;
    pageFieldId: string;
    showFront: boolean;
    width: number;
    height: number;
    slotWidth: number;
    slotHeight: number;
    z: number;
    style?: React.CSSProperties;
    className?: string;
    disabled?: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `slot-card-${pageFieldId}-${slotId}-${z}`,
        disabled,
        data: {
            photocard,
            sourceSlotId: slotId,
            sourcePageNum: pageNum,
            sourcePageFieldId: pageFieldId,
            sourceSlotWidth: slotWidth,
            sourceSlotHeight: slotHeight,
            sourceCardZ: z,
        },
    });
    const { transform, ...containerStyle } = style ?? {};

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{
                ...containerStyle,
                opacity: isDragging ? 0 : containerStyle.opacity,
            }}
        >
            <div style={{ transform, transformOrigin: "center center" }}>
                <PhotocardWithSize
                    photocard={photocard}
                    showFront={showFront}
                    width={width}
                    height={height}
                    className={className}
                />
            </div>
        </div>
    );
}

function SortablePagePreview({
    id,
    index,
    currentPage,
    onSelect,
    children,
}: {
    id: string;
    index: number;
    currentPage: number;
    onSelect: (index: number) => void;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: {
            type: "page-preview",
            index,
        },
        transition: {
            duration: 150, // Animation duration in ms
            easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Animation easing
        },
    });

    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={() => onSelect(index)}
            style={{
                transform: translateTransformToString(transform),
                transition,
                opacity: isDragging ? 0.7 : 1,
            }}
            className={`shrink-0 rounded-lg border-2 p-1 touch-none ${currentPage === index ? "border-third bg-third-lighter" : "border-transparent bg-white/60 hover:bg-white/80"}`}
            {...attributes}
            {...listeners}
        >
            {children}
        </button>
    );
}

function SearchComponent({
    collections,
    cardTypes,
    cardSizes,
    ownedPhotocards,
    wishlistedPhotocards,
}: {
    collections: Selectable<Collections>[];
    cardTypes: Selectable<CardTypes>[];
    cardSizes: Selectable<CardSizes>[];
    ownedPhotocards: Selectable<Photocards>[];
    wishlistedPhotocards: Selectable<Photocards>[];
}) {
    const [searchInput, setSearchInput] = useState("");
    const [searchType, setSearchType] = useState(SearchType.Owned);
    const [shownPhotocards, setShownPhotocards] =
        useState<Selectable<Photocards>[]>(ownedPhotocards);

    function matchesMemberFilter(
        photocardMembers: number[],
        selectedMembers: Set<MemberToIntWithOT7>,
    ): boolean {
        if (selectedMembers.size === 0) return true;
        if (
            selectedMembers.has(MemberToIntWithOT7.OT7) &&
            selectedMembers.size === 1
        ) {
            return photocardMembers.length === 7;
        }
        return photocardMembers.some((member) =>
            selectedMembers.has(member as MemberToIntWithOT7),
        );
    }

    function runNaturalLanguageSearch(
        photocards: Selectable<Photocards>[],
    ): Selectable<Photocards>[] {
        const trimmedInput = searchInput.trim();
        if (!trimmedInput) {
            return photocards;
        }

        const {
            winningMembers,
            winningTopCols,
            winningCardTypes,
            winningCardSizes,
            winningCountries,
        } = executeSearchLogic(
            trimmedInput,
            {
                tops: collections,
                subs: [] as Selectable<Collections>[],
                cardTypes: cardTypes,
                cardSizes: cardSizes,
            },
            {
                topName: (collection: Selectable<Collections>) =>
                    collectionDisplayName(collection),
                subName: () => "",
                cardTypeName: (cardType: Selectable<CardTypes>) =>
                    cardType.name,
                cardSizeName: (cardSize: Selectable<CardSizes>) =>
                    cardSizeToString(cardSize),
            },
        );

        const winningCollectionIds = new Set(
            [...winningTopCols].map((collection) => collection.id!),
        );
        const winningCardTypeIds = new Set(
            [...winningCardTypes].map((cardType) => cardType.id!),
        );
        const winningCardSizeIds = new Set(
            [...winningCardSizes].map((cardSize) => cardSize.id!),
        );

        return photocards.filter((photocard) => {
            if (
                winningCollectionIds.size > 0 &&
                !winningCollectionIds.has(photocard.collection_id)
            ) {
                return false;
            }
            if (
                winningCardTypeIds.size > 0 &&
                !winningCardTypeIds.has(photocard.card_type)
            ) {
                return false;
            }
            if (
                winningCardSizeIds.size > 0 &&
                !winningCardSizeIds.has(photocard.size_id)
            ) {
                return false;
            }
            if (
                winningCountries.size > 0 &&
                !winningCountries.has(photocard.exclusive_country)
            ) {
                return false;
            }
            if (
                winningMembers.size > 0 &&
                !matchesMemberFilter(photocard.members, winningMembers)
            ) {
                return false;
            }
            return true;
        });
    }

    function onSearch(searchType: SearchType) {
        const sourcePhotocards =
            searchType === SearchType.Owned
                ? ownedPhotocards
                : wishlistedPhotocards;
        setShownPhotocards(runNaturalLanguageSearch(sourcePhotocards));
    }

    return (
        <div className="rounded-2xl bg-third-lighter p-4 flex h-full min-h-0 flex-col items-stretch gap-4 overflow-hidden">
            <div className="flex w-full shrink-0 flex-row gap-3">
                <Input
                    type="text"
                    placeholder="Search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            onSearch(searchType);
                        }
                    }}
                />
                <Button
                    type="button"
                    size="icon"
                    className="px-3"
                    onClick={() => onSearch(searchType)}
                >
                    <SearchIcon />
                </Button>
            </div>
            <ToggleGroup
                className="w-auto! shrink-0"
                type="single"
                variant="outline"
                orientation="vertical"
                value={searchType}
                onValueChange={(v) => {
                    let newSearchType = v as SearchType;
                    setSearchType(newSearchType);
                    onSearch(newSearchType);
                }}
            >
                {Object.values(SearchType).map((type) => (
                    <ToggleGroupItem
                        key={type}
                        value={type}
                        className=" data-[state=on]:bg-main data-[state=on]:font-bold"
                    >
                        {type}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <PhotocardGrid
                photocards={shownPhotocards}
                draggable={true}
                scrollable={true}
                className="grid grid-cols-1 gap-4 justify-items-stretch px-4"
                draggablePhotocardWidth="100%"
            />
        </div>
    );
}

enum SearchType {
    Owned = "Owned",
    Wishlisted = "Wishlisted",
}

enum SnapToGrid {
    BottomLeft,
    BottomRight,
    Center,
    Manual,
}

const formSchema = z.object({
    binderType: z.custom<BinderType>(),
    name: z.string(),
    description: z.string().optional(),
    pages: z.array(
        z.object({
            pageType: z.custom<BinderPage>(),
            slots: z.record(
                z.string(), // Slot ID
                z
                    .array(
                        z.object({
                            photocard: z.custom<Selectable<Photocards>>(),
                            snap: z.custom<SnapToGrid>(),
                            showFront: z.boolean(),
                            rotation: z.number(),
                            width: z.number(),
                            height: z.number(),
                            x: z.number(),
                            y: z.number(),
                            z: z.number(),
                        }),
                    )
                    .optional(),
            ),
        }),
    ),
});

export default function BinderClient({
    collections,
    cardTypes,
    cardSizes,
    ownedPhotocards,
    wishlistedPhotocards,
}: {
    collections: Selectable<Collections>[];
    cardTypes: Selectable<CardTypes>[];
    cardSizes: Selectable<CardSizes>[];
    ownedPhotocards: Selectable<Photocards>[];
    wishlistedPhotocards: Selectable<Photocards>[];
}) {
    const [currentPage, setCurrentPage] = useState(0);
    const [needsSaving, setNeedsSaving] = useState(false);
    const [snapToGrid, setSnapToGrid] = useState<SnapToGrid>(SnapToGrid.Center);
    // The one being dragged & dropped
    const [activePhotocard, setActivePhotocard] =
        useState<Selectable<Photocards> | null>(null);
    const [activePhotocardRotation, setActivePhotocardRotation] = useState(0);
    const [activePhotocardShowFront, setActivePhotocardShowFront] =
        useState(true);
    // Source slot when dragging from a slot (null when dragging from search panel)
    const [dragSourceSlot, setDragSourceSlot] = useState<{
        slotId: string;
        pageNum: number;
    } | null>(null);
    // The one in the binder that is now selected
    const [selectedSlot, setSelectedSlot] = useState<{
        id: string;
        width: number;
        height: number;
    } | null>(null);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            binderType: BinderType.OneInch,
            name: "",
            description: "",
            pages: [
                {
                    pageType: BinderPage.Standard9PP,
                    slots: {},
                },
            ],
        },
    });

    // Pages
    const [pageType, setPageType] = useState<BinderPage>(
        BinderPage.Standard9PP,
    );
    const {
        fields: pages,
        insert: insertPage,
        remove: removePage,
        move: movePage,
    } = useFieldArray({
        control: form.control,
        name: "pages",
    });

    // Resize Observer State
    const [binderWidth, setBinderWidth] = useState(0);
    const binderRef = useRef<HTMLDivElement>(null);
    const binderType = form.watch("binderType");
    const activeCardSize =
        activePhotocard && cardSizes.length > 0
            ? cardSizes.find((cs) => cs.id === activePhotocard.size_id)
            : null;
    const totalLogicalWidth = binderType.coverWidth * 2 + binderType.spineWidth;
    const scale = binderWidth ? binderWidth / totalLogicalWidth : 0;
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    useEffect(() => {
        if (!binderRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setBinderWidth(entry.contentRect.width);
            }
        });
        observer.observe(binderRef.current);
        return () => observer.disconnect();
    }, []);

    function getSlotCards(pageNum: number, slotId: string) {
        const slots = form.getValues(`pages.${pageNum}.slots`) as
            | Record<string, BinderSlotCard[]>
            | undefined;
        return getSlotCardsFromSlotsRecord(slots, pageNum, slotId);
    }

    function setSlotCards(
        pageNum: number,
        slotId: string,
        cards: BinderSlotCard[],
    ) {
        form.setValue(`pages.${pageNum}.slots.${slotId}`, cards);
        const legacySlotId = `${pageNum}-${slotId}`;
        const slots = form.getValues(`pages.${pageNum}.slots`) as
            | Record<string, BinderSlotCard[]>
            | undefined;
        if (slots && legacySlotId in slots) {
            form.unregister(`pages.${pageNum}.slots.${legacySlotId}`);
        }
    }

    function unregisterSlot(pageNum: number, slotId: string) {
        form.unregister(`pages.${pageNum}.slots.${slotId}`);
        form.unregister(`pages.${pageNum}.slots.${pageNum}-${slotId}`);
    }

    function onDragStart(event: DragStartEvent) {
        const data = event.active.data.current;
        if (data?.type === "page-preview") {
            return;
        }
        if (data?.photocard) {
            setActivePhotocard(data.photocard);
        }
        if (data?.sourceSlotId !== undefined) {
            const sourceSlotCards = getSlotCards(
                data.sourcePageNum,
                data.sourceSlotId,
            );
            const sourceCard = getVisibleSlotCard(sourceSlotCards, false);
            setActivePhotocardRotation(sourceCard?.rotation ?? 0);
            setActivePhotocardShowFront(sourceCard?.showFront ?? true);
            setDragSourceSlot({
                slotId: data.sourceSlotId,
                pageNum: data.sourcePageNum,
            });
            if (
                data.sourceSlotWidth !== undefined &&
                data.sourceSlotHeight !== undefined
            ) {
                setSelectedSlot({
                    id: data.sourceSlotId,
                    width: data.sourceSlotWidth,
                    height: data.sourceSlotHeight,
                });
            }
        } else {
            setDragSourceSlot(null);
            setActivePhotocardRotation(0);
            setActivePhotocardShowFront(true);
        }
    }

    function calculatePhotocardPosition(
        snapToGrid: SnapToGrid,
        slotWidth: number,
        slotHeight: number,
        cardWidth: number,
        cardHeight: number,
        rotation: number,
    ): { x: number; y: number } {
        let x = 0;
        let y = 0;

        const isSideways = Math.abs(rotation) % 180 === 90;

        if (isSideways) {
            y = (cardWidth - cardHeight) / 2;

            switch (snapToGrid) {
                case SnapToGrid.BottomLeft:
                    x = (cardHeight - cardWidth) / 2;
                    break;
                case SnapToGrid.BottomRight:
                    x = slotWidth - (cardHeight + cardWidth) / 2;
                    break;
                case SnapToGrid.Center:
                    x = (slotWidth - cardWidth) / 2;
                    break;
                case SnapToGrid.Manual:
                    x = (cardHeight - cardWidth) / 2;
                    break;
            }
        } else {
            switch (snapToGrid) {
                case SnapToGrid.BottomLeft:
                    x = 0;
                    break;
                case SnapToGrid.BottomRight:
                    x = slotWidth - cardWidth;
                    break;
                case SnapToGrid.Center:
                    x = (slotWidth - cardWidth) / 2;
                    break;
                case SnapToGrid.Manual:
                    x = 0;
                    break;
            }
        }

        return { x, y };
    }

    function onDragEnd(event: DragEndEvent) {
        const activeData = event.active.data.current;
        if (activeData?.type === "page-preview" && event.over) {
            const oldIndex = pages.findIndex(
                (page) => page.id === event.active.id,
            );
            const newIndex = pages.findIndex(
                (page) => page.id === event.over?.id,
            );

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                movePage(oldIndex, newIndex);
                setCurrentPage((current) => {
                    if (current === oldIndex) {
                        return newIndex;
                    }
                    if (oldIndex < current && current <= newIndex) {
                        return current - 1;
                    }
                    if (newIndex <= current && current < oldIndex) {
                        return current + 1;
                    }
                    return current;
                });
                setNeedsSaving(true);
            }
            return;
        }

        if (!event.over) {
            if (dragSourceSlot) {
                deleteSelectedSlot();
            }
            setActivePhotocard(null);
            setActivePhotocardRotation(0);
            setActivePhotocardShowFront(true);
            setDragSourceSlot(null);
            return;
        }

        const slotWidth = event.over.data.current!.width * scale;
        const width = activeCardSize!.width * scale;
        const height = activeCardSize!.height * scale;
        const sourceCards = dragSourceSlot
            ? getSlotCards(dragSourceSlot.pageNum, dragSourceSlot.slotId)
            : null;
        const source = getVisibleSlotCard(sourceCards ?? undefined, false);
        const sourceSnap = source?.snap ?? snapToGrid;
        const sourceRotation = source?.rotation ?? 0;

        const { x, y } = calculatePhotocardPosition(
            sourceSnap,
            slotWidth,
            0, // slotHeight not needed for x calculation currently, but good to have in sig if y needed later
            width,
            height,
            sourceRotation, // Rotation is 0 on drop
        );

        const overSlotId = String(event.over.data.current!.slotId);
        const overPageNum = Number(event.over.data.current!.pageNum);
        const overSlotWidth = Number(event.over.data.current!.width);
        const overSlotHeight = Number(event.over.data.current!.height);
        const existingCards = getSlotCards(overPageNum, overSlotId) ?? [];
        let nextCards = sortSlotCards(existingCards);

        if (dragSourceSlot) {
            const sourceCardZ = Number(event.active.data.current?.sourceCardZ);
            const removal = removeSlotCardByZ(sourceCards ?? [], sourceCardZ);
            if (
                dragSourceSlot.slotId === overSlotId &&
                dragSourceSlot.pageNum === overPageNum
            ) {
                nextCards = removal.cards;
            } else {
                if (removal.cards.length === 0) {
                    unregisterSlot(
                        dragSourceSlot.pageNum,
                        dragSourceSlot.slotId,
                    );
                } else {
                    setSlotCards(
                        dragSourceSlot.pageNum,
                        dragSourceSlot.slotId,
                        removal.cards,
                    );
                }
            }
        }

        const highestZ = nextCards.reduce(
            (maxZ, card) => Math.max(maxZ, card.z),
            -1,
        );

        setSlotCards(overPageNum, overSlotId, [
            ...nextCards,
            {
                photocard: activePhotocard!,
                snap: sourceSnap,
                showFront: source?.showFront ?? true,
                rotation: sourceRotation,
                width,
                height,
                x,
                y,
                z: highestZ + 1,
            },
        ]);
        setSelectedSlot({
            id: overSlotId,
            width: overSlotWidth,
            height: overSlotHeight,
        });

        setNeedsSaving(true);
        setActivePhotocard(null);
        setActivePhotocardRotation(0);
        setActivePhotocardShowFront(true);
        setDragSourceSlot(null);
    }

    function onPreview() { }

    function onShare() { }

    async function onSubmit(data: z.infer<typeof formSchema>) {
        console.log("Submitting:", data);
    }

    function addPage() {
        insertPage(currentPage + 1, {
            pageType: pageType,
            slots: {},
        });
        setNeedsSaving(true);
        if (currentPage < pages.length) {
            setPage(currentPage + 1);
        } else {
            setPage(currentPage);
        }
    }

    function setPage(page: number) {
        console.log("Setting page to", page);
        setCurrentPage(page);
        setSelectedSlot(null);
        setActivePhotocard(null);
    }

    function onSelectSlot(id: string, width: number, height: number) {
        setSelectedSlot({ id, width, height });
        const slotCards = getSlotCards(currentPage, id);
        const slotData = getVisibleSlotCard(slotCards, false);
        if (slotData) {
            setSnapToGrid(slotData.snap);
        }
    }

    function alignSelectedSlot(snapToGrid: SnapToGrid) {
        if (selectedSlot) {
            const slotCards = getSlotCards(currentPage, selectedSlot.id);
            const slotData = getVisibleSlotCard(slotCards, false);
            if (slotData) {
                const slotWidth = selectedSlot.width * scale;
                const slotHeight = selectedSlot.height * scale;
                const { x, y } = calculatePhotocardPosition(
                    snapToGrid,
                    slotWidth,
                    slotHeight,
                    slotData.width,
                    slotData.height,
                    slotData.rotation,
                );
                setSlotCards(
                    currentPage,
                    selectedSlot.id,
                    updateSlotCardByZ(slotCards, slotData.z, (card) => ({
                        ...card,
                        snap: snapToGrid,
                        x,
                        y,
                    })),
                );
                setNeedsSaving(true);
            }
        }
        setSnapToGrid(snapToGrid);
    }

    function flipSelectedSlot() {
        if (selectedSlot) {
            const slotCards = getSlotCards(currentPage, selectedSlot.id);
            const slotData = getVisibleSlotCard(slotCards, false);
            if (slotData) {
                setSlotCards(
                    currentPage,
                    selectedSlot.id,
                    updateSlotCardByZ(slotCards, slotData.z, (card) => ({
                        ...card,
                        showFront: !card.showFront,
                    })),
                );
                setNeedsSaving(true);
            }
        }
    }

    function rotateSelectedSlot() {
        if (selectedSlot) {
            const slotCards = getSlotCards(currentPage, selectedSlot.id);
            const slotData = getVisibleSlotCard(slotCards, false);
            if (slotData) {
                // Rotate 90 degrees counter-clockwise
                setSlotCards(
                    currentPage,
                    selectedSlot.id,
                    updateSlotCardByZ(slotCards, slotData.z, (card) => ({
                        ...card,
                        rotation: (card.rotation - 90) % 360,
                    })),
                );
                // Immediately realign according to existing snap
                alignSelectedSlot(slotData.snap);
                setNeedsSaving(true);
            }
        }
    }

    function changeSelectedSlotZ(position: "top" | "bottom") {
        if (!selectedSlot) {
            return;
        }
        const slotCards = getSlotCards(currentPage, selectedSlot.id);
        const slotData = getVisibleSlotCard(slotCards, false);
        if (!slotData) {
            return;
        }
        const sorted = sortSlotCards(slotCards);
        const highestZ = sorted.reduce(
            (maxZ, card) => Math.max(maxZ, card.z),
            slotData.z,
        );
        const lowestZ = sorted.reduce(
            (minZ, card) => Math.min(minZ, card.z),
            slotData.z,
        );
        const nextZ = position === "top" ? highestZ + 1 : lowestZ - 1;
        setSlotCards(
            currentPage,
            selectedSlot.id,
            updateSlotCardByZ(slotCards, slotData.z, (card) => ({
                ...card,
                z: nextZ,
            })),
        );
        setNeedsSaving(true);
    }

    function deleteSelectedSlot() {
        if (selectedSlot) {
            const slotCards = getSlotCards(currentPage, selectedSlot.id);
            const slotData = getVisibleSlotCard(slotCards, false);
            if (slotData) {
                const updatedCards = removeSlotCardByZ(
                    slotCards,
                    slotData.z,
                ).cards;
                if (updatedCards.length === 0) {
                    unregisterSlot(currentPage, selectedSlot.id);
                    setSelectedSlot(null);
                } else {
                    setSlotCards(currentPage, selectedSlot.id, updatedCards);
                }
                setNeedsSaving(true);
            }
        }
    }

    function deleteCurrentPage() {
        removePage(currentPage);
        setSelectedSlot(null);
    }

    function PagePreviewComponent() {
        return (
            <div className="relative w-screen px-6">
                <div className="mx-auto w-full rounded-xl bg-main p-4">
                    <div className="overflow-x-auto">
                        <SortableContext
                            items={pages.map((page) => page.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            <div className="flex w-max flex-row gap-4">
                                {pages.map((page, index) => (
                                    <SortablePagePreview
                                        key={page.id}
                                        id={page.id}
                                        index={index}
                                        currentPage={currentPage}
                                        onSelect={setPage}
                                    >
                                        <div className="flex flex-row">
                                            <BinderPageComponent
                                                binderType={binderType}
                                                index={index}
                                                pageFieldId={page.id}
                                                flipped={false}
                                                onSelectSlot={() => { }}
                                                disabled={true}
                                                fixedHeight="10vh"
                                                mainScale={scale}
                                            />
                                            <BinderPageComponent
                                                binderType={binderType}
                                                index={index}
                                                pageFieldId={page.id}
                                                flipped={true}
                                                onSelectSlot={() => { }}
                                                disabled={true}
                                                fixedHeight="10vh"
                                                mainScale={scale}
                                            />
                                        </div>
                                        <span className="mt-1 block text-center text-xs font-semibold">
                                            Page {index + 1}
                                        </span>
                                    </SortablePagePreview>
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            collisionDetection={closestCenter}
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="flex flex-col gap-4 m-6 items-center">
                <h1>Work in Progress!</h1>
                <FormProvider {...form}>
                    <form
                        className="w-full flex flex-col gap-4"
                        onSubmit={form.handleSubmit(onSubmit, (error) =>
                            console.error(error),
                        )}
                    >
                        <Controller
                            name="name"
                            control={form.control}
                            render={({ field }) => (
                                <Field orientation="horizontal">
                                    <Input
                                        {...field}
                                        type="text"
                                        placeholder="Binder Name"
                                    />
                                    <p className="whitespace-nowrap px-4">
                                        {needsSaving
                                            ? "Changes not saved"
                                            : "All changes saved"}
                                    </p>
                                    <Button
                                        size="icon"
                                        type="submit"
                                        className="px-3"
                                        disabled={!needsSaving}
                                    >
                                        <SaveIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={onPreview}
                                        disabled={needsSaving}
                                    >
                                        <EyeIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={onShare}
                                        disabled={needsSaving}
                                    >
                                        <Share2Icon />
                                    </Button>
                                </Field>
                            )}
                        />
                        <div className="flex flex-row w-full gap-4 items-stretch min-h-0">
                            <div className="w-[85%] flex flex-col gap-4 items-center">
                                <div className="flex flex-row gap-2 p-4 bg-main rounded-xl">
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className="px-3"
                                        onClick={flipSelectedSlot}
                                        disabled={selectedSlot === null}
                                        tooltip="Flip card"
                                    >
                                        <FlipHorizontalIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className="px-3"
                                        onClick={rotateSelectedSlot}
                                        disabled={selectedSlot === null}
                                        tooltip="Rotate card 90° CCW"
                                    >
                                        <RotateCcwIcon />
                                    </Button>
                                    <Separator
                                        orientation="vertical"
                                        className="w-0.5! mx-3"
                                    />
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className="px-3"
                                        onClick={() =>
                                            changeSelectedSlotZ("top")
                                        }
                                        disabled={selectedSlot === null}
                                        tooltip="Move to top"
                                    >
                                        <ArrowUpToLineIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className="px-3"
                                        onClick={() =>
                                            changeSelectedSlotZ("bottom")
                                        }
                                        disabled={selectedSlot === null}
                                        tooltip="Move to bottom"
                                    >
                                        <ArrowDownToLineIcon />
                                    </Button>
                                    <Separator
                                        orientation="vertical"
                                        className="w-0.5! mx-3"
                                    />
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.BottomLeft ? "bg-white!" : ""}`}
                                        onClick={() =>
                                            alignSelectedSlot(
                                                SnapToGrid.BottomLeft,
                                            )
                                        }
                                        disabled={selectedSlot === null}
                                        tooltip="Align to bottom left"
                                    >
                                        <AlignStartVerticalIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.Center ? "!bg-white" : ""}`}
                                        onClick={() =>
                                            alignSelectedSlot(SnapToGrid.Center)
                                        }
                                        disabled={selectedSlot === null}
                                        tooltip="Align to center"
                                    >
                                        <AlignCenterVerticalIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.BottomRight ? "!bg-white" : ""}`}
                                        onClick={() =>
                                            alignSelectedSlot(
                                                SnapToGrid.BottomRight,
                                            )
                                        }
                                        disabled={selectedSlot === null}
                                        tooltip="Align to bottom right"
                                    >
                                        <AlignEndVerticalIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.Manual ? "!bg-white" : ""}`}
                                        onClick={() =>
                                            alignSelectedSlot(SnapToGrid.Manual)
                                        }
                                        disabled={selectedSlot === null}
                                        tooltip="Manually position"
                                    >
                                        <PointerIcon />
                                    </Button>
                                    <Separator
                                        orientation="vertical"
                                        className="w-0.5! mx-3"
                                    />
                                    <Button
                                        size="icon"
                                        type="button"
                                        variant="noShadow"
                                        className="px-3"
                                        onClick={() => deleteSelectedSlot()}
                                        disabled={selectedSlot === null}
                                        tooltip="Delete card from slot"
                                    >
                                        <Trash2Icon />
                                    </Button>
                                </div>
                                <div className="w-full">
                                    <Controller
                                        name="binderType"
                                        control={form.control}
                                        render={({ field }) => (
                                            <BinderCoverComponent
                                                binderType={field.value}
                                                binderRef={binderRef}
                                                leftPage={
                                                    <BinderPageComponent
                                                        binderType={field.value}
                                                        index={currentPage - 1}
                                                        pageFieldId={
                                                            pages[
                                                                currentPage - 1
                                                            ]?.id ?? "left-page"
                                                        }
                                                        flipped={true}
                                                        photocardRenderAnchorIndex={
                                                            currentPage
                                                        }
                                                        stackPages={pages
                                                            .slice(
                                                                0,
                                                                Math.max(
                                                                    0,
                                                                    currentPage -
                                                                    1,
                                                                ),
                                                            )
                                                            .map(
                                                                (
                                                                    page,
                                                                    index,
                                                                ) => ({
                                                                    index,
                                                                    pageFieldId:
                                                                        page.id,
                                                                }),
                                                            )}
                                                        onSelectSlot={
                                                            onSelectSlot
                                                        }
                                                        selectedSlotId={
                                                            selectedSlot?.id
                                                        }
                                                        mainScale={scale}
                                                    />
                                                }
                                                rightPage={
                                                    <BinderPageComponent
                                                        binderType={field.value}
                                                        index={currentPage}
                                                        pageFieldId={
                                                            pages[currentPage]
                                                                ?.id ??
                                                            "right-page"
                                                        }
                                                        flipped={false}
                                                        photocardRenderAnchorIndex={
                                                            currentPage
                                                        }
                                                        stackPages={[
                                                            ...pages
                                                                .slice(
                                                                    currentPage +
                                                                    1,
                                                                )
                                                                .map(
                                                                    (
                                                                        page,
                                                                        index,
                                                                    ) => ({
                                                                        index:
                                                                            currentPage +
                                                                            1 +
                                                                            index,
                                                                        pageFieldId:
                                                                            page.id,
                                                                    }),
                                                                ),
                                                        ].reverse()}
                                                        onSelectSlot={
                                                            onSelectSlot
                                                        }
                                                        selectedSlotId={
                                                            selectedSlot?.id
                                                        }
                                                        mainScale={scale}
                                                    />
                                                }
                                            />
                                        )}
                                    />
                                </div>
                                <div className="flex flex-row gap-4">
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={() => setPage(0)}
                                        disabled={currentPage === 0}
                                        tooltip="Go to first page"
                                    >
                                        <ChevronsLeftIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={() => setPage(currentPage - 1)}
                                        disabled={currentPage === 0}
                                        tooltip="Go to previous page"
                                    >
                                        <ChevronLeftIcon />
                                    </Button>
                                    <p className="self-center mx-4">
                                        Page {currentPage + 1}
                                    </p>
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={() => setPage(currentPage + 1)}
                                        disabled={currentPage === pages.length}
                                        tooltip="Go to next page"
                                    >
                                        <ChevronRightIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={() => setPage(pages.length)}
                                        disabled={currentPage === pages.length}
                                        tooltip="Go to last page"
                                    >
                                        <ChevronsRightIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        onClick={addPage}
                                        tooltip="Add a page"
                                    >
                                        <FilePlusIcon />
                                    </Button>
                                    <Button
                                        size="icon"
                                        type="button"
                                        className="px-3"
                                        onClick={deleteCurrentPage}
                                        disabled={
                                            pages.length === 1 ||
                                            currentPage >= pages.length
                                        }
                                        tooltip="Delete current page"
                                    >
                                        <Trash2Icon />
                                    </Button>
                                </div>
                            </div>
                            <div className="relative w-[15%]">
                                <div className="absolute inset-0 overflow-hidden">
                                    <SearchComponent
                                        collections={collections}
                                        cardTypes={cardTypes}
                                        cardSizes={cardSizes}
                                        ownedPhotocards={ownedPhotocards}
                                        wishlistedPhotocards={
                                            wishlistedPhotocards
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                    <PagePreviewComponent />
                </FormProvider>
            </div>
            <DragOverlay dropAnimation={null}>
                {activePhotocard && activeCardSize ? (
                    <PhotocardWithSize
                        photocard={activePhotocard}
                        showFront={activePhotocardShowFront}
                        width={activeCardSize.width * scale}
                        height={activeCardSize.height * scale}
                        style={{
                            transform: `rotate(${activePhotocardRotation}deg)`,
                        }}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
