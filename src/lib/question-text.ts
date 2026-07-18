export function normalizeQuestionText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/에서(?=모두)/g, "에서 ")
    .replace(/([?.])\s*※/g, "$1\n※")
    .replace(/\s+(?=<보기>|<조건>|※)/g, "\n")
    .replace(/(<보기>|<조건>)/g, "\n\n$1\n")
    .replace(/\n+\s*(<보기>|<조건>)\n(?=(?:에서|의|을|를|은|는|이|가|과|와))/g, " $1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function repairQuestionBody(
  value: string,
  options?: { hasMaterialImage?: boolean; subject?: string }
) {
  let text = normalizeQuestionText(value);
  const subject = options?.subject ?? "";
  const imageHasMaterial =
    Boolean(options?.hasMaterialImage) &&
    (subject === "수열추리" || subject === "자료해석");

  if (imageHasMaterial) {
    text = text
      .replace(/다음\s*<보기>\s*의/g, "다음 ")
      .replace(/다음\s*<조건>\s*과/g, "다음 조건과")
      .replace(/\s*(<보기>|<조건>)\s*$/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  text = text
    .replace(
      /^A\s*다음\s+수들이\s+일정한\s+규칙을\s+따를\s+때,\s*의\s+값으로\s+알맞은\s*B\s*것은\?$/,
      "다음 수들이 일정한 규칙을 따를 때, A/B의 값으로 알맞은 것은?"
    )
    .replace(
      /^A\s*다음\s+수들이\s+일정한\s+규칙을\s+따를\s+때,\s*의\s+값으로\s+알맞은\s*것\s*B\s*은\?$/,
      "다음 수들이 일정한 규칙을 따를 때, A/B의 값으로 알맞은 것은?"
    )
    .replace(
      /^B\s*다음\s+수들이\s+일정한\s+규칙을\s+따를\s+때,\s*의\s+값으로\s+알맞은\s+것\s*A\s*은\?$/,
      "다음 수들이 일정한 규칙을 따를 때, B/A의 값으로 알맞은 것은?"
    );

  const hasBlankPrompt = /빈칸\s*㉠/.test(text);
  const hasBlankMarker = /\(\s*㉠\s*\)/.test(text);

  if (hasBlankPrompt && !hasBlankMarker) {
    text = text
      .replace(/\(\s*㉠\s+(?=[가-힣A-Za-z0-9])/g, "( ㉠ ) ")
      .replace(/\(\s*㉠\s*$/g, "( ㉠ )")
      .replace(/\(\s*$/g, "( ㉠ )")
      .replace(/\(\s*(?=고\s+(?:하였다|밝혔다|했다|말했다))/g, "( ㉠ )")
      .replace(/\(\s*(?=는\s+사실)/g, "( ㉠ )")
      .replace(/\(\s*(?=예를\s+들어)/g, "( ㉠ ) ")
      .replace(/\(\s*(?=실제로)/g, "( ㉠ ) ");
  }

  return text.replace(/소밀/g, "소멸");
}

export function normalizeQuestionDisplayText(value: string | null | undefined) {
  if (!value) return "";
  return normalizeQuestionText(value)
    .split(/\n{2,}/)
    .map((block) => {
      const normalized = normalizeKoreanSpacing(
        block.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ")
      );
      if (/^<보기>|^<조건>/.test(normalized)) {
        return normalized
          .replace(/^(<보기>|<조건>)\s*/u, "$1\n")
          .replace(/\s*([㉠㉡㉢㉣㉤])\s+/gu, "\n$1 ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
      return normalized;
    })
    .filter(Boolean)
    .join("\n\n");
}

const COMPACT_FRACTION_DENOMINATORS = [
  "10",
  "13",
  "15",
  "19",
  "25",
  "27",
  "28",
  "45",
  "56",
  "74",
  "126",
  "143",
];

function expandCompactFraction(value: string) {
  const compact = value.replace(/\s+/g, "");
  for (const denominator of COMPACT_FRACTION_DENOMINATORS) {
    if (!compact.endsWith(denominator)) continue;
    const numerator = compact.slice(0, -denominator.length);
    if (/^[1-9]\d?$/.test(numerator)) return `${numerator}/${denominator}`;
  }
  return value;
}

export function normalizeChoiceTexts(choices: string[]) {
  const hasFractionLikeChoice = choices.some((choice) => {
    const compact = choice.trim().replace(/\s+/g, "");
    return (
      /^\d+$/.test(compact) &&
      COMPACT_FRACTION_DENOMINATORS.some(
        (denominator) =>
          compact.endsWith(denominator) &&
          compact.length > denominator.length
      )
    );
  });

  if (!hasFractionLikeChoice) {
    return choices.map((choice) => normalizeKoreanSpacing(normalizeQuestionText(choice)));
  }

  return choices.map((choice) => {
    const trimmed = normalizeKoreanSpacing(normalizeQuestionText(choice));
    if (!/^\d[\d\s]*$/.test(trimmed)) return trimmed;
    return expandCompactFraction(trimmed);
  });
}

export function normalizeReviewText(value: string | null | undefined) {
  if (!value) return "";
  return normalizeQuestionText(value)
    .replace(/(오답분석)/g, "\n$1\n")
    .replace(/([①②③④⑤㉠㉡㉢㉣㉤㉥])\s*/g, "\n$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeKoreanSpacing(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/=\s+/g, "=")
    .replace(/%\s+이다/g, "%이다")
    .replace(/것은\?\s*※/g, "것은?\n※")
    .replace(/\s*[⋅·]\s*/g, "·")
    .replace(/분석·구한/g, "분석·연구한")
    .replace(/대상이다른/g, "대상이 다른")
    .replace(/위험이다시/g, "위험이 다시")
    .replace(/결과\s+적으로/g, "결과적으로")
    .replace(/에\s+서/g, "에서")
    .replace(/유로\s+빌리노겐/g, "유로빌리노겐")
    .replace(/전략 발표했/g, "전략을 발표했")
    .replace(/화학적\s+재활용\s+수백/g, "화학적 재활용은 수백")
    .replace(/간접\s+빌리루빈\s+라/g, "간접 빌리루빈이라")
    .replace(/직접\s+빌리루빈\s+라/g, "직접 빌리루빈이라")
    .replace(/구성성\s+분/g, "구성 성분")
    .replace(/영양\s+소/g, "영양소")
    .replace(/취사선\s+택/g, "취사선택")
    .replace(/아리스토텔레스가\s+심신\s+이원론의\s+입장인지/g, "아리스토텔레스가 심신 이원론의 입장인지")
    .replace(/제조업의\s+분야의/g, "제조업 분야의")
    .replace(/긍정적이\s+기만/g, "긍정적이기만")
    .replace(/수행해\s+야/g, "수행해야")
    .replace(/하지\s+않은\s*것/g, "하지 않은 것")
    .replace(/적절\s+하지/g, "적절하지")
    .replace(/가장적절/g, "가장 적절")
    .replace(/생산\s+된/g, "생산된")
    .replace(/혼합\s+된/g, "혼합된")
    .replace(/오염\s+된/g, "오염된")
    .replace(/없었\s+던/g, "없었던")
    .replace(/추출\s+할/g, "추출할")
    .replace(/존중\s+하는/g, "존중하는")
    .replace(/제재\s+할/g, "제재할")
    .replace(/발생\s+한/g, "발생한")
    .replace(/작위적이\s+고/g, "작위적이고")
    .replace(/않았\s+으/g, "않았으")
    .replace(/휘말리\s+지/g, "휘말리지")
    .replace(/전시되지\s+않았\s+다/g, "전시되지 않았다")
    .replace(/돌아다니\s+면서/g, "돌아다니면서")
    .replace(/단단\s+한/g, "단단한")
    .replace(/불어오\s+는/g, "불어오는")
    .replace(/분분\s+하다/g, "분분하다")
    .replace(/등의내용/g, "등의 내용")
    .replace(/에대한/g, "에 대한")
    .replace(/대해설명/g, "대해 설명")
    .replace(/하고\s*있다/g, "하고 있다")
    .replace(/라고하였다/g, "라고 하였다")
    .replace(/라고하였/g, "라고 하였")
    .replace(/이라고하였다/g, "이라고 하였다")
    .replace(/이라\s+고/g, "이라고")
    .replace(/이\s+라고/g, "이라고")
    .replace(/적이\s+라고/g, "적이라고")
    .replace(/글에이어질/g, "글에 이어질")
    .replace(/가권장/g, "가 권장")
    .replace(/는피로감/g, "는 피로감")
    .replace(/호흡곤란등/g, "호흡곤란 등")
    .replace(/대표적이\s+며/g, "대표적이며")
    .replace(/([가-힣])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|라고|이라고|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=[\s.,)]|$)/g, "$1$2")
    .replace(/([가-힣])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=\s+[가-힣A-Za-z0-9㉠㉡㉢㉣])/g, "$1$2")
    .replace(/([㉠㉡㉢㉣㉤])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=[\s.,)]|$)/g, "$1$2")
    .replace(/([㉠㉡㉢㉣㉤])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=\s+[가-힣A-Za-z0-9])/g, "$1$2")
    .replace(/([A-Za-z0-9)])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=[\s.,)]|$)/g, "$1$2")
    .replace(/([A-Za-z0-9)])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=\s+[가-힣A-Za-z0-9])/g, "$1$2")
    .replace(/\s+(며|고|면|지만|므로|라고|이라고)(?=[\s.,)]|$)/g, "$1")
    .replace(/정답은\s+([①②③④⑤])\s*(?:번\s*)?이다/g, "정답은 $1이다")
    .replace(/전제\s+가/g, "전제가")
    .replace(/결과\s+가/g, "결과가")
    .replace(/부분\s+을/g, "부분을")
    .replace(/부분\s+은/g, "부분은")
    .replace(/정수\s+부분/g, "정수 부분")
    .replace(/소수\s+부분/g, "소수 부분")
    .replace(/들어\s*갈/g, "들어갈")
    .replace(/알\s*수\s*있$/g, "알 수 있다")
    .replace(/알\s*수\s*없$/g, "알 수 없다")
    .trim();
}

function hasFinalAnswer(text: string) {
  return /정답\s*은?\s*[①②③④⑤1-5]/.test(text.slice(-100));
}

function isDanglingExplanationTail(text: string) {
  if (!text) return false;
  if (/[.!?)]$/.test(text) || /(?:다|요|임|음|함|됨)$/.test(text)) {
    return /(?:이므|으므|따라|따라서|고르|가장\s*적|가장\s*알맞|시기와|관리)$/.test(text);
  }

  return true;
}

function dropDanglingTail(text: string) {
  const explicitRepairs: Array<[RegExp, string]> = [
    [/가장\s*적$/u, "가장 적절하다."],
    [/가장\s*적절\s*하$/u, "가장 적절하다."],
    [/적절\s*하$/u, "적절하다."],
    [/알\s*수\s*있$/u, "알 수 있다."],
    [/알\s*수\s*없$/u, "알 수 없다."],
    [/추론할\s*수\s*없$/u, "추론할 수 없다."],
    [/이므$/u, "이므로"],
    [/으므$/u, "으므로"],
    [/따$/u, "따라서"],
    [/따라$/u, "따라서"],
    [/글에\s*이어질\s*$/u, ""],
  ];

  for (const [pattern, replacement] of explicitRepairs) {
    if (pattern.test(text)) return text.replace(pattern, replacement).trim();
  }

  const sentenceEnds = ["다.", "요.", "임.", "음.", "함.", "됨.", ")."];
  const lastSentenceEnd = Math.max(
    ...sentenceEnds.map((ending) => text.lastIndexOf(ending))
  );

  if (lastSentenceEnd > 0) {
    return text.slice(0, lastSentenceEnd + 2).trim();
  }

  return text
    .replace(
      /(?:따라서\s*)?(?:글의\s*)?(?:주제로는|중심\s*내용으로는|내용으로는|옳은\s*것만을\s*모두\s*고르면|옳지\s*않은\s*것만을\s*모두\s*고르면|모두\s*고르|정답은).*$/u,
      ""
    )
    .replace(
      /(?:글에\s*이어질|이므로|이므|으므로|으므|따라서|따라|따|가장|고르|시기와|관리)$/u,
      ""
    )
    .replace(/(?:글에\s*이어질)\s*$/u, "")
    .trim();
}

export function formatReviewExplanation(
  value: string | null | undefined,
  answer: number,
  answerChoice?: string
) {
  const circled = ["①", "②", "③", "④", "⑤"][answer - 1] ?? `${answer}번`;
  const normalizedChoice = normalizeQuestionText(answerChoice).replace(/\s+/g, " ").trim();
  const answerText = normalizedChoice
    ? `정답은 ${circled} '${normalizedChoice}'이다.`
    : `정답은 ${circled}이다.`;

  let text = normalizeKoreanSpacing(String(value ?? ""));
  if (!text) return answerText;

  text = text
    .replace(/오답분석\s*/g, "\n\n오답분석\n")
    .replace(/([.!?다])\s*([①②③④⑤])\s*/g, "$1\n$2 ")
    .replace(/([①②③④⑤])\s+/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (hasFinalAnswer(text)) return text;

  if (isDanglingExplanationTail(text)) {
    text = dropDanglingTail(text);
  }

  return `${text}\n${answerText}`.trim();
}
