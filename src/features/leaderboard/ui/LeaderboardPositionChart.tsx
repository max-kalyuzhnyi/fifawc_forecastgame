"use client";

import { useMemo, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  STAGE_ORDER,
  type LeaderboardAnalytics,
  type LeaderboardOverallEntry,
} from "@/features/leaderboard/lib/buildAnalytics";
import { formatStageLabel } from "@/features/leaderboard/lib/formatStageLabel";
import { getInitials } from "@/features/matches/lib/voterInfo";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const STAGE_CHART_WIDTH = 80;
const TREND_TOP_N = 5;

/** Top-N at the latest finished stage, plus current user when outside the cutoff. */
function buildTrendVisibleEntries(
  overall: LeaderboardOverallEntry[],
  positionSeries: LeaderboardAnalytics["positionSeries"],
  stages: string[],
  currentUserId: string | null | undefined,
  isPreview: boolean,
): LeaderboardOverallEntry[] {
  if (isPreview) {
    const topEntries = overall.slice(0, TREND_TOP_N);
    const visibleIds = new Set(topEntries.map((entry) => entry.user_id));

    if (currentUserId && !visibleIds.has(currentUserId)) {
      const currentUserEntry = overall.find(
        (entry) => entry.user_id === currentUserId,
      );
      if (currentUserEntry) {
        return [...topEntries, currentUserEntry];
      }
    }

    return topEntries;
  }

  const currentStageKey = stages.at(-1);
  if (!currentStageKey) {
    return overall.slice(0, TREND_TOP_N);
  }

  const overallById = new Map(overall.map((entry) => [entry.user_id, entry]));

  // Rank users by cumulative position at the latest finished stage.
  const stageTop = Object.entries(positionSeries)
    .map(([userId, series]) => {
      const point = series.find(
        (seriesPoint) => seriesPoint.stageKey === currentStageKey,
      );
      if (!point || point.position > TREND_TOP_N) {
        return null;
      }

      return { userId, position: point.position };
    })
    .filter((entry): entry is { userId: string; position: number } => entry != null)
    .sort((a, b) => a.position - b.position);

  const topEntries = stageTop
    .map(({ userId, position }) => {
      const entry = overallById.get(userId);
      if (!entry) {
        return null;
      }

      // Anonymous labels should reflect stage rank, not live-projected overall rank.
      return { ...entry, rank: position };
    })
    .filter((entry): entry is LeaderboardOverallEntry => entry != null);

  const visibleIds = new Set(topEntries.map((entry) => entry.user_id));

  if (currentUserId && !visibleIds.has(currentUserId)) {
    const currentUserEntry = overallById.get(currentUserId);
    if (currentUserEntry) {
      const currentUserPoint = positionSeries[currentUserId]?.find(
        (seriesPoint) => seriesPoint.stageKey === currentStageKey,
      );
      const stageRank = currentUserPoint?.position ?? overall.length;

      return [...topEntries, { ...currentUserEntry, rank: stageRank }];
    }
  }

  return topEntries;
}

interface LeaderboardPositionChartProps {
  analytics: Pick<
    LeaderboardAnalytics,
    "stages" | "overall" | "positionSeries"
  >;
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
}

interface PlayerMeta {
  userId: string;
  label: string;
  displayName: string;
  color: string;
  isCurrentUser: boolean;
}

function buildPlayerColor(index: number, isCurrentUser: boolean): string {
  if (isCurrentUser) {
    return "var(--primary)";
  }

  const hue = (index * 67) % 360;
  return `oklch(0.72 0.1 ${hue})`;
}

interface EndAvatarDotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

function renderEndAvatar(
  meta: PlayerMeta,
  lastIndex: number,
): (props: EndAvatarDotProps) => ReactElement {
  const radius = meta.isCurrentUser ? 14 : 10;
  const ring = meta.isCurrentUser ? 2.5 : 1.5;
  const inner = radius - ring + 0.5;

  return function EndAvatarDot(props: EndAvatarDotProps): ReactElement {
    const { cx, cy, index } = props;

    if (index !== lastIndex || cx == null || cy == null) {
      return <g />;
    }

    return (
      <g style={{ pointerEvents: "none" }}>
        <title>{meta.label}</title>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="var(--background)"
          stroke={meta.color}
          strokeWidth={ring}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={inner * 0.85}
          fontWeight={600}
          fill={meta.color}
        >
          {getInitials(meta.displayName)}
        </text>
      </g>
    );
  };
}

export function LeaderboardPositionChart({
  analytics,
  currentUserId,
  canSeePlayerNames,
}: LeaderboardPositionChartProps) {
  const t = useTranslations("leaderboard");
  const tStages = useTranslations("leaderboard.stages");
  const tMatches = useTranslations("matches");

  const { stages, overall, positionSeries } = analytics;
  const isPreview = stages.length === 0;
  const displayStages = useMemo(
    () => (isPreview ? [...STAGE_ORDER] : stages),
    [isPreview, stages],
  );

  const visibleEntries = useMemo(
    () =>
      buildTrendVisibleEntries(
        overall,
        positionSeries,
        stages,
        currentUserId,
        isPreview,
      ),
    [overall, positionSeries, stages, currentUserId, isPreview],
  );

  const playerMeta = useMemo<PlayerMeta[]>(
    () =>
      visibleEntries.map((entry, index) => {
        const isCurrentUser = entry.user_id === currentUserId;
        return {
          userId: entry.user_id,
          label: isCurrentUser
            ? t("you")
            : canSeePlayerNames
              ? entry.display_name
              : tMatches("playerRank", { rank: entry.rank }),
          displayName: entry.display_name,
          color: buildPlayerColor(index, isCurrentUser),
          isCurrentUser,
        };
      }),
    [visibleEntries, currentUserId, canSeePlayerNames, t, tMatches],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const meta of playerMeta) {
      config[meta.userId] = { label: meta.label, color: meta.color };
    }
    return config;
  }, [playerMeta]);

  const chartData = useMemo(
    () =>
      displayStages.map((stageKey) => {
        const row: Record<string, string | number> = {
          stageKey,
          label: formatStageLabel(stageKey, tStages),
        };

        for (const entry of visibleEntries) {
          if (isPreview) {
            row[entry.user_id] = entry.rank;
            continue;
          }

          const point = positionSeries[entry.user_id]?.find(
            (seriesPoint) => seriesPoint.stageKey === stageKey,
          );
          row[entry.user_id] = point?.position ?? overall.length;
        }

        return row;
      }),
    [displayStages, isPreview, overall.length, positionSeries, tStages, visibleEntries],
  );

  const rankDomain = useMemo(() => {
    const positions = chartData.flatMap((row) =>
      visibleEntries.map((entry) => Number(row[entry.user_id])),
    );

    if (positions.length === 0) {
      return [1, Math.max(overall.length, 1)] as const;
    }

    const bestRank = Math.min(...positions);
    const worstRank = Math.max(...positions);
    return [bestRank, worstRank] as const;
  }, [chartData, overall.length, visibleEntries]);

  if (overall.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t("noPlayers")}
      </p>
    );
  }

  const chartMinWidth = Math.max(displayStages.length * STAGE_CHART_WIDTH, 280);
  const [bestRank, worstRank] = rankDomain;
  const lastIndex = displayStages.length - 1;
  const renderOrder = [...playerMeta].sort(
    (a, b) => Number(a.isCurrentUser) - Number(b.isCurrentUser),
  );

  return (
    <div className="flex flex-col gap-2 px-3 pb-4">
      <p className="text-[11px] leading-snug text-muted-foreground">
        {isPreview ? t("previewHint") : t("chartDescriptionTrend")}
      </p>

      <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
        <div style={{ minWidth: chartMinWidth }}>
          <ChartContainer
            config={chartConfig}
            className="h-[260px] w-full"
          >
            <LineChart
              data={chartData}
              margin={{ top: 18, right: 46, left: 4, bottom: 4 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                reversed
                domain={[bestRank, worstRank]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={30}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `#${value}`}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={
                  <ChartTooltipContent
                    labelKey="label"
                    formatter={(value, name) => {
                      const meta = playerMeta.find((p) => p.userId === name);
                      if (!meta) return null;
                      if (!canSeePlayerNames && !meta.isCurrentUser) {
                        return null;
                      }

                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            <span className="text-muted-foreground">
                              {meta.label}
                            </span>
                          </span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            #{value}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              {renderOrder.map((meta) => (
                <Line
                  key={meta.userId}
                  type="monotone"
                  dataKey={meta.userId}
                  stroke={meta.color}
                  strokeWidth={meta.isCurrentUser ? 2.75 : 1.5}
                  strokeOpacity={meta.isCurrentUser ? 1 : 0.5}
                  strokeLinecap="round"
                  dot={renderEndAvatar(meta, lastIndex)}
                  activeDot={{ r: meta.isCurrentUser ? 5 : 3.5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
