"use client";

import {
    getCardSizesFromDB,
    getOwnedPhotocards,
    getWishlistedPhotocards,
} from "@/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    BINDER_PERFORATION_DOT_SIZE,
    BinderPage,
    BinderType,
} from "@/constants";
import { CardSizes, Photocards } from "@/db";
import { useMetadata } from "@/metadata-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Selectable } from "kysely";
import {
    AlignCenterVertical,
    AlignCenterVerticalIcon,
    AlignEndVerticalIcon,
    AlignStartVerticalIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronsLeftIcon,
    ChevronsRightIcon,
    EyeIcon,
    FlipHorizontalIcon,
    PointerIcon,
    RotateCcwIcon,
    SaveIcon,
    Share2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    DndContext,
    DragEndEvent,
    DragOverlay,
    useDroppable,
    useDraggable,
    DragStartEvent,
} from "@dnd-kit/core";
import { PhotocardWithSize } from "../photocard";
import Image from "next/image";

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
    flipped,
    onSelectSlot,
    selectedSlotId,
}: {
    binderType: BinderType;
    index: number;
    flipped: boolean;
    onSelectSlot: (id: string, width: number, height: number) => void;
    selectedSlotId?: string;
}) {
    const { control } = useFormContext<z.infer<typeof formSchema>>();
    const page = useWatch({ control, name: `pages.${index}` });

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

    return (
        <div
            className={`relative bg-white/50 border border-black/10 ${flipped ? "ml-auto flip-horizontal" : ""} grid`}
            style={{
                width: `${widthPercent}%`,
                aspectRatio: `${width}/${height}`,
                gridTemplateColumns: colWidths.map((w) => `${w}fr`).join(" "),
                gridTemplateRows: rowHeights.map((h) => `${h}fr`).join(" "),
            }}
        >
            {rowHeights.map((h, rIndex) =>
                colWidths.map((w, cIndex) => {
                    const dotPctX = (BINDER_PERFORATION_DOT_SIZE / w) * 100;
                    const dotPctY = (BINDER_PERFORATION_DOT_SIZE / h) * 100;
                    const isLastCol = cIndex === colWidths.length - 1;
                    const key = `${index}-${rIndex}-${cIndex}`;
                    return (
                        <BinderSlot
                            key={key}
                            id={key}
                            pageNum={index}
                            width={w}
                            height={h}
                            gradient={gradient}
                            isLastCol={isLastCol}
                            dotPctX={dotPctX}
                            dotPctY={dotPctY}
                            onSelectSlot={onSelectSlot}
                            isSelected={selectedSlotId === key}
                            flipped={flipped}
                        />
                    );
                }),
            )}
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
    onSelectSlot,
    isSelected,
    flipped,
}: {
    gradient: string;
    isLastCol: boolean;
    width: number;
    height: number;
    dotPctX: number;
    dotPctY: number;
    id: string;
    pageNum: number;
    onSelectSlot: (id: string, width: number, height: number) => void;
    isSelected: boolean;
    flipped: boolean;
}) {
    const { control } = useFormContext();
    const logicalWidth =
        width -
        (isLastCol
            ? BINDER_PERFORATION_DOT_SIZE * 2
            : BINDER_PERFORATION_DOT_SIZE) -
        1;
    const logicalHeight = height - BINDER_PERFORATION_DOT_SIZE - 1;

    const { setNodeRef, isOver } = useDroppable({
        id: `${pageNum}-${id}`,
        disabled: flipped,
        // To tell the DndContext what size this slot is, so it can calculate the photocard's position
        // It seems like even though binder perforations are only 2px, the gradient extends 1px on each side
        data: {
            slotId: id,
            pageNum,
            width: logicalWidth,
            height: logicalHeight,
        },
    });
    const slotValue = useWatch({
        control,
        name: `pages.${pageNum}.slots.${id}`,
    });
    // Left border for every cell
    // Right border only for the last column
    // Bottom border for every cell
    return (
        <div
            ref={setNodeRef}
            onClick={() => {
                if (slotValue && !flipped) {
                    onSelectSlot(id, logicalWidth, logicalHeight);
                }
            }}
            className={`${isOver && !flipped ? "bg-white/50" : ""} relative`}
            style={{
                backgroundImage: `${gradient}, ${gradient} ${isLastCol ? ", " + gradient : ""}`,
                backgroundPosition: `left bottom, left top ${isLastCol ? ", right top" : ""}`,
                backgroundSize: `${dotPctX}% ${dotPctY}%, ${dotPctX}% ${dotPctY}% ${isLastCol ? `, ${dotPctX}% ${dotPctY}%` : ""}`,
                backgroundRepeat: `repeat-x, repeat-y ${isLastCol ? ", repeat-y" : ""}`,
            }}
        >
            {slotValue && (
                <DraggableSlotContent
                    photocard={slotValue.photocard}
                    slotId={id}
                    pageNum={pageNum}
                    showFront={slotValue.showFront !== flipped}
                    width={slotValue.width}
                    height={slotValue.height}
                    slotWidth={logicalWidth}
                    slotHeight={logicalHeight}
                    disabled={flipped}
                    className={flipped ? "flip-horizontal!" : ""}
                    style={{
                        position: "absolute",
                        bottom: `calc(${slotValue.y}px + ${dotPctY}%)`,
                        left: `calc(${slotValue.x}px + ${dotPctX}%)`,
                        opacity: isSelected ? 1 : 0.6,
                        transform: `rotate(${slotValue.rotation}deg)`,
                    }}
                />
            )}
        </div>
    );
}

function DraggableSlotContent({
    photocard,
    slotId,
    pageNum,
    showFront,
    width,
    height,
    slotWidth,
    slotHeight,
    style,
    className,
    disabled,
}: {
    photocard: Selectable<Photocards>;
    slotId: string;
    pageNum: number;
    showFront: boolean;
    width: number;
    height: number;
    slotWidth: number;
    slotHeight: number;
    style?: React.CSSProperties;
    className?: string;
    disabled?: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `slot-${slotId}`,
        disabled,
        data: {
            photocard,
            sourceSlotId: slotId,
            sourcePageNum: pageNum,
            sourceSlotWidth: slotWidth,
            sourceSlotHeight: slotHeight,
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

function SearchComponent({
    cardSizes,
}: {
    cardSizes: Selectable<CardSizes>[];
}) {
    const { setError } = useMetadata();
    const [ownedPhotocards, setOwnedPhotocards] = useState<
        Selectable<Photocards>[]
    >([]);
    const [wishlistedPhotocards, setWishlistedPhotocards] = useState<
        Selectable<Photocards>[]
    >([]);
    const [searchType, setSearchType] = useState(SearchType.Owned);

    useEffect(() => {
        const fetchPhotocards = async () => {
            const ownedPhotocards = await getOwnedPhotocards();
            const wishlistedPhotocards = await getWishlistedPhotocards();
            if (ownedPhotocards.error) {
                setError(ownedPhotocards.error);
                return;
            }
            if (wishlistedPhotocards.error) {
                setError(wishlistedPhotocards.error);
                return;
            }
            setOwnedPhotocards(ownedPhotocards.data!);
            setWishlistedPhotocards(wishlistedPhotocards.data!);
        };
        fetchPhotocards();
    }, [setError]);

    function onSearch() {}

    return (
        <div className="rounded-2xl bg-third-lighter p-4 flex flex-col items-center gap-4 w-[75%]">
            <div className="flex flex-row gap-3 w-full">
                <Input type="text" placeholder="Search" />
                <Button type="button" onClick={onSearch}>
                    Search
                </Button>
            </div>
            <ToggleGroup
                className="w-auto!"
                type="single"
                variant="outline"
                value={searchType}
                onValueChange={(v) => setSearchType(v as SearchType)}
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
                photocards={
                    searchType === SearchType.Owned
                        ? ownedPhotocards
                        : wishlistedPhotocards
                }
                draggable={true}
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
                    .object({
                        photocard: z.custom<Selectable<Photocards>>(),
                        snap: z.custom<SnapToGrid>(),
                        showFront: z.boolean(),
                        rotation: z.number(),
                        width: z.number(),
                        height: z.number(),
                        x: z.number(),
                        y: z.number(),
                        z: z.number(),
                    })
                    .optional(),
            ),
        }),
    ),
});

export default function BinderClient() {
    const { setError } = useMetadata();
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
    const [cardSizes, setCardSizes] = useState<Selectable<CardSizes>[]>([]);

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

    useEffect(() => {
        const fetchCardSizes = async () => {
            const result = await getCardSizesFromDB();
            if (result.error) {
                setError(result.error);
                return;
            }
            setCardSizes(result.data!);
        };
        fetchCardSizes();
    }, [setError]);

    function onDragStart(event: DragStartEvent) {
        const data = event.active.data.current;
        if (data?.photocard) {
            setActivePhotocard(data.photocard);
        }
        if (data?.sourceSlotId !== undefined) {
            const sourceSlotData = form.getValues(
                `pages.${data.sourcePageNum}.slots.${data.sourceSlotId}`,
            );
            setActivePhotocardRotation(sourceSlotData?.rotation ?? 0);
            setActivePhotocardShowFront(sourceSlotData?.showFront ?? true);
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
    ): { x: number; y: number; z: number } {
        let x = 0;
        let y = 0;
        const z = 0;

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

        return { x, y, z };
    }

    function onDragEnd(event: DragEndEvent) {
        if (!event.over) {
            setActivePhotocard(null);
            setActivePhotocardRotation(0);
            setActivePhotocardShowFront(true);
            setDragSourceSlot(null);
            return;
        }

        const slotWidth = event.over.data.current!.width * scale;
        const width = activeCardSize!.width * scale;
        const height = activeCardSize!.height * scale;
        const source = dragSourceSlot
            ? form.getValues(
                  `pages.${dragSourceSlot.pageNum}.slots.${dragSourceSlot.slotId}`,
              )
            : null;
        const sourceSnap = source?.snap ?? snapToGrid;
        const sourceRotation = source?.rotation ?? 0;

        const { x, y, z } = calculatePhotocardPosition(
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

        form.setValue(`pages.${overPageNum}.slots.${overSlotId}`, {
            photocard: activePhotocard!,
            snap: sourceSnap,
            showFront: source?.showFront ?? true,
            rotation: sourceRotation,
            width,
            height,
            x,
            y,
            z,
        });
        setSelectedSlot({
            id: overSlotId,
            width: overSlotWidth,
            height: overSlotHeight,
        });

        // Clear source slot if this was a slot-to-slot drag to a different slot
        if (
            dragSourceSlot &&
            (overSlotId !== dragSourceSlot.slotId ||
                overPageNum !== dragSourceSlot.pageNum)
        ) {
            form.unregister(
                `pages.${dragSourceSlot.pageNum}.slots.${dragSourceSlot.slotId}`,
            );
        }

        setNeedsSaving(true);
        setActivePhotocard(null);
        setActivePhotocardRotation(0);
        setActivePhotocardShowFront(true);
        setDragSourceSlot(null);
    }

    function onPreview() {}

    function onShare() {}

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
        const slotData = form.getValues(`pages.${currentPage}.slots.${id}`);
        if (slotData) {
            setSnapToGrid(slotData.snap);
        }
    }

    function alignSelectedSlot(snapToGrid: SnapToGrid) {
        if (selectedSlot) {
            const slotData = form.getValues(
                `pages.${currentPage}.slots.${selectedSlot.id}`,
            );
            if (slotData) {
                const slotWidth = selectedSlot.width * scale;
                const slotHeight = selectedSlot.height * scale;
                const { x, y, z } = calculatePhotocardPosition(
                    snapToGrid,
                    slotWidth,
                    slotHeight,
                    slotData.width,
                    slotData.height,
                    slotData.rotation,
                );
                form.setValue(`pages.${currentPage}.slots.${selectedSlot.id}`, {
                    ...slotData,
                    snap: snapToGrid,
                    x,
                    y,
                    z,
                });
                setNeedsSaving(true);
            }
        }
        setSnapToGrid(snapToGrid);
    }

    function flipSelectedSlot() {
        if (selectedSlot) {
            const slotData = form.getValues(
                `pages.${currentPage}.slots.${selectedSlot.id}`,
            );
            if (slotData) {
                form.setValue(`pages.${currentPage}.slots.${selectedSlot.id}`, {
                    ...slotData,
                    showFront: !slotData.showFront,
                });
                setNeedsSaving(true);
            }
        }
    }

    function rotateSelectedSlot() {
        if (selectedSlot) {
            const slotData = form.getValues(
                `pages.${currentPage}.slots.${selectedSlot.id}`,
            );
            if (slotData) {
                // Rotate 90 degrees counter-clockwise
                form.setValue(`pages.${currentPage}.slots.${selectedSlot.id}`, {
                    ...slotData,
                    rotation: (slotData.rotation - 90) % 360,
                });
                // Immediately realign according to existing snap
                alignSelectedSlot(slotData.snap);
            }
        }
    }

    return (
        <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex flex-col gap-4 m-16 items-center">
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
                        <div className="flex flex-row gap-4 items-center">
                            <div className="flex flex-col gap-4 p-4 bg-main rounded-xl">
                                <Button
                                    size="icon"
                                    type="button"
                                    variant="noShadow"
                                    onClick={addPage}
                                >
                                    <Image
                                        src="flipthru_addpage.svg"
                                        className="size-7"
                                        width={0}
                                        height={0}
                                        alt="Add a binder page"
                                    />
                                </Button>
                            </div>
                            <div className="flex flex-col gap-4">
                                <Button
                                    size="icon"
                                    type="button"
                                    className="px-3"
                                    onClick={() => setPage(currentPage - 1)}
                                    disabled={currentPage === 0}
                                >
                                    <ChevronLeftIcon />
                                </Button>
                                <Button
                                    size="icon"
                                    type="button"
                                    className="px-3"
                                    onClick={() => setPage(0)}
                                    disabled={currentPage === 0}
                                >
                                    <ChevronsLeftIcon />
                                </Button>
                            </div>
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
                                                flipped={true}
                                                onSelectSlot={onSelectSlot}
                                                selectedSlotId={
                                                    selectedSlot?.id
                                                }
                                            />
                                        }
                                        rightPage={
                                            <BinderPageComponent
                                                binderType={field.value}
                                                index={currentPage}
                                                flipped={false}
                                                onSelectSlot={onSelectSlot}
                                                selectedSlotId={
                                                    selectedSlot?.id
                                                }
                                            />
                                        }
                                    />
                                )}
                            />
                            <div className="flex flex-col gap-4">
                                <Button
                                    size="icon"
                                    type="button"
                                    className="px-3"
                                    onClick={() => setPage(currentPage + 1)}
                                    disabled={currentPage === pages.length}
                                >
                                    <ChevronRightIcon />
                                </Button>
                                <Button
                                    size="icon"
                                    type="button"
                                    className="px-3"
                                    onClick={() => setPage(pages.length)}
                                    disabled={currentPage === pages.length}
                                >
                                    <ChevronsRightIcon />
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2 p-4 bg-main rounded-xl">
                                <Button
                                    size="icon"
                                    type="button"
                                    variant="noShadow"
                                    className="px-3"
                                    onClick={flipSelectedSlot}
                                    disabled={selectedSlot === null}
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
                                >
                                    <RotateCcwIcon />
                                </Button>
                                <Button
                                    size="icon"
                                    type="button"
                                    variant="noShadow"
                                    className={`px-3 ${selectedSlot && snapToGrid === SnapToGrid.BottomLeft ? "!bg-white" : ""}`}
                                    onClick={() =>
                                        alignSelectedSlot(SnapToGrid.BottomLeft)
                                    }
                                    disabled={selectedSlot === null}
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
                                >
                                    <PointerIcon />
                                </Button>
                            </div>
                        </div>
                    </form>
                </FormProvider>
                <SearchComponent cardSizes={cardSizes} />
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
