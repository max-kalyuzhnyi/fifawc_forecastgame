"use client";

import { useMemo, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  STAGE_ORDER,
  type LeaderboardAnalytics,
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
  photoUrl: string | null;
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
  const clipId = `lb-avatar-${meta.userId}`;

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
        {meta.photoUrl ? (
          <>
            <defs>
              <clipPath id={clipId}>
                <circle cx={cx} cy={cy} r={inner} />
              </clipPath>
            </defs>
            <image
              href={meta.photoUrl}
              x={cx - inner}
              y={cy - inner}
              width={inner * 2}
              height={inner * 2}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </>
        ) : (
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
        )}
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

  const playerMeta = useMemo<PlayerMeta[]>(
    () =>
      overall.map((entry, index) => {
        const isCurrentUser = entry.user_id === currentUserId;
        return {
          userId: entry.user_id,
          label: isCurrentUser
            ? t("you")
            : canSeePlayerNames
              ? entry.display_name
              : tMatches("playerRank", { rank: entry.rank }),
          displayName: entry.display_name,
          photoUrl: canSeePlayerNames || isCurrentUser ? entry.photo_url : null,
          color: buildPlayerColor(index, isCurrentUser),
          isCurrentUser,
        };
      }),
    [overall, currentUserId, canSeePlayerNames, t, tMatches],
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

        for (const entry of overall) {
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
    [displayStages, isPreview, overall, positionSeries, tStages],
  );

  if (overall.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t("noPlayers")}
      </p>
    );
  }

  const chartMinWidth = Math.max(displayStages.length * STAGE_CHART_WIDTH, 280);
  const maxRank = Math.max(overall.length, 1);
  const lastIndex = displayStages.length - 1;
  const renderOrder = [...playerMeta].sort(
    (a, b) => Number(a.isCurrentUser) - Number(b.isCurrentUser),
  );

  return (
    <div className="flex flex-col gap-2 px-3 pb-4">
      <p className="text-[11px] leading-snug text-muted-foreground">
        {isPreview ? t("previewHint") : t("chartDescription")}
      </p>

      <div className="overflow-x-auto overscroll-x-contain">
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
                domain={[1, maxRank]}
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
                  isAnimationActive
                  animationDuration={650}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
