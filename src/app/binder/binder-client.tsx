"use client";

import { getCardSizesFromDB, getOwnedPhotocards, getWishlistedPhotocards } from "@/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BINDER_PERFORATION_DOT_SIZE, BinderPage, BinderType } from "@/constants";
import { CardSizes, Photocards } from "@/db";
import { useMetadata } from "@/metadata-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Selectable } from "kysely";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, EyeIcon, SaveIcon, Share2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import z from "zod";

import PhotocardGrid from "../photocard-grid";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DndContext, DragEndEvent, DragOverlay, useDroppable, DragStartEvent } from "@dnd-kit/core";
import { DraggablePhotocard, PhotocardWithSize } from "../photocard";

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
}: {
    binderType: BinderType;
    index: number;
    flipped: boolean;
}) {
    const { control } = useFormContext<z.infer<typeof formSchema>>();
    const pageType = useWatch({ control, name: `pages.${index}.pageType` });

    if (index < 0 || !pageType) {
        return null;
    }

    const width = pageType.xPerforations[pageType.xPerforations.length - 1] + BINDER_PERFORATION_DOT_SIZE;
    const height = pageType.yPerforations[pageType.yPerforations.length - 1] + BINDER_PERFORATION_DOT_SIZE;
    const widthPercent = (width / binderType.coverWidth) * 100;

    const xPerfs = [0, ...pageType.xPerforations];
    const yPerfs = [0, ...pageType.yPerforations];

    const colWidths = xPerfs.slice(1).map((x, i) => {
        // Last column gets needs extra space to draw the rightmost perforations
        if (i === xPerfs.length - 1) {
            return x - xPerfs[i] + BINDER_PERFORATION_DOT_SIZE;
        }
        return x - xPerfs[i];
    });
    const rowHeights = yPerfs.slice(1).map((y, i) => y - yPerfs[i]);

    const gradient = "radial-gradient(circle, transparent 40%, white 40%, white 50%, transparent 50%)";

    return (
        <div
            className={`relative bg-white/50 border border-black/10 ${flipped ? "ml-auto" : ""} grid`}
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
                    const key = `${rIndex}-${cIndex}`;
                    return (
                        <BinderSlot
                            key={key}
                            id={key}
                            currentPage={index}
                            width={w}
                            height={h}
                            gradient={gradient}
                            isLastCol={isLastCol}
                            dotPctX={dotPctX}
                            dotPctY={dotPctY}
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
    currentPage,
}: {
    gradient: string;
    isLastCol: boolean;
    width: number;
    height: number;
    dotPctX: number;
    dotPctY: number;
    id: string;
    currentPage: number;
}) {
    const { control } = useFormContext();
    const { setNodeRef, isOver } = useDroppable({
        id,
        // To tell the DndContext what size this slot is, so it can calculate the photocard's position
        // It seems like even though binder perforations are only 2px, the gradient extends 1px on each side
        data: {
            width: width - (isLastCol ? BINDER_PERFORATION_DOT_SIZE * 2 : BINDER_PERFORATION_DOT_SIZE) - 1,
            height: height - BINDER_PERFORATION_DOT_SIZE - 1,
        },
    });
    // Left border for every cell
    // Right border only for the last column
    // Bottom border for every cell
    return (
        <Controller
            name={`pages.${currentPage}.slots.${id}`}
            control={control}
            render={({ field }) => (
                <div
                    ref={setNodeRef}
                    className={`${isOver ? "bg-white/50" : ""} relative`}
                    style={{
                        backgroundImage: `${gradient}, ${gradient} ${isLastCol ? ", " + gradient : ""}`,
                        backgroundPosition: `left bottom, left top ${isLastCol ? ", right top" : ""}`,
                        backgroundSize: `${dotPctX}% ${dotPctY}%, ${dotPctX}% ${dotPctY}% ${isLastCol ? `, ${dotPctX}% ${dotPctY}%` : ""}`,
                        backgroundRepeat: `repeat-x, repeat-y ${isLastCol ? ", repeat-y" : ""}`,
                    }}
                >
                    {field.value && (
                        <PhotocardWithSize
                            photocard={field.value.photocard}
                            showFront={true}
                            width={field.value.width}
                            height={field.value.height}
                            style={{
                                position: "absolute",
                                bottom: `calc(${field.value.y}px + ${dotPctY}%)`,
                                left: `calc(${field.value.x}px + ${dotPctX}%)`,
                            }}
                        />
                    )}
                </div>
            )}
        />
    );
}

function SearchComponent({ cardSizes }: { cardSizes: Selectable<CardSizes>[] }) {
    const { setError } = useMetadata();
    const [ownedPhotocards, setOwnedPhotocards] = useState<Selectable<Photocards>[]>([]);
    const [wishlistedPhotocards, setWishlistedPhotocards] = useState<Selectable<Photocards>[]>([]);
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
    }, []);

    function onSearch() { }

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
                photocards={searchType === SearchType.Owned ? ownedPhotocards : wishlistedPhotocards}
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
    const [activePhotocard, setActivePhotocard] = useState<Selectable<Photocards> | null>(null);
    const [cardSizes, setCardSizes] = useState<Selectable<CardSizes>[]>([]);
    const [numPages, setNumPages] = useState(1);

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

    // Resize Observer State
    const [binderWidth, setBinderWidth] = useState(0);
    const binderRef = useRef<HTMLDivElement>(null);
    const binderType = form.watch("binderType");
    const activeCardSize =
        activePhotocard && cardSizes.length > 0 ? cardSizes.find((cs) => cs.id === activePhotocard.size_id) : null;
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
    }, []);

    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.photocard) {
            setActivePhotocard(event.active.data.current.photocard);
        }
    }

    function onDragEnd(event: DragEndEvent) {
        if (!event.over) return;

        const slotWidth = event.over.data.current!.width * scale;
        const slotHeight = event.over.data.current!.height * scale;
        const width = activeCardSize!.width * scale;
        const height = activeCardSize!.height * scale;
        let x = 0;
        const y = 0;
        const z = 0;
        switch (snapToGrid) {
            case SnapToGrid.BottomLeft:
                x = 0;
                break;
            case SnapToGrid.BottomRight:
                x = slotWidth - width;
                break;
            case SnapToGrid.Center:
                x = (slotWidth - width) / 2;
                break;
            case SnapToGrid.Manual:
                x = event.active.rect.current.translated!.left;
                break;
        }
        form.setValue(`pages.${currentPage}.slots.${event.over.id}`, {
            photocard: activePhotocard!,
            showFront: true,
            rotation: 0,
            width,
            height,
            x,
            y,
            z,
        });
        setNeedsSaving(true);
        setActivePhotocard(null);
    }

    function onPreview() { }

    function onShare() { }

    async function onSubmit(data: z.infer<typeof formSchema>) {
        console.log("Submitting:", data);
    }

    function setPage(page: number) {
        setCurrentPage(page);
    }

    return (
        <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex flex-col gap-4 m-16 items-center">
                <h1>Work in Progress!</h1>
                <FormProvider {...form}>
                    <form
                        className="w-full flex flex-col gap-4"
                        onSubmit={form.handleSubmit(onSubmit, (error) => console.error(error))}
                    >
                        <Controller
                            name="name"
                            control={form.control}
                            render={({ field }) => (
                                <Field orientation="horizontal">
                                    <Input {...field} type="text" placeholder="Binder Name" />
                                    <p className="whitespace-nowrap px-4">
                                        {needsSaving ? "Changes not saved" : "All changes saved"}
                                    </p>
                                    <Button size="icon" type="submit" className="px-3" disabled={!needsSaving}>
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
                            <div className="flex flex-col gap-4">
                                <Button size="icon" type="button" className="px-3" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>
                                    <ChevronLeftIcon />
                                </Button>
                                <Button size="icon" type="button" className="px-3" onClick={() => setPage(0)} disabled={currentPage === 0}>
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
                                            />
                                        }
                                        rightPage={
                                            <BinderPageComponent
                                                binderType={field.value}
                                                index={currentPage}
                                                flipped={false}
                                            />
                                        }
                                    />
                                )}
                            />
                            <div className="flex flex-col gap-4">
                                <Button size="icon" type="button" className="px-3" onClick={() => setPage(currentPage + 1)} disabled={currentPage === numPages - 1}>
                                    <ChevronRightIcon />
                                </Button>
                                <Button size="icon" type="button" className="px-3" onClick={() => setPage(numPages - 1)} disabled={currentPage === numPages - 1}>
                                    <ChevronsRightIcon />
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
                        showFront={true}
                        width={activeCardSize.width * scale}
                        height={activeCardSize.height * scale}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
