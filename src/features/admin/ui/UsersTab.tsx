"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { UserWithPicks } from "@/features/admin/lib/types";
import { formatKickoff } from "@/shared/lib/formatDate";
import { TeamName } from "@/shared/ui/TeamFlag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface UsersTabProps {
  users: UserWithPicks[];
  currentUserId: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UsersTab({ users, currentUserId }: UsersTabProps) {
  const t = useTranslations("admin");
  const [selectedUser, setSelectedUser] = useState<UserWithPicks | null>(null);

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noUsers")}</p>
    );
  }

  return (
    <>
      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>{t("allUsers")}</CardTitle>
          <CardDescription>
            {t("users.description", { count: users.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {users.map((user) => (
            <button
              key={user.profile.id}
              type="button"
              onClick={() => setSelectedUser(user)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
            >
              <Avatar size="sm">
                {user.profile.photo_url ? (
                  <AvatarImage
                    src={user.profile.photo_url}
                    alt={user.profile.display_name}
                  />
                ) : null}
                <AvatarFallback>
                  {getInitials(user.profile.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.profile.display_name}
                  {user.profile.id === currentUserId ? ` ${t("you")}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("users.picksCount", { count: user.picks.length })}
                </p>
              </div>
              {user.isAdmin ? (
                <Badge variant="secondary">{t("roles.admin")}</Badge>
              ) : null}
            </button>
          ))}
        </CardContent>
      </Card>

      <Drawer
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      >
        <DrawerContent className="max-h-[85dvh]">
          {selectedUser ? (
            <>
              <DrawerHeader>
                <DrawerTitle>{selectedUser.profile.display_name}</DrawerTitle>
                <DrawerDescription>
                  {t("users.picksCount", { count: selectedUser.picks.length })}
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-2">
                {selectedUser.picks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("users.noPicks")}
                  </p>
                ) : (
                  selectedUser.picks.map((pick) => (
                    <div
                      key={pick.matchId}
                      className="rounded-2xl bg-white/5 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {formatKickoff(pick.kickoffAt)}
                        </p>
                        {pick.boostMultiplier > 1 ? (
                          <Badge variant="outline">x{pick.boostMultiplier}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        <TeamName
                          name={pick.homeTeamName}
                          flagSize={16}
                        />{" "}
                        {pick.homeScore}:{pick.awayScore}{" "}
                        <TeamName
                          name={pick.awayTeamName}
                          flagSize={16}
                        />
                      </p>
                      {pick.scorerName ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("users.scorer")}: {pick.scorerName}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">{t("users.close")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}
