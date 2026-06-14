"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { pingAllPending, pingUser } from "@/features/admin/actions";
import type { NextMatchPickers } from "@/features/admin/lib/types";
import { formatKickoff } from "@/shared/lib/formatDate";
import { TeamName } from "@/shared/ui/TeamFlag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PicksTabProps {
  pickers: NextMatchPickers | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PicksTab({ pickers }: PicksTabProps) {
  const t = useTranslations("admin");
  const [isPending, startTransition] = useTransition();
  const [pingingUserId, setPingingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!pickers) {
    return (
      <p className="text-sm text-muted-foreground">{t("picks.noUpcoming")}</p>
    );
  }

  const { match, withPick, withoutPick } = pickers;

  function handlePingUser(userId: string) {
    setFeedback(null);
    setPingingUserId(userId);
    startTransition(async () => {
      const result = await pingUser(userId, match.id);
      setPingingUserId(null);
      if (result.success) {
        setFeedback({ type: "success", message: t("ping.sent") });
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? t("ping.sendFailed"),
        });
      }
    });
  }

  function handlePingAll() {
    setFeedback(null);
    startTransition(async () => {
      const result = await pingAllPending(match.id);
      if (result.success) {
        setFeedback({
          type: "success",
          message: t("ping.pingAllResult", {
            sent: result.sent ?? 0,
            failed: result.failed ?? 0,
          }),
        });
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? t("ping.sendFailed"),
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {feedback ? (
        <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>{t("picks.nextMatch")}</CardTitle>
          <CardDescription>{formatKickoff(match.kickoff_at)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-base font-semibold">
            <TeamName name={match.home_team_name} /> {match.home_score ?? "–"}:{" "}
            {match.away_score ?? "–"}{" "}
            <TeamName name={match.away_team_name} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">
              {t("picks.pendingTitle", { count: withoutPick.length })}
            </CardTitle>
            <CardDescription>{t("picks.description")}</CardDescription>
          </div>
          {withoutPick.length > 0 ? (
            <Button
              size="sm"
              disabled={isPending}
              onClick={handlePingAll}
            >
              {isPending && !pingingUserId
                ? t("ping.sendingAll")
                : t("ping.pingAll", { count: withoutPick.length })}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {withoutPick.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("picks.allDone")}</p>
          ) : (
            withoutPick.map(({ profile }) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2"
              >
                <Avatar size="sm">
                  {profile.photo_url ? (
                    <AvatarImage
                      src={profile.photo_url}
                      alt={profile.display_name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(profile.display_name)}
                  </AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {profile.display_name}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !profile.telegram_id}
                  onClick={() => handlePingUser(profile.id)}
                >
                  {pingingUserId === profile.id
                    ? t("ping.sending")
                    : t("ping.ping")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle className="text-base">
            {t("picks.withPickTitle", { count: withPick.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {withPick.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("picks.noPicksYet")}
            </p>
          ) : (
            withPick.map(({ profile }) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2"
              >
                <Avatar size="sm">
                  {profile.photo_url ? (
                    <AvatarImage
                      src={profile.photo_url}
                      alt={profile.display_name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(profile.display_name)}
                  </AvatarFallback>
                </Avatar>
                <p className="truncate text-sm font-medium">
                  {profile.display_name}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
