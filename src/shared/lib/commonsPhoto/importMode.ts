/** Env flags that control Commons card-photo import persistence. */
export interface CommonsImportModeInput {
  reviewOnly: boolean;
  applyAutoAccepted: boolean;
}

export interface CommonsImportMode extends CommonsImportModeInput {
  /** When true, skip storage uploads and all DB writes. */
  writeToSupabase: boolean;
  /** When true, upload and apply auto-accepted candidates. */
  applyAcceptedPhotos: boolean;
  /** When true, insert pending rows for manual-review candidates. */
  storePendingSources: boolean;
}

/** Resolve import mode from script env knobs. */
export function resolveCommonsImportMode(input: CommonsImportModeInput): CommonsImportMode {
  const writeToSupabase = !input.reviewOnly;

  return {
    ...input,
    writeToSupabase,
    applyAcceptedPhotos: writeToSupabase && input.applyAutoAccepted,
    storePendingSources: writeToSupabase,
  };
}

/** Human-readable mode label for script startup logs. */
export function formatCommonsImportModeLabel(mode: CommonsImportMode): string {
  if (!mode.writeToSupabase) {
    return "review-only (no Supabase writes)";
  }

  if (mode.applyAcceptedPhotos) {
    return "review+apply";
  }

  return "review without apply (pending metadata only)";
}
