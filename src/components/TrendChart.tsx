"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendDatum = {
  name: string;
  나: number | null;
  그룹평균: number | null;
  캠퍼스평균?: number | null;
  분반평균?: number | null;
};

const legendItems = [
  { key: "나", label: "나", color: "#e94343" },
  { key: "그룹평균", label: "그룹 평균", color: "#f59a8e" },
  { key: "분반평균", label: "분반 평균", color: "#8f7d73" },
  { key: "캠퍼스평균", label: "캠퍼스 평균", color: "#f0b85b" },
] as const;

export default function TrendChart({ data }: { data: TrendDatum[] }) {
  const [visible, setVisible] = useState<Record<(typeof legendItems)[number]["key"], boolean>>({
    나: true,
    그룹평균: true,
    분반평균: true,
    캠퍼스평균: true,
  });
  const toggleSeries = (key: (typeof legendItems)[number]["key"]) => {
    setVisible((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="flex h-64 w-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 28, bottom: 8, left: -8 }}>
            <defs>
              <linearGradient id="trendMine" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#e94343" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#e94343" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#9aa2b4" }}
              axisLine={{ stroke: "#f1ece9" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              unit="점"
              tick={{ fontSize: 11, fill: "#9aa2b4" }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip
              formatter={(v) => (v == null ? "" : `${v}점`)}
              cursor={{ stroke: "#ead9d4", strokeDasharray: "3 4" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(76,54,54,0.1)",
                boxShadow: "0 14px 34px rgba(60,40,40,0.12)",
                fontSize: 12,
              }}
            />
            {visible.나 && (
              <Area
                name="나"
                dataKey="나"
                type="monotone"
                stroke="#e94343"
                strokeWidth={2.4}
                fill="url(#trendMine)"
                dot={{ r: 3.5, fill: "#fff", stroke: "#e94343", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#e94343", stroke: "#fff", strokeWidth: 2 }}
              />
            )}
            {visible.그룹평균 && (
              <Line
                name="그룹 평균"
                dataKey="그룹평균"
                type="monotone"
                stroke="#f59a8e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {visible.분반평균 && (
              <Line
                name="분반 평균"
                dataKey="분반평균"
                type="monotone"
                stroke="#8f7d73"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {visible.캠퍼스평균 && (
              <Line
                name="캠퍼스 평균"
                dataKey="캠퍼스평균"
                type="monotone"
                stroke="#f0b85b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium">
        {legendItems.map((item) => (
          <label
            key={item.key}
            className={`inline-flex cursor-pointer items-center gap-1.5 transition ${
              visible[item.key] ? "" : "opacity-45"
            }`}
          >
            <input
              type="checkbox"
              checked={visible[item.key]}
              onChange={() => toggleSeries(item.key)}
              className="h-3.5 w-3.5 rounded border-[var(--border)] accent-[var(--brand)]"
            />
            <span style={{ color: item.color }}>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
