import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const WIKIPEDIA_API_URL =
  "https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&format=json&formatversion=2";

/** Wikipedia section title → teams.name (OpenFootball naming). */
const WIKIPEDIA_TO_TEAM_NAME: Record<string, string> = {
  "United States": "USA",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
};

type PlayerPosition = "GK" | "DF" | "MF" | "FW";

interface ParsedPlayer {
  name: string;
  /** Wikipedia page title from [[Page title|Display name]] for Commons lookup. */
  wikiTitle: string;
  position: PlayerPosition;
  shirtNumber: number;
}

interface ParsedSquad {
  wikipediaName: string;
  teamName: string;
  players: ParsedPlayer[];
}

const PLAYER_TEMPLATE_MARKER = "{{nat fs g player|";
const TEAM_SECTION_RE = /^===([^=]+)===$/gm;

function extractPlayerTemplateContents(sectionBody: string): string[] {
  const results: string[] = [];
  let searchFrom = 0;

  while (searchFrom < sectionBody.length) {
    const start = sectionBody.indexOf(PLAYER_TEMPLATE_MARKER, searchFrom);
    if (start === -1) break;

    let depth = 1;
    let index = start + 2;

    while (index < sectionBody.length && depth > 0) {
      if (
        sectionBody[index] === "{" &&
        sectionBody[index + 1] === "{"
      ) {
        depth += 1;
        index += 2;
      } else if (
        sectionBody[index] === "}" &&
        sectionBody[index + 1] === "}"
      ) {
        depth -= 1;
        index += 2;
      } else {
        index += 1;
      }
    }

    results.push(
      sectionBody.slice(start + PLAYER_TEMPLATE_MARKER.length, index - 2),
    );
    searchFrom = index;
  }

  return results;
}

function mapWikipediaTeamName(wikipediaName: string): string {
  return WIKIPEDIA_TO_TEAM_NAME[wikipediaName.trim()] ?? wikipediaName.trim();
}

function parsePlayerTemplate(content: string): ParsedPlayer | null {
  const noMatch = content.match(/(?:^|\|)no=(\d+)(?:\||$)/);
  const posMatch = content.match(/(?:^|\|)pos=(GK|DF|MF|FW)(?:\||$)/);
  const nameMatch = content.match(
    /(?:^|\|)name=\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/,
  );

  if (!noMatch || !posMatch || !nameMatch) return null;

  const displayName = (nameMatch[2] ?? nameMatch[1]).trim();
  const shirtNumber = Number.parseInt(noMatch[1], 10);

  if (!displayName || Number.isNaN(shirtNumber)) return null;

  return {
    name: displayName,
    wikiTitle: nameMatch[1].trim(),
    position: posMatch[1] as PlayerPosition,
    shirtNumber,
  };
}

function parseSquads(wikitext: string): ParsedSquad[] {
  const statisticsIndex = wikitext.indexOf("==Statistics==");
  const relevantText =
    statisticsIndex === -1 ? wikitext : wikitext.slice(0, statisticsIndex);

  const squads: ParsedSquad[] = [];
  const sectionMatches = [...relevantText.matchAll(TEAM_SECTION_RE)];

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const wikipediaName = match[1].trim();
    const sectionStart = match.index! + match[0].length;
    const sectionEnd =
      i + 1 < sectionMatches.length
        ? sectionMatches[i + 1].index!
        : relevantText.length;
    const sectionBody = relevantText.slice(sectionStart, sectionEnd);

    const players: ParsedPlayer[] = [];
    for (const templateContent of extractPlayerTemplateContents(sectionBody)) {
      const parsed = parsePlayerTemplate(templateContent);
      if (parsed) players.push(parsed);
    }

    if (players.length === 0) continue;

    squads.push({
      wikipediaName,
      teamName: mapWikipediaTeamName(wikipediaName),
      players,
    });
  }

  return squads;
}

async function fetchWikitext(): Promise<string> {
  const response = await fetch(WIKIPEDIA_API_URL, {
    headers: { "User-Agent": "fifawc-forecastgame/1.0 (squad import)" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Wikipedia: ${response.status}`);
  }

  const data = (await response.json()) as {
    parse?: { wikitext?: string };
  };

  const wikitext = data.parse?.wikitext;
  if (!wikitext) {
    throw new Error("Wikipedia response missing wikitext");
  }

  return wikitext;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);
  const wikitext = await fetchWikitext();
  const squads = parseSquads(wikitext);

  console.log(`Parsed ${squads.length} squads from Wikipedia.`);

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name");

  if (teamsError) throw teamsError;

  const teamIdByName = new Map((teams ?? []).map((team) => [team.name, team.id]));

  let imported = 0;
  const sourcePlayerKeys = new Set<string>();

  for (const squad of squads) {
    const teamId = teamIdByName.get(squad.teamName);
    if (!teamId) {
      throw new Error(
        `Team not found in database: "${squad.teamName}" (Wikipedia: "${squad.wikipediaName}")`,
      );
    }

    if (squad.players.length < 23 || squad.players.length > 26) {
      console.warn(
        `Warning: ${squad.teamName} has ${squad.players.length} players (expected 23–26).`,
      );
    }

    for (const player of squad.players) {
      sourcePlayerKeys.add(`${teamId}:${player.name}`);

      const { error } = await supabase.from("players").upsert(
        {
          team_id: teamId,
          name: player.name,
          wiki_title: player.wikiTitle,
          position: player.position,
          shirt_number: player.shirtNumber,
        },
        { onConflict: "team_id,name" },
      );

      if (error) throw error;
      imported++;
    }
  }

  const { data: existingPlayers, error: existingError } = await supabase
    .from("players")
    .select("team_id, name, teams(name)");

  if (existingError) throw existingError;

  let staleCount = 0;
  for (const player of existingPlayers ?? []) {
    const key = `${player.team_id}:${player.name}`;
    if (!sourcePlayerKeys.has(key)) {
      const teamName =
        (player.teams as { name?: string } | null)?.name ?? player.team_id;
      console.warn(
        `Stale player kept in DB (not in Wikipedia source): ${teamName} — ${player.name}`,
      );
      staleCount++;
    }
  }

  console.log(`Imported ${imported} players across ${squads.length} teams.`);
  if (staleCount > 0) {
    console.log(`${staleCount} stale player(s) left unchanged.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
