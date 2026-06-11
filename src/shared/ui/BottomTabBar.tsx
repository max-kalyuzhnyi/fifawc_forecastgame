"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FootballIcon,
  RankingIcon,
  Settings01Icon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface BottomTabBarProps {
  isAdmin?: boolean;
}

const tabs = [
  { href: "/matches", key: "matches", icon: FootballIcon },
  { href: "/leaderboard", key: "leaderboard", icon: RankingIcon },
  { href: "/settings", key: "settings", icon: Settings01Icon },
] as const;

export function BottomTabBar({ isAdmin }: BottomTabBarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const allTabs = isAdmin
    ? [...tabs, { href: "/admin", key: "admin" as const, icon: ShieldIcon }]
    : tabs;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50"
      aria-label={t("main")}
    >
      <div className="glass-strong corner-squircle pointer-events-auto mx-auto max-w-md rounded-t-[min(var(--radius-3xl),28px)] border-b-0">
        <div className="flex items-stretch justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {allTabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={
                  tab.href === "/settings" || tab.href === "/admin"
                }
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium transition-[color,transform] duration-200 active:scale-95 motion-reduce:transition-none",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={tab.icon} />
                <span>{t(tab.key)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
