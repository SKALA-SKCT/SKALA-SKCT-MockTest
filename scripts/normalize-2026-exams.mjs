import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const projectRoot = process.cwd();
const sourceRoot = process.env.SOURCE_ROOT;
const ocrRoot = process.env.OCR_ROOT ?? "/tmp/skct-ocr";
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
  let prompt = compactText(question.prompt).split(/\n정답\s*:/)[0];
  if (question.number >= 81) {
    prompt = prompt.split("\n")[0];
  }
  return prompt;
}

function passageText(value) {
  return compactText(value)
    .split("\n")
    .filter(Boolean)
    .join(" ")
    .replace(/\(\s*([A-E])\s*\)/g, "($1)")
    .replace(/\(\s*([A-E])\s*$/, "($1)");
}

function conditionText(value) {
  return compactText(value)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const withoutBullet = line.replace(/^[•●·]\s*/, "").replace(/^[^\s]{1,2}\s+(?=[가-힣A-Z0-9(])/, "");
      return `- ${withoutBullet}`;
    })
    .join("\n");
}

function latexToText(latex) {
  let value = latex.replace(/&nbsp;/g, " ").replace(/~/g, "").trim();
  for (let pass = 0; pass < 3; pass += 1) {
    value = value.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  }
  return value
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\,/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\(([^()]+)\)\/\(([^()]+)\)$/, "$1/$2")
    .trim();
}

function cleanChoices(question) {
  const annotations = [...String(question.choicesHtml ?? "").matchAll(
    /<annotation[^>]*encoding="application\/x-tex"[^>]*>([\s\S]*?)<\/annotation>/g,
  )].map((match) => latexToText(match[1]));
  if (annotations.length === question.choices.length) return annotations;
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
    const supplementPath = join(
      projectRoot,
      `public/exam-assets/round-${round}/q-${question.number}-supplement.jpg`,
    );
    const hasSupplement = existsSync(supplementPath);

    if (question.number <= 20) {
      const ocr = await readFile(join(ocrRoot, `round-${round}/q-${question.number}.txt`), "utf8");
      if (hasSupplement) prompt = prompt.replace(/\n?<보기>\s*$/, "");
      body = `${prompt}\n\n${passageText(ocr)}${hasSupplement ? "\n\n<보기>" : ""}`;
      if (hasSupplement) imageUrl = `/exam-assets/round-${round}/q-${question.number}-supplement.jpg`;
    } else if (question.number <= 40 || question.number >= 81) {
      imageUrl = `/exam-assets/round-${round}/q-${question.number}.jpg`;
    } else if (question.number >= 61 && question.number <= 80) {
      const ocr = await readFile(join(ocrRoot, `round-${round}/q-${question.number}.txt`), "utf8");
      body = `${prompt}\n${conditionText(ocr)}`;
      if (hasSupplement) imageUrl = `/exam-assets/round-${round}/q-${question.number}-supplement.jpg`;
    }

    normalized.push({
      number: question.number,
      subject: subjects[Math.floor((question.number - 1) / 20)],
      body: compactText(body),
      choices: cleanChoices(question),
      answer: question.answer,
      explanation: compactText(question.explanation) || null,
      imageUrl,
    });
  }

  const dataDirectory = join(projectRoot, "data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(join(dataDirectory, `round-${round}.json`), `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(`round-${round}: ${normalized.length}문항 정규화`);
}
