import { describe, expect, it } from "vitest";
import {
  formatCommonsImportModeLabel,
  resolveCommonsImportMode,
} from "@/shared/lib/commonsPhoto/importMode";

describe("resolveCommonsImportMode", () => {
  it("disables all Supabase writes in review-only mode", () => {
    const mode = resolveCommonsImportMode({
      reviewOnly: true,
      applyAutoAccepted: true,
    });

    expect(mode.writeToSupabase).toBe(false);
    expect(mode.applyAcceptedPhotos).toBe(false);
    expect(mode.storePendingSources).toBe(false);
  });

  it("stores pending metadata but skips apply when APPLY=0", () => {
    const mode = resolveCommonsImportMode({
      reviewOnly: false,
      applyAutoAccepted: false,
    });

    expect(mode.writeToSupabase).toBe(true);
    expect(mode.applyAcceptedPhotos).toBe(false);
    expect(mode.storePendingSources).toBe(true);
  });

  it("enables full persistence in default apply mode", () => {
    const mode = resolveCommonsImportMode({
      reviewOnly: false,
      applyAutoAccepted: true,
    });

    expect(mode.writeToSupabase).toBe(true);
    expect(mode.applyAcceptedPhotos).toBe(true);
    expect(mode.storePendingSources).toBe(true);
  });
});

describe("formatCommonsImportModeLabel", () => {
  it("labels strict dry run clearly", () => {
    const mode = resolveCommonsImportMode({
      reviewOnly: true,
      applyAutoAccepted: true,
    });

    expect(formatCommonsImportModeLabel(mode)).toBe("review-only (no Supabase writes)");
  });
});
