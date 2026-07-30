import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type MentionedQuestion = {
  subject: string;
  number: number;
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
  participantCount?: number;
  mentionedQuestions?: MentionedQuestion[];
};

function buildPrompt(input: Required<ReviewChatInput>) {
  return `너는 SKCT 문항 리뷰 튜터다. 사용자의 질문에 한국어로 답하라.
반드시 제공된 문항 데이터와 사용자 풀이 기록만 근거로 사용하고, 없는 원문/조건/통계를 만들어내지 마라.
해설, 풀이 팁, 함정, 응시자들이 헷갈렸을 가능성, 다른 답이 나온 이유를 묻는 경우 문항 정보와 선택률, 사용자의 선택/정오답/풀이 시간을 반영하라.
답변은 2~5문장으로 짧고 구체적으로 작성하라. 수식이 필요한 경우 간단히 단계화하라.
문항이 언급되지 않았으면 @문제번호 또는 @문제유형으로 질문하라고 안내하라.

전체 기준 응시자 수: ${input.participantCount}명
사용자 질문: ${input.question}
언급된 문항 데이터:
${JSON.stringify(input.mentionedQuestions)}`;
}

async function requestGemini(apiKey: string, model: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 700,
        },
      }),
    }
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

export async function POST(request: Request) {
  await requireUser();
  const payload = (await request.json()) as ReviewChatInput;
  const question = payload.question?.trim().slice(0, 500) ?? "";
  const mentionedQuestions = (payload.mentionedQuestions ?? []).slice(0, 5);

  if (!question) {
    return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const answer = await requestGemini(
    apiKey,
    model,
    buildPrompt({
      question,
      participantCount: payload.participantCount ?? 0,
      mentionedQuestions,
    })
  );

  if (!answer) {
    return NextResponse.json(
      { error: "답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  return NextResponse.json({ answer });
}
