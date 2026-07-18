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
  borderRadius: 10,
  border: "1px solid rgba(11,11,11,0.08)",
  fontSize: 12,
};

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl bg-page text-sm text-ink-3">
      {label}
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
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink">회차별 응시 현황</h2>
        <p className="mb-3 mt-1 text-xs text-ink-3">
          시작, 완료, 중도이탈 건수
        </p>
        {examData.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={examData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="시작" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="완료" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="중도이탈" fill="#e34948" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="응시 데이터가 없습니다." />
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink">회차별 점수 분포</h2>
        <p className="mb-3 mt-1 text-xs text-ink-3">
          완료 응시 기준 평균, 최고, 최저
        </p>
        {examData.some((row) => row.완료 > 0) ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={examData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="평균" fill="#2a78d6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="최고" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="최저" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="완료 응시 데이터가 없습니다." />
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink">캠퍼스별 통계</h2>
        <p className="mb-3 mt-1 text-xs text-ink-3">
          완료 인원과 평균 점수
        </p>
        {campusData.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={campusData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="완료" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="평균점수" fill="#2a78d6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="캠퍼스 완료 데이터가 없습니다." />
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink">분반별 통계</h2>
        <p className="mb-3 mt-1 text-xs text-ink-3">
          완료 인원과 평균 점수
        </p>
        {classData.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={classData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="완료" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="평균점수" fill="#2a78d6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="분반 완료 데이터가 없습니다." />
        )}
      </div>

      <div className="card p-5 xl:col-span-2">
        <h2 className="text-sm font-semibold text-ink">유형별 평균 정답률</h2>
        <p className="mb-3 mt-1 text-xs text-ink-3">
          전체 완료 응시 기준
        </p>
        {subjectData.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={subjectData} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                <Bar dataKey="평균정답률" fill="#e34948" radius={[4, 4, 0, 0]} />
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
