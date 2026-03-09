"use client";

import { saveBinder } from "@/actions";
import { cardSizeToString } from "@/actions-client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    BINDER_MAX_RENDERING_PAGE_DEPTH,
    BINDER_PERFORATION_DOT_SIZE,
    BINDER_STACKED_PAGE_X_OFFSET,
    BinderPageDimensions,
    BinderPageDimensionsById,
    BinderType,
    collectionDisplayName,
    MemberToIntWithOT7,
} from "@/constants";
import {
    BinderPages,
    CardSizes,
    CardTypes,
    Collections,
    Photocards,
    UserBinders,
} from "@/db";
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
    EditIcon,
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

import PhotocardGrid from "../../photocard-grid";
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
import { PhotocardWithSize } from "../../photocard";
import { Separator } from "@/components/ui/separator";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const DEFAULT_BINDER_PAGE_DIMENSIONS = BinderPageDimensions.Standard9PP;

const stackedSlotSchema = z.object({
    photocard: z.custom<Selectable<Photocards>>(),
    snap: z.custom<SnapToGrid>(),
    showFront: z.boolean(),
    rotation: z.number(),
    width: z.number(),
    height: z.number(),
    x: z.number(),
    y: z.number(),
    z: z.number(),
});

const formSchema = z.object({
    binderType: z.custom<BinderType>(),
    name: z.string(),
    description: z.string().optional(),
    pages: z.array(
        z.object({
            pageKey: z.number().int().nonnegative(),
            pageType: z.custom<BinderPageDimensions>(),
            description: z.string().optional(),
            slots: z.record(z.string(), z.array(stackedSlotSchema)),
        }),
    ),
});

function sortStackedSlots(
    cards: z.infer<typeof stackedSlotSchema>[] = [],
): z.infer<typeof stackedSlotSchema>[] {
    return [...cards].sort((a, b) => a.z - b.z);
}

function getVisibleStackedSlotIndex(
    cards: z.infer<typeof stackedSlotSchema>[],
    flipped: boolean,
): number | undefined {
    if (cards.length === 0) {
        return undefined;
    }
    return flipped ? 0 : cards.length - 1;
}

function buildDefaultPages(
    binderPages: Selectable<BinderPages>[],
    savedPhotocards: Selectable<Photocards>[],
    cardSizes: Selectable<CardSizes>[],
): z.infer<typeof formSchema>["pages"] {
    if (binderPages.length === 0) {
        return [
            {
                pageKey: 0,
                pageType: DEFAULT_BINDER_PAGE_DIMENSIONS,
                description: "",
                slots: {},
            },
        ];
    }

    const photocardsById = new Map<number, Selectable<Photocards>>();
    for (const photocard of savedPhotocards) {
        photocardsById.set(photocard.id, photocard);
    }

    const cardSizesById = new Map<number, Selectable<CardSizes>>();
    for (const cardSize of cardSizes) {
        cardSizesById.set(cardSize.id, cardSize);
    }

    return binderPages.map((page) => {
        const pageType = BinderPageDimensionsById[page.page_type];
        const stackedSlotGroups = new Map<
            string,
            z.infer<typeof stackedSlotSchema>[]
        >();

        for (let index = 0; index < page.photocard_ids.length; index++) {
            const photocard = photocardsById.get(page.photocard_ids[index]);
            if (!photocard) {
                continue;
            }

            const cardSize = cardSizesById.get(photocard.size_id);
            if (!cardSize) {
                continue;
            }

            const z = page.photocard_z_indices[index];
            const slotId = page.photocard_slot_ids[index];
            let stackedSlots = stackedSlotGroups.get(slotId);
            if (!stackedSlots) {
                stackedSlots = [];
                stackedSlotGroups.set(slotId, stackedSlots);
            }
            stackedSlots.push({
                photocard,
                snap: page.photocard_snaps[index] as SnapToGrid,
                showFront: page.photocard_show_front[index],
                rotation: page.photocard_rotations[index],
                width: cardSize.width,
                height: cardSize.height,
                x: page.photocard_x_positions[index],
                y: page.photocard_y_positions[index],
                z,
            });
        }

        return {
            pageKey: page.page_key,
            pageType,
            description: page.description ?? "",
            slots: Object.fromEntries(stackedSlotGroups),
        };
    });
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
    pageKey,
    flipped,
    stackPages = [],
    photocardRenderAnchorIndex = index,
    onSelectSlot,
    selectedSlotId,
    disabled = false,
    previewMode = false,
    onOpenPhotocard,
    fixedHeight,
    mainScale = 1,
}: {
    binderType: BinderType;
    index: number;
    pageKey: number;
    flipped: boolean;
    stackPages?: Array<{ index: number; pageKey: number }>;
    photocardRenderAnchorIndex?: number;
    onSelectSlot: (id: string, width: number, height: number) => void;
    selectedSlotId?: string;
    disabled?: boolean;
    previewMode?: boolean;
    onOpenPhotocard: (photocardId: number) => void;
    fixedHeight?: string;
    mainScale?: number;
}) {
    const layers = [
        ...stackPages.map((stackPage, stackIndex) => ({
            key: stackPage.pageKey,
            index: stackPage.index,
            pageKey: stackPage.pageKey,
            disabled: true,
            offsetX:
                (stackPages.length - stackIndex) *
                (flipped
                    ? -BINDER_STACKED_PAGE_X_OFFSET
                    : BINDER_STACKED_PAGE_X_OFFSET),
            offsetY: 0,
            pointerEvents: "none" as const,
        })),
        {
            key: pageKey,
            index,
            pageKey,
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
                        pageKey={layer.pageKey}
                        flipped={flipped}
                        renderPhotocards={
                            Math.abs(
                                layer.index - photocardRenderAnchorIndex,
                            ) <= BINDER_MAX_RENDERING_PAGE_DEPTH
                        }
                        onSelectSlot={onSelectSlot}
                        selectedSlotId={selectedSlotId}
                        disabled={layer.disabled}
                        previewMode={previewMode}
                        onOpenPhotocard={onOpenPhotocard}
                        fixedHeight={fixedHeight}
                        mainScale={mainScale}
                    />
                </div>
            ))}
            <div className="invisible">
                <BinderPageLayer
                    binderType={binderType}
                    index={index}
                    pageKey={pageKey}
                    flipped={flipped}
                    renderPhotocards={
                        Math.abs(index - photocardRenderAnchorIndex) <=
                        BINDER_MAX_RENDERING_PAGE_DEPTH
                    }
                    onSelectSlot={onSelectSlot}
                    selectedSlotId={selectedSlotId}
                    disabled={true}
                    previewMode={previewMode}
                    onOpenPhotocard={onOpenPhotocard}
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
    pageKey,
    flipped,
    renderPhotocards = true,
    onSelectSlot,
    selectedSlotId,
    disabled = false,
    previewMode = false,
    onOpenPhotocard,
    fixedHeight,
    mainScale = 1,
}: {
    binderType: BinderType;
    index: number;
    pageKey: number;
    flipped: boolean;
    renderPhotocards?: boolean;
    onSelectSlot: (id: string, width: number, height: number) => void;
    selectedSlotId?: string;
    disabled?: boolean;
    previewMode?: boolean;
    onOpenPhotocard: (photocardId: number) => void;
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
                const key = `${page.pageKey}-${rIndex}-${cIndex}`;
                const slotProps = {
                    id: key,
                    pageNum: index,
                    pageKey,
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
                    previewMode,
                    renderPhotocards,
                    valueScale: previewScale,
                    onOpenPhotocard,
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
    pageKey,
    onSelectSlot,
    isSelected,
    flipped,
    disabled,
    previewMode,
    renderPhotocards,
    valueScale,
    onOpenPhotocard,
}: {
    gradient: string;
    isLastCol: boolean;
    width: number;
    height: number;
    dotPctX: number;
    dotPctY: number;
    id: string;
    pageNum: number;
    pageKey: number;
    onSelectSlot: (id: string, width: number, height: number) => void;
    isSelected: boolean;
    flipped: boolean;
    disabled: boolean;
    previewMode: boolean;
    renderPhotocards: boolean;
    valueScale: number;
    onOpenPhotocard: (photocardId: number) => void;
}) {
    const { control } = useFormContext();
    const logicalWidth =
        width -
        (isLastCol
            ? BINDER_PERFORATION_DOT_SIZE * 2
            : BINDER_PERFORATION_DOT_SIZE) -
        1;
    const logicalHeight = height - BINDER_PERFORATION_DOT_SIZE - 1;

    const pageSlots =
        (useWatch({
            control,
            name: `pages.${pageNum}.slots`,
        }) as
            | Record<string, z.infer<typeof stackedSlotSchema>[]>
            | undefined) ?? {};
    const stackedSlots = pageSlots[id] ?? [];
    const visibleCardIndex = getVisibleStackedSlotIndex(stackedSlots, flipped);
    const visibleCard =
        visibleCardIndex === undefined
            ? undefined
            : stackedSlots[visibleCardIndex];
    const slotStyle = {
        backgroundImage: `${gradient}, ${gradient} ${isLastCol ? ", " + gradient : ""}`,
        backgroundPosition: `left bottom, left top ${isLastCol ? ", right top" : ""}`,
        backgroundSize: `${dotPctX}% ${dotPctY}%, ${dotPctX}% ${dotPctY}% ${isLastCol ? `, ${dotPctX}% ${dotPctY}%` : ""}`,
        backgroundRepeat: `repeat-x, repeat-y ${isLastCol ? ", repeat-y" : ""}`,
    };
    const cardShowFront = visibleCard?.showFront !== flipped;
    const cardScale = disabled ? valueScale : 1;
    const cardPositionStyle = visibleCard
        ? {
            position: "absolute" as const,
            bottom: `calc(${visibleCard.y * cardScale}px + ${dotPctY}%)`,
            left: `calc(${visibleCard.x * cardScale}px + ${dotPctX}%)`,
        }
        : undefined;
    const cardTransformStyle = visibleCard
        ? {
            transform: `rotate(${visibleCard.rotation}deg)`,
            transformOrigin: "center center" as const,
        }
        : undefined;
    const selectedCardStyle = isSelected
        ? {
            boxShadow: "0 0 0 3px var(--accent-light)",
            borderRadius: "0.5rem",
        }
        : undefined;
    const cardContent =
        renderPhotocards && visibleCard && valueScale > 0 ? (
            disabled ? (
                <div style={cardPositionStyle}>
                    <PhotocardWithSize
                        photocard={visibleCard.photocard}
                        showFront={cardShowFront}
                        width={visibleCard.width * valueScale}
                        height={visibleCard.height * valueScale}
                        className={flipped ? "flip-horizontal!" : ""}
                        style={{
                            ...cardTransformStyle,
                            ...selectedCardStyle,
                        }}
                    />
                </div>
            ) : (
                <PhotocardWithDragContent
                    photocard={visibleCard.photocard}
                    slotId={id}
                    pageNum={pageNum}
                    pageKey={pageKey}
                    showFront={cardShowFront}
                    width={visibleCard.width}
                    height={visibleCard.height}
                    slotWidth={logicalWidth}
                    slotHeight={logicalHeight}
                    z={visibleCard.z}
                    disabled={flipped || previewMode}
                    className={flipped ? "flip-horizontal!" : ""}
                    style={{
                        ...cardPositionStyle,
                        transform: cardTransformStyle?.transform,
                        boxShadow: selectedCardStyle?.boxShadow,
                        borderRadius: selectedCardStyle?.borderRadius,
                    }}
                />
            )
        ) : null;

    if (disabled) {
        return (
            <div className="relative" style={slotStyle}>
                {cardContent}
            </div>
        );
    }

    return (
        <InteractiveSlotContent
            slotId={id}
            pageNum={pageNum}
            pageKey={pageKey}
            logicalWidth={logicalWidth}
            logicalHeight={logicalHeight}
            flipped={flipped}
            stackedSlots={stackedSlots}
            onSelectSlot={onSelectSlot}
            slotStyle={slotStyle}
            previewMode={previewMode}
            visiblePhotocardId={visibleCard?.photocard.id}
            onOpenPhotocard={onOpenPhotocard}
        >
            {cardContent}
        </InteractiveSlotContent>
    );
}

function InteractiveSlotContent({
    slotId,
    pageNum,
    pageKey,
    logicalWidth,
    logicalHeight,
    flipped,
    stackedSlots,
    onSelectSlot,
    slotStyle,
    previewMode,
    visiblePhotocardId,
    onOpenPhotocard,
    children,
}: {
    slotId: string;
    pageNum: number;
    pageKey: number;
    logicalWidth: number;
    logicalHeight: number;
    flipped: boolean;
    stackedSlots: z.infer<typeof stackedSlotSchema>[];
    onSelectSlot: (id: string, width: number, height: number) => void;
    slotStyle: React.CSSProperties;
    previewMode: boolean;
    visiblePhotocardId?: number;
    onOpenPhotocard: (photocardId: number) => void;
    children?: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${pageKey}-${slotId}`,
        disabled: flipped || previewMode,
        data: {
            slotId,
            pageNum,
            pageKey,
            width: logicalWidth,
            height: logicalHeight,
        },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={() => {
                if (previewMode && visiblePhotocardId !== undefined) {
                    onOpenPhotocard(visiblePhotocardId);
                    return;
                }
                if (stackedSlots.length > 0 && !flipped) {
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
    pageKey,
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
    pageKey: number;
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
        id: `slot-card-${pageKey}-${slotId}`,
        disabled,
        data: {
            photocard,
            sourceSlotId: slotId,
            sourcePageNum: pageNum,
            sourcePageKey: pageKey,
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
    disabled = false,
}: {
    id: string;
    index: number;
    currentPage: number;
    onSelect: (index: number) => void;
    children: React.ReactNode;
    disabled?: boolean;
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
        disabled,
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
                transform: transform
                    ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX ?? 1}) scaleY(${transform.scaleY ?? 1})`
                    : undefined,
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

// NOTE: Do not change ordering, since this is stored in the database
enum SnapToGrid {
    BottomLeft,
    BottomRight,
    Center,
    Manual,
}

enum ZPosition {
    Top,
    Bottom,
}

export default function BinderClient({
    userBinder,
    binderPages,
    collections,
    cardTypes,
    cardSizes,
    ownedPhotocards,
    wishlistedPhotocards,
    savedPhotocards,
    isOwner,
}: {
    userBinder: Selectable<UserBinders>;
    binderPages: Selectable<BinderPages>[];
    collections: Selectable<Collections>[];
    cardTypes: Selectable<CardTypes>[];
    cardSizes: Selectable<CardSizes>[];
    ownedPhotocards: Selectable<Photocards>[];
    wishlistedPhotocards: Selectable<Photocards>[];
    savedPhotocards: Selectable<Photocards>[];
    isOwner: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPreview, setIsPreview] = useState(false);
    const previewMode = !isOwner || isPreview;
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
    const defaultPages = buildDefaultPages(
        binderPages,
        savedPhotocards,
        cardSizes,
    );
    const nextPageKeyRef = useRef(
        Math.max(...defaultPages.map((page) => page.pageKey), -1) + 1,
    );
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            binderType: BinderType.OneInch,
            name: userBinder.name,
            description: userBinder.description ?? "",
            pages: defaultPages,
        },
    });

    // Pages
    const [pageType, setPageType] = useState<BinderPageDimensions>(
        defaultPages[0]?.pageType ?? DEFAULT_BINDER_PAGE_DIMENSIONS,
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
    const currentPageData = pages[currentPage];

    // Resize Observer State
    const [binderWidth, setBinderWidth] = useState(0);
    const binderRef = useRef<HTMLDivElement>(null);
    const previousScaleRef = useRef<number | null>(null);
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

    // Normalize card dimensions on first render, then rescale cards if the binder width changes.
    useEffect(() => {
        if (scale <= 0) {
            return;
        }

        const pages = form.getValues("pages");
        const previousScale = previousScaleRef.current;
        const scaleRatio =
            previousScale && previousScale > 0 ? scale / previousScale : null;

        for (let pageNum = 0; pageNum < pages.length; pageNum++) {
            const page = pages[pageNum];
            for (const [slotId, stackedSlots] of Object.entries(page.slots)) {
                const next = stackedSlots.map((card) => {
                    const cardSize = cardSizes.find(
                        (size) => size.id === card.photocard.size_id,
                    );
                    if (!cardSize) {
                        return card;
                    }
                    if (scaleRatio !== null) {
                        return {
                            ...card,
                            width: card.width * scaleRatio,
                            height: card.height * scaleRatio,
                            x: card.x * scaleRatio,
                            y: card.y * scaleRatio,
                        };
                    }
                    return {
                        ...card,
                        width: cardSize.width * scale,
                        height: cardSize.height * scale,
                    };
                });
                form.setValue(
                    `pages.${pageNum}.slots.${slotId}`,
                    sortStackedSlots(next),
                );
            }
        }

        previousScaleRef.current = scale;
    }, [cardSizes, form, scale]);

    useEffect(() => {
        if (previewMode) {
            return;
        }
        function confirmLeave() {
            return window.confirm(
                "You have unsaved binder changes. Leave without saving?",
            );
        }

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (!needsSaving) {
                return;
            }
            event.preventDefault();
            event.returnValue = "";
        }

        function handleDocumentClick(event: MouseEvent) {
            if (!needsSaving) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const link = target.closest("a[href]");
            if (!(link instanceof HTMLAnchorElement)) {
                return;
            }

            if (
                link.target === "_blank" ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const href = link.href;
            if (!href || href === window.location.href) {
                return;
            }

            if (!confirmLeave()) {
                event.preventDefault();
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("click", handleDocumentClick, true);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("click", handleDocumentClick, true);
        };
    }, [needsSaving, previewMode]);

    function openPhotocard(photocardId: number) {
        window.open(
            `/photocard/${photocardId}`,
            "_blank",
            "noopener,noreferrer",
        );
    }

    function getStackedSlots(pageNum: number, slotId: string) {
        const slots =
            (form.getValues(`pages.${pageNum}.slots`) as Record<
                string,
                z.infer<typeof stackedSlotSchema>[]
            >) ?? {};
        return slots[slotId] ?? [];
    }

    function setStackedSlots(
        pageNum: number,
        slotId: string,
        cards: z.infer<typeof stackedSlotSchema>[],
    ) {
        form.setValue(
            `pages.${pageNum}.slots.${slotId}`,
            sortStackedSlots(cards),
        );
    }

    function unregisterSlot(pageNum: number, slotId: string) {
        const slots =
            (form.getValues(`pages.${pageNum}.slots`) as Record<
                string,
                z.infer<typeof stackedSlotSchema>[]
            >) ?? {};
        const nextSlots = { ...slots };
        delete nextSlots[slotId];
        form.setValue(`pages.${pageNum}.slots`, nextSlots);
    }

    function onDragStart(event: DragStartEvent) {
        if (previewMode) {
            return;
        }
        const data = event.active.data.current;
        // Reordering pages
        if (data?.type === "page-preview") {
            return;
        }
        // Dragging a photocard from search/slot
        if (data?.photocard) {
            setActivePhotocard(data.photocard);
        }
        // Dragging a photocard from a slot
        if (data?.sourceSlotId !== undefined) {
            const sourceStackedSlots = getStackedSlots(
                data.sourcePageNum,
                data.sourceSlotId,
            );
            const sourceCardIndex = getVisibleStackedSlotIndex(
                sourceStackedSlots,
                false,
            );
            const sourceCard =
                sourceCardIndex === undefined
                    ? undefined
                    : sourceStackedSlots[sourceCardIndex];
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
            // Dragging a photocard from search
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
        if (previewMode) {
            return;
        }
        const activeData = event.active.data.current;
        // Reordering pages
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

        // Dragging a photocard. If it's not over a slot, delete it
        if (!event.over) {
            if (dragSourceSlot) {
                deleteSelectedSlot();
            }
            setActivePhotocard(null);
            setActivePhotocardRotation(0);
            setActivePhotocardShowFront(true);
            setDragSourceSlot(null);
            setNeedsSaving(true);
            return;
        }

        const slotWidth = Number(event.over.data.current!.width) * scale;
        const width = activeCardSize!.width * scale;
        const height = activeCardSize!.height * scale;
        const sourceCards = dragSourceSlot
            ? getStackedSlots(dragSourceSlot.pageNum, dragSourceSlot.slotId)
            : [];
        const sourceIndex = getVisibleStackedSlotIndex(sourceCards, false);
        const source =
            sourceIndex === undefined ? undefined : sourceCards[sourceIndex];
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
        const existingCards = getStackedSlots(overPageNum, overSlotId);
        let nextCards = sortStackedSlots(existingCards);

        if (dragSourceSlot) {
            // Dragging back into itself, do nothing
            if (
                dragSourceSlot.slotId === overSlotId &&
                dragSourceSlot.pageNum === overPageNum
            ) {
                return;
            }

            const sourceCardIndex = getVisibleStackedSlotIndex(
                sourceCards,
                false,
            );
            const removalCards = [...sourceCards];
            if (sourceCardIndex !== undefined) {
                removalCards.splice(sourceCardIndex, 1);
            }

            // Delete card from original slot
            if (removalCards.length === 0) {
                unregisterSlot(dragSourceSlot.pageNum, dragSourceSlot.slotId);
            } else {
                setStackedSlots(
                    dragSourceSlot.pageNum,
                    dragSourceSlot.slotId,
                    removalCards,
                );
            }
        }

        // Set new slot
        const highestZ = nextCards.reduce(
            (maxZ, card) => Math.max(maxZ, card.z),
            -1,
        );

        setStackedSlots(overPageNum, overSlotId, [
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

    function onPreview() {
        setIsPreview(true);
        setSelectedSlot(null);
    }

    function onShare() {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Binder URL copied to clipboard");
    }

    function onEdit() {
        setIsPreview(false);
    }

    async function onSubmit(data: z.infer<typeof formSchema>) {
        const pageRows = data.pages.map((page) => {
            const stackedSlots = Object.entries(page.slots).flatMap(
                ([slotId, stackedSlots]) =>
                    stackedSlots.map((card) => ({
                        slotId,
                        card,
                    })),
            );

            return {
                page_key: page.pageKey,
                page_type: page.pageType.id,
                description: page.description ?? null,
                creation_ids: [],
                creation_rotations: [],
                creation_show_front: [],
                creation_x_positions: [],
                creation_y_positions: [],
                creation_z_indices: [],
                photocard_ids: stackedSlots.map(
                    ({ card }) => card.photocard.id!,
                ),
                photocard_rotations: stackedSlots.map(
                    ({ card }) => card.rotation,
                ),
                photocard_slot_ids: stackedSlots.map(({ slotId }) => slotId),
                photocard_snaps: stackedSlots.map(({ card }) => card.snap),
                photocard_show_front: stackedSlots.map(
                    ({ card }) => card.showFront,
                ),
                photocard_x_positions: stackedSlots.map(({ card }) => card.x),
                photocard_y_positions: stackedSlots.map(({ card }) => card.y),
                photocard_z_indices: stackedSlots.map(({ card }) => card.z),
            };
        });

        toast.promise(
            async () => {
                const result = await saveBinder(
                    {
                        id: userBinder.id,
                        name: data.name,
                        description: data.description ?? null,
                        updated_at: new Date(),
                    },
                    pageRows.map((page) => ({
                        id: undefined as never,
                        binder_id: userBinder.id,
                        ...page,
                    })),
                );

                if (result.error) {
                    throw new Error(result.error);
                }

                setNeedsSaving(false);
            },
            {
                loading: "Saving binder...",
                success: "Binder saved",
                error: (error) => error.message,
            },
        );
    }

    const handleSaveSubmit = form.handleSubmit(onSubmit, (error) =>
        console.error(error),
    );

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (previewMode || !isOwner || !needsSaving) {
                return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                void handleSaveSubmit();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSaveSubmit, isOwner, needsSaving, previewMode]);

    function addPage() {
        insertPage(currentPage + 1, {
            pageKey: nextPageKeyRef.current++,
            pageType: pageType,
            description: "",
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
        setCurrentPage(page);
        setSelectedSlot(null);
        setActivePhotocard(null);
    }

    function onSelectSlot(id: string, width: number, height: number) {
        setSelectedSlot({ id, width, height });
        const stackedSlots = getStackedSlots(currentPage, id);
        const visibleIndex = getVisibleStackedSlotIndex(stackedSlots, false);
        if (visibleIndex !== undefined) {
            const slotData = stackedSlots[visibleIndex];
            setSnapToGrid(slotData.snap);
        }
    }

    function alignSelectedSlot(snapToGrid: SnapToGrid) {
        if (selectedSlot) {
            const stackedSlots = getStackedSlots(currentPage, selectedSlot.id);
            const visibleIndex = getVisibleStackedSlotIndex(
                stackedSlots,
                false,
            );
            if (visibleIndex !== undefined) {
                const slotData = stackedSlots[visibleIndex];
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
                const next = [...stackedSlots];
                next[visibleIndex] = {
                    ...slotData,
                    snap: snapToGrid,
                    x,
                    y,
                };
                setStackedSlots(currentPage, selectedSlot.id, next);
                setNeedsSaving(true);
            }
        }
        setSnapToGrid(snapToGrid);
    }

    function flipSelectedSlot() {
        if (selectedSlot) {
            const stackedSlots = getStackedSlots(currentPage, selectedSlot.id);
            const visibleIndex = getVisibleStackedSlotIndex(
                stackedSlots,
                false,
            );
            if (visibleIndex !== undefined) {
                const slotData = stackedSlots[visibleIndex];
                const next = [...stackedSlots];
                next[visibleIndex] = {
                    ...slotData,
                    showFront: !slotData.showFront,
                };
                setStackedSlots(currentPage, selectedSlot.id, next);
                setNeedsSaving(true);
            }
        }
    }

    function rotateSelectedSlot() {
        if (selectedSlot) {
            const stackedSlots = getStackedSlots(currentPage, selectedSlot.id);
            const visibleIndex = getVisibleStackedSlotIndex(
                stackedSlots,
                false,
            );
            if (visibleIndex !== undefined) {
                const slotData = stackedSlots[visibleIndex];
                // Rotate 90 degrees counter-clockwise
                const next = [...stackedSlots];
                next[visibleIndex] = {
                    ...slotData,
                    rotation: (slotData.rotation - 90) % 360,
                };
                setStackedSlots(currentPage, selectedSlot.id, next);
                // Immediately realign according to existing snap
                alignSelectedSlot(slotData.snap);
                setNeedsSaving(true);
            }
        }
    }

    function changeSelectedSlotZ(position: ZPosition) {
        if (!selectedSlot) {
            return;
        }
        const stackedSlots = getStackedSlots(currentPage, selectedSlot.id);
        const visibleIndex = getVisibleStackedSlotIndex(stackedSlots, false);
        if (visibleIndex === undefined) {
            return;
        }
        const slotData = stackedSlots[visibleIndex];
        if (stackedSlots.length <= 1) {
            return;
        }
        const sorted = sortStackedSlots(stackedSlots);
        const highestZ = sorted.reduce(
            (maxZ, card) => Math.max(maxZ, card.z),
            slotData.z,
        );
        const lowestZ = sorted.reduce(
            (minZ, card) => Math.min(minZ, card.z),
            slotData.z,
        );
        const nextZ = position === ZPosition.Top ? highestZ + 1 : lowestZ - 1;
        const next = [...stackedSlots];
        next[visibleIndex] = {
            ...slotData,
            z: nextZ,
        };
        setStackedSlots(currentPage, selectedSlot.id, next);
        setNeedsSaving(true);
    }

    function deleteSelectedSlot() {
        if (selectedSlot) {
            const stackedSlots = getStackedSlots(currentPage, selectedSlot.id);
            const visibleIndex = getVisibleStackedSlotIndex(
                stackedSlots,
                false,
            );
            if (visibleIndex !== undefined) {
                const updatedCards = [...stackedSlots];
                updatedCards.splice(visibleIndex, 1);
                if (updatedCards.length === 0) {
                    unregisterSlot(currentPage, selectedSlot.id);
                    setSelectedSlot(null);
                } else {
                    setStackedSlots(currentPage, selectedSlot.id, updatedCards);
                }
                setNeedsSaving(true);
            }
        }
    }

    function deleteCurrentPage() {
        removePage(currentPage);
        setSelectedSlot(null);
        setNeedsSaving(true);
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
                                        disabled={previewMode}
                                    >
                                        <div className="flex flex-row">
                                            <BinderPageComponent
                                                binderType={binderType}
                                                index={index}
                                                pageKey={page.pageKey}
                                                flipped={false}
                                                onSelectSlot={() => { }}
                                                disabled={true}
                                                previewMode={previewMode}
                                                onOpenPhotocard={openPhotocard}
                                                fixedHeight="10vh"
                                                mainScale={scale}
                                            />
                                            <BinderPageComponent
                                                binderType={binderType}
                                                index={index}
                                                pageKey={page.pageKey}
                                                flipped={true}
                                                onSelectSlot={() => { }}
                                                disabled={true}
                                                previewMode={previewMode}
                                                onOpenPhotocard={openPhotocard}
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
                <FormProvider {...form}>
                    <form
                        className="w-full flex flex-col gap-4"
                        onSubmit={handleSaveSubmit}
                    >
                        <Controller
                            name="name"
                            control={form.control}
                            render={({ field }) =>
                                previewMode ? (
                                    <h1 className="font-heading text-7xl! text-center leading-none w-[calc(100%-8rem)] mx-16">
                                        {field.value || userBinder.name}
                                    </h1>
                                ) : (
                                    <Input
                                        {...field}
                                        onChange={(event) => {
                                            field.onChange(event);
                                            setNeedsSaving(true);
                                        }}
                                        type="text"
                                        placeholder="Binder Name"
                                        className="font-heading text-7xl! text-center leading-none h-auto w-[calc(100%-8rem)] mx-16"
                                    />
                                )
                            }
                        />
                        <Controller
                            name="description"
                            control={form.control}
                            render={({ field }) => (
                                <Field orientation="horizontal">
                                    <Input
                                        {...field}
                                        onChange={(event) => {
                                            field.onChange(event);
                                            setNeedsSaving(true);
                                        }}
                                        type="text"
                                        placeholder="Description"
                                        disabled={previewMode}
                                    />
                                    <p
                                        className="whitespace-nowrap px-4"
                                        hidden={previewMode}
                                    >
                                        {needsSaving
                                            ? "Changes not saved"
                                            : "All changes saved"}
                                    </p>
                                    {previewMode ? (
                                        isOwner && (
                                            <Button
                                                size="icon"
                                                type="button"
                                                className="px-3"
                                                onClick={onEdit}
                                            >
                                                <EditIcon />
                                            </Button>
                                        )
                                    ) : (
                                        <>
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
                                        </>
                                    )}
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
                            <div
                                className={`${previewMode ? "w-full" : "w-[85%]"} flex flex-col gap-4 items-center`}
                            >
                                {!previewMode && (
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
                                                changeSelectedSlotZ(
                                                    ZPosition.Top,
                                                )
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
                                                changeSelectedSlotZ(
                                                    ZPosition.Bottom,
                                                )
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
                                            className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.Center ? "bg-white!" : ""}`}
                                            onClick={() =>
                                                alignSelectedSlot(
                                                    SnapToGrid.Center,
                                                )
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
                                            className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.BottomRight ? "bg-white!" : ""}`}
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
                                            className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.Manual ? "bg-white!" : ""}`}
                                            onClick={() =>
                                                alignSelectedSlot(
                                                    SnapToGrid.Manual,
                                                )
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
                                )}
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
                                                        pageKey={
                                                            pages[
                                                                currentPage - 1
                                                            ]?.pageKey ?? -1
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
                                                                    pageKey:
                                                                        page.pageKey,
                                                                }),
                                                            )}
                                                        onSelectSlot={
                                                            onSelectSlot
                                                        }
                                                        selectedSlotId={
                                                            selectedSlot?.id
                                                        }
                                                        previewMode={
                                                            previewMode
                                                        }
                                                        onOpenPhotocard={
                                                            openPhotocard
                                                        }
                                                        mainScale={scale}
                                                    />
                                                }
                                                rightPage={
                                                    <BinderPageComponent
                                                        binderType={field.value}
                                                        index={currentPage}
                                                        pageKey={
                                                            pages[currentPage]
                                                                ?.pageKey ?? -2
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
                                                                        pageKey:
                                                                            page.pageKey,
                                                                    }),
                                                                ),
                                                        ].reverse()}
                                                        onSelectSlot={
                                                            onSelectSlot
                                                        }
                                                        selectedSlotId={
                                                            selectedSlot?.id
                                                        }
                                                        previewMode={
                                                            previewMode
                                                        }
                                                        onOpenPhotocard={
                                                            openPhotocard
                                                        }
                                                        mainScale={scale}
                                                    />
                                                }
                                            />
                                        )}
                                    />
                                </div>
                                {currentPageData ? (
                                    <Controller
                                        name={`pages.${currentPage}.description`}
                                        control={form.control}
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(event) => {
                                                    field.onChange(event);
                                                    setNeedsSaving(true);
                                                }}
                                                type="text"
                                                placeholder="Notes for this page"
                                                disabled={previewMode}
                                            />
                                        )}
                                    />
                                ) : (
                                    <Input
                                        value=""
                                        type="text"
                                        placeholder="Notes for this page"
                                        disabled={true}
                                    />
                                )}

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
                                    {!previewMode && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>
                            {!previewMode && (
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
                            )}
                        </div>
                    </form>
                    <PagePreviewComponent />
                </FormProvider>
            </div>
            {!previewMode && (
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
            )}
        </DndContext>
    );
}
