"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import * as React from "react";

import { cn } from "@/lib/utils";
import { CircleQuestionMarkIcon } from "lucide-react";

export function TooltipProvider({
    delayDuration = 0,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return (
        <TooltipPrimitive.Provider
            data-slot="tooltip-provider"
            delayDuration={delayDuration}
            {...props}
        />
    );
}

export function Tooltip({
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

export function TooltipTrigger({
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
    className,
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Content
            data-slot="tooltip-content"
            sideOffset={sideOffset}
            className={cn(
                "z-50 max-w-60 overflow-hidden rounded-base border-2 border-border bg-accent-light px-3 py-2 text-sm font-bold text-main-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
                className,
            )}
            {...props}
        />
    );
}

export default function TooltipComponent({
    children,
    tooltip,
    contentProps,
}: {
    children: React.ReactNode;
    tooltip?: React.ReactNode;
    contentProps?: React.ComponentProps<typeof TooltipContent>;
}) {
    const trigger = tooltip ? children : <CircleQuestionMarkIcon />;
    const content = tooltip ?? children;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {trigger}
                </TooltipTrigger>
                <TooltipContent {...contentProps}>
                    <p>{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
