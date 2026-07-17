"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendDatum = {
  name: string;
  나: number;
  그룹평균: number;
  캠퍼스평균?: number;
  분반평균?: number;
};

export default function TrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#e1e0d9" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => `${v}%`}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(11,11,11,0.08)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            name="나"
            dataKey="나"
            stroke="#e34948"
            strokeWidth={2}
            dot={{ r: 4, fill: "#e34948", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="그룹 평균"
            dataKey="그룹평균"
            stroke="#2a78d6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#2a78d6", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="캠퍼스 평균"
            dataKey="캠퍼스평균"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 4, fill: "#16a34a", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            name="분반 평균"
            dataKey="분반평균"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
