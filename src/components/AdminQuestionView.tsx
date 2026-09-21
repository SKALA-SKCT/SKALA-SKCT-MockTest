import Image from "next/image";
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
  const supplementImageUrl =
    display.supplementImageUrl && display.supplementImageUrl !== display.imageUrl
      ? display.supplementImageUrl
      : null;
  const localNumber = (question.number - 1) % 20 + 1;

  return (
    <article className="chart-card space-y-4 p-5">
      <h3 className="text-sm font-black text-ink">
        {question.subject} {localNumber}번 <span className="font-medium text-ink-3">(전체 {question.number}번)</span>
      </h3>

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
        <PdfPassage text={body} round={examId} number={question.number} />
      </div>

      {display.imageUrl && (
        <Image src={display.imageUrl} alt="" width={880} height={520} className="h-auto w-full rounded-lg border border-hairline" unoptimized />
      )}
      {supplementImageUrl && (
        <Image src={supplementImageUrl} alt="" width={880} height={520} className="h-auto w-full rounded-lg border border-hairline" unoptimized />
      )}

      <ol className="space-y-1.5 text-sm text-ink">
        {choices.map((choice, index) => (
          <li
            key={index}
            className={index + 1 === display.answer ? "font-bold text-brand" : undefined}
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
