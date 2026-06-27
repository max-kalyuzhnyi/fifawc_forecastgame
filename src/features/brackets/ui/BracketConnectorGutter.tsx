"use client";

import type { BracketStageKey } from "@/shared/lib/playoff/bracket";
import {
  BRACKET_CONNECTOR_WIDTH,
  getBracketTreeHeight,
  getConnectorPaths,
  type BracketConnectorPath,
} from "@/shared/lib/playoff/bracketLayout";

interface BracketConnectorGutterProps {
  toStage: Exclude<BracketStageKey, "groups" | "round_of_32">;
}

function ConnectorPath({
  path,
  width,
}: {
  path: BracketConnectorPath;
  width: number;
}) {
  const midX = width / 2;
  const { yTop, yBottom, yChild } = path;

  const d = [
    `M 0 ${yTop} H ${midX}`,
    `M 0 ${yBottom} H ${midX}`,
    `M ${midX} ${yTop} V ${yBottom}`,
    `M ${midX} ${yChild} H ${width}`,
  ].join(" ");

  return (
    <path
      d={d}
      fill="none"
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function BracketConnectorGutter({ toStage }: BracketConnectorGutterProps) {
  const height = getBracketTreeHeight();
  const width = BRACKET_CONNECTOR_WIDTH;
  const paths = getConnectorPaths(toStage);

  return (
    <div
      className="relative shrink-0 self-start"
      style={{ width, height, minHeight: height }}
      aria-hidden
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {paths.map((path, index) => (
          <ConnectorPath key={index} path={path} width={width} />
        ))}
      </svg>
    </div>
  );
}
