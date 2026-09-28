import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeQuestionDisplayText } from "../src/lib/question-text";

const sourceRoot = process.env.SOURCE_ROOT;
if (!sourceRoot) throw new Error("SOURCE_ROOT 환경 변수가 필요합니다.");

const projectRoot = process.cwd();
const sourceSets = [
  [13, "2026년 상반기 1회"],
  [14, "2026년 상반기 2회"],
  [15, "2026년 상반기 3회"],
  [16, "2026년 하반기 1회"],
  [17, "2026년 하반기 2회"],
] as const;
const subjects = ["언어이해", "자료해석", "창의수리", "언어추리", "수열추리"];
const attachmentPattern = /https:\/\/api\.linkareer\.com\/academy\/apiV2\/attachments\/\d+/g;
const assetManifest = JSON.parse(
  readFileSync(join(projectRoot, "archives/linkareer-cbt/asset-manifest.json"), "utf8"),
) as Record<string, { attachments: number; labels: Array<string | null>; asset: string }>;

type RawQuestion = {
  number: number;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string | null;
  choicesHtml?: string;
  questionHtml?: string;
  solutionHtml?: string;
};

type NormalizedQuestion = {
  number: number;
  subject: string;
  body: string;
  choices: string[];
  answer: number;
  explanation: string | null;
  imageUrl: string | null;
};

function compactText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u00a0\u200b]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function expectedBody(question: RawQuestion) {
  const rawPrompt = compactText(question.prompt).split(/\n정답\s*:/)[0];
  const questionEnd = rawPrompt.indexOf("?");
  let prompt = questionEnd >= 0 ? rawPrompt.slice(0, questionEnd + 1) : rawPrompt.split("\n")[0];
  const inlineMath = String(question.questionHtml ?? "").match(
    /<annotation[^>]*encoding="application\/x-tex"[^>]*>([\s\S]*?)<\/annotation>/,
  )?.[1];
  if (inlineMath) prompt = prompt.replace(/\n[𝐴𝐵]\n[𝐴𝐵]\n[AB]\n[AB]\n/gu, ` ${latexToText(inlineMath)} `);
  prompt = prompt.replace(/\s+(?=의 값으로)/g, "");
  const trailing = questionEnd >= 0 ? rawPrompt.slice(questionEnd + 1).trim() : "";
  if (trailing.startsWith("※")) {
    prompt = `${prompt}\n${trailing.split("\n").filter((line) => line.startsWith("※")).join("\n")}`;
  }
  return compactText(prompt.replace(/\n<(보기|조건)>\s*$/, ""));
}

function hasValidPromptLayout(body: string) {
  const lines = normalizeQuestionDisplayText(body).split("\n").filter(Boolean);
  return lines.slice(1).every((line) => line.startsWith("※"));
}

function latexToText(latex: string) {
  let value = latex.replace(/&nbsp;/g, " ").replace(/~/g, "").replace(/(\d)\s*(?=\\d?frac)/g, "$1 ").trim();
  for (let pass = 0; pass < 3; pass += 1) {
    value = value.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  }
  return value
    .replace(/\\Big/g, "")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\,/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\(([\p{L}\p{N}.,]+)\)/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function expectedExplanationMath(question: RawQuestion) {
  return [...String(question.solutionHtml ?? "").matchAll(
    /<annotation[^>]*encoding="application\/x-tex"[^>]*>([\s\S]*?)<\/annotation>/g,
  )].map((match) => latexToText(decodeHtml(match[1])));
}

function hasValidExplanation(question: RawQuestion, explanation: string | null) {
  if (!explanation) return false;
  const math = expectedExplanationMath(question);
  return math.every((value) => explanation.includes(value))
    && !/[\u00a0\u200b]/.test(explanation)
    && !/^\s*(?:[\d.,]+|[=+×÷-])\s*$/m.test(explanation);
}

function passesReportedRegression(round: number, question: NormalizedQuestion) {
  if (round !== 13 || question.number !== 84) return true;
  return JSON.stringify(question.choices) === JSON.stringify(["5 13/15", "5 7/8", "4 14/15", "5 14/15", "4 13/15"])
    && Boolean(question.explanation?.includes("= 89/15 = 5 14/15이므로 정답은 ④이다."))
    && !question.explanation?.includes("\n");
}

function expectedChoices(question: RawQuestion) {
  return String(question.choicesHtml ?? "").split('<div class="choice">').slice(1).map((choice) =>
    [...choice.matchAll(/<annotation[^>]*encoding="application\/x-tex"[^>]*>([\s\S]*?)<\/annotation>/g)]
      .map((match) => latexToText(match[1])),
  );
}

function hasValidChoices(question: RawQuestion, choices: string[]) {
  const math = expectedChoices(question);
  if (math.length === choices.length) {
    return choices.every((choice, index) => choice.trim() && !/[\n\u00a0\u200b]/.test(choice)
      && math[index].every((formula) => choice.includes(formula)));
  }
  return JSON.stringify(choices) === JSON.stringify(question.choices.map(compactText));
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function expectedLabels(html: string) {
  const attachments = [...html.matchAll(attachmentPattern)];
  const labels: Array<string | null> = [];
  let previousEnd = 0;
  for (const attachment of attachments) {
    const segment = html.slice(previousEnd, attachment.index);
    const paragraphs = [...segment.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((match) => decodeHtml(match[1]));
    labels.push([...paragraphs].reverse().find((text) => text === "<보기>" || text === "<조건>") ?? null);
    previousEnd = (attachment.index ?? 0) + attachment[0].length;
  }
  return labels;
}

function jpegDimensions(path: string) {
  const buffer = readFileSync(path);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`JPEG 크기를 읽을 수 없습니다: ${path}`);
}

const results: Array<Record<string, unknown>> = [];
for (const [round, directory] of sourceSets) {
  const sourcePath = join(sourceRoot, directory, "linkareer-cbt-2026-09-28-100문제.json");
  const raw = JSON.parse(readFileSync(sourcePath, "utf8")) as RawQuestion[];
  const normalized = JSON.parse(
    readFileSync(join(projectRoot, `archives/linkareer-cbt/normalized/round-${round}.json`), "utf8"),
  ) as NormalizedQuestion[];

  for (let index = 0; index < 100; index += 1) {
    const source = raw[index];
    const actual = normalized[index];
    const attachments = String(source.questionHtml ?? "").match(attachmentPattern) ?? [];
    const expectedImage = attachments.length > 0 ? `/exam-assets/round-${round}/q-${source.number}.jpg` : null;
    const assetPath = expectedImage ? join(projectRoot, "public", expectedImage) : null;
    const manifest = assetManifest[`${round}:${source.number}`];
    const labels = expectedLabels(String(source.questionHtml ?? ""));
    const dimensions = assetPath && existsSync(assetPath) ? jpegDimensions(assetPath) : null;
    const checks = {
      order: source.number === index + 1 && actual.number === source.number,
      subject: actual.subject === subjects[Math.floor(index / 20)],
      body: actual.body === expectedBody(source),
      promptLayout: hasValidPromptLayout(actual.body),
      choices: hasValidChoices(source, actual.choices),
      answer: actual.answer === source.answer,
      explanation: hasValidExplanation(source, actual.explanation),
      reportedRegression: passesReportedRegression(round, actual),
      imageUrl: actual.imageUrl === expectedImage,
      assetExists: !assetPath || existsSync(assetPath),
      assetWidth: !dimensions || dimensions.width <= 790,
      attachmentCount: attachments.length === 0 || manifest?.attachments === attachments.length,
      labels: attachments.length === 0 || JSON.stringify(manifest?.labels) === JSON.stringify(labels),
    };
    const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
    results.push({ round, number: source.number, subject: actual.subject, status: failures.length ? "FAIL" : "PASS", failures, checks });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((result) => result.status === "PASS").length,
  failed: results.filter((result) => result.status === "FAIL").length,
  results,
};
const outputPath = join(projectRoot, "archives/linkareer-cbt/verification-2026.json");
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`2026 문항 검수: ${report.passed}/${report.total} PASS, ${report.failed} FAIL`);
if (report.failed > 0) {
  console.error(results.filter((result) => result.status === "FAIL"));
  process.exit(1);
}
