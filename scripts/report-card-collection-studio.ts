import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CARD_TEAMS, PLAYERS_PER_TEAM } from "../src/shared/lib/cards/config";
import type {
  PlayerPhotoReviewEntry,
  RankedCommonsPhotoCandidate,
} from "../src/shared/lib/commonsPhoto/types";
import {
  CARD_COLLECTION_DIR,
  CARD_COLLECTION_SELECTIONS_PATH,
  CARD_COLLECTION_STUDIO_HTML_PATH,
  loadCardRoster,
  type CardPhotoSelection,
  type LocalRosterPlayer,
} from "./lib/card-collection";
import { loadReviewEntries } from "./lib/card-photo-review";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function previewKey(playerId: string, fileTitle: string): string {
  return `${playerId}:${fileTitle}`;
}

function renderImage(url: string | null, alt: string, className: string): string {
  if (!url) {
    return `<div class="${className} placeholder">No image</div>`;
  }

  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
}

function renderTags(tags: string[]): string {
  if (tags.length === 0) {
    return "";
  }

  return `<div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderCandidateCard(
  entry: PlayerPhotoReviewEntry,
  candidate: RankedCommonsPhotoCandidate,
  index: number,
  previewPath: string | undefined,
  suggestedFileTitle: string | null,
): string {
  const imageUrl = previewPath
    ? `card-photo-previews/${previewPath}`
    : candidate.thumbUrl ?? candidate.sourceUrl;

  return `
    <button
      type="button"
      class="candidate${candidate.fileTitle === suggestedFileTitle ? " suggested" : ""}"
      data-player-id="${escapeHtml(entry.playerId)}"
      data-player-slug="${escapeHtml(entry.playerId)}"
      data-player-name="${escapeHtml(entry.playerName)}"
      data-team-name="${escapeHtml(entry.teamName)}"
      data-file-title="${escapeHtml(candidate.fileTitle)}"
      data-source-url="${escapeHtml(candidate.sourceUrl)}"
      data-score="${candidate.score}"
    >
      <div class="candidate-rank">#${index + 1}</div>
      ${renderImage(imageUrl, candidate.fileTitle, "candidate-image")}
      <div class="candidate-meta">
        <div class="score">Score ${candidate.score}</div>
        ${renderTags(candidate.reasonTags)}
        <div class="file-title" title="${escapeHtml(candidate.fileTitle)}">${escapeHtml(candidate.fileTitle)}</div>
        <div class="dims">${candidate.width}×${candidate.height} · ${escapeHtml(candidate.source)}</div>
      </div>
    </button>
  `;
}

function poolRoleBadge(poolRole: string | undefined): string {
  if (!poolRole) {
    return "";
  }

  return `<span class="pool-role pool-role-${escapeHtml(poolRole)}">${escapeHtml(poolRole)}</span>`;
}

function renderPlayerSection(
  entry: PlayerPhotoReviewEntry,
  previewByKey: Map<string, string>,
  poolRole: string | undefined,
): string {
  const suggested = entry.suggestedFileTitle ?? entry.selectedFileTitle;
  const candidateCards = entry.candidates
    .map((candidate, index) =>
      renderCandidateCard(
        entry,
        candidate,
        index,
        previewByKey.get(previewKey(entry.playerId, candidate.fileTitle)),
        suggested,
      ),
    )
    .join("");

  return `
    <section class="player-card" data-player-id="${escapeHtml(entry.playerId)}" data-team-name="${escapeHtml(entry.teamName)}">
      <header class="player-header">
        <div>
          <h3>${escapeHtml(entry.playerName)} ${poolRoleBadge(poolRole)}</h3>
          <div class="subline">${escapeHtml(entry.teamName)}</div>
        </div>
        <div class="status">
          <span class="badge" data-selection-label>Not selected</span>
        </div>
      </header>
      <div class="candidate-grid">${candidateCards || `<p class="empty">No candidates found</p>`}</div>
    </section>
  `;
}

function renderTeamPanel(
  teamName: string,
  entries: PlayerPhotoReviewEntry[],
  previewByKey: Map<string, string>,
  poolRoleByPlayerId: Map<string, string>,
): string {
  const teamEntries = entries.filter((entry) => entry.teamName === teamName);
  const cards = teamEntries
    .map((entry) =>
      renderPlayerSection(entry, previewByKey, poolRoleByPlayerId.get(entry.playerId)),
    )
    .join("");

  return `
    <section class="tab-panel" data-team-panel="${escapeHtml(teamName)}" hidden>
      <div class="team-toolbar">
        <h2>${escapeHtml(teamName)}</h2>
        <span class="team-counter" data-team-counter="${escapeHtml(teamName)}">0 / ${PLAYERS_PER_TEAM} selected</span>
      </div>
      ${cards || `<p class="empty">No review entries for ${escapeHtml(teamName)}</p>`}
    </section>
  `;
}

function renderOverallPanel(teams: readonly string[]): string {
  const rows = teams
    .map(
      (teamName) => `
        <tr data-team-row="${escapeHtml(teamName)}">
          <td>${escapeHtml(teamName)}</td>
          <td data-overall-selected="${escapeHtml(teamName)}">0 / ${PLAYERS_PER_TEAM}</td>
          <td data-overall-pool="${escapeHtml(teamName)}">0 / 15</td>
          <td data-overall-status="${escapeHtml(teamName)}">✗</td>
        </tr>
      `,
    )
    .join("");

  return `
    <section class="tab-panel" data-team-panel="__overall__">
      <h2>Overall</h2>
      <p class="meta">Pick exactly ${PLAYERS_PER_TEAM} players per team, then save, apply, and push.</p>
      <table class="overall-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Selected</th>
            <th>Pool</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="overall-actions">
        <button type="button" class="action" id="validate-all">Validate</button>
        <button type="button" class="action" id="export-selections-json">Export selections JSON</button>
        <button type="button" class="action" id="save-selections">Save selections</button>
        <button type="button" class="action" id="apply-all" disabled>Apply all</button>
        <button type="button" class="action danger" id="push-all" disabled>Push to database</button>
      </div>
      <p class="meta" id="validation-message">Validate to enable apply.</p>
      <pre class="log" id="action-log"></pre>
    </section>
  `;
}

function buildHtml(input: {
  reviewPath: string;
  entries: PlayerPhotoReviewEntry[];
  previewByKey: Map<string, string>;
  poolRoleByPlayerId: Map<string, string>;
  poolSizeByTeam: Record<string, number>;
  savedSelections: CardPhotoSelection[];
}): string {
  const generatedAt = new Date().toISOString();
  const teamsInReview = CARD_TEAMS.filter((teamName) =>
    input.entries.some((entry) => entry.teamName === teamName),
  );

  const tabs = [
    ...teamsInReview.map(
      (teamName) =>
        `<button type="button" class="tab" data-tab="${escapeHtml(teamName)}">${escapeHtml(teamName)}</button>`,
    ),
    `<button type="button" class="tab" data-tab="__overall__">Overall</button>`,
  ].join("");

  const panels = [
    ...teamsInReview.map((teamName) =>
      renderTeamPanel(teamName, input.entries, input.previewByKey, input.poolRoleByPlayerId),
    ),
    renderOverallPanel(teamsInReview),
  ].join("");

  const configJson = JSON.stringify({
    teams: teamsInReview,
    requiredPerTeam: PLAYERS_PER_TEAM,
    poolSizeByTeam: input.poolSizeByTeam,
    savedSelections: input.savedSelections,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Card Collection Studio</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1115;
      --panel: #171a21;
      --border: #2a3140;
      --text: #eef2f7;
      --muted: #9aa7bd;
      --accent: #4f8cff;
      --danger: #d45b5b;
      --selected: #2f6f4a;
      --suggested: #6a5520;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.4;
    }
    main { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1, h2, h3 { margin: 0; }
    .meta { color: var(--muted); font-size: 13px; word-break: break-all; }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 20px 0;
    }
    .tab {
      background: var(--panel);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
    }
    .tab.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }
    .team-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }
    .team-counter { color: var(--muted); font-weight: 600; }
    .player-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 18px;
    }
    .player-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 16px;
    }
    .subline { color: var(--muted); font-size: 14px; margin-top: 4px; }
    .badge {
      display: inline-block;
      background: #3a2f1d;
      color: #f6d28f;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
    }
    .pool-role {
      display: inline-block;
      margin-left: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-radius: 999px;
      padding: 2px 8px;
      vertical-align: middle;
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .pool-role-starter { color: #9fd4ff; }
    .pool-role-substitute { color: #9fe0b8; }
    .pool-role-bench { color: #d4b48a; }
    .candidate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }
    .candidate {
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: #12151c;
      padding: 0;
      text-align: left;
      cursor: pointer;
      color: inherit;
    }
    .candidate.suggested {
      border-style: dashed;
      border-color: #d4a72c;
    }
    .candidate.selected {
      border-color: #5fd39a;
      box-shadow: 0 0 0 2px #5fd39a inset;
    }
    .candidate-rank {
      padding: 8px 10px 0;
      color: var(--muted);
      font-size: 12px;
    }
    .candidate-image, .placeholder {
      width: 100%;
      height: 320px;
      object-fit: contain;
      border: 0;
      background: #0b0d11;
      display: block;
    }
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      font-size: 12px;
    }
    .candidate-meta { padding: 10px 12px 12px; }
    .score { font-weight: 700; margin-bottom: 8px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .tag {
      font-size: 11px;
      color: var(--muted);
      background: #0f131a;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 8px;
    }
    .file-title {
      font-size: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .dims { color: var(--muted); font-size: 11px; }
    .empty { color: var(--muted); margin: 0; }
    .overall-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 20px;
    }
    .overall-table th, .overall-table td {
      border-bottom: 1px solid var(--border);
      padding: 10px 8px;
      text-align: left;
    }
    .overall-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }
    button.action {
      background: var(--accent);
      color: white;
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button.action:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button.action.danger {
      background: var(--danger);
    }
    .log {
      background: #0b0d11;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      min-height: 120px;
      white-space: pre-wrap;
      overflow: auto;
      font-size: 12px;
    }
    .toast {
      position: fixed;
      right: 20px;
      bottom: 20px;
      background: #3a2f1d;
      color: #f6d28f;
      border-radius: 12px;
      padding: 12px 16px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .toast.visible { opacity: 1; }
  </style>
</head>
<body>
  <main>
    <h1>Card Collection Studio</h1>
    <p class="meta">Source: ${escapeHtml(input.reviewPath)} · Generated ${escapeHtml(generatedAt)}</p>
    <div class="tabs">${tabs}</div>
    ${panels}
  </main>
  <div class="toast" id="toast"></div>
  <script>
    const CONFIG = ${configJson};
    const STORAGE_KEY = "card-collection-studio-selections-v1";
    const REQUIRED = CONFIG.requiredPerTeam;

    const selectionsByTeam = new Map();
    for (const teamName of CONFIG.teams) {
      selectionsByTeam.set(teamName, new Map());
    }

    function showToast(message) {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.classList.add("visible");
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
    }

    function hydrateFromSaved(savedSelections) {
      for (const selection of savedSelections) {
        const teamMap = selectionsByTeam.get(selection.teamName);
        if (!teamMap) continue;
        teamMap.set(selection.playerId, {
          fileTitle: selection.fileTitle,
          playerName: selection.playerName,
          playerSlug: selection.playerSlug,
          sourceUrl: selection.sourceUrl,
          score: selection.score,
        });
      }
    }

    function hydrateFromLocalStorage() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        for (const [teamName, teamSelections] of Object.entries(raw)) {
          const teamMap = selectionsByTeam.get(teamName);
          if (!teamMap) continue;
          for (const [playerId, value] of Object.entries(teamSelections || {})) {
            teamMap.set(playerId, value);
          }
        }
      } catch {}
    }

    function persistLocalStorage() {
      const payload = {};
      for (const [teamName, teamMap] of selectionsByTeam.entries()) {
        payload[teamName] = Object.fromEntries(teamMap.entries());
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function teamCount(teamName) {
      return selectionsByTeam.get(teamName)?.size ?? 0;
    }

    function updateUi() {
      document.querySelectorAll(".player-card").forEach((section) => {
        const teamName = section.dataset.teamName;
        const playerId = section.dataset.playerId;
        const teamMap = selectionsByTeam.get(teamName);
        const selected = teamMap?.get(playerId);
        const label = section.querySelector("[data-selection-label]");
        section.querySelectorAll(".candidate").forEach((button) => {
          button.classList.toggle("selected", selected?.fileTitle === button.dataset.fileTitle);
        });
        if (label) {
          label.textContent = selected ? "Selected: " + selected.fileTitle : "Not selected";
        }
      });

      for (const teamName of CONFIG.teams) {
        const count = teamCount(teamName);
        const counter = document.querySelector('[data-team-counter="' + teamName + '"]');
        if (counter) counter.textContent = count + " / " + REQUIRED + " selected";

        const selectedCell = document.querySelector('[data-overall-selected="' + teamName + '"]');
        const poolCell = document.querySelector('[data-overall-pool="' + teamName + '"]');
        const statusCell = document.querySelector('[data-overall-status="' + teamName + '"]');
        const poolSize = CONFIG.poolSizeByTeam[teamName] ?? 0;
        if (selectedCell) selectedCell.textContent = count + " / " + REQUIRED;
        if (poolCell) poolCell.textContent = poolSize + " / 15";
        if (statusCell) statusCell.textContent = count === REQUIRED ? "✓" : "✗";
      }
    }

    function validateAll() {
      const errors = [];
      for (const teamName of CONFIG.teams) {
        const count = teamCount(teamName);
        if (count !== REQUIRED) {
          errors.push(teamName + ": expected " + REQUIRED + ", got " + count);
        }
      }
      return errors;
    }

    function exportSelections() {
      const payload = [];
      for (const [teamName, teamMap] of selectionsByTeam.entries()) {
        for (const [playerId, value] of teamMap.entries()) {
          payload.push({
            playerId,
            playerSlug: value.playerSlug || playerId,
            playerName: value.playerName,
            teamName,
            fileTitle: value.fileTitle,
            sourceUrl: value.sourceUrl,
            score: Number(value.score),
          });
        }
      }
      return payload;
    }

    function setActiveTab(tabName) {
      document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === tabName);
      });
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        const isOverall = tabName === "__overall__";
        const isTeam = panel.dataset.teamPanel === tabName;
        panel.hidden = !(isOverall ? isOverall : isTeam);
      });
    }

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
    });

    document.querySelectorAll(".candidate").forEach((button) => {
      button.addEventListener("click", () => {
        const teamName = button.dataset.teamName;
        const playerId = button.dataset.playerId;
        const teamMap = selectionsByTeam.get(teamName);
        if (!teamMap) return;

        const current = teamMap.get(playerId);
        if (current?.fileTitle === button.dataset.fileTitle) {
          teamMap.delete(playerId);
          persistLocalStorage();
          updateUi();
          return;
        }

        if (!current && teamMap.size >= REQUIRED) {
          showToast(teamName + " already has " + REQUIRED + " selections");
          return;
        }

        teamMap.set(playerId, {
          fileTitle: button.dataset.fileTitle,
          playerName: button.dataset.playerName,
          playerSlug: button.dataset.playerSlug,
          sourceUrl: button.dataset.sourceUrl,
          score: button.dataset.score,
        });
        persistLocalStorage();
        updateUi();
      });
    });

    const validationMessage = document.getElementById("validation-message");
    const applyButton = document.getElementById("apply-all");
    const pushButton = document.getElementById("push-all");
    const actionLog = document.getElementById("action-log");

    function setActionEnabled(valid, applySucceeded) {
      applyButton.disabled = !valid;
      pushButton.disabled = !(valid && applySucceeded);
    }

    document.getElementById("validate-all").addEventListener("click", () => {
      const errors = validateAll();
      if (errors.length > 0) {
        validationMessage.textContent = errors.join("; ");
        setActionEnabled(false, false);
        return;
      }
      validationMessage.textContent = "All teams valid (" + REQUIRED + "/" + REQUIRED + ").";
      setActionEnabled(true, false);
    });

    document.getElementById("export-selections-json").addEventListener("click", () => {
      const payload = exportSelections();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "card-photo-selections.json";
      anchor.click();
      URL.revokeObjectURL(url);
      validationMessage.textContent = "Downloaded " + payload.length + " selections.";
      showToast("Exported JSON");
    });

    document.getElementById("save-selections").addEventListener("click", async () => {
      const errors = validateAll();
      if (errors.length > 0) {
        showToast("Fix selections before save");
        validationMessage.textContent = errors.join("; ");
        return;
      }

      const response = await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportSelections()),
      });
      const body = await response.json();
      if (!response.ok) {
        showToast(body.error || "Save failed");
        return;
      }
      validationMessage.textContent = "Saved " + body.saved + " selections to server.";
      showToast("Selections saved");
    });

    document.getElementById("apply-all").addEventListener("click", async () => {
      const errors = validateAll();
      if (errors.length > 0) {
        validationMessage.textContent = errors.join("; ");
        return;
      }

      applyButton.disabled = true;
      actionLog.textContent = "Applying...";
      const response = await fetch("/api/apply", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        actionLog.textContent = body.error || "Apply failed";
        applyButton.disabled = false;
        return;
      }

      actionLog.textContent = (body.studioState?.applyLogs || []).join("\\n");
      validationMessage.textContent = body.studioState?.applySucceeded
        ? "Apply succeeded. Push is now enabled."
        : "Apply finished with issues.";
      setActionEnabled(true, Boolean(body.studioState?.applySucceeded));
    });

    document.getElementById("push-all").addEventListener("click", async () => {
      if (!window.confirm("Push all selected cards to the database? This deactivates other non-legend cards per team.")) {
        return;
      }

      pushButton.disabled = true;
      actionLog.textContent = "Pushing...";
      const response = await fetch("/api/push", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        actionLog.textContent = body.error || "Push failed";
        pushButton.disabled = false;
        return;
      }

      actionLog.textContent = (body.studioState?.pushLogs || []).join("\\n");
      validationMessage.textContent = "Push succeeded.";
    });

    async function refreshStatus() {
      try {
        const response = await fetch("/api/status");
        const status = await response.json();
        if (status.studioState?.applySucceeded) {
          setActionEnabled(status.allValid, true);
        }
      } catch {}
    }

    hydrateFromSaved(CONFIG.savedSelections);
    hydrateFromLocalStorage();
    updateUi();
    if (CONFIG.teams.length > 0) {
      setActiveTab(CONFIG.teams[0]);
    } else {
      setActiveTab("__overall__");
    }
    refreshStatus();
  </script>
</body>
</html>`;
}

async function loadPreviewIndex(): Promise<Map<string, string>> {
  try {
    const raw = await readFile(path.join(CARD_COLLECTION_DIR, "preview-index.json"), "utf8");
    return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
  } catch {
    return new Map();
  }
}

async function loadSavedSelections(): Promise<CardPhotoSelection[]> {
  try {
    const raw = await readFile(CARD_COLLECTION_SELECTIONS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CardPhotoSelection[]) : [];
  } catch {
    return [];
  }
}

function buildPoolRoleMaps(rosterPlayers: LocalRosterPlayer[]): {
  poolRoleByPlayerId: Map<string, string>;
} {
  const poolRoleByPlayerId = new Map<string, string>();
  for (const player of rosterPlayers) {
    poolRoleByPlayerId.set(player.slug, player.poolRole);
  }
  return { poolRoleByPlayerId };
}

async function main(): Promise<void> {
  const explicitPath = process.argv[2];
  const [{ reviewPath, entries }, previewByKey, roster, savedSelections] = await Promise.all([
    loadReviewEntries(explicitPath),
    loadPreviewIndex(),
    loadCardRoster().catch(() => null),
    loadSavedSelections(),
  ]);

  const poolRoleByPlayerId = new Map<string, string>();
  const poolSizeByTeam: Record<string, number> = {};

  if (roster) {
    for (const team of Object.values(roster.teams)) {
      poolSizeByTeam[team.teamName] = team.players.length;
      const maps = buildPoolRoleMaps(team.players);
      for (const [playerId, poolRole] of maps.poolRoleByPlayerId) {
        poolRoleByPlayerId.set(playerId, poolRole);
      }
    }
  }

  const html = buildHtml({
    reviewPath,
    entries,
    previewByKey,
    poolRoleByPlayerId,
    poolSizeByTeam,
    savedSelections,
  });

  await mkdir(CARD_COLLECTION_DIR, { recursive: true });
  await writeFile(CARD_COLLECTION_STUDIO_HTML_PATH, html, "utf8");

  console.log(`Review file: ${reviewPath}`);
  console.log(`Studio HTML: ${CARD_COLLECTION_STUDIO_HTML_PATH}`);
  console.log(`Players in review: ${entries.length}`);
  console.log("Run: npm run card-collection:studio");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
