"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FootballIcon,
  RankingIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface BottomTabBarProps {
  isAdmin?: boolean;
}

const tabs = [
  { href: "/matches", label: "Matches", icon: FootballIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: RankingIcon },
] as const;

export function BottomTabBar({ isAdmin }: BottomTabBarProps) {
  const pathname = usePathname();

  const allTabs = isAdmin
    ? [...tabs, { href: "/admin", label: "Admin", icon: ShieldIcon }]
    : tabs;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 safe-bottom"
      aria-label="Main navigation"
    >
      <div className="glass-strong corner-squircle pointer-events-auto mx-auto max-w-md rounded-t-[min(var(--radius-3xl),28px)] border-b-0">
        <div className="flex items-stretch justify-around px-2 pt-2 pb-2">
          {allTabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={tab.icon} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
