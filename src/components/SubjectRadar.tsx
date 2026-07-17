"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type RadarDatum = {
  subject: string;
  나: number;
  그룹평균: number;
};

export default function SubjectRadar({
  data,
  className = "h-64",
}: {
  data: RadarDatum[];
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="#e1e0d9" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: "#52514e" }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            formatter={(v) => `${v}%`}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(11,11,11,0.08)",
              fontSize: 12,
            }}
          />
          <Radar
            name="나"
            dataKey="나"
            stroke="#e34948"
            strokeWidth={2}
            fill="#e34948"
            fillOpacity={0.25}
          />
          <Radar
            name="그룹 평균"
            dataKey="그룹평균"
            stroke="#2a78d6"
            strokeWidth={2}
            fill="#2a78d6"
            fillOpacity={0.12}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
