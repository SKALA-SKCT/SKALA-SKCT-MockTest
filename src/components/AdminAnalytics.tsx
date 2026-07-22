import {
  getAnalyticsOverview,
  type AnalyticsPageRow,
  type AnalyticsPeriodRow,
} from "@/lib/google-analytics";

function formatDuration(seconds: number) {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes ? `${minutes}분 ${remainder}초` : `${remainder}초`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function PageTable({ pages }: { pages: AnalyticsPageRow[] }) {
  return (
    <table className="data-table text-sm">
      <thead>
        <tr>
          <th className="px-5 py-3 text-left font-semibold">페이지</th>
          <th className="px-5 py-3 text-right font-semibold">사용자</th>
          <th className="px-5 py-3 text-right font-semibold">조회수</th>
          <th className="px-5 py-3 text-right font-semibold">참여 시간</th>
        </tr>
      </thead>
      <tbody>
        {pages.length ? (
          pages.map((page) => (
            <tr key={page.path}>
              <td className="max-w-[420px] truncate px-5 py-3 font-semibold text-ink" title={page.path}>
                {page.path}
              </td>
              <td className="px-5 py-3 text-right tabular-nums">{formatNumber(page.users)}</td>
              <td className="px-5 py-3 text-right tabular-nums">{formatNumber(page.views)}</td>
              <td className="px-5 py-3 text-right tabular-nums">{formatDuration(page.engagementSeconds)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-3">
              수집된 페이지 데이터가 없습니다.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function PeriodTable({ rows, label }: { rows: AnalyticsPeriodRow[]; label: string }) {
  return (
    <table className="data-table text-sm">
      <thead>
        <tr>
          <th className="px-5 py-3 text-left font-semibold">{label}</th>
          <th className="px-5 py-3 text-right font-semibold">사용자</th>
          <th className="px-5 py-3 text-right font-semibold">세션</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row) => (
            <tr key={row.period}>
              <td className="px-5 py-3 font-semibold text-ink">{row.period}</td>
              <td className="px-5 py-3 text-right tabular-nums">{formatNumber(row.users)}</td>
              <td className="px-5 py-3 text-right tabular-nums">{formatNumber(row.sessions)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3} className="px-5 py-8 text-center text-sm text-ink-3">
              수집된 접속 데이터가 없습니다.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default async function AdminAnalytics() {
  const analytics = await getAnalyticsOverview();

  return (
    <div className="space-y-5">
      <section className="chart-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">서비스 이용 분석</h2>
            <p className="mt-1 text-xs text-ink-3">GA4 최근 30일 기준</p>
          </div>
          <span className="text-xs text-ink-3">페이지 체류 시간 · 접속 국가</span>
        </div>
      </section>

      {!analytics.configured ? (
        <section className="chart-card p-5">
          <h2 className="text-sm font-semibold text-ink">분석 데이터 연결 필요</h2>
          <p className="mt-2 text-sm leading-6 text-ink-2">
            GA4 측정 ID와 서비스 계정 정보를 설정하면 실제 이용 데이터가 표시됩니다.
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-3">
            {!analytics.configured && analytics.reason === "request-failed"
              ? "현재 GA4 데이터를 불러오지 못했습니다. GA4 속성 권한과 환경변수를 확인해주세요."
              : "NEXT_PUBLIC_GA_MEASUREMENT_ID, GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY를 설정해주세요."}
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">현재 접속 인원</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {formatNumber(analytics.realtimeUsers)}명
              </p>
              <p className="mt-1 text-xs text-ink-3">최근 30분 활성 사용자</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">오늘 접속</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {formatNumber(analytics.daily.at(-1)?.users ?? 0)}명
              </p>
              <p className="mt-1 text-xs text-ink-3">최근 일별 활성 사용자</p>
            </div>
            <div className="metric-card px-5 py-4">
              <p className="text-xs font-medium text-ink-3">이번 달 접속</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {formatNumber(analytics.monthly.at(-1)?.users ?? 0)}명
              </p>
              <p className="mt-1 text-xs text-ink-3">최근 월별 활성 사용자</p>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="chart-card overflow-hidden">
              <div className="border-b border-hairline px-5 py-4">
                <h2 className="text-sm font-semibold text-ink">일별 접속</h2>
                <p className="mt-1 text-xs text-ink-3">최근 30일 기준</p>
              </div>
              <PeriodTable rows={analytics.daily} label="날짜" />
            </div>
            <div className="chart-card overflow-hidden">
              <div className="border-b border-hairline px-5 py-4">
                <h2 className="text-sm font-semibold text-ink">월별 접속</h2>
                <p className="mt-1 text-xs text-ink-3">최근 12개월 기준</p>
              </div>
              <PeriodTable rows={analytics.monthly} label="월" />
            </div>
          </section>

          <section className="chart-card overflow-hidden">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">인기 페이지</h2>
              <p className="mt-1 text-xs text-ink-3">활성 사용자 기준 상위 페이지</p>
            </div>
            <PageTable pages={analytics.pages} />
          </section>

          <section className="chart-card overflow-hidden">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">접속 국가</h2>
              <p className="mt-1 text-xs text-ink-3">활성 사용자 기준 상위 국가</p>
            </div>
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">국가</th>
                  <th className="px-5 py-3 text-right font-semibold">사용자</th>
                  <th className="px-5 py-3 text-right font-semibold">조회수</th>
                </tr>
              </thead>
              <tbody>
                {analytics.countries.length ? (
                  analytics.countries.map((country) => (
                    <tr key={country.country}>
                      <td className="px-5 py-3 font-semibold text-ink">{country.country}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatNumber(country.users)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatNumber(country.views)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-sm text-ink-3">
                      수집된 국가 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
