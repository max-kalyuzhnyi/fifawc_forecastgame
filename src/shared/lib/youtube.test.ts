import { describe, expect, it } from "vitest";
import {
  buildYoutubeEmbedUrl,
  buildYoutubeThumbnailUrl,
  buildYoutubeWatchUrl,
  parseYoutubeVideoId,
} from "@/shared/lib/youtube";

describe("parseYoutubeVideoId", () => {
  it("accepts a raw 11-character video id", () => {
    expect(parseYoutubeVideoId("Wb56UP6-t-E")).toBe("Wb56UP6-t-E");
  });

  it("parses watch URLs", () => {
    expect(
      parseYoutubeVideoId("https://www.youtube.com/watch?v=Wb56UP6-t-E"),
    ).toBe("Wb56UP6-t-E");
  });

  it("parses youtu.be URLs", () => {
    expect(parseYoutubeVideoId("https://youtu.be/Wb56UP6-t-E")).toBe(
      "Wb56UP6-t-E",
    );
  });

  it("parses shorts URLs", () => {
    expect(
      parseYoutubeVideoId("https://www.youtube.com/shorts/Wb56UP6-t-E"),
    ).toBe("Wb56UP6-t-E");
  });

  it("returns null for empty or invalid input", () => {
    expect(parseYoutubeVideoId("")).toBeNull();
    expect(parseYoutubeVideoId("invalid-id")).toBeNull();
    expect(parseYoutubeVideoId("https://example.com")).toBeNull();
  });
});

describe("buildYoutubeEmbedUrl", () => {
  it("uses the privacy-enhanced host", () => {
    expect(buildYoutubeEmbedUrl("Wb56UP6-t-E")).toBe(
      "https://www.youtube-nocookie.com/embed/Wb56UP6-t-E",
    );
  });
});

describe("buildYoutubeWatchUrl", () => {
  it("builds a standard watch URL", () => {
    expect(buildYoutubeWatchUrl("Wb56UP6-t-E")).toBe(
      "https://www.youtube.com/watch?v=Wb56UP6-t-E",
    );
  });
});

describe("buildYoutubeThumbnailUrl", () => {
  it("builds a hq thumbnail URL", () => {
    expect(buildYoutubeThumbnailUrl("Wb56UP6-t-E")).toBe(
      "https://i.ytimg.com/vi/Wb56UP6-t-E/hqdefault.jpg",
    );
  });
});
