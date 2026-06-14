"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";
import { TeamName } from "@/shared/ui/TeamFlag";

export interface ScorerPlayerOption {
  id: string;
  name: string;
  shirt_number: number | null;
  photo_url?: string | null;
  position?: "GK" | "DF" | "MF" | "FW" | null;
}

interface ScorerPickerDrawerProps {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: ScorerPlayerOption[];
  awayPlayers: ScorerPlayerOption[];
  selectedPlayerId: string;
  onSelect: (playerId: string) => void;
}

function splitPlayerName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function getPositionLabel(
  position: ScorerPlayerOption["position"],
  t: ReturnType<typeof useTranslations<"predictions">>,
): string | null {
  if (!position) return null;
  return t(`position.${position}`);
}

function PlayerRow({
  player,
  selected,
  onSelect,
  positionLabel,
}: {
  player: ScorerPlayerOption;
  selected: boolean;
  onSelect: () => void;
  positionLabel: string | null;
}) {
  const { firstName, lastName } = splitPlayerName(player.name);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        selected ? "bg-white/15" : "hover:bg-white/10",
      )}
    >
      <PlayerAvatar
        name={player.name}
        photoUrl={player.photo_url}
        size={40}
      />
      {player.shirt_number != null ? (
        <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-white/60">
          {player.shirt_number}
        </span>
      ) : (
        <span className="w-6 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">
          {firstName}
        </span>
        {lastName ? (
          <span className="block truncate text-xs text-white/60">{lastName}</span>
        ) : null}
      </span>
      {positionLabel ? (
        <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium leading-none text-white/55">
          {positionLabel}
        </span>
      ) : null}
    </button>
  );
}

function SelectedPlayerDisplay({
  player,
  positionLabel,
}: {
  player: ScorerPlayerOption;
  positionLabel: string | null;
}) {
  const { firstName, lastName } = splitPlayerName(player.name);

  return (
    <>
      <PlayerAvatar
        name={player.name}
        photoUrl={player.photo_url}
        size={32}
      />
      {player.shirt_number != null ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-white/60">
          {player.shirt_number}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate text-sm text-white">
        <span className="font-medium">{firstName}</span>
        {lastName ? (
          <span className="text-white/70"> {lastName}</span>
        ) : null}
      </span>
      {positionLabel ? (
        <span className="shrink-0 text-[11px] font-medium text-white/50">
          {positionLabel}
        </span>
      ) : null}
    </>
  );
}

export function ScorerPickerDrawer({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
  selectedPlayerId,
  onSelect,
}: ScorerPickerDrawerProps) {
  const t = useTranslations("predictions");
  const [open, setOpen] = useState(false);
  const [teamTab, setTeamTab] = useState<"home" | "away">("home");

  const allPlayers = [...homePlayers, ...awayPlayers];
  const selectedPlayer = allPlayers.find(
    (player) => player.id === selectedPlayerId,
  );

  const handleSelect = (playerId: string) => {
    onSelect(playerId);
    setOpen(false);
  };

  const teamTabClassName =
    "h-full flex-1 text-sm text-white/60 hover:text-white data-active:text-white";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-vaul-no-drag
        className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 text-left transition-colors hover:border-white/25 hover:bg-white/10"
        aria-label={t("selectScorer")}
      >
        {selectedPlayer ? (
          <SelectedPlayerDisplay
            player={selectedPlayer}
            positionLabel={getPositionLabel(selectedPlayer.position, t)}
          />
        ) : (
          <span className="text-sm text-white/50">{t("selectScorer")}</span>
        )}
      </button>

      <DrawerNestedRoot open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="z-[70] max-h-[75dvh] border-0"
          overlayClassName="z-[70] bg-black/55"
        >
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>{t("selectScorer")}</DrawerTitle>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                !selectedPlayerId
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {t("noScorer")}
            </button>

            <Tabs
              value={teamTab}
              onValueChange={(value) => {
                if (value === "home" || value === "away") {
                  setTeamTab(value);
                }
              }}
              className="flex min-h-0 flex-1 flex-col gap-3"
            >
              <TabsList
                className="h-11 w-full shrink-0 bg-white/10 p-1"
                indicatorClassName="bg-white/20"
              >
                <TabsTrigger value="home" className={teamTabClassName}>
                  <TeamName name={homeTeamName} />
                </TabsTrigger>
                <TabsTrigger value="away" className={teamTabClassName}>
                  <TeamName name={awayTeamName} />
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="home"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                data-vaul-no-drag
              >
                <div className="flex flex-col gap-1">
                  {homePlayers.map((player) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      selected={player.id === selectedPlayerId}
                      positionLabel={getPositionLabel(player.position, t)}
                      onSelect={() => handleSelect(player.id)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="away"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                data-vaul-no-drag
              >
                <div className="flex flex-col gap-1">
                  {awayPlayers.map((player) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      selected={player.id === selectedPlayerId}
                      positionLabel={getPositionLabel(player.position, t)}
                      onSelect={() => handleSelect(player.id)}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DrawerClose className="sr-only">{t("close")}</DrawerClose>
        </DrawerContent>
      </DrawerNestedRoot>
    </>
  );
}
