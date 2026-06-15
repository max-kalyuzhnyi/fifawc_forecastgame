"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  sendCommunication,
  type SendCommunicationResult,
} from "@/features/admin/actions";
import {
  selectTelegramRecipients,
  type CommunicationTarget,
} from "@/features/admin/lib/selectTelegramRecipients";
import type {
  AdminMatch,
  AdminPrediction,
  AdminProfile,
} from "@/features/admin/lib/types";
import { formatKickoff } from "@/shared/lib/formatDate";
import { TeamName } from "@/shared/ui/TeamFlag";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface CommunicationsTabProps {
  profiles: AdminProfile[];
  predictions: AdminPrediction[];
  matches: AdminMatch[];
}

export function CommunicationsTab({
  profiles,
  predictions,
  matches,
}: CommunicationsTabProps) {
  const t = useTranslations("admin.communications");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<CommunicationTarget>("selectedUsers");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirmAll, setConfirmAll] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { recipients, match: soonMatch } = useMemo(
    () =>
      selectTelegramRecipients({
        target,
        profiles,
        predictions,
        matches,
        selectedUserIds,
      }),
    [target, profiles, predictions, matches, selectedUserIds],
  );

  const telegramProfiles = useMemo(
    () => profiles.filter((profile) => profile.telegram_id != null),
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const needle = userFilter.trim().toLowerCase();
    if (!needle) return telegramProfiles;

    return telegramProfiles.filter((profile) =>
      profile.display_name.toLowerCase().includes(needle),
    );
  }, [telegramProfiles, userFilter]);

  function toggleUser(userId: string, checked: boolean) {
    setSelectedUserIds((current) =>
      checked
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId),
    );
  }

  function handleSend() {
    setFeedback(null);
    startTransition(async () => {
      const result: SendCommunicationResult = await sendCommunication({
        message,
        target,
        selectedUserIds:
          target === "selectedUsers" ? selectedUserIds : undefined,
        confirmAll: target === "all" ? confirmAll : undefined,
      });

      if (result.success) {
        setFeedback({
          type: "success",
          message: t("sendResult", {
            sent: result.sent ?? 0,
            failed: result.failed ?? 0,
            total: result.total ?? 0,
          }),
        });
        return;
      }

      setFeedback({
        type: "error",
        message: result.error ?? t("sendFailed"),
      });
    });
  }

  const canSend =
    message.trim().length > 0 &&
    recipients.length > 0 &&
    (target !== "all" || confirmAll) &&
    !isPending;

  return (
    <div className="flex flex-col gap-4">
      {feedback ? (
        <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="communication-message">{t("message")}</FieldLabel>
            <textarea
              id="communication-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={6}
              maxLength={4096}
              className={cn(
                "corner-squircle w-full min-w-0 resize-y rounded-lg border border-transparent bg-input/50 px-3 py-2 text-base transition-[color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm",
              )}
            />
            <FieldDescription>{t("messageHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{t("target")}</FieldLabel>
            <ToggleGroup
              type="single"
              value={target}
              onValueChange={(value) => {
                if (value) setTarget(value as CommunicationTarget);
              }}
              variant="outline"
              className="w-full flex-wrap"
            >
              <ToggleGroupItem value="selectedUsers" className="flex-1">
                {t("targetSelected")}
              </ToggleGroupItem>
              <ToggleGroupItem value="missingNextPick" className="flex-1">
                {t("targetMissingPick")}
              </ToggleGroupItem>
              <ToggleGroupItem value="all" className="flex-1">
                {t("targetAll")}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          {target === "selectedUsers" ? (
            <Field>
              <FieldLabel htmlFor="communication-user-filter">
                {t("selectUsers")}
              </FieldLabel>
              <input
                id="communication-user-filter"
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                placeholder={t("searchUsers")}
                className={cn(
                  "corner-squircle h-10 w-full min-w-0 rounded-lg border border-transparent bg-input/50 px-3 py-2 text-base transition-[color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm",
                )}
              />
              <div className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {filteredProfiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("noTelegramUsers")}
                  </p>
                ) : (
                  filteredProfiles.map((profile) => {
                    const checked = selectedUserIds.includes(profile.id);
                    return (
                      <label
                        key={profile.id}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/5 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            toggleUser(profile.id, event.target.checked)
                          }
                          className="size-4 rounded border-input"
                        />
                        <span className="truncate text-sm font-medium">
                          {profile.display_name}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </Field>
          ) : null}

          {target === "missingNextPick" && soonMatch ? (
            <div className="rounded-2xl bg-white/5 px-3 py-2.5 text-sm">
              <p className="font-medium">{t("soonMatch")}</p>
              <p className="mt-1 text-muted-foreground">
                {formatKickoff(soonMatch.kickoff_at)}
              </p>
              <p className="mt-1">
                <TeamName name={soonMatch.home_team_name} /> vs{" "}
                <TeamName name={soonMatch.away_team_name} />
              </p>
            </div>
          ) : null}

          {target === "all" ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
              <Label htmlFor="communication-confirm-all" className="text-sm">
                {t("confirmAll", { count: recipients.length })}
              </Label>
              <Switch
                id="communication-confirm-all"
                checked={confirmAll}
                onCheckedChange={setConfirmAll}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("recipientPreview", { count: recipients.length })}
            </p>
            <Button disabled={!canSend} onClick={handleSend}>
              {isPending ? t("sending") : t("send")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
