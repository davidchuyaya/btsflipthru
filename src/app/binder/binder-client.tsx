"use client";

import { getCardSizesFromDB, getOwnedPhotocards, getWishlistedPhotocards } from "@/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BinderPage, BinderType } from "@/constants";
import { CardSizes, Photocards } from "@/db";
import { useMetadata } from "@/metadata-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { Selectable } from "kysely";
import { EyeIcon, SaveIcon, Share2Icon } from "lucide-react";
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

    const width = pageType.xPerforations[pageType.xPerforations.length - 1];
    const height = pageType.yPerforations[pageType.yPerforations.length - 1];
    const widthPercent = (width / binderType.coverWidth) * 100;

    const xPerfs = [0, ...pageType.xPerforations];
    const yPerfs = [0, ...pageType.yPerforations];

    const colWidths = xPerfs.slice(1).map((x, i) => x - xPerfs[i]);
    const rowHeights = yPerfs.slice(1).map((y, i) => y - yPerfs[i]);

    const dotSize = 2; // mm
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
                    const dotPctX = (dotSize / w) * 100;
                    const dotPctY = (dotSize / h) * 100;
                    const isLastCol = cIndex === colWidths.length - 1;
                    const key = `${rIndex}-${cIndex}`;
                    return (
                        <BinderSlot
                            key={key}
                            id={key}
                            currentPage={index}
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
    id,
    currentPage,
}: {
    gradient: string;
    isLastCol: boolean;
    dotPctX: number;
    dotPctY: number;
    id: string;
    currentPage: number;
}) {
    const { control } = useFormContext();
    const { setNodeRef, isOver } = useDroppable({
        id,
    });
    // Left border for every cell
    // Right border only for the last column
    // Bottom border for every cell
    return (
        <div
            ref={setNodeRef}
            className={isOver ? "bg-white/50" : ""}
            style={{
                backgroundImage: `${gradient}, ${gradient} ${isLastCol ? ", " + gradient : ""}`,
                backgroundPosition: `left bottom, left top ${isLastCol ? ", right top" : ""}`,
                backgroundSize: `${dotPctX}% ${dotPctY}%, ${dotPctX}% ${dotPctY}% ${isLastCol ? `, ${dotPctX}% ${dotPctY}%` : ""}`,
                backgroundRepeat: `repeat-x, repeat-y ${isLastCol ? ", repeat-y" : ""}`,
            }}
        >
            <Controller
                name={`pages.${currentPage}.slots.${id}`}
                control={control}
                render={({ field }) =>
                    field.value && (
                        <PhotocardWithSize
                            photocard={field.value.photocard}
                            showFront={true}
                            width={field.value.width}
                            height={field.value.height}
                        />
                    )
                }
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
                photocards={searchType === SearchType.Owned ? ownedPhotocards : wishlistedPhotocards}
                draggable={true}
            />
        </div>
    );
}

const formSchema = z.object({
    binderType: z.object({
        id: z.number(),
        name: z.string(),
        numPages: z.number(),
        coverWidth: z.number(),
        coverHeight: z.number(),
        spineWidth: z.number(),
        maxPageWidth: z.number(),
        maxPageHeight: z.number(),
    }),
    name: z.string(),
    description: z.string().optional(),
    pages: z.array(
        z.object({
            pageType: z.object({
                id: z.number(),
                name: z.string(),
                xPerforations: z.array(z.number()),
                yPerforations: z.array(z.number()),
            }),
            slots: z.record(
                z.string(), // Slot ID
                z.object({
                    photocard: z.custom<Selectable<Photocards>>(),
                    showFront: z.boolean(),
                    rotation: z.number(),
                    width: z.number(),
                    height: z.number(),
                    x: z.number(),
                    y: z.number(),
                    z: z.number(),
                }),
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
        form.setValue(`pages.${currentPage}.slots.${event.over.id}`, {
            photocard: activePhotocard!,
            showFront: true,
            rotation: 0,
            width: activeCardSize!.width * scale,
            height: activeCardSize!.height * scale,
            x: 0,
            y: 0,
            z: 0,
        });
        setNeedsSaving(true);
        setActivePhotocard(null);
    }

    function onPreview() {}

    function onShare() {}

    async function onSubmit(data: z.infer<typeof formSchema>) {
        console.log("Submitting:", data);
    }

    return (
        <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex flex-col gap-4 m-16 items-center">
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
