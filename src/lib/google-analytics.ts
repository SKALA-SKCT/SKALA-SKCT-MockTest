import { importPKCS8, SignJWT } from "jose";

export type AnalyticsPageRow = {
  path: string;
  users: number;
  views: number;
  engagementSeconds: number;
};

export type AnalyticsCountryRow = {
  country: string;
  users: number;
  views: number;
};

export type AnalyticsPeriodRow = {
  period: string;
  users: number;
  sessions: number;
};

export type AnalyticsOverview =
  | {
      configured: true;
      realtimeUsers: number;
      pages: AnalyticsPageRow[];
      countries: AnalyticsCountryRow[];
      daily: AnalyticsPeriodRow[];
      monthly: AnalyticsPeriodRow[];
    }
  | {
      configured: false;
      reason: "missing-config" | "request-failed";
    };

type AnalyticsResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

function getConfig() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

async function getAccessToken(config: NonNullable<ReturnType<typeof getConfig>>) {
  const privateKey = await importPKCS8(config.privateKey, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/analytics.readonly",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("Google access token request failed");

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("Google access token missing");
  return payload.access_token;
}

async function runReport(
  propertyId: string,
  accessToken: string,
  dimensions: string[],
  metrics: string[],
  limit: number,
  startDate = "30daysAgo",
  orderByDimension = false
) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate: "today" }],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit,
        orderBys: [
          orderByDimension
            ? { dimension: { dimensionName: dimensions[0] }, desc: false }
            : { metric: { metricName: metrics[0] }, desc: true },
        ],
      }),
    }
  );
  if (!response.ok) throw new Error("Google Analytics report request failed");
  return (await response.json()) as AnalyticsResponse;
}

async function runRealtimeReport(propertyId: string, accessToken: string) {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
    }
  );
  if (!response.ok) throw new Error("Google Analytics realtime request failed");
  return (await response.json()) as AnalyticsResponse;
}

function metricValue(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const config = getConfig();
  if (!config) return { configured: false, reason: "missing-config" };

  try {
    const accessToken = await getAccessToken(config);
    const [realtimeReport, pageReport, countryReport, dailyReport, monthlyReport] = await Promise.all([
      runRealtimeReport(config.propertyId, accessToken),
      runReport(
        config.propertyId,
        accessToken,
        ["pagePath"],
        ["activeUsers", "screenPageViews", "userEngagementDuration"],
        10
      ),
      runReport(
        config.propertyId,
        accessToken,
        ["country"],
        ["activeUsers", "screenPageViews"],
        10
      ),
      runReport(
        config.propertyId,
        accessToken,
        ["date"],
        ["activeUsers", "sessions"],
        30,
        "30daysAgo",
        true
      ),
      runReport(
        config.propertyId,
        accessToken,
        ["yearMonth"],
        ["activeUsers", "sessions"],
        12,
        "12monthsAgo",
        true
      ),
    ]);

    return {
      configured: true,
      realtimeUsers: metricValue(realtimeReport.rows?.[0]?.metricValues?.[0]?.value),
      pages: (pageReport.rows ?? []).map((row) => ({
        path: row.dimensionValues?.[0]?.value || "/",
        users: metricValue(row.metricValues?.[0]?.value),
        views: metricValue(row.metricValues?.[1]?.value),
        engagementSeconds: metricValue(row.metricValues?.[2]?.value),
      })),
      countries: (countryReport.rows ?? []).map((row) => ({
        country: row.dimensionValues?.[0]?.value || "알 수 없음",
        users: metricValue(row.metricValues?.[0]?.value),
        views: metricValue(row.metricValues?.[1]?.value),
      })),
      daily: (dailyReport.rows ?? []).map((row) => ({
        period: row.dimensionValues?.[0]?.value || "-",
        users: metricValue(row.metricValues?.[0]?.value),
        sessions: metricValue(row.metricValues?.[1]?.value),
      })),
      monthly: (monthlyReport.rows ?? []).map((row) => ({
        period: row.dimensionValues?.[0]?.value || "-",
        users: metricValue(row.metricValues?.[0]?.value),
        sessions: metricValue(row.metricValues?.[1]?.value),
      })),
    };
  } catch {
    return { configured: false, reason: "request-failed" };
  }
}
