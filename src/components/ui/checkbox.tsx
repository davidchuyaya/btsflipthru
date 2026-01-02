"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "./label";

interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
    text?: string;
}

function CheckboxWithoutLabel({ className, ...props }: Omit<CheckboxProps, "text">) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                "peer size-4 shrink-0 outline-2 outline-border ring-offset-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-main data-[state=checked]:text-white",
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className={cn("flex items-center justify-center text-current")}
            >
                <Check className="size-4 text-main-foreground" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

function Checkbox({ className, text, ...props }: CheckboxProps) {
    return text ? (
        <Label className="flex flex-row gap-3 items-center ml-1">
            <CheckboxWithoutLabel className={className} {...props} />
            <div className="font-sans text-base font-semibold">{text}</div>
        </Label>
    ) : (
        <CheckboxWithoutLabel className={className} {...props} />
    );
}

export { Checkbox, CheckboxWithoutLabel };
