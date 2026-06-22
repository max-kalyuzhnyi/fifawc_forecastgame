import { describe, expect, it } from "vitest";
import {
  isGoldShieldBorder,
  removeFifaCardOuterBackground,
} from "@/shared/lib/commonsPhoto/removeFifaCardOuterBackground";

describe("isGoldShieldBorder", () => {
  it("detects gold border pixels", () => {
    expect(isGoldShieldBorder(200, 170, 60)).toBe(true);
    expect(isGoldShieldBorder(30, 89, 56)).toBe(false);
  });
});

describe("removeFifaCardOuterBackground", () => {
  it("makes outer white margins transparent while preserving the shield interior", () => {
    const width = 7;
    const height = 7;
    const rgba = Buffer.alloc(width * height * 4, 255);

    // Outer white margin with a gold border around a colored interior.
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const isInterior = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        const isGold = x === 1 || x === 5 || y === 1 || y === 5;

        if (isGold) {
          rgba[offset] = 200;
          rgba[offset + 1] = 170;
          rgba[offset + 2] = 60;
        } else if (isInterior) {
          rgba[offset] = 20;
          rgba[offset + 1] = 80;
          rgba[offset + 2] = 40;
        }
      }
    }

    const cleaned = removeFifaCardOuterBackground(rgba, width, height, 10);

    expect(cleaned[3]).toBe(0);
    expect(cleaned[(2 * width + 2) * 4 + 3]).toBe(255);
    expect(cleaned[(1 * width + 1) * 4 + 3]).toBe(255);
  });
});
