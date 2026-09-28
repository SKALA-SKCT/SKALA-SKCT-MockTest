import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = process.env.SOURCE_ROOT;
if (!sourceRoot) throw new Error("SOURCE_ROOT 환경 변수에 원본 회차 폴더의 상위 경로를 지정하세요.");
const sourceSets = [
  [13, "2026년 상반기 1회"],
  [14, "2026년 상반기 2회"],
  [15, "2026년 상반기 3회"],
  [16, "2026년 하반기 1회"],
  [17, "2026년 하반기 2회"],
];

const subjects = ["언어이해", "자료해석", "창의수리", "언어추리", "수열추리"];

function compactText(value) {
  return String(value ?? "")
    .replace(/[\u00a0\u200b]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPrompt(question) {
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
  return prompt.replace(/\n<(보기|조건)>\s*$/, "").trim();
}

function latexToText(latex) {
  let value = latex
    .replace(/&nbsp;/g, " ")
    .replace(/~/g, "")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/(\d)\s*(?=\\d?frac)/g, "$1 ")
    .trim();
  for (let pass = 0; pass < 3; pass += 1) {
    value = value.replace(/\\d?frac\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)");
  }
  return value
    .replace(/\\Big/g, "")
    .replace(/\\!/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\,/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\(([\p{L}\p{N}.,]+)\)/gu, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderHtmlText(fragment) {
  const tokens = fragment.match(/<[^>]+>|[^<]+/g) ?? [];
  let katexHtmlDepth = 0;
  let mathMlDepth = 0;
  let annotation = "";
  let inAnnotation = false;
  let output = "";

  for (const token of tokens) {
    if (token.startsWith("<")) {
      const closing = /^<\//.test(token);
      const selfClosing = /\/$/.test(token) || /^<(?:br|img)\b/i.test(token);

      if (katexHtmlDepth) {
        if (!selfClosing) katexHtmlDepth += closing ? -1 : 1;
        continue;
      }
      if (!closing && /class="[^"]*katex-html\b/.test(token)) {
        katexHtmlDepth = 1;
        continue;
      }
      if (mathMlDepth) {
        if (!closing && /^<annotation\b/i.test(token)) inAnnotation = true;
        if (closing && /^<\/annotation/i.test(token)) {
          const formula = latexToText(decodeHtml(annotation));
          if (/\d$/.test(output) && /^\d+\//.test(formula)) output += " ";
          output += formula;
          annotation = "";
          inAnnotation = false;
        }
        if (!selfClosing) mathMlDepth += closing ? -1 : 1;
        continue;
      }
      if (!closing && /class="[^"]*katex-mathml\b/.test(token)) {
        mathMlDepth = 1;
        continue;
      }
      if (closing && /^<\/p/i.test(token)) output += " ";
      if (!closing && /^<br\b/i.test(token)) output += " ";
      continue;
    }

    if (katexHtmlDepth) continue;
    if (mathMlDepth) {
      if (inAnnotation) annotation += token;
      continue;
    }
    output += decodeHtml(token);
  }

  return compactText(output);
}

function cleanExplanation(question) {
  const html = String(question.solutionHtml ?? "");
  const start = html.indexOf('class="styles_solutionText');
  const footer = html.indexOf('class="styles_solutionFooter', start);
  const end = footer < 0 ? html.length : html.lastIndexOf("<div", footer);
  return renderHtmlText(html.slice(html.indexOf(">", start) + 1, end))
    .replace("a × 0.4 × 0.0 = 0.016a", "a × 0.4 × 0.04 = 0.016a");
}

function cleanChoices(question) {
  const choices = String(question.choicesHtml ?? "").split('<div class="choice">').slice(1).map((choice) => {
    const start = choice.indexOf("render-content");
    return renderHtmlText(choice.slice(choice.indexOf(">", start) + 1));
  });
  if (choices.length === question.choices.length && choices.every(Boolean)) return choices;
  return question.choices.map(compactText);
}

for (const [round, directory] of sourceSets) {
  const source = join(sourceRoot, directory, "linkareer-cbt-2026-09-28-100문제.json");
  const rawQuestions = JSON.parse(await readFile(source, "utf8"));
  if (rawQuestions.length !== 100) throw new Error(`${basename(source)}: 100문항이 아닙니다.`);
  const normalized = [];

  for (const question of rawQuestions) {
    let prompt = cleanPrompt(question);
    let body = prompt;
    let imageUrl = null;
    const materialPath = join(projectRoot, `public/exam-assets/round-${round}/q-${question.number}.jpg`);

    if (existsSync(materialPath)) {
      imageUrl = `/exam-assets/round-${round}/q-${question.number}.jpg`;
    }

    normalized.push({
      number: question.number,
      subject: subjects[Math.floor((question.number - 1) / 20)],
      body: compactText(body),
      choices: cleanChoices(question),
      answer: question.answer,
      explanation: cleanExplanation(question) || null,
      imageUrl,
    });
  }

  const dataDirectory = join(projectRoot, "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(join(dataDirectory, `round-${round}.json`), `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(`round-${round}: ${normalized.length}문항 정규화`);
}
