"use client";

import { CheckIcon, ChevronsUpDown, PlusCircleIcon, Trash2Icon, XIcon } from "lucide-react";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { ButtonGroup, ButtonGroupSeparator } from "./button-group";

interface ComboboxProps<E> {
    items: [string, E][];
    value?: E;
    onValueChange: (value: E) => void;
    onDelete?: () => void;
    type?: string;
    onCreate?: (inputValue: string) => void;
    className?: string;
    isEqual?: (a: E, b: E) => boolean;
}

export default function Combobox<E>({
    items,
    value,
    onValueChange,
    onDelete,
    type = "item",
    onCreate,
    className,
    isEqual = (a, b) => a === b,
}: ComboboxProps<E>) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState<string>("");

    const selectedItem = React.useMemo(
        () => items.find(([itemName, itemEnum]) => value !== undefined && isEqual(itemEnum, value)),
        [items, value, isEqual],
    );

    const filteredItems = React.useMemo(
        () => items.filter(([itemName, itemEnum]) => itemName.toLowerCase().includes(inputValue.toLowerCase())),
        [items, inputValue],
    );

    const hasExactMatch = React.useMemo(
        () => filteredItems.some(([itemName, itemEnum]) => itemName.toLowerCase() === inputValue.toLowerCase()),
        [filteredItems, inputValue],
    );

    const handleCreate = () => {
        if (onCreate) {
            onCreate(inputValue.trim());
            setOpen(false);
            setInputValue("");
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <ButtonGroup role="combobox" aria-expanded={open}>
                    <Button
                        type="button"
                        variant="noShadow"
                        className={cn("w-full justify-between px-2 md:max-w-70", className)}
                    >
                        {selectedItem ? selectedItem[0] : `Select ${type}...`}
                        <ChevronsUpDown className="text-muted-foreground" />
                    </Button>
                    {onDelete && (
                        <>
                            <ButtonGroupSeparator />
                            <Button type="button" size="icon" variant="noShadow" onClick={onDelete}>
                                <Trash2Icon />
                            </Button>
                        </>
                    )}
                </ButtonGroup>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) border-0 p-0">
                <Command className="**:data-[slot=command-input-wrapper]:h-11" shouldFilter={false}>
                    <CommandInput placeholder={`Search ${type}...`} value={inputValue} onValueChange={setInputValue} />
                    <CommandList className="p-1">
                        {filteredItems.length === 0 && <CommandEmpty>{`No ${type} found.`}</CommandEmpty>}
                        {filteredItems.length > 0 && (
                            <CommandGroup className="**:[[cmdk-group-items]]:flex **:[[cmdk-group-items]]:flex-col **:[[cmdk-group-items]]:gap-1">
                                {filteredItems.map(([itemName, itemEnum]) => {
                                    return (
                                        <CommandItem
                                            key={itemName}
                                            value={itemName}
                                            onSelect={(currentValue) => {
                                                onValueChange(itemEnum);
                                                setOpen(false);
                                                setInputValue("");
                                            }}
                                        >
                                            {itemName}
                                            <CheckIcon
                                                className={cn(
                                                    "ml-auto",
                                                    value !== undefined && isEqual(itemEnum, value)
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                        {onCreate && inputValue !== "" && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem onSelect={handleCreate} className="bg-main-darker">
                                        <PlusCircleIcon />
                                        Create
                                        {inputValue && !hasExactMatch ? `: "${inputValue}"` : ""}
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
