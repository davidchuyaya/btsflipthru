"use client";

import { CheckIcon, ChevronsUpDown } from "lucide-react";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function MultiCombobox<E>({
    items,
    allItem,
    selectedItems,
    onSelect,
    className,
}: {
    items: [string, E][];
    allItem: string;
    selectedItems: E[];
    onSelect: (items: E[]) => void;
    className?: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState<string>("");

    const filteredItems = React.useMemo(
        () => items.filter(([itemName, itemEnum]) => itemName.toLowerCase().includes(inputValue.toLowerCase())),
        [items, inputValue],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="noShadow"
                    role="combobox"
                    aria-expanded={open}
                    className="w-fit justify-between md:max-w-70 bg-accent-light"
                >
                    {selectedItems.length > 0
                        ? selectedItems.length === items.length
                            ? allItem
                            : selectedItems
                                  .map(
                                      (itemEnum) =>
                                          items.find(([itemName, enumValue]) => enumValue === itemEnum)?.[0] || "",
                                  )
                                  .join(", ")
                        : "Select..."}
                    <ChevronsUpDown className="text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0 border-0" align="start">
                <Command className="**:data-[slot=command-input-wrapper]:h-11 bg-accent-light">
                    <CommandInput placeholder="Search..." value={inputValue} onValueChange={setInputValue} />
                    <CommandList className="p-1">
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup className="**:[[cmdk-group-items]]:flex **:[[cmdk-group-items]]:flex-col **:[[cmdk-group-items]]:gap-1">
                            {filteredItems.map(([itemName, itemEnum]) => (
                                <CommandItem
                                    key={itemName}
                                    value={itemName}
                                    onSelect={(currentValue) => {
                                        const prevIndex = selectedItems.findIndex(
                                            (selectedEnum) => selectedEnum === itemEnum,
                                        );
                                        if (prevIndex >= 0) {
                                            // Deselect
                                            const newSelected = [...selectedItems];
                                            newSelected.splice(prevIndex, 1);
                                            onSelect(newSelected); // Update parent state
                                        } else {
                                            // Select
                                            onSelect([...selectedItems, itemEnum]);
                                        }
                                        setInputValue("");
                                    }}
                                >
                                    <div
                                        className="border-border pointer-events-none size-5 shrink-0 rounded-base border-2 transition-all select-none *:[svg]:opacity-0 data-[selected=true]:*:[svg]:opacity-100"
                                        data-selected={selectedItems.some((selectedEnum) => selectedEnum === itemEnum)}
                                    >
                                        <CheckIcon className="size-4 text-current" />
                                    </div>
                                    {itemName}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup className="bg-main border-t-2 border-t-border sticky bottom-0 bg-accent-light">
                            <CommandItem
                                onSelect={() => {
                                    if (selectedItems.length < items.length) {
                                        onSelect(items.map(([_, enumValue]) => enumValue));
                                    } else {
                                        onSelect([]);
                                    }
                                }}
                            >
                                <div
                                    className="border-border pointer-events-none size-5 shrink-0 rounded-base border-2 transition-all select-none *:[svg]:opacity-0 data-[selected=true]:*:[svg]:opacity-100"
                                    data-selected={selectedItems.length === items.length}
                                >
                                    <CheckIcon className="size-4 text-current" />
                                </div>
                                OT7
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
