import { describe, expect, it } from "vitest";
import {
  getConnectorPaths,
  getMatchCenterY,
} from "@/shared/lib/playoff/bracketLayout";

describe("bracketLayout", () => {
  it("centers R16 matches between their R32 parents", () => {
    const y89 = getMatchCenterY(89);
    const y74 = getMatchCenterY(74);
    const y77 = getMatchCenterY(77);
    expect(y89).toBe((y74 + y77) / 2);
  });

  it("builds connector paths for each next-round match", () => {
    const paths = getConnectorPaths("round_of_16");
    expect(paths).toHaveLength(8);
    expect(paths[0].yChild).toBe((paths[0].yTop + paths[0].yBottom) / 2);
  });
});
