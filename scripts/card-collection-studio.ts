import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CARD_TEAMS, PLAYERS_PER_TEAM } from "@/shared/lib/cards/config";
import { applyCardPhotoSelections } from "./lib/apply-card-selections";
import { pushCardCollectionLocal } from "./lib/push-card-collection";
import {
  CARD_COLLECTION_DIR,
  CARD_COLLECTION_PREVIEWS_DIR,
  CARD_COLLECTION_SELECTIONS_PATH,
  CARD_COLLECTION_STUDIO_HTML_PATH,
  CARD_COLLECTION_STUDIO_STATE_PATH,
  emptyStudioState,
  loadCardRoster,
  loadStudioState,
  saveStudioState,
  type CardPhotoSelection,
  type StudioState,
} from "./lib/card-collection";
import { loadReviewEntries } from "./lib/card-photo-review";

const PORT = Number(process.env.CARD_COLLECTION_STUDIO_PORT ?? 3847);
const HOST = process.env.CARD_COLLECTION_STUDIO_HOST ?? "127.0.0.1";

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "text/javascript";
  return "application/octet-stream";
}

async function serveStatic(relativePath: string, res: ServerResponse): Promise<boolean> {
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.join(CARD_COLLECTION_DIR, safePath);

  if (!absolutePath.startsWith(CARD_COLLECTION_DIR)) {
    return false;
  }

  try {
    const data = await readFile(absolutePath);
    res.writeHead(200, { "Content-Type": contentTypeFor(absolutePath) });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

async function loadSelections(): Promise<CardPhotoSelection[]> {
  try {
    const raw = await readFile(CARD_COLLECTION_SELECTIONS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CardPhotoSelection[]) : [];
  } catch {
    return [];
  }
}

async function buildStatus() {
  const [roster, selections, studioState, review] = await Promise.all([
    loadCardRoster().catch(() => null),
    loadSelections(),
    loadStudioState(),
    loadReviewEntries().catch(() => null),
  ]);

  const teams = CARD_TEAMS.map((teamName) => {
    const teamRoster = roster?.teams
      ? Object.values(roster.teams).find((team) => team.teamName === teamName)
      : null;
    const poolSize = teamRoster?.players.length ?? 0;
    const selected = selections.filter((selection) => selection.teamName === teamName).length;
    const inReview = review?.entries.filter((entry) => entry.teamName === teamName).length ?? 0;

    return {
      teamName,
      poolSize,
      inReview,
      selected,
      valid: selected === PLAYERS_PER_TEAM,
    };
  });

  const teamsInReview = new Set(review?.entries.map((entry) => entry.teamName) ?? []);
  const allValid = teams
    .filter((team) => teamsInReview.has(team.teamName))
    .every((team) => team.valid);

  return {
    reviewPath: review?.reviewPath ?? null,
    reviewPlayerCount: review?.entries.length ?? 0,
    selectionsPath: CARD_COLLECTION_SELECTIONS_PATH,
    selectionsCount: selections.length,
    teams,
    allValid,
    studioState: studioState ?? emptyStudioState(),
    requiredPerTeam: PLAYERS_PER_TEAM,
  };
}

async function handleApply(): Promise<StudioState> {
  const selections = await loadSelections();
  const { reviewPath, entries } = await loadReviewEntries();
  const roster = await loadCardRoster();
  const rosterPlayersByTeam = new Map(
    Object.values(roster.teams).map((team) => [team.teamName, team.players]),
  );

  const result = await applyCardPhotoSelections({
    selections,
    reviewPath,
    reviewEntries: entries,
    rosterPlayersByTeam,
  });

  const state: StudioState = {
    updatedAt: new Date().toISOString(),
    applySucceeded: result.skipped === 0 && result.applied > 0,
    pushSucceeded: false,
    lastApplyAt: new Date().toISOString(),
    lastPushAt: null,
    applyLogs: result.logs,
    pushLogs: [],
  };

  await saveStudioState(state);
  return state;
}

async function handlePush(): Promise<StudioState> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const existing = (await loadStudioState()) ?? emptyStudioState();
  if (!existing.applySucceeded) {
    throw new Error("Apply must succeed before push.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const result = await pushCardCollectionLocal({ supabase, supabaseUrl });

  const state: StudioState = {
    ...existing,
    updatedAt: new Date().toISOString(),
    pushSucceeded: true,
    lastPushAt: new Date().toISOString(),
    pushLogs: result.logs,
  };

  await saveStudioState(state);
  return state;
}

async function main(): Promise<void> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${HOST}`);
      const pathname = decodeURIComponent(url.pathname);

      if (req.method === "GET" && pathname === "/api/status") {
        json(res, 200, await buildStatus());
        return;
      }

      if (req.method === "POST" && pathname === "/api/selections") {
        const body = await readJsonBody<CardPhotoSelection[]>(req);
        if (!Array.isArray(body)) {
          json(res, 400, { error: "Expected JSON array" });
          return;
        }

        await writeFile(CARD_COLLECTION_SELECTIONS_PATH, JSON.stringify(body, null, 2));
        json(res, 200, { saved: body.length, path: CARD_COLLECTION_SELECTIONS_PATH });
        return;
      }

      if (req.method === "POST" && pathname === "/api/apply") {
        const state = await handleApply();
        json(res, 200, { ok: true, studioState: state });
        return;
      }

      if (req.method === "POST" && pathname === "/api/push") {
        const state = await handlePush();
        json(res, 200, { ok: true, studioState: state });
        return;
      }

      if (req.method === "GET" && (pathname === "/" || pathname === "/studio.html")) {
        const served = await serveStatic("studio.html", res);
        if (served) return;
      }

      if (req.method === "GET" && pathname.startsWith("/card-photo-previews/")) {
        const served = await serveStatic(pathname.slice(1), res);
        if (served) return;
      }

      if (req.method === "GET" && pathname.startsWith("/")) {
        const served = await serveStatic(pathname.slice(1), res);
        if (served) return;
      }

      json(res, 404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      json(res, 500, { error: message });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Card Collection Studio: http://${HOST}:${PORT}`);
    console.log(`HTML: ${CARD_COLLECTION_STUDIO_HTML_PATH}`);
    console.log(`Previews: ${CARD_COLLECTION_PREVIEWS_DIR}`);
    console.log(`Selections: ${CARD_COLLECTION_SELECTIONS_PATH}`);
    console.log(`State: ${CARD_COLLECTION_STUDIO_STATE_PATH}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
