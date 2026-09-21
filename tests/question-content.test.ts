import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import pdfChoices from "../src/lib/pdf-verified-choices.json";
import pdfText from "../src/lib/pdf-verified-text.json";
import { applyQuestionContentOverride } from "../src/lib/question-overrides";
import { formatReviewExplanation, normalizeChoiceTexts } from "../src/lib/question-text";

test("2회차 수열추리 20문항은 캡처 대신 PDF 전사 텍스트를 표시한다", () => {
  for (let number = 81; number <= 100; number++) {
    const input = { number, body: "", explanation: "", choices: [] as string[], answer: 2, imageUrl: `/exam-assets/round-2/q-${number}.png` };
    const actual = applyQuestionContentOverride(2, input);
    assert.equal(actual.imageUrl, null);
    assert.equal(actual.supplementImageUrl, undefined);
    assert.equal(actual.pdfVerifiedBody, true);
    assert.ok(actual.body.includes("<보기>\n"));
    assert.equal(actual.answer, input.answer);
    assert.ok(actual.explanation?.endsWith("이다."));
    assert.equal(input.body, "");
  }
  assert.ok(pdfText["2:88"].explanation.includes("분자는 ÷3, 분모는 +4"));
  assert.deepEqual(pdfChoices["2:92"], ["1/2,160", "1/1,800", "1/1,080", "1/720", "1/540"]);
});

test("2회차 72번 지문은 캡처나 임의 빈칸 기호 없이 PDF 텍스트로 표시한다", () => {
  const question = applyQuestionContentOverride(2, { number: 72, body: "", choices: [] as string[], answer: 3, imageUrl: null });
  assert.equal(question.supplementImageUrl, undefined);
  assert.equal(question.imageUrl, null);
  assert.equal(question.body.includes("㉠"), false);
  assert.equal(question.pdfVerifiedBody, true);
  assert.equal(question.answer, 3);
  assert.ok(pdfText["2:72"].explanation.endsWith("따라서 정답은 ③이다."));
});

test("숫자의 끝자리를 분모로 추측하지 않는다", () => {
  const choices = ["513", "8325", "113", "864", "256"];
  assert.deepEqual(normalizeChoiceTexts(choices), choices);
});

test("분수와 대분수는 PDF 전사 값을 그대로 표시한다", () => {
  const choices = ["1/140", "9/100", "12 2/5", "1 54/125", "64/6,561"];
  assert.deepEqual(normalizeChoiceTexts(choices), choices);
});

test("2회차 창의수리 2·12·20번 선지는 원본 PDF 전사 값이다", () => {
  assert.deepEqual(pdfChoices["2:42"], ["1/140", "1/70", "3/140", "1/35", "1/28"]);
  assert.deepEqual(pdfChoices["2:52"], ["3/100", "9/100", "3/25", "3/20", "1/5"]);
  assert.deepEqual(pdfChoices["2:60"], ["1/20", "1/10", "3/20", "1/5", "1/4"]);
});

test("모든 PDF 선지 복원은 원본 객체와 정답 번호를 변경하지 않는다", () => {
  for (const [key, choices] of Object.entries(pdfChoices)) {
    const [round, number] = key.split(":").map(Number);
    assert.equal(choices.length, 5, key);
    assert.ok(choices.every((choice) => choice.trim()), key);
    for (let answer = 1; answer <= 5; answer++) {
      const input = { number, body: "문제", choices: ["1", "2", "3", "4", "5"], answer };
      const before = structuredClone(input);
      const actual = applyQuestionContentOverride(round, input);
      assert.deepEqual(normalizeChoiceTexts(actual.choices), choices, key);
      assert.equal(actual.answer, answer, key);
      assert.deepEqual(input, before, key);
    }
  }
});

test("해설을 삭제·완성하거나 정답 문장을 생성하지 않는다", () => {
  for (const explanation of ["1/10", "9C2 = 36", "풀이이다. 따라서 가장 적", "오답분석\n① 보기\n② 보기", "계산식\n3 × 2 = 6"]) {
    assert.equal(formatReviewExplanation(explanation), explanation);
  }
  assert.equal(formatReviewExplanation(null), "");
  assert.equal(formatReviewExplanation(undefined), "");
});

test("원본 도형·표 자료가 존재한다", () => {
  for (const [round, number, field] of [
    [6, 41, "supplementImageUrl"], [7, 50, "supplementImageUrl"],
    [4, 45, "supplementImageUrl"],
  ] as const) {
    const question = applyQuestionContentOverride(round, { number, body: "", choices: [] });
    const image = question[field];
    assert.ok(image, `${round}:${number}`);
    assert.ok(existsSync(resolve(process.cwd(), "public", image.slice(1))), image);
  }
});

test("PDF 본문·해설은 텍스트로 적용하고 정답은 보존한다", () => {
  for (const [key, override] of Object.entries(pdfText)) {
    const [round, number] = key.split(":").map(Number);
    const input = { number, body: "기존 본문", choices: ["1", "2", "3", "4", "5"], answer: 3, explanation: "기존 해설" };
    const before = structuredClone(input);
    const actual = applyQuestionContentOverride(round, input);
    for (const [field, value] of Object.entries(override)) {
      assert.ok(!field.includes("Image"), `${key}: 텍스트를 캡처로 대체하지 않는다`);
      assert.deepEqual(actual[field as keyof typeof actual], value, `${key}:${field}`);
      if (field.endsWith("ImageUrl") || field === "explanationImageUrls") {
        for (const src of Array.isArray(value) ? value : [value]) {
          if (typeof src === "string") assert.ok(existsSync(resolve(process.cwd(), "public", src.slice(1))), src);
        }
      }
    }
    assert.equal(actual.answer, input.answer, key);
    assert.deepEqual(input, before, key);
  }
});

test("PDF 전사 본문·선지는 추정 띄어쓰기 보정을 우회하도록 표시한다", () => {
  const q = applyQuestionContentOverride(2, {number:24,body:"본문",choices:[] as string[],answer:2});
  assert.equal(q.pdfVerifiedChoices, true);
  assert.ok(q.choices[1].includes("증가율은 D구"));
  const body = applyQuestionContentOverride(2, {number:25,body:"본문",choices:[]});
  assert.equal(body.pdfVerifiedBody, true);
  assert.ok(body.body.includes("NC 나노바이오 ⋅ 의료"));
});

test("2회차 창의수리의 누락 수식·본문·선지를 원본대로 복원한다", () => {
  assert.ok(pdfText["2:43"].explanation.includes("x/20 + (4 − x)/5 = 30/60"));
  assert.ok(pdfText["2:46"].body.includes("20%의 소금물"));
  assert.ok(pdfText["2:46"].body.includes("10%가 될 때까지"));
  assert.ok(pdfText["2:53"].body.includes("길이가 8km이다."));
  assert.ok(pdfText["2:56"].body.endsWith("몇 m인가?"));
  assert.equal(pdfText["2:57"].choices[2], "360개"); // PDF 300dpi 재판독: ③은 360개
  assert.ok(pdfText["2:55"].explanation.includes("(5,000 − 500) + 330"));
  assert.ok(pdfText["2:58"].explanation.includes("₇C₁ × ₆C₂ × ₄C₂ × ₂C₂"));
});

test("2회차 자료해석의 누락 조건·수식·그래프를 원본대로 복원한다", () => {
  assert.equal(pdfText["2:36"].choices[3], "2022년 응답자 수 중 문화예술행사 관람자는 여성이 남성보다 600명 이상 더 많다.");
  assert.ok(pdfText["2:28"].explanation.includes("1.7 − 3.0 = -1.3명"));
  assert.ok(pdfText["2:30"].explanation.includes("|5.3 − 17.0|"));
  const q = applyQuestionContentOverride(2, {number:39,body:"",choices:[],imageUrl:"/exam-assets/round-2/q-39.png",answer:4});
  assert.equal(q.imageUrl, "/exam-assets/pdf-verified/round-2/q-39-material.png");
  assert.ok(existsSync(resolve(process.cwd(), "public", q.imageUrl.slice(1))));
  assert.ok(q.body.includes("㉢ 2022년 4사분기에 부산의 취업자는 울산보다 1,150명 이상 더 많다."));
  assert.equal(q.answer, 4);
});

test("3회차 1~5번의 잘린 해설과 본문 표식을 PDF 텍스트로 복원한다", () => {
  for (let number = 1; number <= 5; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:[],answer:number,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${["⑤", "②", "③", "③", "④"][number - 1]}이다.`), `3:${number}`);
    assert.equal(q.answer, number);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(!pdfText["3:3"].body.includes("즉, 이런 현상"));
  assert.ok(pdfText["3:4"].body.includes("㉠ 수소에너지가 기존의 화석연료"));
});

test("3회차 6~10번의 누락 본문·각주·보기·해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["④", "④", "①", "④", "⑤"];
  for (let number = 6; number <= 10; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 6]}이다.`), `3:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["3:6"].body.includes("3인 이상의 배우가 등장하지 않으며"));
  assert.ok(pdfText["3:8"].body.includes("청직(淸職)과 요직(要職)"));
  assert.equal(pdfText["3:9"].choices[2], "AI 생성 문학의 예술성에 대한 논란과 그에 대한 다양한 시각");
});

test("3회차 11~15번의 표식·원문 오탈자·각주·해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["⑤", "③", "②", "②", "④"];
  for (let number = 11; number <= 15; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 11]}이다.`), `3:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["3:12"].body.includes("㉡ 베블런효과"));
  assert.ok(pdfText["3:14"].body.includes("렌즈 같은 광학계를 이용해 빛을 집광시킨다"));
  assert.equal(pdfText["3:13"].choices[1], "젠트리케이션이 나타나기 위해서는 지역 상권의 확대가 선행되어야 한다.");
});

test("3회차 16~20번의 표식·누락 문구·전체 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["⑤", "⑤", "④", "④", "③"];
  for (let number = 16; number <= 20; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:2,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 16]}이다.`), `3:${number}`);
    assert.equal(q.answer, 2);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["3:16"].body.includes("1870년대에 들어서면서 ㉠ 세잔의 화풍"));
  assert.ok(pdfText["3:17"].body.includes("가상 전시의 종류에 상관없이"));
  assert.ok(pdfText["3:20"].explanation.startsWith("제시글에서는 노인 세대가"));
});

test("3회차 21~25번의 자료 문구·보기·계산 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["②", "④", "④", "②", "⑤"];
  for (let number = 21; number <= 25; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:3,explanation:"잘린 해설",imageUrl:`/exam-assets/round-3/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `3:${number}`);
    assert.equal(q.answer, 3);
    assert.equal(q.imageUrl, `/exam-assets/round-3/q-${number}.png`);
  }
  assert.ok(pdfText["3:21"].explanation.includes("≒ 1.7%"));
  assert.ok(pdfText["3:22"].explanation.includes("= 846명"));
  assert.ok(pdfText["3:23"].explanation.includes("≒ 446.8배"));
  assert.ok(pdfText["3:24"].explanation.includes("= 13개"));
  assert.ok(pdfText["3:25"].explanation.includes("= 31,784명"));
});

test("3회차 26~30번의 전체 계산 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["⑤", "②", "③", "④", "③"];
  for (let number = 26; number <= 30; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설",imageUrl:`/exam-assets/round-3/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 26]}이다.`), `3:${number}`);
    assert.equal(q.answer, 4);
    assert.equal(q.imageUrl, `/exam-assets/round-3/q-${number}.png`);
  }
  assert.ok(pdfText["3:26"].explanation.includes("≒ 7.2%"));
  assert.ok(pdfText["3:27"].explanation.includes("= 163,200억 원"));
  assert.ok(pdfText["3:28"].explanation.includes("= 390십억 원"));
  assert.ok(pdfText["3:29"].explanation.includes("= 9,205십만 달러"));
  assert.ok(pdfText["3:30"].explanation.includes("= 89,058억 원"));
});

test("3회차 31~40번의 표기·단위·전체 계산 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["④", "⑤", "②", "⑤", "③", "④", "⑤", "③", "④", "⑤"];
  for (let number = 31; number <= 40; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설",imageUrl:`/exam-assets/round-3/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 31]}이다.`), `3:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.imageUrl, `/exam-assets/round-3/q-${number}.png`);
  }
  assert.ok(pdfText["3:32"].body.includes("특허·실용신안"));
  assert.ok(pdfText["3:33"].choices[1].startsWith("2018~2022년"));
  assert.ok(pdfText["3:39"].choices[2].includes("m³"));
  assert.ok(pdfText["3:40"].explanation.includes("= 3조 210억 원"));
});

test("3회차 41~60번의 수리 본문·수식·전체 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["③","⑤","①","①","④","①","③","①","④","②","①","③","④","②","⑤","⑤","①","④","③","③"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:2,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `3:${number}`);
    assert.equal(q.answer, 2);
  }
  assert.ok(pdfText["3:41"].explanation.includes("0.7a × x/100"));
  assert.ok(pdfText["3:50"].explanation.includes("= 55.3%"));
  assert.ok(pdfText["3:56"].explanation.includes("= 41가지"));
});

test("3회차 61~80번의 조건·보기·논리 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["①","③","③","②","②","③","③","③","④","③","②","④","⑤","⑤","①","⑤","④","③","①","④"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `3:${number}`);
    assert.equal(q.answer, 4);
  }
  assert.ok(pdfText["3:61"].body.includes("㉤ C가 출장을 가는 국가는"));
  assert.ok(pdfText["3:69"].explanation.includes("p → q → t → ~s → ~r"));
  assert.ok(pdfText["3:75"].body.includes("반도체소자의 이해"));
  assert.ok(pdfText["3:80"].explanation.endsWith("정답은 ④이다."));
});

test("3회차 81~100번의 수열 분수 선지·연산기호·전체 해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["④","①","③","⑤","③","④","③","④","④","⑤","③","③","②","②","⑤","①","④","③","③","②"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(3, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설",imageUrl:`/exam-assets/round-3/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `3:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.imageUrl, `/exam-assets/round-3/q-${number}.png`);
  }
  assert.deepEqual(pdfText["3:86"].choices, ["1/3","1/4","1/6","1/8","1/9"]);
  assert.deepEqual(pdfText["3:87"].choices, ["1/4","1/2","4/9","8/9","16/9"]);
  assert.deepEqual(pdfText["3:88"].choices, ["13/6","5/2","8/3","17/6","3"]);
  assert.deepEqual(pdfText["3:89"].choices, ["63/187","99/119","119/109","119/99","187/63"]);
  assert.ok(pdfText["3:100"].body.includes("B − A"));
});

test("4회차 1~20번의 잘린 지문·보기·해설을 PDF 텍스트로 복원한다", () => {
  const answers = ["③","⑤","⑤","②","②","②","②","②","⑤","①","①","⑤","⑤","④","③","③","⑤","④","④","⑤"];
  for (let number = 1; number <= 20; number++) {
    const q = applyQuestionContentOverride(4, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `4:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["4:4"].body.includes("㉠ 각성 효과"));
  assert.ok(pdfText["4:8"].body.includes("카사 바트요는 가우디의 다른 작품"));
  assert.ok(pdfText["4:13"].body.includes("복수의 정당성을 강조하면서"));
  assert.ok(pdfText["4:20"].body.includes("폴리염화비페닐"));
});

test("4회차 21~40번의 표·그래프와 전체 계산 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","①","②","④","①","④","⑤","②","③","②","④","④","⑤","⑤","②","①","②","④","①","①"];
  for (let number = 21; number <= 40; number++) {
    const q = applyQuestionContentOverride(4, {number,body:"본문",choices:["1","2","3","4","5"],answer:3,explanation:"잘린 해설",imageUrl:`/exam-assets/round-4/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `4:${number}`);
    assert.equal(q.answer, 3);
    assert.equal(q.imageUrl, `/exam-assets/round-4/q-${number}.png`);
  }
  assert.ok(pdfText["4:21"].explanation.includes("≒ 47.8조 원"));
  assert.ok(pdfText["4:28"].explanation.includes("1,442.3조 원"));
  assert.ok(pdfText["4:32"].explanation.includes("= 685만 명"));
  assert.ok(pdfText["4:40"].explanation.includes("= 12만 권"));
});

test("4회차 41~60번의 분수 보기·수식·도형 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","①","②","③","②","③","③","⑤","②","④","⑤","②","③","③","①","⑤","②","③","④","②"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(4, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `4:${number}`);
    assert.equal(q.answer, 4);
  }
  assert.deepEqual(pdfText["4:52"].choices, ["1/10","3/20","1/5","1/4","3/10"]);
  assert.equal(pdfText["4:45"].choices[3], "38가지");
  assert.ok(pdfText["4:42"].explanation.includes("x = 4"));
  assert.ok(pdfText["4:59"].explanation.includes("= 40%"));
});

test("4회차 61~80번의 조건추리·명제·진술 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["①","④","⑤","⑤","④","②","③","②","①","②","①","④","①","①","⑤","④","④","⑤","⑤","②"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(4, {number,body:"본문",choices:["1","2","3","4","5"],answer:3,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `4:${number}`);
    assert.equal(q.answer, 3);
  }
  assert.ok(pdfText["4:64"].explanation.includes("~r → s → ~t → q → p"));
  assert.ok(pdfText["4:71"].explanation.includes("p → q → t → r"));
  assert.ok(pdfText["4:76"].explanation.includes("~q → p → ~s → ~r"));
  assert.ok(pdfText["4:80"].explanation.endsWith("정답은 ②이다."));
});

test("4회차 81~100번의 분수 선지·수열·도형 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","②","③","③","④","②","①","②","①","③","②","④","④","③","⑤","①","④","⑤","③","②"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(4, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설",imageUrl:`/exam-assets/round-4/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `4:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.imageUrl, `/exam-assets/round-4/q-${number}.png`);
  }
  assert.deepEqual(pdfText["4:81"].choices, ["9/10","10/11","11/12","12/11","11/10"]);
  assert.deepEqual(pdfText["4:82"].choices, ["1/32","3/64","1/16","5/64","3/32"]);
  assert.deepEqual(pdfText["4:83"].choices, ["12/53","27/106","106/27","13/3","53/12"]);
  assert.deepEqual(pdfText["4:84"].choices, ["61/62","62/63","63/64","1","64/63"]);
});

test("5회차 1~20번의 줄 단위 손상 지문과 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","④","④","②","⑤","④","②","⑤","④","⑤","⑤","③","④","②","②","②","⑤","④","⑤","③"];
  for (let number = 1; number <= 20; number++) {
    const q = applyQuestionContentOverride(5, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `5:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["5:2"].body.includes("꽃가루를 핥거나"));
  assert.ok(pdfText["5:8"].body.includes("(라) 한국의 행복관"));
  assert.ok(pdfText["5:10"].body.includes("IT 인프라가 잘 확보되어 있음에도"));
  assert.ok(pdfText["5:16"].body.includes("각각 181%, 166% 증가"));
});

test("5회차 21~40번의 표·그래프 계산과 손상 보기를 PDF 기준으로 복원한다", () => {
  const answers = ["③","①","④","②","⑤","③","②","④","⑤","⑤","②","②","③","④","④","⑤","④","②","①","⑤"];
  for (let number = 21; number <= 40; number++) {
    const q = applyQuestionContentOverride(5, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설",imageUrl:`/exam-assets/round-5/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `5:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.imageUrl, `/exam-assets/round-5/q-${number}.png`);
  }
  assert.equal(pdfText["5:38"].choices[4], "2021년 내수 사용량이 가장 많은 악기는 기타이다.");
  assert.ok(pdfText["5:22"].explanation.includes("μg/m³"));
  assert.ok(pdfText["5:26"].explanation.includes("50만 명"));
  assert.ok(pdfText["5:36"].explanation.includes("≒ 1.9%"));
});

test("5회차 41~60번의 수식·분수 선지·잘린 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","④","①","②","②","①","②","④","⑤","⑤","③","②","①","⑤","①","③","③","③","③","③"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(5, {number,body:"본문",choices:["1","2","3","4","5"],answer:2,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `5:${number}`);
    assert.equal(q.answer, 2);
  }
  assert.deepEqual(pdfText["5:55"].choices, ["7/15","23/45","5/9","3/5","2/3"]);
  assert.deepEqual(pdfText["5:60"].choices, ["7/13","15/26","9/13","10/13","21/26"]);
  assert.ok(pdfText["5:58"].body.includes("20%로 증가"));
  assert.ok(pdfText["5:51"].explanation.includes("240 − 96 = 144"));
});

test("5회차 61~80번의 명제·조건추리 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["⑤","①","②","③","④","②","②","⑤","⑤","⑤","④","①","①","③","⑤","②","⑤","④","④","④"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(5, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `5:${number}`);
    assert.equal(q.answer, 1);
  }
  assert.ok(pdfText["5:61"].explanation.includes("~q∨t"));
  assert.ok(pdfText["5:75"].body.includes("㉣ 백의 자리 숫자"));
  assert.equal(pdfText["5:77"].choices[4], "B는 콜라를 마시지 않았다.");
  assert.ok(pdfText["5:80"].explanation.endsWith("정답은 ④이다."));
});

test("5회차 81~100번의 수열 분수 선지·수식·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","②","①","②","④","⑤","④","①","②","①","③","④","②","③","②","④","⑤","③","③","④"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(5, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설",imageUrl:`/exam-assets/round-5/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `5:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.imageUrl, `/exam-assets/round-5/q-${number}.png`);
  }
  assert.deepEqual(pdfText["5:90"].choices, ["243/32","243/31","81/10","43/5","9"]);
  assert.deepEqual(pdfText["5:92"].choices, ["16 1/3","16 2/3","17","17 1/3","17 2/3"]);
  assert.deepEqual(pdfText["5:93"].choices, ["4","4 1/6","4 1/3","4 1/2","4 2/3"]);
  assert.ok(pdfText["5:91"].explanation.includes("B=7/19"));
  assert.ok(pdfText["5:100"].explanation.endsWith("정답은 ④이다."));
});

test("6회차 1~20번의 손상된 지문·보기·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","③","⑤","②","⑤","④","⑤","③","④","④","③","②","④","④","④","④","④","④","④","④"];
  for (let number = 1; number <= 20; number++) {
    const q = applyQuestionContentOverride(6, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `6:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["6:4"].body.includes("청소년들의 언어와 문화적 특성"));
  assert.ok(pdfText["6:7"].body.includes("세종실록과 훈민정음 해례본"));
  assert.ok(pdfText["6:14"].body.includes("㉠ 형식주의와 ㉡ 인지주의"));
  assert.equal(pdfText["6:17"].choices[4], "(다) - (라) - (가) - (나)");
});

test("6회차 21~40번의 표·그래프 계산과 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","①","①","②","④","③","③","①","①","④","②","③","⑤","①","②","②","④","②","④","①"];
  for (let number = 21; number <= 40; number++) {
    const q = applyQuestionContentOverride(6, {number,body:"본문",choices:["1","2","3","4","5"],answer:2,explanation:"잘린 해설",imageUrl:`/exam-assets/round-6/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `6:${number}`);
    assert.equal(q.answer, 2);
    assert.equal(q.imageUrl, `/exam-assets/round-6/q-${number}.png`);
  }
  assert.ok(pdfText["6:22"].explanation.includes("10.5억 원"));
  assert.ok(pdfText["6:26"].body.includes("합격률 = 합격자 수/응시자 수"));
  assert.equal(pdfText["6:37"].choices[3], "3~8월 내내 스트리밍 서비스 신규 가입자의 전월 대비 증감 추이는 B사와 E사가 동일하다.");
  assert.ok(pdfText["6:40"].explanation.endsWith("정답은 ①이다."));
});

test("6회차 41~60번의 수식·분수 선지·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["①","④","④","④","⑤","③","③","④","②","③","②","③","①","⑤","①","②","④","③","①","①"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(6, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `6:${number}`);
    assert.equal(q.answer, 5);
  }
  assert.deepEqual(pdfText["6:41"].choices, ["35/74","37/74","20/37","43/74","45/74"]);
  assert.deepEqual(pdfText["6:46"].choices, ["1/5","11/45","14/45","17/45","7/15"]);
  assert.ok(pdfText["6:49"].explanation.includes("16,560/40,320=23/56"));
  assert.ok(pdfText["6:54"].body.includes("몇 km인가?"));
  assert.ok(pdfText["6:60"].explanation.endsWith("정답은 ①이다."));
});

test("6회차 61~80번의 명제·조건추리 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","⑤","②","④","④","③","②","⑤","①","②","④","①","③","③","③","②","④","④","④","⑤"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(6, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설",imageUrl:number >= 65 ? `/exam-assets/overrides/round-6/q-${number}.png` : null});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `6:${number}`);
    assert.equal(q.answer, 1);
    if (number >= 65) assert.equal(q.imageUrl, `/exam-assets/overrides/round-6/q-${number}.png`);
  }
  assert.ok(pdfText["6:61"].explanation.includes("p∨~t"));
  assert.equal(pdfText["6:68"].choices[3], "B는 D보다 먼저 꽂는다.");
  assert.ok(pdfText["6:73"].explanation.includes("1+4+1=6"));
  assert.ok(pdfText["6:80"].explanation.endsWith("정답은 ⑤이다."));
});

test("6회차 81~100번의 수열 분수 선지·수식·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","③","⑤","①","③","②","①","①","④","③","⑤","③","①","⑤","④","③","①","②","③","①"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(6, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설",imageUrl:`/exam-assets/round-6/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `6:${number}`);
    assert.equal(q.answer, 4);
    assert.equal(q.imageUrl, `/exam-assets/round-6/q-${number}.png`);
  }
  assert.deepEqual(pdfText["6:88"].choices, ["9/8","5/4","11/8","3/2","13/8"]);
  assert.deepEqual(pdfText["6:90"].choices, ["8/1,875","8/1,825","16/1,875","8/935","16/1,825"]);
  assert.deepEqual(pdfText["6:92"].choices, ["12 2/5","12 3/5","13 2/5","13 3/5","14 2/5"]);
  assert.equal(pdfText["6:99"].body, "다음 수들이 일정한 규칙을 따를 때, 2B−A의 값으로 알맞은 것은?");
});

test("7회차 1~20번의 손상된 지문·보기·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","②","①","②","③","⑤","③","③","③","①","②","④","②","③","④","③","④","②","③","③"];
  for (let number = 1; number <= 20; number++) {
    const q = applyQuestionContentOverride(7, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `7:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["7:1"].body.includes("제임스 에스먼드"));
  assert.ok(pdfText["7:4"].body.includes("여성의 자기결정권"));
  assert.ok(pdfText["7:15"].body.includes("조로아스터교"));
  assert.ok(pdfText["7:17"].body.includes("트리클 충전"));
  assert.ok(pdfText["7:20"].body.includes("Customer Benefit"));
});

test("7회차 21~40번의 표·그래프 계산과 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","①","②","④","④","②","②","③","①","④","⑤","②","②","③","③","①","①","⑤","④","②"];
  for (let number = 21; number <= 40; number++) {
    const q = applyQuestionContentOverride(7, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설",imageUrl:`/exam-assets/round-7/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `7:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.imageUrl, `/exam-assets/round-7/q-${number}.png`);
  }
  assert.ok(pdfText["7:23"].body.includes("옳은 것만을"));
  assert.equal(pdfText["7:26"].choices[4], "2021년 대전 연평균 미세먼지 농도는 부산보다 3μg/m³ 더 높다.");
  assert.ok(pdfText["7:30"].explanation.includes("40억 원 증가"));
  assert.ok(pdfText["7:39"].explanation.includes("1.75배"));
});

test("7회차 41~60번의 수식·분수 선지·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","③","④","②","①","④","③","④","⑤","②","④","②","④","①","②","④","④","②","⑤","②"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(7, {number,body:"본문",choices:["1","2","3","4","5"],answer:3,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `7:${number}`);
    assert.equal(q.answer, 3);
  }
  assert.deepEqual(pdfText["7:45"].choices, ["1/126","1/63","1/42","2/63","5/126"]);
  assert.deepEqual(pdfText["7:54"].choices, ["1/825","1/275","1/165","7/825","3/275"]);
  assert.ok(pdfText["7:49"].explanation.includes("1/30+1/6+1/20=1/4"));
  assert.ok(pdfText["7:52"].explanation.includes("y=225"));
});

test("7회차 61~80번의 명제·조건추리 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","④","④","②","④","③","③","⑤","②","④","④","③","③","②","②","⑤","②","⑤","③","①"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(7, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설",imageUrl:[61,67,79].includes(number) ? null : `/exam-assets/overrides/round-7/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `7:${number}`);
    assert.equal(q.answer, 1);
  }
  assert.ok(pdfText["7:61"].explanation.includes("무선 마우스→노트북"));
  assert.ok(pdfText["7:67"].explanation.includes("기획→설계→개발→코드→수정"));
  assert.ok(pdfText["7:79"].explanation.includes("여권→항공권→비자→여행 일정→호텔"));
  assert.ok(pdfText["7:80"].explanation.endsWith("정답은 ①이다."));
});

test("7회차 81~100번의 수열 분수 선지·수식·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","③","④","⑤","③","①","③","②","①","④","④","①","⑤","⑤","①","④","①","②","③","⑤"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(7, {number,body:"본문",choices:["1","2","3","4","5"],answer:2,explanation:"잘린 해설",imageUrl:`/exam-assets/round-7/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `7:${number}`);
    assert.equal(q.answer, 2);
    assert.equal(q.imageUrl, `/exam-assets/round-7/q-${number}.png`);
  }
  assert.deepEqual(pdfText["7:87"].choices, ["4/9","−3","−4/9","−9/4","3"]);
  assert.deepEqual(pdfText["7:90"].choices, ["2 1/11","2 1/2","2 1/5","2 2/11","1 10/11"]);
  assert.deepEqual(pdfText["7:93"].choices, ["1/32","1/12","1/48","1/24","1/16"]);
  assert.deepEqual(pdfText["7:96"].choices, ["1/9","5/126","1/6","1/18","2/9"]);
  assert.equal(pdfText["7:97"].body, "다음 수들이 일정한 규칙을 따를 때, B−A의 값으로 알맞은 것은?");
});

test("8회차 1~20번의 손상된 지문과 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["⑤","④","③","④","②","①","③","④","③","①","②","②","④","④","⑤","②","⑤","③","③","④"];
  for (let number = 1; number <= 20; number++) {
    const q = applyQuestionContentOverride(8, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `8:${number}`);
    assert.equal(q.answer, 1);
    assert.equal(q.supplementImageUrl, undefined);
  }
  assert.ok(pdfText["8:1"].body.includes("코페르니쿠스의 지동설"));
  assert.ok(pdfText["8:4"].body.includes("경제적 주권을 상실"));
  assert.ok(pdfText["8:7"].body.includes("시민 과학 활동"));
  assert.ok(pdfText["8:17"].body.includes("40세 이전"));
});

test("8회차 21~40번의 자료해석 계산과 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","③","④","⑤","③","④","⑤","④","③","③","③","③","①","①","⑤","②","②","③","③","②"];
  for (let number = 21; number <= 40; number++) {
    const q = applyQuestionContentOverride(8, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설",imageUrl:`/exam-assets/round-8/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `8:${number}`);
    assert.equal(q.answer, 5);
    assert.equal(q.imageUrl, `/exam-assets/round-8/q-${number}.png`);
  }
  assert.ok(pdfText["8:23"].explanation.includes("12.5%"));
  assert.ok(pdfText["8:29"].explanation.includes("94천 명"));
  assert.ok(pdfText["8:37"].explanation.includes("5.8%"));
  assert.ok(pdfText["8:39"].explanation.includes("13달러"));
});

test("8회차 41~60번의 수식·분수 선지·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","⑤","④","⑤","①","②","③","①","④","②","④","⑤","①","③","①","⑤","①","②","③","④"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(8, {number,body:"본문",choices:["1","2","3","4","5"],answer:2,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `8:${number}`);
    assert.equal(q.answer, 2);
  }
  assert.deepEqual(pdfText["8:46"].choices, ["29/45","31/45","11/15","7/9","37/45"]);
  assert.deepEqual(pdfText["8:50"].choices, ["2/5","8/15","1/2","3/5","11/15"]);
  assert.deepEqual(pdfText["8:57"].choices, ["1/12","1/6","1/4","1/3","5/12"]);
  assert.ok(pdfText["8:54"].body.includes("0~9의 10개 숫자"));
});

test("8회차 61~80번의 조건추리·명제 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["⑤","⑤","③","④","②","③","④","①","②","②","②","④","④","⑤","①","③","④","②","①","④"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(8, {number,body:"본문",choices:["1","2","3","4","5"],answer:3,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `8:${number}`);
    assert.equal(q.answer, 3);
  }
  assert.equal(pdfText["8:65"].choices[0], "A는 왼쪽에서 두 번째에 앉는다.");
  assert.equal(pdfText["8:69"].choices[4], "녹차를 마시는 사람은 2명이다.");
  assert.ok(pdfText["8:62"].explanation.includes("카메라→삼각대→렌즈→메모리카드"));
  assert.ok(pdfText["8:75"].explanation.includes("연구 자료 조사→가설 설정→실험 진행"));
});

test("8회차 81~100번의 수열 분수 선지·수식·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","①","④","②","⑤","③","②","⑤","④","①","③","③","②","③","②","②","④","③","②","①"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(8, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설",imageUrl:`/exam-assets/round-8/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `8:${number}`);
    assert.equal(q.answer, 4);
    assert.equal(q.imageUrl, `/exam-assets/round-8/q-${number}.png`);
  }
  assert.deepEqual(pdfText["8:87"].choices, ["1/4","−1/4","−1/3","−1/2","1/3"]);
  assert.deepEqual(pdfText["8:88"].choices, ["11/15","5/7","12/15","9/13","10/13"]);
  assert.deepEqual(pdfText["8:94"].choices, ["2 1/17","2 1/9","2 4/19","2 1/4","1 2/7"]);
  assert.deepEqual(pdfText["8:96"].choices, ["1/56","1/224","3/160","1/40","1/32"]);
  assert.ok(pdfText["8:96"].body.includes("A−B"));
});

test("9회차 1~20번의 손상된 보기와 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","⑤","②","⑤","③","④","④","⑤","③","②","⑤","③","②","③","②","⑤","②","④","⑤","①"];
  for (let number = 1; number <= 20; number++) {
    const q = applyQuestionContentOverride(9, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `9:${number}`);
    assert.equal(q.answer, 1);
  }
  assert.equal(pdfText["9:9"].choices[1], "㉡은 제품의 객관적 우위를 명확하게 전달하여 소비자의 정보 탐색 비용을 줄인다.");
  assert.ok(pdfText["9:13"].choices[3].includes("운동 기록과 건강 데이터"));
});

test("9회차 21~40번의 자료해석 계산과 전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["⑤","②","①","①","③","②","②","④","③","⑤","②","①","④","①","②","④","②","③","②","③"];
  for (let number = 21; number <= 40; number++) {
    const q = applyQuestionContentOverride(9, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설",imageUrl:`/exam-assets/round-9/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 21]}이다.`), `9:${number}`);
    assert.equal(q.answer, 4);
    assert.equal(q.imageUrl, `/exam-assets/round-9/q-${number}.png`);
  }
  assert.ok(pdfText["9:21"].explanation.includes("20.5%"));
  assert.ok(pdfText["9:27"].explanation.includes("9.4%"));
  assert.ok(pdfText["9:35"].explanation.includes("66.4백만 원"));
  assert.equal(pdfText["9:37"].choices[4], "2023년 전기 신규 자동차 등록 대수의 2021년 대비 증가율은 75% 이상이다.");
});

test("9회차 41~60번의 분수 선지·수식·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","③","⑤","②","④","③","④","②","③","①","④","②","③","②","⑤","①","④","②","④","③"];
  for (let number = 41; number <= 60; number++) {
    const q = applyQuestionContentOverride(9, {number,body:"본문",choices:["1","2","3","4","5"],answer:5,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 41]}이다.`), `9:${number}`);
    assert.equal(q.answer, 5);
  }
  assert.deepEqual(pdfText["9:41"].choices, ["7/19","10/19","12/19","15/19","17/19"]);
  assert.deepEqual(pdfText["9:46"].choices, ["1/3","2/5","3/5","2/3","4/5"]);
  assert.deepEqual(pdfText["9:49"].choices, ["1/10","1/5","2/5","1/2","7/10"]);
  assert.deepEqual(pdfText["9:53"].choices, ["1/5","1/4","1/3","2/5","1/2"]);
  assert.ok(pdfText["9:20"].body.includes("가속 페달에서 발을 떼고"));
});

test("9회차 61~80번의 명제·조건추리 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","②","④","④","①","④","①","②","⑤","④","③","②","③","④","②","⑤","③","⑤","⑤","③"];
  for (let number = 61; number <= 80; number++) {
    const q = applyQuestionContentOverride(9, {number,body:"본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 61]}이다.`), `9:${number}`);
    assert.equal(q.answer, 1);
  }
  assert.ok(pdfText["9:61"].explanation.includes("독일 → 영국 → 프랑스 → 스페인"));
  assert.ok(pdfText["9:66"].explanation.includes("모니터 → 노트북을 사지 않음 → 책상을 사지 않음"));
  assert.ok(pdfText["9:74"].explanation.includes("청소기 → 환기 → 세탁기 → 건조기 → 설거지"));
  assert.ok(pdfText["9:80"].explanation.includes("울산 → 포항 → 마산 → 김해"));
});

test("9회차 81~100번의 수열 분수 선지·수식·전체 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["②","⑤","④","②","③","③","②","①","②","①","③","①","④","④","⑤","④","③","③","④","⑤"];
  for (let number = 81; number <= 100; number++) {
    const q = applyQuestionContentOverride(9, {number,body:"본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설",imageUrl:`/exam-assets/round-9/q-${number}.png`});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 81]}이다.`), `9:${number}`);
    assert.equal(q.answer, 4);
    assert.equal(q.imageUrl, `/exam-assets/round-9/q-${number}.png`);
  }
  assert.deepEqual(pdfText["9:83"].choices, ["2/7","1/7","8/15","4/15","3/10"]);
  assert.deepEqual(pdfText["9:86"].choices, ["27/22","28/23","29/24","6/5","31/26"]);
  assert.deepEqual(pdfText["9:92"].choices, ["161/165","165/161","23/21","17/15","15/17"]);
  assert.deepEqual(pdfText["9:95"].choices, ["11/24","11/26","6/13","13/28","4/15"]);
  assert.deepEqual(pdfText["9:98"].choices, ["−1/2","1/3","−1/3","1/4","−1/4"]);
});

test("10회차 1~5번의 유실된 지문과 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","①","②","③","③"];
  for (let number = 1; number <= 5; number++) {
    const q = applyQuestionContentOverride(10, {number,body:"잘린 본문",choices:["1","2","3","4","5"],answer:4,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 1]}이다.`), `10:${number}`);
    assert.equal(q.answer, 4);
  }
  assert.ok(pdfText["10:1"].body.includes("관음보살상까지 자연스럽게 닿도록 설계되었다"));
  assert.ok(pdfText["10:2"].body.includes("운동에너지는 4배로 폭증하게 된다"));
  assert.ok(pdfText["10:3"].body.includes("재현된 이미지와 실재 간의 인식론적 괴리"));
  assert.ok(pdfText["10:4"].body.includes("유기견에만 국한되었던 지원 대상"));
});

test("10회차 6~10번의 유실된 지문과 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["④","②","⑤","⑤","③"];
  for (let number = 6; number <= 10; number++) {
    const q = applyQuestionContentOverride(10, {number,body:"잘린 본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 6]}이다.`), `10:${number}`);
    assert.equal(q.answer, 1);
  }
  assert.ok(pdfText["10:6"].body.includes("권력 지향적인 담론 체계"));
  assert.ok(pdfText["10:7"].body.includes("관념은 원초적 경험인 인상의 흐릿한 모사품"));
  assert.ok(pdfText["10:8"].body.includes("네덜란드 스키폴 국제공항"));
  assert.ok(pdfText["10:10"].body.includes("『화성성역의궤』"));
});

test("10회차 11~20번의 유실된 지문과 해설을 PDF 기준으로 복원한다", () => {
  const answers = ["③","④","②","④","⑤","⑤","③","③","②","⑤"];
  for (let number = 11; number <= 20; number++) {
    const q = applyQuestionContentOverride(10, {number,body:"잘린 본문",choices:["1","2","3","4","5"],answer:1,explanation:"잘린 해설"});
    assert.ok(q.explanation?.includes(`정답은 ${answers[number - 11]}이다.`), `10:${number}`);
    assert.equal(q.answer, 1);
  }
  assert.ok(pdfText["10:11"].body.includes("시장 실패(Market Failure)"));
  assert.ok(pdfText["10:13"].body.includes("개인 간(P2P) 거래"));
  assert.ok(pdfText["10:16"].body.includes("현상적 경험의 세계"));
  assert.ok(pdfText["10:19"].body.includes("지질 나노입자(LNP)"));
  assert.ok(pdfText["10:20"].body.includes("번조(燔造)"));
});

test("10~12회차 복원 해설은 PDF 정답 문장으로 끝나고 선지 손상이 남지 않는다", () => {
  const circled = ["①", "②", "③", "④", "⑤"];
  for (const round of [10, 11, 12]) {
    for (let number = 1; number <= 100; number++) {
      const entry = (pdfText as Record<string, { explanation?: string; choices?: string[] }>)[`${round}:${number}`];
      if (!entry?.explanation) continue;
      assert.ok(
        circled.some((mark) => entry.explanation!.replace(/\s/g, "").includes(`정답은${mark}이다`)),
        `${round}:${number} 해설이 정답 문장으로 끝나지 않음`,
      );
      for (const choice of entry.choices ?? []) {
        assert.ok(choice.trim().length > 0, `${round}:${number} 빈 선지`);
      }
    }
  }
});

test("PDF 대조로 바로잡은 10~12회차 선지를 유지한다", () => {
  assert.deepEqual(pdfText["10:84"].choices, ["5 13/15", "5 7/8", "4 14/15", "5 14/15", "4 13/15"]);
  assert.deepEqual(pdfText["10:86"].choices, ["7/720", "7/120", "1/6", "6", "120/7"]);
  assert.deepEqual(pdfText["10:93"].choices, ["1/42", "1/28", "1/56", "1/40", "1/21"]);
  assert.deepEqual(pdfText["11:87"].choices, ["6,561/39", "19,683/43", "6,561/43", "19,683/47", "19,683/39"]);
  assert.deepEqual(pdfText["11:91"].choices, ["2 13/16", "2 3/4", "2 11/16", "2 4/5", "2 14/17"]);
  assert.deepEqual(pdfText["12:84"].choices, ["1 5/17", "1 6/17", "1 5/16", "1 3/8", "1 7/16"]);
  assert.equal(pdfText["12:9"].choices[4], "(다) - (라) - (마) - (가) - (나)");
  assert.equal(pdfText["8:28"].choices[1], "㉠, ㉢");
});

test("1~12회차 1,200문항의 복원 해설은 모두 PDF 정답 문장으로 끝난다", () => {
  const circled = ["①", "②", "③", "④", "⑤"];
  let checked = 0;
  for (const [key, entry] of Object.entries(pdfText as Record<string, { explanation?: string }>)) {
    if (!entry.explanation) continue;
    checked += 1;
    assert.ok(
      circled.some((mark) => entry.explanation!.replace(/\s/g, "").includes(`정답은${mark}이다`)),
      `${key} 해설이 정답 문장으로 끝나지 않음`,
    );
  }
  assert.ok(checked > 1000, `복원 해설 수가 부족함: ${checked}`);
});

test("PDF 재판독으로 바로잡은 1~7회차 선지를 유지한다", () => {
  assert.equal(pdfText["1:34"].choices[2], "2018~2021년 내내 제조업 근로자수의 전년 대비 증감 추이와 운수·창고 및 통신업은 정반대이다.");
  assert.equal(pdfText["1:38"].choices[2], "2022년 S사 자회사 중 소각·매립 처리량이 재활용 처리량보다 많은 자회사는 2개이다.");
  assert.deepEqual(pdfText["4:85"].choices, ["15 1/32", "15 1/31", "16 1/32", "16 1/31", "16 1/30"]);
  assert.equal(pdfText["7:83"].choices[4], "1/3");
});

test("중복 캡처였던 언어추리 보충 이미지는 더 이상 참조하지 않는다", () => {
  for (const key of ["1:73", "1:76", "1:78", "3:69", "3:72", "3:75", "3:78"]) {
    const [round, number] = key.split(":").map(Number);
    const q = applyQuestionContentOverride(round, { number, body: "", choices: [] as string[], answer: 1 });
    assert.equal(q.supplementImageUrl, undefined, key);
  }
});
