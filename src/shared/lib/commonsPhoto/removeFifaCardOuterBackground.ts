function colorDistance(a: readonly number[], b: readonly number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Gold shield border — flood fill must not cross it into the card interior. */
export function isGoldShieldBorder(r: number, g: number, b: number): boolean {
  return r > 160 && g > 120 && b < 120 && r > b + 40;
}

function readRgb(data: Buffer, width: number, x: number, y: number): [number, number, number] {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]];
}

function writeAlpha(data: Buffer, width: number, x: number, y: number, alpha: number): void {
  data[(y * width + x) * 4 + 3] = alpha;
}

function isNearWhite(r: number, g: number, b: number, threshold = 240): boolean {
  return r >= threshold && g >= threshold && b >= threshold;
}

/**
 * Remove rectangular margin outside the gold shield by flood-filling edge background colors.
 * Works for white, dark-green, black, or dark-blue outer canvases.
 */
export function removeFifaCardOuterBackground(
  rgba: Buffer,
  width: number,
  height: number,
  tolerance = 40,
): Buffer {
  const output = Buffer.from(rgba);
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const cornerColors: Array<[number, number, number]> = [
    readRgb(rgba, width, 0, 0),
    readRgb(rgba, width, width - 1, 0),
    readRgb(rgba, width, 0, height - 1),
    readRgb(rgba, width, width - 1, height - 1),
  ];

  const matchesOuterBackground = (r: number, g: number, b: number): boolean => {
    if (isNearWhite(r, g, b)) {
      return true;
    }

    return cornerColors.some((corner) => colorDistance([r, g, b], corner) <= tolerance);
  };

  const seedEdge = (x: number, y: number): void => {
    const index = y * width + x;
    if (visited[index]) {
      return;
    }

    const [r, g, b] = readRgb(rgba, width, x, y);
    if (!matchesOuterBackground(r, g, b)) {
      return;
    }

    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    seedEdge(x, 0);
    seedEdge(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    seedEdge(0, y);
    seedEdge(width - 1, y);
  }

  while (queue.length > 0) {
    const pixelIndex = queue.pop()!;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const [r, g, b] = readRgb(rgba, width, x, y);

    if (isGoldShieldBorder(r, g, b) || !matchesOuterBackground(r, g, b)) {
      continue;
    }

    writeAlpha(output, width, x, y, 0);

    for (const [nextX, nextY] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
        continue;
      }

      const nextIndex = nextY * width + nextX;
      if (!visited[nextIndex]) {
        visited[nextIndex] = 1;
        queue.push(nextIndex);
      }
    }
  }

  return output;
}
