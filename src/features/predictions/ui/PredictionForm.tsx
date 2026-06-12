"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { savePrediction } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreWheelPicker } from "@/components/ui/wheel-picker";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { sortPlayersForScorerSelect } from "@/shared/lib/sortPlayers";
import { TeamName } from "@/shared/ui/TeamFlag";

interface PlayerOption {
  id: string;
  name: string;
  team_id: string;
  position: "GK" | "DF" | "MF" | "FW" | null;
  shirt_number: number | null;
}

interface PredictionFormProps {
  matchId: string;
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
  boostUsed: { x2: boolean; x3: boolean };
  currentBoost: BoostMultiplier;
}

// TODO: показать поля выбора бомбардира и буста после релиза
const SHOW_GOALSCORER_AND_BOOST = false;

function formatBoostLabel(mult: BoostMultiplier): string {
  if (mult === 1) return "None";
  if (mult === 2) return "🔥🔥 x2";
  return "🔥🔥🔥 x3";
}

function PredictionSummary({
  initial,
  onEdit,
}: {
  initial: NonNullable<PredictionFormProps["initial"]>;
  onEdit: () => void;
}) {
  const t = useTranslations("predictions");

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col justify-between gap-4">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-3xl font-bold tabular-nums text-white">
          {formatMatchScore(initial.home_score, initial.away_score)}
        </p>
        {initial.scorer_name && (
          <p className="text-sm text-white/70">
            Scorer: {initial.scorer_name}
          </p>
        )}
        {initial.boost_multiplier > 1 && (
          <p className="text-sm text-white/70">
            Boost: {formatBoostLabel(initial.boost_multiplier)}
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
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  players,
  initial,
  locked,
  boostUsed,
  currentBoost,
}: PredictionFormProps) {
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

  const homePlayers = sortPlayersForScorerSelect(
    players.filter((p) => p.team_id === homeTeamId),
  );
  const awayPlayers = sortPlayersForScorerSelect(
    players.filter((p) => p.team_id === awayTeamId),
  );

  const showX2 = !boostUsed.x2 || currentBoost === 2;
  const showX3 = !boostUsed.x3 || currentBoost === 3;
  const showBoostBlock = showX2 || showX3;
  const boostTabTriggerClassName =
    "h-full flex-1 text-sm text-white/60 hover:text-white data-active:bg-white/20 data-active:text-white dark:text-white/60 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white";

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

  if (locked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Predictions locked</CardTitle>
          {initial && (
            <CardDescription>
              Your pick:{" "}
              {formatMatchScore(initial.home_score, initial.away_score)}
              {initial.scorer_name && ` · Scorer: ${initial.scorer_name}`}
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
        onEdit={() => setMode("edit")}
      />
    );
  }

  return (
    <form
      action={action}
      className="flex w-full min-h-0 flex-1 flex-col justify-between gap-4"
    >
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="home_score" value={homeScore} />
      <input type="hidden" name="away_score" value={awayScore} />
      <input type="hidden" name="scorer_player_id" value={scorerPlayerId} />
      <input type="hidden" name="boost_multiplier" value={boost} />

      <FieldGroup className="min-h-0 flex-1">
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

        {SHOW_GOALSCORER_AND_BOOST && (
        <Field>
          <Select
            value={scorerPlayerId || "none"}
            onValueChange={(value) =>
              setScorerPlayerId(value === "none" ? "" : value)
            }
          >
            <SelectTrigger
              className="h-12 w-full text-base"
              aria-label="Goalscorer"
            >
              <SelectValue placeholder="Choose player who score" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">None</SelectItem>
              </SelectGroup>
              {homePlayers.length > 0 && (
                <SelectGroup>
                  <SelectLabel>
                    <TeamName name={homeTeamName} />
                  </SelectLabel>
                  {homePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <span className="flex items-center gap-2">
                        {player.shirt_number != null && (
                          <span className="text-muted-foreground tabular-nums">
                            {player.shirt_number}
                          </span>
                        )}
                        <span>{player.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {awayPlayers.length > 0 && (
                <SelectGroup>
                  <SelectLabel>
                    <TeamName name={awayTeamName} />
                  </SelectLabel>
                  {awayPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      <span className="flex items-center gap-2">
                        {player.shirt_number != null && (
                          <span className="text-muted-foreground tabular-nums">
                            {player.shirt_number}
                          </span>
                        )}
                        <span>{player.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </Field>
        )}

        {SHOW_GOALSCORER_AND_BOOST && showBoostBlock && (
          <Field>
            <Tabs
              value={boost}
              onValueChange={(value) => {
                if (value) setBoost(value);
              }}
            >
              <TabsList className="h-11 w-full bg-white/10 p-1 group-data-horizontal/tabs:h-11">
                <TabsTrigger value="1" className={boostTabTriggerClassName}>
                  None
                </TabsTrigger>
                {showX2 && (
                  <TabsTrigger value="2" className={boostTabTriggerClassName}>
                    🔥🔥 x2
                  </TabsTrigger>
                )}
                {showX3 && (
                  <TabsTrigger value="3" className={boostTabTriggerClassName}>
                    🔥🔥🔥 x3
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            <FieldDescription className="text-white/60">
              One x2 and one x3 boost per round.
            </FieldDescription>
          </Field>
        )}

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
        {pending ? "Saving…" : "Save prediction"}
      </Button>
    </form>
  );
}
