"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  updateAvatar,
  updateDisplayName,
  updateLocale,
  updateNotificationSettings,
} from "@/features/settings/actions";
import { prepareImageForUpload } from "@/features/settings/lib/prepareImage";
import { locales } from "@/i18n/config";
import type { Locale } from "@/shared/types/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  displayName: string;
  photoUrl: string | null;
  notifyGoals: boolean;
  locale: Locale;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function SettingsView({
  displayName,
  photoUrl,
  notifyGoals,
  locale: initialLocale,
}: SettingsViewProps) {
  const router = useRouter();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("common.errors");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [avatarUrl, setAvatarUrl] = useState(photoUrl);
  const [notifyEnabled, setNotifyEnabled] = useState(notifyGoals);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(initialLocale);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [localeError, setLocaleError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isNamePending, startNameTransition] = useTransition();
  const [isNotifyPending, startNotifyTransition] = useTransition();
  const [isLocalePending, startLocaleTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form after server refresh
    setName(displayName);
  }, [displayName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form after server refresh
    setAvatarUrl(photoUrl);
  }, [photoUrl]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form after server refresh
    setSelectedLocale(initialLocale);
  }, [initialLocale]);

  function handleAvatarPick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProfileError(null);

    startProfileTransition(async () => {
      try {
        const prepared = await prepareImageForUpload(file);
        const formData = new FormData();
        formData.set(
          "avatar",
          new File([prepared], "avatar.jpg", {
            type: prepared.type || "image/jpeg",
          }),
        );

        const result = await updateAvatar(null, formData);
        if (result.error) {
          setProfileError(result.error);
          return;
        }

        if (result.photoUrl) {
          setAvatarUrl(result.photoUrl);
        }
        router.refresh();
      } catch {
        setProfileError(tErrors("failedUploadAvatar"));
      }
    });
  }

  function handleNameSave() {
    setNameError(null);
    setNameSuccess(false);

    startNameTransition(async () => {
      const formData = new FormData();
      formData.set("display_name", name);

      const result = await updateDisplayName(null, formData);
      if (result.error) {
        setNameError(result.error);
        return;
      }

      setNameSuccess(true);
      router.refresh();
    });
  }

  function handleToggle(checked: boolean) {
    setNotifyEnabled(checked);
    setNotifyError(null);

    startNotifyTransition(async () => {
      const formData = new FormData();
      formData.set("notify_goals", checked ? "true" : "false");

      const result = await updateNotificationSettings(null, formData);
      if (result.error) {
        setNotifyEnabled(!checked);
        setNotifyError(result.error);
      }
    });
  }

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === selectedLocale) return;

    setLocaleError(null);
    setSelectedLocale(nextLocale);

    startLocaleTransition(async () => {
      const result = await updateLocale(nextLocale);
      if (result.error) {
        setSelectedLocale(initialLocale);
        setLocaleError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const nameChanged = name.trim() !== displayName.trim();

  return (
    <div className="flex flex-col animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
      <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <h1 className="text-[15px] font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="px-4 py-4">
          <FieldGroup>
            <div className="space-y-1">
              <h2 className="text-[13px] font-medium text-foreground">{t("profile")}</h2>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("profileDescription")}
              </p>
            </div>

            <Field orientation="vertical">
              <FieldLabel>{t("avatar")}</FieldLabel>
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="size-16">
                  <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                  <AvatarFallback className="text-base">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProfilePending}
                    onClick={handleAvatarPick}
                  >
                    {isProfilePending ? tCommon("uploading") : t("changePhoto")}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    {t("imageFormats")}
                  </p>
                </div>
              </div>
              {profileError && <FieldError>{profileError}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="display-name">{t("displayName")}</FieldLabel>
              <div className="flex gap-2">
                <input
                  id="display-name"
                  type="text"
                  value={name}
                  maxLength={32}
                  disabled={isNamePending}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameSuccess(false);
                    setNameError(null);
                  }}
                  className="h-9 min-w-0 flex-1 rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isNamePending || !nameChanged || !name.trim()}
                  onClick={handleNameSave}
                >
                  {isNamePending ? tCommon("saving") : tCommon("save")}
                </Button>
              </div>
              {nameError && <FieldError>{nameError}</FieldError>}
              {nameSuccess && !nameError && (
                <p className="text-[11px] text-muted-foreground">
                  {t("nameUpdated")}
                </p>
              )}
            </Field>

            <Separator className="bg-white/[0.08]" />

            <Field orientation="vertical">
              <FieldLabel>{t("language")}</FieldLabel>
              <FieldDescription>{t("languageDescription")}</FieldDescription>
              <div className="flex gap-2">
                {locales.map((localeOption) => (
                  <Button
                    key={localeOption}
                    type="button"
                    size="sm"
                    variant={selectedLocale === localeOption ? "default" : "outline"}
                    disabled={isLocalePending}
                    onClick={() => handleLocaleChange(localeOption)}
                    className={cn("flex-1")}
                  >
                    {t(`languages.${localeOption}`)}
                  </Button>
                ))}
              </div>
              {localeError && <FieldError>{localeError}</FieldError>}
            </Field>

            <Separator className="bg-white/[0.08]" />

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>{t("goalNotifications")}</FieldTitle>
                <FieldDescription>
                  {t("goalNotificationsDescription")}
                </FieldDescription>
              </FieldContent>
              <FieldLabel htmlFor="notify-goals" className="sr-only">
                {t("goalNotifications")}
              </FieldLabel>
              <Switch
                id="notify-goals"
                checked={notifyEnabled}
                disabled={isNotifyPending}
                onCheckedChange={handleToggle}
                aria-label={t("goalNotifications")}
              />
            </Field>
            {notifyError && <FieldError>{notifyError}</FieldError>}
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
