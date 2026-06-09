"use client";

import { useActionState } from "react";
import { saveMatchResult } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TeamName } from "@/shared/ui/TeamFlag";

interface MatchResultFormProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  initialHome?: number | null;
  initialAway?: number | null;
  initialScorers?: string;
}

export function MatchResultForm({
  matchId,
  homeTeamName,
  awayTeamName,
  initialHome,
  initialAway,
  initialScorers = "",
}: MatchResultFormProps) {
  const [state, action, pending] = useActionState(saveMatchResult, null);

  return (
    <Card size="sm">
      <form action={action}>
        <input type="hidden" name="match_id" value={matchId} />
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <TeamName name={homeTeamName} />
            <span>vs</span>
            <TeamName name={awayTeamName} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <div className="flex items-center gap-2">
                <Input
                  id={`home-${matchId}`}
                  name="home_score"
                  type="number"
                  min={0}
                  defaultValue={initialHome ?? 0}
                  placeholder={homeTeamName}
                  aria-label={homeTeamName}
                  required
                  className="w-20"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  id={`away-${matchId}`}
                  name="away_score"
                  type="number"
                  min={0}
                  defaultValue={initialAway ?? 0}
                  placeholder={awayTeamName}
                  aria-label={awayTeamName}
                  required
                  className="w-20"
                />
              </div>
            </Field>
            <Field>
              <Input
                id={`scorers-${matchId}`}
                name="scorers"
                type="text"
                placeholder="Scorers (comma-separated)"
                aria-label="Scorers"
                defaultValue={initialScorers}
              />
            </Field>
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            {state?.success && (
              <Alert>
                <AlertDescription>Result saved</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save result"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
