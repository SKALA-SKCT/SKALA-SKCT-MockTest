import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, attemptResults } from "@/db/schema";

export const dynamic = "force-dynamic";

type AnalysisInput = {
  attemptId?: number;
  examTitle: string;
  score: number;
  total: number;
  rank: number;
  participants: number;
  unanswered: number;
  easyMistakes: number;
  subjects: Array<{
    subject: string;
    score: number;
    total: number;
    accuracy: number;
    averageAccuracy: number;
    elapsedSeconds: number;
  }>;
  questions: Array<{
    subject: string;
    number: number;
    status: "정답" | "오답" | "미응답";
    isEasyMistake: boolean;
    elapsedSeconds: number;
    peerWrongRate: number | null;
    difficulty: "고오답률" | "저오답률" | "분석 불가";
  }>;
};

type AnalysisContent = {
  summary: string;
  priorities: string[];
  actions: string[];
};

function isAnalysisContent(value: unknown): value is AnalysisContent {
  if (!value || typeof value !== "object") return false;
  const content = value as Record<string, unknown>;
  return (
    typeof content.summary === "string" &&
    content.summary.trim().length > 0 &&
    Array.isArray(content.priorities) &&
    content.priorities.length > 0 &&
    content.priorities.every(
      (item) => typeof item === "string" && item.trim().length > 0
    ) &&
    Array.isArray(content.actions) &&
    content.actions.length > 0 &&
    content.actions.every(
      (item) => typeof item === "string" && item.trim().length > 0
    )
  );
}

function normalizeAnalysisContent(value: AnalysisContent): AnalysisContent {
  return {
    summary: value.summary.trim().slice(0, 300),
    priorities: value.priorities
      .map((item) => item.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 3),
    actions: value.actions
      .map((item) => item.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 3),
  };
}

function buildPrompt(input: AnalysisInput, retry = false) {
  return `너는 SKCT 학습 전략 코치다. 아래의 응시 요약만 사용해 한국어로 짧고 구체적인 분석을 작성하라.
문제의 정답이나 원문을 추측하지 말고, 데이터에 없는 사실을 만들지 마라.
문항별 체류 시간과 영역별 체류 시간을 활용하고, 오답 문항은 고오답률인지 저오답률인지 구분하라. isEasyMistake가 true인 문항은 쉬운 문제 실수이므로 우선 개선점과 다음 응시 행동에 반영하라.
${retry ? "이전 응답은 형식 검증에 실패했다. 반드시 아래 JSON 스키마에 맞는 JSON 객체만 반환하라." : ""}
반드시 JSON만 반환하라. 형식은 다음과 같다:
{"summary":"핵심 진단 한 문장","priorities":["우선 개선점 2~3개"],"actions":["다음 응시 행동 2~3개"]}

응시 요약:
${JSON.stringify(input)}`;
}

const responseJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    priorities: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "priorities", "actions"],
};

async function requestGemini(
  apiKey: string,
  model: string,
  prompt: string
) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
            responseJsonSchema,
          },
        }),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  const input = (await request.json()) as AnalysisInput;

  if (!input || !Array.isArray(input.subjects)) {
    return NextResponse.json({ error: "분석 데이터가 올바르지 않습니다." }, { status: 400 });
  }

  if (input.attemptId) {
    const [ownedResult] = await db
      .select({ aiAnalysis: attemptResults.aiAnalysis })
      .from(attemptResults)
      .innerJoin(attempts, eq(attempts.id, attemptResults.attemptId))
      .where(
        and(
          eq(attemptResults.attemptId, input.attemptId),
          eq(attempts.userId, user.id)
        )
      );
    if (ownedResult?.aiAnalysis) {
      return NextResponse.json(ownedResult.aiAnalysis);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const parseContent = (text: string | null): AnalysisContent | null => {
    if (!text) return null;
    try {
      const parsed: unknown = JSON.parse(text);
      return isAnalysisContent(parsed) ? normalizeAnalysisContent(parsed) : null;
    } catch {
      return null;
    }
  };

  const firstResult = parseContent(
    await requestGemini(apiKey, model, buildPrompt(input))
  );
  const result =
    firstResult ??
    parseContent(await requestGemini(apiKey, model, buildPrompt(input, true)));

  if (!result) {
    return NextResponse.json(
      { error: "Gemini 분석을 완료하지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  const responsePayload = { ...result, provider: "gemini" as const };
  if (input.attemptId) {
    await db
      .update(attemptResults)
      .set({ aiAnalysis: responsePayload, updatedAt: new Date() })
      .where(eq(attemptResults.attemptId, input.attemptId));
  }

  return NextResponse.json(responsePayload);
}
