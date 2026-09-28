import PdfPassage from "@/components/PdfPassage";
import { applyQuestionContentOverride } from "@/lib/question-overrides";
import {
  formatReviewExplanation,
  normalizeChoiceTexts,
  normalizeQuestionDisplayText,
  repairQuestionBody,
} from "@/lib/question-text";
import type { Subject } from "@/db/schema";

type QuestionRow = {
  number: number;
  subject: Subject;
  body: string;
  choices: string[];
  answer: number;
  explanation: string | null;
  imageUrl: string | null;
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

function splitQuestionBody(value: string) {
  const [firstBlock, ...restBlocks] = value.split(/\n{2,}/);
  if (firstBlock?.trim().endsWith("?") && restBlocks.length > 0) {
    return { prompt: firstBlock.trim(), passage: restBlocks.join("\n\n").trim() };
  }
  const questionEnd = value.indexOf("?");
  if (questionEnd < 0) return { prompt: value, passage: "" };
  return {
    prompt: value.slice(0, questionEnd + 1).trim(),
    passage: value.slice(questionEnd + 1).trim(),
  };
}

export default function AdminQuestionView({ examId, question }: { examId: number; question: QuestionRow }) {
  const display = applyQuestionContentOverride(examId, question);
  const body = display.pdfVerifiedBody
    ? display.body.trim()
    : normalizeQuestionDisplayText(
        repairQuestionBody(display.body, {
          hasMaterialImage: Boolean(display.imageUrl || display.supplementImageUrl),
          subject: question.subject,
        }),
      );
  const choices = display.pdfVerifiedChoices ? display.choices : normalizeChoiceTexts(display.choices);
  const explanation = formatReviewExplanation(display.explanation);
  const { prompt, passage } = splitQuestionBody(body);
  const supplementImageUrl =
    display.supplementImageUrl && display.supplementImageUrl !== display.imageUrl
      ? display.supplementImageUrl
      : null;
  const localNumber = (question.number - 1) % 20 + 1;
  // 조건·보기 목록이 본문에 들어간 문항은 그림이 목록보다 먼저 보여야 한다.
  const materialFirst = /^\s*<(조건|보기)>/.test(passage);
  const materials = (
    <>
      {display.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={display.imageUrl} alt={`${question.number}번 문제 자료`} className="mt-3 h-auto max-w-full rounded-lg border border-hairline bg-white object-contain" />
      )}
      {supplementImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={supplementImageUrl} alt={`${question.number}번 보조 자료`} className="mt-3 h-auto max-w-full rounded-lg border border-hairline bg-white object-contain" />
      )}
    </>
  );

  return (
    <article className="chart-card space-y-4 p-5">
      <h3 className="text-sm font-black text-ink">
        {question.subject} {localNumber}번 <span className="font-medium text-ink-3">(전체 {question.number}번)</span>
      </h3>

      <div className="rounded-xl bg-zinc-50 px-4 py-4">
        <p className="whitespace-pre-line text-[15px] font-bold leading-7 text-ink [overflow-wrap:anywhere]">
          {prompt}
        </p>
        {materialFirst && materials}
        {passage && (
          <div className="mt-3 border-t border-zinc-200 pt-3">
            <p className="whitespace-pre-line text-sm leading-7 text-ink-2 [overflow-wrap:anywhere]">
              <PdfPassage text={passage} round={examId} number={question.number} />
            </p>
          </div>
        )}
        {!materialFirst && materials}
      </div>

      <ol className="grid gap-2 text-sm text-ink">
        {choices.map((choice, index) => (
          <li
            key={index}
            className={`rounded-lg border px-3 py-2.5 ${
              index + 1 === display.answer
                ? "border-brand/40 bg-brand/5 font-bold text-brand"
                : "border-hairline bg-white"
            }`}
          >
            {CIRCLED[index] ?? `${index + 1}.`} {choice}
          </li>
        ))}
      </ol>

      <p className="text-sm font-bold text-ink">정답 {CIRCLED[display.answer - 1] ?? display.answer}</p>

      {explanation && (
        <div className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm leading-relaxed text-ink-2">
          {explanation}
        </div>
      )}
    </article>
  );
}
