import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type MentionedQuestion = {
  subject: string;
  number: number;
  localNumber?: number;
  displayLabel?: string;
  body: string;
  choices: Array<{
    number: number;
    label: string;
    text: string;
    selectedRatePercent: number | null;
    isMyChoice: boolean;
    isAnswer: boolean;
  }>;
  answer: number;
  explanation: string | null;
  myChoice: number | null;
  myChoiceLabel: string | null;
  isCorrect: boolean;
  elapsedSeconds: number | null;
  elapsedText: string;
  wrongRatePercent: number | null;
  groupAccuracyPercent: number;
};

type ReviewChatInput = {
  question?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  participantCount?: number;
  mentionedQuestions?: MentionedQuestion[];
};

const SKCT_KEYWORDS = [
  "skct",
  "SKCT",
  "에스케이씨티",
  "모의고사",
  "문항",
  "문제",
  "풀이",
  "해설",
  "오답",
  "정답",
  "무응답",
  "유형",
  "자료해석",
  "언어이해",
  "언어추리",
  "수열추리",
  "창의수리",
  "실전",
  "시험",
  "응시",
  "시간관리",
  "찍기",
  "함정",
  "취약",
  "학습",
  "복습",
  "인적성",
  "적성",
];

const SUBJECTS = ["언어이해", "자료해석", "창의수리", "언어추리", "수열추리"];

const BLOCKED_TOPIC_KEYWORDS = [
  "레시피",
  "요리",
  "주식",
  "코인",
  "연애",
  "게임",
  "영화",
  "음악",
  "여행",
  "정치",
  "대출",
  "부동산",
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const RATE_LIMIT_MIN_INTERVAL_MS = 2_000;
const rateLimitStore = new Map<number, number[]>();

function isSkctRelated(
  question: string,
  mentionedQuestions: MentionedQuestion[],
  history: ReviewChatInput["history"]
) {
  if (mentionedQuestions.length > 0) return true;
  const normalized = `${history
    ?.slice(-4)
    .map((message) => message.content)
    .join("\n") ?? ""}\n${question}`.toLowerCase();
  const hasSkctKeyword = SKCT_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
  const hasBlockedTopic = BLOCKED_TOPIC_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
  return hasSkctKeyword && !hasBlockedTopic;
}

function checkRateLimit(userId: number) {
  const now = Date.now();
  const recent = (rateLimitStore.get(userId) ?? []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS
  );
  const lastRequestAt = recent.at(-1) ?? 0;

  if (now - lastRequestAt < RATE_LIMIT_MIN_INTERVAL_MS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((RATE_LIMIT_MIN_INTERVAL_MS - (now - lastRequestAt)) / 1000),
    };
  }

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000),
    };
  }

  recent.push(now);
  rateLimitStore.set(userId, recent);
  return { allowed: true, retryAfter: 0 };
}

function buildPrompt(input: Required<ReviewChatInput>) {
  return `너는 SKCT 문항 리뷰 튜터다. 사용자의 질문에 한국어로 답하라.
답변 범위는 SKCT 시험, SKCT 학습 전략, SKCT 문항 유형, 모의고사 결과 리뷰, 시간관리, 오답 분석으로 제한한다.
SKCT 범위를 벗어난 질문에는 "SKCT 학습과 문항 리뷰에 관한 질문만 도와드릴 수 있어요."라고 짧게 답하라.
최근 대화 맥락이 있으면 현재 질문이 "좀 더", "자세히", "왜?", "그럼?"처럼 짧아도 직전 SKCT 주제를 이어서 답하라.
문항 데이터가 제공된 경우 반드시 제공된 문항 데이터와 사용자 풀이 기록만 근거로 사용하고, 없는 원문/조건/통계를 만들어내지 마라.
사용자가 말한 "자료해석 12번" 같은 번호는 displayLabel 또는 localNumber 기준이다. number는 DB 원본 전체 번호이므로 사용자 질문 번호와 달라도 같은 문항으로 취급하라.
mentionedQuestions가 비어 있지 않으면 "데이터가 없다"고 답하지 말고, 제공된 문항 데이터로 답하라.
사용자가 특정 과목과 문항 번호를 말했으면 displayLabel이 정확히 일치하는 문항만 분석하라. 다른 과목 문항으로 대체하거나 여러 문항의 내용을 섞지 마라.
언급된 문항 데이터가 여러 개라 어느 문항인지 확정할 수 없으면 임의로 선택하지 말고 과목명을 함께 말해 달라고 요청하라.
해설, 풀이 팁, 함정, 응시자들이 헷갈렸을 가능성, 다른 답이 나온 이유를 묻는 경우 문항 정보와 선택률, 사용자의 선택/정오답/풀이 시간을 반영하라.
문항이 언급되지 않았지만 SKCT 관련 일반 질문이면, 일반적인 SKCT 학습 조언으로 답하라.
답변은 마크다운 형식으로 작성하라. 2~4개 bullet 또는 짧은 문단으로 끝까지 완성하라.
문장을 중간에 끊지 말고 반드시 완결된 문장으로 끝내라.
수식이 필요한 경우 간단히 단계화하라.
문항별 상세 분석이 필요한 경우에만 @문제번호 또는 @문제유형으로 질문하라고 안내하라.

전체 기준 응시자 수: ${input.participantCount}명
최근 대화:
${JSON.stringify(input.history)}
사용자 질문: ${input.question}
언급된 문항 데이터:
${JSON.stringify(input.mentionedQuestions)}`;
}

type GeminiResult = {
  answer: string | null;
  finishReason?: string;
  failed?: boolean;
};

function isLikelyTruncated(answer: string, finishReason?: string) {
  if (finishReason === "MAX_TOKENS") return true;
  return !/[.!?。！？요다함음됨임죠네세요어요습니다]$/.test(answer.trim());
}

async function requestGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GeminiResult> {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 2048,
          },
        }),
      }
    );
  } catch (error) {
    console.error("[review-chat] Gemini request failed", error);
    return { answer: null, failed: true };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[review-chat] Gemini response error", {
      status: response.status,
      model,
      body: errorText.slice(0, 1000),
    });
    return { answer: null, failed: true };
  }
  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const answer = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  const finishReason = payload.candidates?.[0]?.finishReason;
  if (!answer) {
    console.error("[review-chat] Gemini response had no text", {
      model,
      finishReason,
    });
  }
  return { answer: answer ?? null, finishReason };
}

export async function POST(request: Request) {
  const user = await requireUser();
  const payload = (await request.json()) as ReviewChatInput;
  const question = payload.question?.trim().slice(0, 500) ?? "";
  const history = (payload.history ?? [])
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
    )
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 800),
    }));
  const requestedSubjects = SUBJECTS.filter((subject) => question.includes(subject));
  const requestedNumbers = Array.from(question.matchAll(/@?(\d{1,3})번/g)).map(
    (match) => Number(match[1])
  );
  const mentionedQuestions = (payload.mentionedQuestions ?? [])
    .filter(
      (item) =>
        (requestedSubjects.length === 0 || requestedSubjects.includes(item.subject)) &&
        (requestedNumbers.length === 0 ||
          requestedNumbers.includes(item.localNumber ?? item.number))
    )
    .slice(0, 5);

  if (!question) {
    return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
  }

  if (
    requestedSubjects.length > 0 &&
    requestedNumbers.length > 0 &&
    mentionedQuestions.length === 0
  ) {
    return NextResponse.json({
      answer: `${requestedSubjects[0]} ${requestedNumbers[0]}번 문항 데이터를 찾지 못했습니다. 결과 페이지에서 해당 문항 번호를 확인해 주세요.`,
    });
  }

  if (!isSkctRelated(question, mentionedQuestions, history)) {
    return NextResponse.json({
      answer: "SKCT 학습과 문항 리뷰에 관한 질문만 도와드릴 수 있어요.",
    });
  }

  const rateLimit = checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `요청이 너무 빠릅니다. ${rateLimit.retryAfter}초 후 다시 시도해주세요.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const primaryModel = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
  const models = Array.from(
    new Set([primaryModel, "gemini-flash-lite-latest", "gemini-flash-latest"])
  );
  const prompt = buildPrompt({
    question,
    history,
    participantCount: payload.participantCount ?? 0,
    mentionedQuestions,
  });

  let model = models[0];
  let result: GeminiResult = { answer: null, failed: true };
  for (const candidateModel of models) {
    model = candidateModel;
    result = await requestGemini(apiKey, candidateModel, prompt);
    if (result.answer || !result.failed) break;
  }

  let answer = result.answer;
  if (answer && isLikelyTruncated(answer, result.finishReason)) {
    console.error("[review-chat] Gemini answer looked truncated, retrying", {
      model,
      finishReason: result.finishReason,
      answer,
    });
    const retry = await requestGemini(
      apiKey,
      model,
      `${prompt}

이전 답변이 중간에 끊겼다. 이번에는 2문장 이내로 아주 짧게, 반드시 완결된 문장으로 답하라.`
    );
    answer = retry.answer ?? answer;
  }

  if (answer && isLikelyTruncated(answer)) {
    answer = `${answer.replace(/[,\s]+$/, "")}.`;
  }

  if (!answer) {
    return NextResponse.json(
      { error: "답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  return NextResponse.json({ answer });
}
