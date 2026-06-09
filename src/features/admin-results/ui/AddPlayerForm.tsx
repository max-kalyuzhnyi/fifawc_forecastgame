"use client";

import { useActionState, useState } from "react";
import { addPlayer } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamName } from "@/shared/ui/TeamFlag";

interface TeamOption {
  id: string;
  name: string;
}

export function AddPlayerForm({ teams }: { teams: TeamOption[] }) {
  const [state, action, pending] = useActionState(addPlayer, null);
  const [teamId, setTeamId] = useState("");

  return (
    <form action={action}>
      <input type="hidden" name="team_id" value={teamId} />
      <FieldGroup className="flex-row flex-wrap items-end">
        <Field>
          <Select value={teamId} onValueChange={setTeamId} required>
            <SelectTrigger className="w-full min-w-48" aria-label="Team">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <TeamName name={team.name} />
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Input
            id="player_name"
            name="name"
            type="text"
            placeholder="Player name"
            aria-label="Player name"
            required
          />
        </Field>
        <Button type="submit" disabled={pending || !teamId}>
          {pending ? "Adding…" : "Add player"}
        </Button>
        {state?.error && (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state?.success && (
          <Alert className="w-full">
            <AlertDescription>Player added</AlertDescription>
          </Alert>
        )}
      </FieldGroup>
    </form>
  );
}
