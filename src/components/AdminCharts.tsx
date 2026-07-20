"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AdminExamChartDatum = {
  name: string;
  시작: number;
  완료: number;
  중도이탈: number;
  평균: number;
  최고: number;
  최저: number;
};

export type AdminSubjectDatum = {
  subject: string;
  평균정답률: number;
};

export type AdminGroupDatum = {
  name: string;
  완료: number;
  평균점수: number;
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(76,54,54,0.1)",
  boxShadow: "0 14px 34px rgba(60,40,40,0.12)",
  fontSize: 12,
};

const chartMargin = { top: 12, right: 16, bottom: 0, left: -16 };
const gridStroke = "#eee7e3";
const tickStyle = { fontSize: 11, fill: "#9aa2b4" };
const colors = {
  red: "#e94343",
  coral: "#f59a8e",
  taupe: "#8f7d73",
  amber: "#f0b85b",
  green: "#78d89a",
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl bg-page text-sm text-ink-3">
      {label}
    </div>
  );
}

function ChartHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <p className="mt-1 text-xs text-ink-3">{description}</p>
      </div>
      <span className="mt-1 h-1.5 w-8 rounded-full bg-[var(--series-group)]" />
    </div>
  );
}

export default function AdminCharts({
  examData,
  subjectData,
  campusData,
  classData,
}: {
  examData: AdminExamChartDatum[];
  subjectData: AdminSubjectDatum[];
  campusData: AdminGroupDatum[];
  classData: AdminGroupDatum[];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="chart-card p-5">
        <ChartHeader title="회차별 응시 현황" description="시작, 완료, 중도이탈 건수" />
        {examData.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={examData} margin={chartMargin} barGap={6}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="시작" fill={colors.coral} radius={[8, 8, 0, 0]} />
                <Bar dataKey="완료" fill={colors.red} radius={[8, 8, 0, 0]} />
                <Bar dataKey="중도이탈" fill={colors.taupe} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="응시 데이터가 없습니다." />
        )}
      </div>

      <div className="chart-card p-5">
        <ChartHeader title="회차별 점수 분포" description="완료 응시 기준 평균, 최고, 최저" />
        {examData.some((row) => row.완료 > 0) ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={examData} margin={chartMargin} barGap={6}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} />
                <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="평균" fill={colors.red} radius={[8, 8, 0, 0]} />
                <Bar dataKey="최고" fill={colors.coral} radius={[8, 8, 0, 0]} />
                <Bar dataKey="최저" fill={colors.amber} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="완료 응시 데이터가 없습니다." />
        )}
      </div>

      <div className="chart-card p-5">
        <ChartHeader title="캠퍼스별 통계" description="완료 인원과 평균 점수" />
        {campusData.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={campusData} margin={chartMargin} barGap={8}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="완료" fill={colors.coral} radius={[8, 8, 0, 0]} />
                <Bar dataKey="평균점수" fill={colors.red} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="캠퍼스 완료 데이터가 없습니다." />
        )}
      </div>

      <div className="chart-card p-5">
        <ChartHeader title="분반별 통계" description="완료 인원과 평균 점수" />
        {classData.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={classData} margin={chartMargin} barGap={8}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={tickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="완료" fill={colors.coral} radius={[8, 8, 0, 0]} />
                <Bar dataKey="평균점수" fill={colors.red} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="분반 완료 데이터가 없습니다." />
        )}
      </div>

      <div className="chart-card p-5 xl:col-span-2">
        <ChartHeader title="유형별 평균 정답률" description="전체 완료 응시 기준" />
        {subjectData.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={subjectData} margin={chartMargin}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="subject" tick={tickStyle} tickLine={false} axisLine={{ stroke: gridStroke }} />
                <YAxis domain={[0, 100]} unit="%" tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                <Bar dataKey="평균정답률" fill={colors.red} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="유형별 데이터가 없습니다." />
        )}
      </div>
    </section>
  );
}
