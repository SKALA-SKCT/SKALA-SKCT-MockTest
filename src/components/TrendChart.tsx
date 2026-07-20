"use client";

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
  { label: "나", color: "#566bd6" },
  { label: "그룹 평균", color: "#72d8d2" },
  { label: "분반 평균", color: "#d879cf" },
  { label: "캠퍼스 평균", color: "#f2bd70" },
];

export default function TrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <div className="flex h-64 w-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 28, bottom: 8, left: -8 }}>
            <defs>
              <linearGradient id="trendMine" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#566bd6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#566bd6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#9aa2b4" }}
              axisLine={{ stroke: "#edf0f6" }}
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
              cursor={{ stroke: "#d6dcef", strokeDasharray: "3 4" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(66,76,96,0.1)",
                boxShadow: "0 14px 34px rgba(38,51,77,0.12)",
                fontSize: 12,
              }}
            />
            <Area
              name="나"
              dataKey="나"
              type="monotone"
              stroke="#566bd6"
              strokeWidth={2.4}
              fill="url(#trendMine)"
              dot={{ r: 3.5, fill: "#fff", stroke: "#566bd6", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#566bd6", stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              name="그룹 평균"
              dataKey="그룹평균"
              type="monotone"
              stroke="#72d8d2"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              name="분반 평균"
              dataKey="분반평균"
              type="monotone"
              stroke="#d879cf"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              name="캠퍼스 평균"
              dataKey="캠퍼스평균"
              type="monotone"
              stroke="#f2bd70"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium">
        {legendItems.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span style={{ color: item.color }}>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
