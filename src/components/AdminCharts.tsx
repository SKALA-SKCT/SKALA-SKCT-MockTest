"use client";

export type AdminExamChartDatum = {
  name: string;
  시작: number;
  완료: number;
  중도이탈: number;
  평균: number;
  최고: number;
  최저: number;
};

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl bg-page text-sm text-ink-3">
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

function CompactTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="data-table text-sm">
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th
              key={header}
              className={`whitespace-nowrap px-4 py-3 font-semibold ${
                index === 0 ? "text-left" : "text-right"
              }`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${row[0]}-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td
                key={`${row[0]}-${cellIndex}`}
                className={`whitespace-nowrap px-4 py-3 tabular-nums ${
                  cellIndex === 0
                    ? "font-semibold text-ink"
                    : "text-right text-ink-2"
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminCharts({
  examData,
}: {
  examData: AdminExamChartDatum[];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="chart-card overflow-hidden p-5 pb-3">
        <ChartHeader title="회차별 응시 현황" description="시작, 완료, 중도이탈 건수" />
        {examData.length ? (
          <CompactTable
            headers={["회차", "시작", "완료", "중도이탈"]}
            rows={examData.map((row) => [
              row.name,
              row.시작,
              row.완료,
              row.중도이탈,
            ])}
          />
        ) : (
          <EmptyState label="응시 데이터가 없습니다." />
        )}
      </div>

      <div className="chart-card overflow-hidden p-5 pb-3">
        <ChartHeader title="회차별 점수 분포" description="완료 응시 기준 평균, 최고, 최저" />
        {examData.some((row) => row.완료 > 0) ? (
          <CompactTable
            headers={["회차", "평균", "최고", "최저"]}
            rows={examData
              .filter((row) => row.완료 > 0)
              .map((row) => [
                row.name,
                `${row.평균}%`,
                `${row.최고}%`,
                `${row.최저}%`,
              ])}
          />
        ) : (
          <EmptyState label="완료 응시 데이터가 없습니다." />
        )}
      </div>
    </section>
  );
}
