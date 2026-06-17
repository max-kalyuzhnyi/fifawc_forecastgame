"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import {
  useSlidingIndicator,
  type SlidingIndicatorVariant,
} from "@/shared/lib/useSlidingIndicator"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-2xl p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:p-1 data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const indicatorBaseClassName =
  "pointer-events-none absolute left-0 z-0 transition-[transform,width,height,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none data-[ready=false]:opacity-0 data-[ready=false]:transition-none"

const indicatorVariantClassName: Record<
  Exclude<SlidingIndicatorVariant, never> | "pill",
  string
> = {
  pill: "rounded-2xl bg-background shadow-sm dark:border dark:border-input dark:bg-input/30",
  underline: "h-0.5 rounded-full bg-foreground",
}

function TabsList({
  className,
  variant = "default",
  indicatorClassName,
  indicatorVariant,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    indicatorClassName?: string
    indicatorVariant?: SlidingIndicatorVariant | "none"
  }) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const indicatorRef = React.useRef<HTMLSpanElement>(null)

  const resolvedIndicatorVariant: SlidingIndicatorVariant | "none" =
    indicatorVariant ?? (variant === "line" ? "underline" : "pill")

  const { ready } = useSlidingIndicator({
    listRef,
    indicatorRef,
    activeSelector: "[data-active]",
    variant:
      resolvedIndicatorVariant === "none"
        ? "pill"
        : resolvedIndicatorVariant,
    enabled: resolvedIndicatorVariant !== "none",
  })

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {resolvedIndicatorVariant !== "none" && (
        <span
          ref={indicatorRef}
          aria-hidden
          data-ready={ready}
          className={cn(
            indicatorBaseClassName,
            indicatorVariantClassName[resolvedIndicatorVariant],
            indicatorClassName
          )}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-transparent! px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color] duration-200 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-0.5 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:text-foreground dark:data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "text-sm outline-none data-[state=inactive]:hidden",
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
