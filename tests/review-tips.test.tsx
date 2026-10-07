import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import ResultReviewTips from "../src/components/ResultReviewTips";
import type { ReviewQuestion } from "../src/components/ResultReview";

const question = { id: 1, subject: "언어추리", number: 1 } as ReviewQuestion;
const html = renderToStaticMarkup(<ResultReviewTips preview questions={[question]} onSelectQuestion={() => {}} />);
assert.ok(html.indexOf("헷갈리는 조건") < html.indexOf("보기부터 확인"));
assert.ok(html.indexOf("보기부터 확인") < html.indexOf("조건을 하나씩"));
assert.equal((html.match(/>삭제<\/button>/g) ?? []).length, 1);
assert.equal((html.match(/>신고<\/button>/g) ?? []).length, 2);
assert.ok(html.includes('maxLength="1000"'));
const empty = renderToStaticMarkup(<ResultReviewTips preview questions={[]} onSelectQuestion={() => {}} />);
assert.ok(empty.includes("아직 풀이팁이 없어요."));
assert.ok(!html.includes("<select"));
console.log("풀이팁 초기 정렬, 작성자별 동작, 입력 제한, 빈 목록 확인 통과");
