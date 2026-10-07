"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "soft-scrollbar z-50 max-h-72 min-w-[8rem] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 text-sm shadow-lg",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "cursor-pointer select-none rounded-md px-3 py-2 outline-none data-[highlighted]:bg-zinc-100",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

function ReviewSelect({ label, value, options, onSelect, disabled }: { disabled?: boolean; label: string; value: string; options: { value: string; label: string }[]; onSelect: (value: string) => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={label} disabled={disabled} className="flex w-full items-center justify-between gap-2 rounded-lg border border-hairline bg-surface py-1.5 pl-3 pr-3 text-xs font-semibold text-ink outline-none hover:bg-page focus-visible:ring-2 focus-visible:ring-brand/20">
    {options.find((option) => option.value === value)?.label ?? "선택"}<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4 text-ink-3"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border-hairline bg-surface p-1 shadow-[0_14px_32px_rgba(0,0,0,0.14)]">
    {options.map((option) => <DropdownMenuItem key={option.value} onSelect={() => onSelect(option.value)} className={`flex items-center justify-between rounded-lg py-2 text-xs data-[highlighted]:bg-page ${value === option.value ? "font-semibold text-brand" : "text-ink-2"}`}>{option.label}{value === option.value && <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}</DropdownMenuItem>)}
  </DropdownMenuContent></DropdownMenu>;
}


export { ReviewSelect, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
