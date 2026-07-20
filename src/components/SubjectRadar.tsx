"use client";

import {
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
  캠퍼스평균?: number;
  분반평균?: number;
};

const legendItems = [
  { label: "나", color: "#e94343" },
  { label: "그룹 평균", color: "#f59a8e" },
  { label: "분반 평균", color: "#7aa7e8" },
  { label: "캠퍼스 평균", color: "#f0b85b" },
];

export default function SubjectRadar({
  data,
  className = "h-64",
}: {
  data: RadarDatum[];
  className?: string;
}) {
  return (
    <div className={`flex w-full flex-col ${className}`}>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="76%">
            <PolarGrid stroke="#e9edf5" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 12, fill: "#7c8498" }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              formatter={(v) => `${v}점`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(66,76,96,0.1)",
                boxShadow: "0 14px 34px rgba(38,51,77,0.12)",
                fontSize: 12,
              }}
            />
            <Radar
              name="나"
              dataKey="나"
              stroke="#e94343"
              strokeWidth={2.4}
              fill="#e94343"
              fillOpacity={0.2}
            />
            <Radar
              name="그룹 평균"
              dataKey="그룹평균"
              stroke="#f59a8e"
              strokeWidth={2}
              fill="#f59a8e"
              fillOpacity={0.1}
            />
            <Radar
              name="분반 평균"
              dataKey="분반평균"
              stroke="#7aa7e8"
              strokeWidth={2}
              fill="#7aa7e8"
              fillOpacity={0.07}
            />
            <Radar
              name="캠퍼스 평균"
              dataKey="캠퍼스평균"
              stroke="#f0b85b"
              strokeWidth={2}
              fill="#f0b85b"
              fillOpacity={0.07}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium">
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
