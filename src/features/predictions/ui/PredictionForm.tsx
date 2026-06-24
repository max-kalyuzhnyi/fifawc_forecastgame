"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import {
  loadScoreSuggestions,
  type ScoreSuggestion,
} from "@/features/matches/actions";
import type { BoostUsed, PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { savePrediction } from "../actions";
import { ScorerPickerDrawer } from "./ScorerPickerDrawer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreWheelPicker } from "@/components/ui/wheel-picker";
import { cn } from "@/lib/utils";
import { getBoostDayKey } from "@/shared/lib/formatDate";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { sortPlayersForScorerSelect } from "@/shared/lib/sortPlayers";
import { PlayerAvatar } from "@/shared/ui/PlayerAvatar";

interface PlayerOption {
  id: string;
  name: string;
  team_id: string;
  position: "GK" | "DF" | "MF" | "FW" | null;
  shirt_number: number | null;
  photo_url?: string | null;
}

interface PredictionFormProps {
  matchId: string;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  players: PlayerOption[];
  initial?: {
    home_score: number;
    away_score: number;
    scorer_player_id: string | null;
    scorer_name: string | null;
    boost_multiplier: BoostMultiplier;
  };
  locked: boolean;
  boostUsed: BoostUsed;
  currentBoost: BoostMultiplier;
  roundKey: string;
  onPredictionSaved?: (prediction: PredictionDetail) => void;
}

function formatBoostLabel(
  mult: BoostMultiplier,
  t: ReturnType<typeof useTranslations<"predictions">>,
): string {
  if (mult === 1) return t("boostNone");
  return t("boostX2");
}

function getSuggestionLabel(
  suggestion: ScoreSuggestion,
  homeTeamName: string,
  awayTeamName: string,
  drawLabel: string,
): string {
  if (suggestion.outcome === "home") {
    return homeTeamName;
  }

  if (suggestion.outcome === "away") {
    return awayTeamName;
  }

  return drawLabel;
}

function ScoreSuggestionChips({
  suggestions,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  onSelect,
}: {
  suggestions: ScoreSuggestion[];
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  onSelect: (home: number, away: number) => void;
}) {
  const t = useTranslations("predictions");

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs font-medium text-white/70">{t("suggestions")}</p>
      <div className="grid w-full grid-cols-3 gap-2">
        {suggestions.map((suggestion) => {
          const isActive =
            homeScore === suggestion.home && awayScore === suggestion.away;
          const label = getSuggestionLabel(
            suggestion,
            homeTeamName,
            awayTeamName,
            t("draw"),
          );

          return (
            <button
              key={suggestion.outcome}
              type="button"
              onClick={() => onSelect(suggestion.home, suggestion.away)}
              className={cn(
                "flex min-w-0 w-full flex-col items-center rounded-xl border px-2 py-2 text-center transition-colors",
                isActive
                  ? "border-white bg-white/15 text-white"
                  : "border-white/15 bg-white/5 text-white/85 hover:border-white/25 hover:bg-white/10",
              )}
            >
              <span className="w-full truncate text-xs font-medium">{label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {formatMatchScore(suggestion.home, suggestion.away)}
              </span>
              <span className="text-[10px] text-white/50">
                {suggestion.outcomeProbability}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PredictionSummary({
  initial,
  players,
  onEdit,
}: {
  initial: NonNullable<PredictionFormProps["initial"]>;
  players: PlayerOption[];
  onEdit: () => void;
}) {
  const t = useTranslations("predictions");
  const selectedPlayer = players.find(
    (player) => player.id === initial.scorer_player_id,
  );

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col justify-between gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-3xl font-bold tabular-nums text-white">
          {formatMatchScore(initial.home_score, initial.away_score)}
        </p>
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/55">
          {t("myPick")}
        </span>
        {selectedPlayer ? (
          <div className="flex items-center justify-center gap-2">
            <PlayerAvatar
              name={selectedPlayer.name}
              photoUrl={selectedPlayer.photo_url}
              size={28}
            />
            {selectedPlayer.shirt_number != null ? (
              <span className="text-sm font-semibold tabular-nums text-white/60">
                {selectedPlayer.shirt_number}
              </span>
            ) : null}
            <span className="text-sm text-white/80">{selectedPlayer.name}</span>
          </div>
        ) : initial.scorer_name ? (
          <p className="text-sm text-white/70">
            {t("scorer")}: {initial.scorer_name}
          </p>
        ) : null}
        {initial.boost_multiplier > 1 && (
          <p className="text-sm text-white/70">
            {t("boost")}: {formatBoostLabel(initial.boost_multiplier, t)}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="xl"
        onClick={onEdit}
        className="shrink-0 bg-white text-black hover:bg-white/90 aria-expanded:bg-white aria-expanded:text-black"
      >
        {t("changeMind")}
      </Button>
    </div>
  );
}

export function PredictionForm({
  matchId,
  kickoffAt,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  players,
  initial,
  locked,
  boostUsed,
  currentBoost,
  roundKey,
  onPredictionSaved,
}: PredictionFormProps) {
  const t = useTranslations("predictions");
  const router = useRouter();
  const boostDay = getBoostDayKey(kickoffAt);
  const initialKey = initial
    ? `${initial.home_score}:${initial.away_score}:${initial.scorer_player_id ?? ""}:${initial.boost_multiplier}`
    : "";
  const [mode, setMode] = useState<"readonly" | "edit">(
    initial ? "readonly" : "edit",
  );
  const [state, action, pending] = useActionState(
    async (
      prev: { error?: string; success?: boolean } | null,
      formData: FormData,
    ) => {
      const result = await savePrediction(prev, formData);
      if (result.success) {
        setMode("readonly");

        const savedHome = Number(formData.get("home_score"));
        const savedAway = Number(formData.get("away_score"));
        const savedScorerId = String(formData.get("scorer_player_id") || "");
        const boostMultiplier = Number(
          formData.get("boost_multiplier"),
        ) as BoostMultiplier;
        const savedBoostDay = String(formData.get("boost_day") || "");
        const selectedPlayer = players.find(
          (player) => player.id === savedScorerId,
        );

        onPredictionSaved?.({
          round_key: roundKey,
          home_score: savedHome,
          away_score: savedAway,
          scorer_player_id: savedScorerId || null,
          scorer_name: selectedPlayer?.name ?? null,
          boost_multiplier: boostMultiplier,
          boost_day: boostMultiplier === 2 ? savedBoostDay : null,
        });

        router.refresh();
      }
      return result;
    },
    null,
  );
  const [homeScore, setHomeScore] = useState(initial?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(initial?.away_score ?? 0);
  const [scorerPlayerId, setScorerPlayerId] = useState(
    initial?.scorer_player_id ?? "",
  );
  const [boost, setBoost] = useState(String(initial?.boost_multiplier ?? 1));
  const [suggestions, setSuggestions] = useState<ScoreSuggestion[] | null>(
    null,
  );

  useEffect(() => {
    if (initial) {
      setHomeScore(initial.home_score);
      setAwayScore(initial.away_score);
      setScorerPlayerId(initial.scorer_player_id ?? "");
      setBoost(String(initial.boost_multiplier ?? 1));
      setMode("readonly");
      return;
    }

    setHomeScore(0);
    setAwayScore(0);
    setScorerPlayerId("");
    setBoost("1");
    setMode("edit");
  }, [matchId, initialKey]);

  useEffect(() => {
    let cancelled = false;

    loadScoreSuggestions(homeTeamName, awayTeamName).then((data) => {
      if (!cancelled) {
        setSuggestions(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [homeTeamName, awayTeamName]);

  const homePlayers = sortPlayersForScorerSelect(
    players.filter((player) => player.team_id === homeTeamId),
  );
  const awayPlayers = sortPlayersForScorerSelect(
    players.filter((player) => player.team_id === awayTeamId),
  );

  const showX2 = !boostUsed.x2 || currentBoost === 2;
  const boostTabTriggerClassName = cn(
    "h-full flex-1 !rounded-[10px] text-sm font-medium text-white/60 transition-colors",
    "hover:text-white/80",
    "data-active:!border data-active:!border-white/40 data-active:bg-white/20",
    "data-active:font-semibold data-active:text-white",
  );

  const savedSnapshot = useMemo(() => {
    if (!state?.success) return null;

    const selectedPlayer = players.find((player) => player.id === scorerPlayerId);

    return {
      home_score: homeScore,
      away_score: awayScore,
      scorer_player_id: scorerPlayerId || null,
      scorer_name: selectedPlayer?.name ?? null,
      boost_multiplier: Number(boost) as BoostMultiplier,
    };
  }, [state?.success, homeScore, awayScore, scorerPlayerId, boost, players]);

  const summaryData = savedSnapshot ?? initial;

  const handleEdit = () => {
    if (summaryData) {
      setHomeScore(summaryData.home_score);
      setAwayScore(summaryData.away_score);
      setScorerPlayerId(summaryData.scorer_player_id ?? "");
      setBoost(String(summaryData.boost_multiplier ?? 1));
    }
    setMode("edit");
  };

  if (locked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("locked")}</CardTitle>
          {initial && (
            <CardDescription>
              {t("yourPick", {
                pick: formatMatchScore(initial.home_score, initial.away_score),
              })}
              {initial.scorer_name && ` · ${t("scorer")}: ${initial.scorer_name}`}
              {initial.boost_multiplier > 1 &&
                ` · x${initial.boost_multiplier}`}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    );
  }

  if (summaryData && mode === "readonly") {
    return (
      <PredictionSummary
        initial={summaryData}
        players={players}
        onEdit={handleEdit}
      />
    );
  }

  return (
    <form
      action={action}
      data-vaul-no-drag
      className="flex w-full min-h-0 flex-1 flex-col justify-between gap-4"
    >
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="home_score" value={homeScore} />
      <input type="hidden" name="away_score" value={awayScore} />
      <input type="hidden" name="scorer_player_id" value={scorerPlayerId} />
      <input type="hidden" name="boost_multiplier" value={boost} />
      <input type="hidden" name="boost_day" value={boostDay} />

      <FieldGroup className="min-h-0 flex-1">
        {suggestions && suggestions.length > 0 ? (
          <Field>
            <ScoreSuggestionChips
              suggestions={suggestions}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeScore={homeScore}
              awayScore={awayScore}
              onSelect={(home, away) => {
                setHomeScore(home);
                setAwayScore(away);
              }}
            />
          </Field>
        ) : null}

        <Field>
          <ScoreWheelPicker
            homeScore={homeScore}
            awayScore={awayScore}
            onHomeChange={setHomeScore}
            onAwayChange={setAwayScore}
            homeLabel={homeTeamName}
            awayLabel={awayTeamName}
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs font-medium text-white/70">
            {t("scorer")}
          </FieldLabel>
          <ScorerPickerDrawer
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            selectedPlayerId={scorerPlayerId}
            onSelect={setScorerPlayerId}
          />
          <FieldDescription className="text-white/60">
            {t("scorerBonusHint")}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel className="text-xs font-medium text-white/70">
            {t("boost")}
          </FieldLabel>
          <Tabs
            value={boost}
            onValueChange={(value) => {
              if (value) setBoost(value);
            }}
          >
            <TabsList
              className="h-11 w-full gap-1 rounded-xl bg-white/10 p-1 group-data-horizontal/tabs:h-11"
              indicatorVariant="none"
              data-vaul-no-drag
            >
              <TabsTrigger value="1" className={boostTabTriggerClassName}>
                {t("boostNone")}
              </TabsTrigger>
              {showX2 ? (
                <TabsTrigger value="2" className={boostTabTriggerClassName}>
                  {t("boostX2")}
                </TabsTrigger>
              ) : null}
            </TabsList>
          </Tabs>
          <FieldDescription className="text-white/60">
            {t("boostPerDay")}
          </FieldDescription>
        </Field>

        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>

      <Button
        type="submit"
        disabled={pending}
        size="xl"
        className="w-full shrink-0 bg-white text-black hover:bg-white/90"
      >
        {pending ? t("saving") : initial ? t("update") : t("save")}
      </Button>
    </form>
  );
}
