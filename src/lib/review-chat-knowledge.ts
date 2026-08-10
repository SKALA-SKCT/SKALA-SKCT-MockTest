export type ReviewKnowledgeScope = "actual-exam" | "service" | "study";

type ReviewKnowledgeSource = {
  label: string;
  locator: string;
  authority: "official" | "publisher" | "private-guide" | "service";
  year?: number;
  url?: string;
};

export type ReviewKnowledgeChunk = {
  id: string;
  scope: ReviewKnowledgeScope;
  title: string;
  content: string;
  tags: string[];
  source: ReviewKnowledgeSource;
};

export type RetrievedReviewKnowledge = ReviewKnowledgeChunk & {
  score: number;
};

const SERVICE_SOURCE: ReviewKnowledgeSource = {
  label: "SKALA-SKCT 실전 모의고사 이용 규칙",
  locator: "현재 서비스",
  authority: "service",
};

const EDUWILL_SOURCE = (locator: string): ReviewKnowledgeSource => ({
  label: "에듀윌 취업 SKCT 2025 통합 기본서",
  locator,
  authority: "publisher",
  year: 2025,
});

const HACKERS_SOURCE = (locator: string): ReviewKnowledgeSource => ({
  label: "해커스 SKCT 2025 통합 기본서",
  locator,
  authority: "publisher",
  year: 2025,
});

const EBOOK_SOURCE = (locator: string): ReviewKnowledgeSource => ({
  label: "SKCT 전자책",
  locator,
  authority: "private-guide",
});

/**
 * 사용자에게 필요한 시험·응시·학습 정보만 교재에서 요약한 지식베이스다.
 * 상업 교재의 문제 본문이나 해설 원문은 저장하지 않는다.
 */
export const REVIEW_CHAT_KNOWLEDGE: ReviewKnowledgeChunk[] = [
  {
    id: "actual-definition",
    scope: "actual-exam",
    title: "SKCT의 정확한 명칭과 목적",
    content:
      "SKCT의 영문 명칭은 SK Competency Test이며, SK그룹의 종합역량검사다. 인지역량은 업무에 필요한 논리적·분석적 사고를, 심층역량은 직무와 조직에 관련된 성격·가치관·태도를 살피는 데 목적이 있다. 관계사와 채용 시기에 따라 실시 영역은 달라질 수 있으므로 개별 채용 공고와 응시 안내를 우선한다.",
    tags: ["SKCT", "뜻", "정식 명칭", "풀네임", "종합역량검사", "인지역량", "심층역량"],
    source: HACKERS_SOURCE("PDF 17~18쪽, 본문 13~14쪽"),
  },
  {
    id: "actual-cognitive-structure",
    scope: "actual-exam",
    title: "2024년 기준 온라인 SKCT 인지검사 구성",
    content:
      "2025년판 두 기본서는 2024년 온라인 인지검사를 언어이해, 자료해석, 창의수리, 언어추리, 수열추리의 5개 영역으로 정리한다. 각 영역은 20문항, 15분으로 안내되어 있다. 이는 교재가 정리한 2024년 기준이므로 실제 응시자는 본인의 최신 안내문에서 문항 수와 시간을 다시 확인해야 한다.",
    tags: ["시험 구성", "과목", "영역", "문항 수", "시험 시간", "20문항", "15분", "언어이해", "자료해석", "창의수리", "언어추리", "수열추리"],
    source: EDUWILL_SOURCE("PDF 12쪽, 본문 6쪽"),
  },
  {
    id: "actual-cognitive-structure-corroboration",
    scope: "actual-exam",
    title: "온라인 인지검사 구성 교차 확인",
    content:
      "해커스 2025 기본서도 언어이해·자료해석·창의수리·언어추리·수열추리를 각각 20문항, 15분으로 정리한다. 교재는 이 구성을 2024년 하반기 SKCT 인지검사 기준이라고 명시한다.",
    tags: ["시험 구성", "과목", "영역", "문항 수", "시험 시간", "2024년", "20문항", "15분"],
    source: HACKERS_SOURCE("PDF 18~19쪽, 본문 14~15쪽"),
  },
  {
    id: "actual-online-navigation",
    scope: "actual-exam",
    title: "온라인 시험의 문제 이동과 도구",
    content:
      "교재가 설명하는 온라인 인지검사에서는 프로그램 안의 메모장·그림판·계산기를 사용하며 종이와 필기구는 사용할 수 없다. 다음 문제로 건너뛸 수 있지만 이전 문제로 돌아가거나 이미 넘긴 답을 수정할 수 없다고 안내한다. 시험 운영 방식은 바뀔 수 있으므로 최신 응시 안내가 우선이다.",
    tags: ["온라인", "필기구", "종이", "메모장", "그림판", "계산기", "뒤로가기", "이전 문제", "답안 수정", "건너뛰기"],
    source: HACKERS_SOURCE("PDF 18쪽 및 21쪽, 본문 14쪽 및 17쪽"),
  },
  {
    id: "actual-test-day",
    scope: "actual-exam",
    title: "온라인 시험 전 준비와 응시 유의사항",
    content:
      "응시 전 사전 점검을 완료하고, 독립된 공간·응시 가능한 PC·웹캠·유효한 신분증을 준비한다. 감독 방식, 지원 운영체제, 보조 기기와 음향 장비 허용 여부는 채용 시기별 안내가 달라질 수 있으므로 교재보다 본인에게 발송된 안내문을 우선한다. 네트워크 문제가 생기면 즉시 안내된 재접속 절차를 따른다.",
    tags: ["시험 당일", "준비물", "신분증", "웹캠", "PC", "사전 점검", "독립된 공간", "네트워크", "재접속"],
    source: EDUWILL_SOURCE("PDF 12~13쪽, 본문 6~7쪽"),
  },
  {
    id: "actual-negative-marking",
    scope: "actual-exam",
    title: "실제 SKCT의 오답 감점",
    content:
      "제공된 SKCT 전자책은 실제 SKCT에서 오답 감점이 있다고 안내하고, 모르는 문항은 무작정 선택하기보다 정답 가능성을 충분히 높인 뒤 답하거나 넘기는 전략을 제안한다. 다만 정확한 감점 폭이나 계산식은 이 자료에 제시되어 있지 않다. 채점 정책은 바뀔 수 있으므로 최신 공식 응시 안내에서 다시 확인해야 한다.",
    tags: ["감점", "오답 감점", "채점", "점수", "틀리면", "찍기", "모르면", "실제 시험", "본시험"],
    source: EBOOK_SOURCE("PDF 11쪽, 본문 10쪽"),
  },
  {
    id: "actual-negative-marking-official-history",
    scope: "actual-exam",
    title: "SK 채용 콘텐츠의 오답 감점 안내 이력",
    content:
      "SK Careers Journal의 과거 합격자 안내 콘텐츠에서도 인지역량 오답 감점을 언급했다. 이는 감점 제도가 안내된 이력을 뒷받침하지만, 현재 시험의 정확한 감점 산식을 의미하지는 않는다.",
    tags: ["감점", "오답 감점", "인지역량", "공식", "SK Careers", "채점"],
    source: {
      label: "SK Careers Journal - SK하이닉스 신입사원은 SKCT를 찢어!",
      locator: "2022년 게시물",
      authority: "official",
      year: 2022,
      url: "https://www.skcareersjournal.com/2909",
    },
  },
  {
    id: "actual-deep-test",
    scope: "actual-exam",
    title: "심층역량검사 응답 원칙",
    content:
      "심층역량검사는 정답을 맞히는 인지검사와 성격이 다르며, 직무·조직과 관련된 성격·가치관·태도와 응답의 일관성을 살핀다. 자신을 꾸며 답하기보다 실제 성향에 맞게 솔직하고 일관되게 응답하고, 시간 안에 문항을 빠뜨리지 않는 것이 기본 원칙이다.",
    tags: ["심층역량", "심층검사", "인성", "성격", "가치관", "일관성", "솔직", "정답"],
    source: HACKERS_SOURCE("PDF 18쪽, 본문 14쪽"),
  },
  {
    id: "study-general-time",
    scope: "study",
    title: "인지검사 공통 시간 관리",
    content:
      "20문항을 15분에 푸는 구성이라면 문항당 평균 시간은 약 45초다. 처음부터 제한 시간을 재고 연습하며, 1분 이상 걸릴 것으로 보이는 문항은 다음 문제로 넘어가는 기준을 미리 정한다. 메모장·그림판·계산기의 용도를 유형별로 정해 두고, 문제를 읽었을 때 적용할 풀이 순서를 반복해 자동화한다.",
    tags: ["풀이 팁", "공략", "시간 관리", "시간 단축", "45초", "1분", "건너뛰기", "메모장", "계산기"],
    source: HACKERS_SOURCE("PDF 20쪽, 본문 16쪽"),
  },
  {
    id: "study-review-loop",
    scope: "study",
    title: "오답을 풀이 습관으로 바꾸는 3단계 복습",
    content:
      "문제를 푼 뒤 정답만 확인하지 말고, 첫 풀이와 더 나은 풀이를 비교한 다음 같은 유형을 처음 보는 것처럼 다시 푼다. 복습할 때는 문제 접근 순서, 사용할 도구, 먼저 확인할 선지를 한 문장으로 정리한다. 시간이 부족하면 틀린 문제와 오래 걸린 유형부터 반복한다.",
    tags: ["오답", "복습", "3R", "반복", "회고", "풀이 습관", "학습법", "공부법"],
    source: EBOOK_SOURCE("PDF 23~25쪽, 본문 22~24쪽"),
  },
  {
    id: "study-verbal-reading",
    scope: "study",
    title: "언어이해 기본 독해와 시간 관리",
    content:
      "속도만 높이기보다 주어·목적어·서술어와 원인→결과, 주장→근거 같은 문장 관계를 잡는다. 쉬운 문항은 빠르게 처리하고, 첫 부분부터 구조가 잡히지 않아 1분 이상 걸릴 것 같으면 다음 문항으로 넘어간다. 같은 지문을 여러 번 읽지 않도록 첫 독해에서 글의 방향을 한 문장으로 요약한다.",
    tags: ["언어이해", "독해", "시간 관리", "주어", "목적어", "서술어", "글의 흐름", "풀이 팁"],
    source: EBOOK_SOURCE("PDF 36~40쪽, 본문 35~39쪽"),
  },
  {
    id: "study-verbal-types",
    scope: "study",
    title: "언어이해 유형별 접근",
    content:
      "주제 문제는 선지의 표현에 끌려가지 않도록 지문 흐름과 결론을 먼저 잡는다. 빈칸은 앞뒤 문장의 논리 관계를 확인한 뒤 들어갈 방향을 예상한다. 일치·불일치는 선지의 핵심어, 서술어, 조건과 범위를 본문과 대조한다. 문단 배열은 대명사·접속사·예시 표현을 연결하고, 추론은 본문에 없는 확대·축소·반대 진술을 경계한다. 반박은 결론과 그 결론을 받치는 근거를 분리한 뒤 약해지는 지점을 찾는다.",
    tags: ["언어이해", "주제", "빈칸", "일치", "불일치", "문단 배열", "순서 배열", "추론", "반박", "풀이 팁", "함정"],
    source: EBOOK_SOURCE("PDF 45쪽, 54쪽, 64쪽, 70쪽, 78쪽, 87쪽"),
  },
  {
    id: "study-data-first-look",
    scope: "study",
    title: "자료해석에서 자료를 읽는 순서",
    content:
      "계산 전에 자료 제목, 단위, 가로축·세로축과 이미 제공된 합계를 먼저 확인한다. 자료 전체를 정독하지 말고 선지가 요구하는 항목의 위치를 찾는다. 단위가 바뀌거나 출원/등록처럼 비슷한 이름의 표가 함께 제시되는 함정을 먼저 차단한다.",
    tags: ["자료해석", "표", "그래프", "제목", "단위", "가로축", "세로축", "합계", "함정", "풀이 팁"],
    source: EBOOK_SOURCE("PDF 102~106쪽, 본문 101~105쪽"),
  },
  {
    id: "study-data-calculation",
    scope: "study",
    title: "자료해석 계산기·암산 선택",
    content:
      "증감 추이, 대소 비교, 단순 합·차처럼 눈으로 판별 가능한 선지는 먼저 처리한다. 간단한 계산과 범위 비교는 암산·어림값을 쓰고, 정확한 나눗셈이나 복잡한 비율은 계산기를 사용한다. 증감률은 변화량을 기준이 되는 이전 값으로 나누며, 모든 선지를 계산하려 하지 말고 빠르게 판정 가능한 선지부터 검증한다.",
    tags: ["자료해석", "계산기", "암산", "어림 계산", "증감률", "비율", "대소 비교", "선지", "시간 단축", "풀이 팁"],
    source: EBOOK_SOURCE("PDF 93~100쪽 및 108~109쪽, 본문 92~99쪽 및 107~108쪽"),
  },
  {
    id: "study-creative-math",
    scope: "study",
    title: "창의수리 공통 접근",
    content:
      "문제를 읽자마자 농도, 가격, 경우의 수, 거리·속력·시간, 일률 중 어떤 틀인지 먼저 분류하고 필요한 식만 짧게 메모한다. 농도는 섞기 전후 용질의 양 보존, 가격은 정가·할인율·판매가·이익의 관계, 경우의 수는 OR이면 합하고 AND이면 곱하는 원칙을 쓴다. 거리는 거리=속력×시간, 일률은 작업량÷시간을 기준으로 식을 세운다. 식이 바로 잡히지 않으면 오래 버티지 않는다.",
    tags: ["창의수리", "응용수리", "농도", "원가", "정가", "판매가", "경우의 수", "확률", "거리", "속력", "시간", "일률", "작업량", "풀이 팁"],
    source: EBOOK_SOURCE("PDF 137~141쪽, 158~164쪽, 191~193쪽, 206~208쪽"),
  },
  {
    id: "study-language-reasoning-proposition",
    scope: "study",
    title: "언어추리 명제 접근",
    content:
      "‘모든 A는 B’는 A가 B에 포함된다는 뜻이며 역은 자동으로 성립하지 않지만 대우는 성립한다. ‘어떤 A는 B’는 존재를 나타내므로 순서를 바꿀 수 있지만 ‘모든’과 같은 포함 화살표로 취급하면 안 된다. 여러 전제는 공통 중간항을 찾아 A→B→C처럼 짧게 연결하고, 결론에 필요한 양 끝 관계만 확인한다.",
    tags: ["언어추리", "명제", "삼단논법", "모든", "어떤", "대우", "포함관계", "풀이 팁", "함정"],
    source: EBOOK_SOURCE("PDF 218~222쪽, 본문 217~221쪽"),
  },
  {
    id: "study-language-reasoning-conditions",
    scope: "study",
    title: "언어추리 조건추리 접근",
    content:
      "긴 조건은 먼저 순서, 인접, 배제, 동일·반대 관계를 짧은 기호로 바꾼다. 모든 경우를 만들기 전에 위치나 관계가 확정된 항목으로 선지를 먼저 제거한다. 불확정 조건이 많으면 선지 하나를 가정해 한 가지 가능한 경우만 만든 뒤 여러 선지를 동시에 검증한다. 가정문이나 경우의 수를 직접 요구하는 무거운 선지는 뒤로 미룬다.",
    tags: ["언어추리", "조건추리", "기호화", "배치", "순서", "선지 제거", "가정", "경우의 수", "진실게임", "풀이 팁"],
    source: EBOOK_SOURCE("PDF 234~246쪽 및 263~265쪽, 본문 233~245쪽 및 262~264쪽"),
  },
  {
    id: "study-sequence",
    scope: "study",
    title: "수열추리 규칙 탐색 순서",
    content:
      "먼저 항 사이의 차이와 비율을 확인하고, 규칙이 없으면 홀수항·짝수항 분리, 두세 항 묶음, 반복되는 혼합 연산 순으로 살핀다. 이어 제곱·세제곱·피보나치·팩토리얼을 확인한다. 분수는 분자와 분모를 따로 본 뒤 분수 전체 연산을, 소수는 정수부와 소수부를 나눈 뒤 전체 규칙을 확인한다. 1분 안에 규칙 후보가 잡히지 않으면 다음 문항으로 넘어간다.",
    tags: ["수열추리", "수열", "등차", "등비", "계차", "홀수항", "짝수항", "분수", "소수", "피보나치", "팩토리얼", "풀이 순서", "풀이 팁"],
    source: EBOOK_SOURCE("PDF 272~289쪽, 본문 271~288쪽"),
  },
  {
    id: "service-overview",
    scope: "service",
    title: "실전 모의고사 서비스 설명",
    content:
      "SKALA-SKCT 실전 모의고사는 회차별로 언어이해·자료해석·창의수리·언어추리·수열추리를 제한 시간 안에 풀고, 완료 후 점수·영역별 결과·문항별 해설·응시자 통계·AI 학습 분석을 확인하는 연습 서비스다. 실제 SK 채용을 주관하거나 실제 SKCT 점수를 산출하는 공식 시험 시스템은 아니다.",
    tags: ["서비스", "사이트", "실전 모의고사", "무슨 서비스", "기능", "공식", "SKALA-SKCT"],
    source: SERVICE_SOURCE,
  },
  {
    id: "service-scoring",
    scope: "service",
    title: "실전 모의고사 채점 규칙",
    content:
      "이 서비스는 정답 문항 수를 점수로 계산한다. 정답은 1점, 오답과 미응답은 0점이며 오답에 대한 추가 감점은 없다. 결과 화면의 ‘선택 n%’는 해당 선택지를 고른 응시자의 비율이지 문항 배점이나 획득 점수가 아니다.",
    tags: ["이 서비스", "모의고사", "감점", "채점", "점수", "틀리면", "오답", "미응답", "선택률", "선택", "퍼센트", "배점"],
    source: SERVICE_SOURCE,
  },
  {
    id: "service-exam-flow",
    scope: "service",
    title: "실전 모의고사 응시 방식",
    content:
      "영역은 정해진 순서로 진행되고 각 영역 제한 시간은 15분이다. 다음 문항으로 이동하면 이전 문항으로 돌아갈 수 없고, 시간이 끝나면 해당 영역이 자동 제출된다. 서비스 안의 메모장·그림판·계산기를 사용할 수 있으며 메모장과 그림판 내용은 다음 문제로 넘어가면 초기화된다.",
    tags: ["이 서비스", "응시", "15분", "영역", "순서", "이전 문제", "뒤로가기", "자동 제출", "메모장", "그림판", "계산기"],
    source: SERVICE_SOURCE,
  },
  {
    id: "service-results",
    scope: "service",
    title: "결과 화면 통계의 의미",
    content:
      "문항 결과에는 내 선택·정오답·풀이 시간과 응시자 오답률·선택지별 선택률이 표시된다. 비교 통계는 같은 시험에서 각 사용자의 동일한 N번째 완료 기록을 기준으로 계산하며 내 응시도 포함한다. 응시자 수가 적으면 비율이 크게 흔들릴 수 있으므로 절대 난이도보다는 참고 지표로 본다.",
    tags: ["결과", "통계", "오답률", "선택률", "응시자", "참여자", "풀이 시간", "내 응시", "동일 회차"],
    source: SERVICE_SOURCE,
  },
  {
    id: "service-chatbot",
    scope: "service",
    title: "문항 리뷰 챗봇의 범위와 기록",
    content:
      "문항을 과목과 번호로 지정하면 챗봇은 해당 문제 본문·선지·정답·해설과 내 선택·풀이 시간·응시자 선택 통계를 바탕으로 답한다. 일반 질문에는 검색된 SKCT 시험·학습 지식과 서비스 이용 규칙을 사용한다. 채팅 메시지는 서비스 DB에 저장하지 않고 현재 결과 페이지 상태에만 보관되어 새로고침하거나 페이지를 나가면 사라진다. 답변 생성 과정에서는 질문과 필요한 대화·문항 맥락이 Gemini API로 전송된다.",
    tags: ["챗봇", "AI", "근거", "채팅 기록", "저장", "새로고침", "문항 리뷰", "RAG", "출처"],
    source: SERVICE_SOURCE,
  },
];

const SERVICE_MARKERS = [
  "여기",
  "이 서비스",
  "이 모의고사",
  "우리 모의고사",
  "사이트",
  "결과 페이지",
  "화면",
  "선택률",
  "챗봇",
];

const ACTUAL_EXAM_MARKERS = [
  "실제 시험",
  "실제 skct",
  "본시험",
  "진짜 시험",
  "공식 시험",
  "실전 skct",
  "인지역량",
  "심층역량",
];

const STUDY_MARKERS = [
  "풀이",
  "팁",
  "공략",
  "시간 단축",
  "공부",
  "학습",
  "복습",
  "오답",
  "언어이해",
  "자료해석",
  "창의수리",
  "언어추리",
  "수열추리",
  "독해",
  "그래프",
  "농도",
  "명제",
  "조건추리",
  "수열",
];

const SUBJECT_ALIASES = [
  { subject: "언어이해", aliases: ["언어이해", "독해"] },
  { subject: "자료해석", aliases: ["자료해석", "자료 해석", "표 해석", "그래프"] },
  { subject: "창의수리", aliases: ["창의수리", "창의 수리", "응용수리", "농도", "거속시", "일률"] },
  { subject: "언어추리", aliases: ["언어추리", "언어 추리", "명제", "조건추리", "진실게임"] },
  { subject: "수열추리", aliases: ["수열추리", "수열 추리", "수열"] },
] as const;

const SUBJECT_MARKERS = SUBJECT_ALIASES.map(({ subject }) => subject);

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value: string, markers: string[]) {
  return markers.some((marker) => value.includes(normalize(marker)));
}

function inferScopes(question: string, history: Array<{ role: string; content: string }>) {
  const direct = normalize(question);
  const scopes = new Set<ReviewKnowledgeScope>();
  if (includesAny(direct, SERVICE_MARKERS)) scopes.add("service");
  if (includesAny(direct, ACTUAL_EXAM_MARKERS)) scopes.add("actual-exam");
  if (includesAny(direct, STUDY_MARKERS)) scopes.add("study");
  if (scopes.size > 0) return scopes;

  const recent = normalize(
    history
      .slice(-3)
      .map((message) => message.content)
      .join(" ")
  );
  if (includesAny(recent, SERVICE_MARKERS)) scopes.add("service");
  if (includesAny(recent, ACTUAL_EXAM_MARKERS)) scopes.add("actual-exam");
  if (includesAny(recent, STUDY_MARKERS)) scopes.add("study");
  return scopes;
}

function queryTerms(question: string, history: Array<{ role: string; content: string }>) {
  const combined = normalize(
    `${history
      .slice(-2)
      .map((message) => message.content)
      .join(" ")} ${question}`
  );
  return Array.from(
    new Set(
      combined
        .split(" ")
        .filter((term) => term.length >= 2)
        .flatMap((term) => [
          term,
          term.replace(
            /(에서는|에서|으로|에게|에는|하고|인가요|나요|해줘|알려줘|은|는|이|가|을|를|에)$/g,
            ""
          ),
        ])
        .filter((term) => term.length >= 2)
    )
  );
}

export function retrieveReviewChatKnowledge(
  question: string,
  history: Array<{ role: string; content: string }> = [],
  limit = 5
): RetrievedReviewKnowledge[] {
  const direct = normalize(question);
  const terms = queryTerms(question, history);
  const preferredScopes = inferScopes(question, history);
  const mentionedSubject = SUBJECT_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => direct.includes(normalize(alias)))
  )?.subject;

  const ranked = REVIEW_CHAT_KNOWLEDGE.map((chunk) => {
    const title = normalize(chunk.title);
    const content = normalize(chunk.content);
    const tags = chunk.tags.map(normalize);
    let lexicalScore = 0;

    for (const tag of tags) {
      if (tag && direct.includes(tag)) lexicalScore += Math.min(12, 4 + tag.length / 2);
    }
    for (const term of terms) {
      if (tags.some((tag) => tag.includes(term) || term.includes(tag))) lexicalScore += 4;
      if (title.includes(term)) lexicalScore += 3;
      if (content.includes(term)) lexicalScore += 1;
    }

    let scopeScore = 0;
    if (preferredScopes.size > 0) {
      scopeScore = preferredScopes.has(chunk.scope) ? 20 : -12;
    }

    if (mentionedSubject && chunk.scope === "study") {
      const chunkSubjects = SUBJECT_MARKERS.filter((subject) => tags.includes(normalize(subject)));
      if (chunkSubjects.length > 0 && !chunkSubjects.includes(mentionedSubject)) {
        scopeScore -= 18;
      }
    }

    const authorityScore =
      chunk.source.authority === "service"
        ? 4
        : chunk.source.authority === "official"
          ? 3
          : chunk.source.authority === "publisher"
            ? 2
            : 1;

    return {
      ...chunk,
      score: lexicalScore > 0 ? lexicalScore + scopeScore + authorityScore : -Infinity,
    };
  })
    .filter((chunk) => Number.isFinite(chunk.score) && chunk.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestScore = ranked[0]?.score ?? 0;
  return ranked
    .filter((chunk) => chunk.score >= Math.max(5, bestScore * 0.35))
    .slice(0, Math.max(1, limit));
}

export function formatReviewChatKnowledge(chunks: RetrievedReviewKnowledge[]) {
  if (chunks.length === 0) return "검색된 근거 없음";
  return chunks
    .map((chunk, index) => {
      const sourceUrl = chunk.source.url ? `, ${chunk.source.url}` : "";
      return `[근거 ${index + 1}] ${chunk.title}\n범위: ${chunk.scope}\n내용: ${chunk.content}\n출처: ${chunk.source.label}, ${chunk.source.locator}${sourceUrl}`;
    })
    .join("\n\n");
}

function isScoringQuestion(question: string) {
  const value = normalize(question);
  return /(감점|채점|점수.*(떨어|깎)|틀리.*(점수|감점)|오답.*(점수|감점)|찍어|찍기)/.test(
    value
  );
}

function scoringScope(question: string, history: Array<{ role: string; content: string }>) {
  const direct = normalize(question);
  if (includesAny(direct, SERVICE_MARKERS)) return "service" as const;
  if (includesAny(direct, ACTUAL_EXAM_MARKERS)) return "actual-exam" as const;

  const recentUserMessage = [...history]
    .reverse()
    .find((message) => message.role === "user")?.content;
  if (recentUserMessage) {
    const recent = normalize(recentUserMessage);
    if (includesAny(recent, SERVICE_MARKERS)) return "service" as const;
    if (includesAny(recent, ACTUAL_EXAM_MARKERS)) return "actual-exam" as const;
  }
  return "both" as const;
}

export function getFixedReviewChatAnswer(
  question: string,
  history: Array<{ role: string; content: string }> = []
) {
  const value = normalize(question);

  if (/skct.*(뜻|뭐|정식 명칭|풀네임)|skct가 무엇/.test(value)) {
    return "SKCT는 **SK Competency Test**의 약자로, SK그룹의 종합역량검사입니다. 채용 시기와 관계사에 따라 실시 영역이 달라질 수 있으므로 세부 구성은 해당 채용 공고와 응시 안내를 우선해 확인해야 합니다.\n\n출처: 해커스 SKCT 2025 통합 기본서 PDF 17~18쪽";
  }

  if (!isScoringQuestion(question)) return null;

  const scope = scoringScope(question, history);
  if (scope === "service") {
    return "이 **실전 모의고사 서비스에서는 오답 감점이 없습니다.** 정답은 1점, 오답과 미응답은 0점입니다. 결과 화면의 `선택 n%`는 그 선지를 고른 응시자 비율이며 점수가 아닙니다.\n\n출처: SKALA-SKCT 실전 모의고사 이용 규칙";
  }
  if (scope === "actual-exam") {
    return "제공된 자료와 SK 채용 콘텐츠에서는 **실제 SKCT 인지역량에 오답 감점이 있다고 안내**합니다. 다만 정확한 감점 폭과 계산식은 공개된 자료에서 확인되지 않으며 운영 기준이 바뀔 수 있으므로, 실제 응시 때는 본인에게 발송된 최신 안내문을 우선해야 합니다.\n\n출처: SKCT 전자책 PDF 11쪽(본문 10쪽), SK Careers Journal 2022";
  }
  return "**이 실전 모의고사 서비스는 오답 감점이 없고**, 정답 1점·오답과 미응답 0점으로 계산합니다. 반면 제공된 시험 자료와 SK 채용 콘텐츠에서는 실제 SKCT 인지역량의 오답 감점을 안내하지만, 정확한 감점 폭은 공개된 자료에서 확인되지 않으므로 최신 응시 안내를 우선해야 합니다.\n\n출처: SKALA-SKCT 실전 모의고사 이용 규칙, SKCT 전자책 PDF 11쪽(본문 10쪽)";
}
