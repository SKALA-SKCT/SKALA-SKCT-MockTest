"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ScoreDistributionDatum = {
  label: string;
  min: number;
  max: number;
  count: number;
  percent: number;
  includesMe: boolean;
};

export default function ScoreDistributionChart({
  data,
  myScore,
  average,
}: {
  data: ScoreDistributionDatum[];
  myScore: number;
  average: number;
}) {
  const myBand = data.find((band) => band.includesMe)?.label;
  const averageBand = data.find(
    (band) => average >= band.min && average <= band.max
  )?.label;

  return (
    <div className="h-72 w-full min-w-[680px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 14, right: 24, bottom: 8, left: -12 }}>
          <defs>
            <linearGradient id="scoreDistributionFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e94343" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#e94343" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e9edf5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9aa2b4" }}
            tickFormatter={(value) => `${value}점`}
            tickLine={false}
            axisLine={{ stroke: "#edf0f6" }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9aa2b4" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const payload = item.payload as ScoreDistributionDatum;
              return [`${value}명 (${payload.percent}%)`, "응시자"];
            }}
            labelFormatter={(label) => `${label}점 구간`}
            cursor={{ stroke: "#e94343", strokeDasharray: "3 4", strokeOpacity: 0.45 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(66,76,96,0.1)",
              boxShadow: "0 14px 34px rgba(38,51,77,0.12)",
              fontSize: 12,
            }}
          />
          {myBand ? (
            <ReferenceLine
              x={myBand}
              stroke="#e94343"
              strokeDasharray="4 4"
              label={{
                value: `내 점수 ${myScore}점`,
                position: "insideTopRight",
                fill: "#e94343",
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          ) : null}
          {averageBand ? (
            <ReferenceLine
              x={averageBand}
              stroke="#f59a8e"
              strokeDasharray="3 5"
              label={{
                value: `평균 ${average.toFixed(1)}점`,
                position: "insideBottomLeft",
                fill: "#c43b3b",
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          ) : null}
          <Area
            dataKey="count"
            type="monotone"
            stroke="#e94343"
            strokeWidth={2.8}
            fill="url(#scoreDistributionFill)"
            dot={({ cx, cy, payload }) => (
              <circle
                cx={cx}
                cy={cy}
                r={payload.includesMe ? 5 : 3.5}
                fill={payload.includesMe ? "#e94343" : "#fff"}
                stroke="#e94343"
                strokeWidth={2}
              />
            )}
            activeDot={{ r: 6, fill: "#e94343", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
