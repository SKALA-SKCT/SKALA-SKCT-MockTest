"use client";

import { useState } from "react";
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
  { key: "나", label: "나", color: "#e94343" },
  { key: "그룹평균", label: "그룹 평균", color: "#f59a8e" },
  { key: "분반평균", label: "분반 평균", color: "#8f7d73" },
  { key: "캠퍼스평균", label: "캠퍼스 평균", color: "#f0b85b" },
] as const;

export default function SubjectRadar({
  data,
  className = "h-64",
}: {
  data: RadarDatum[];
  className?: string;
}) {
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
    <div className={`flex w-full flex-col ${className}`}>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="76%">
            <PolarGrid stroke="#f1ece9" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 12, fill: "#7c8498" }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              formatter={(v) => `${v}점`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(76,54,54,0.1)",
                boxShadow: "0 14px 34px rgba(60,40,40,0.12)",
                fontSize: 12,
              }}
            />
            {visible.나 && (
              <Radar
                name="나"
                dataKey="나"
                stroke="#e94343"
                strokeWidth={2.4}
                fill="#e94343"
                fillOpacity={0.2}
              />
            )}
            {visible.그룹평균 && (
              <Radar
                name="그룹 평균"
                dataKey="그룹평균"
                stroke="#f59a8e"
                strokeWidth={2}
                fill="#f59a8e"
                fillOpacity={0.1}
              />
            )}
            {visible.분반평균 && (
              <Radar
                name="분반 평균"
                dataKey="분반평균"
                stroke="#8f7d73"
                strokeWidth={2}
                fill="#8f7d73"
                fillOpacity={0.07}
              />
            )}
            {visible.캠퍼스평균 && (
              <Radar
                name="캠퍼스 평균"
                dataKey="캠퍼스평균"
                stroke="#f0b85b"
                strokeWidth={2}
                fill="#f0b85b"
                fillOpacity={0.07}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-auto flex flex-nowrap items-center justify-center gap-3 whitespace-nowrap pt-4 text-xs font-medium sm:gap-4">
        {legendItems.map((item) => (
          <label
            key={item.key}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 transition ${
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
