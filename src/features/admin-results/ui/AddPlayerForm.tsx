"use client";

import { useActionState } from "react";
import { addPlayer } from "../actions";

interface TeamOption {
  id: string;
  name: string;
}

export function AddPlayerForm({ teams }: { teams: TeamOption[] }) {
  const [state, action, pending] = useActionState(addPlayer, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium">Team</label>
        <select
          name="team_id"
          required
          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Select team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Player name</label>
        <input
          name="name"
          type="text"
          required
          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Add player
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="w-full text-xs text-emerald-600">Player added</p>
      )}
    </form>
  );
}
