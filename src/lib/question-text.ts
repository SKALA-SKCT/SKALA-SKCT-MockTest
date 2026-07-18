export function normalizeQuestionText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/에서(?=모두)/g, "에서 ")
    .replace(/([?.])\s*※/g, "$1\n※")
    .replace(/\s+(?=<보기>|<조건>|※)/g, "\n")
    .replace(/(<보기>|<조건>)/g, "\n\n$1\n")
    .replace(
      /\n+\s*(<보기>|<조건>)\n(?=(?:에서|의|을|를|은|는|이|가|과|와))/g,
      " $1 "
    )
    .replace(/것만을\s*\n+\s*<보기>\s*\n+\s*에서/g, "것만을 <보기>에서")
    .replace(/것을\s*\n+\s*<보기>\s*\n+\s*에서/g, "것을 <보기>에서")
    .replace(/내용을\s*\n+\s*<보기>\s*\n+\s*에서/g, "내용을 <보기>에서")
    .replace(/다음\s*\n+\s*<조건>\s*\n+\s*과/g, "다음 <조건>과")
    .replace(/다음\s*\n+\s*<보기>\s*\n+\s*의/g, "다음 <보기>의")
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
          .replace(/([.?!])\s*([㉠㉡㉢㉣㉤㉥])/gu, "$1\n$2")
          .replace(/\s*([㉠㉡㉢㉣㉤㉥])\s+/gu, "\n$1 ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
      return normalized.replace(/\s+([A-E]):/g, "\n$1:");
    })
    .filter(Boolean)
    .join("\n\n")
    .replace(/<보기>\s*\n\s*의/g, "<보기>의")
    .replace(/<조건>\s*\n\s*(?:과|와)/g, "<조건>과")
    .replace(/(<보기>|<조건>)\s*([㉠㉡㉢㉣㉤㉥])/gu, "$1\n\n$2")
    .replace(/([.?!])\s*([㉠㉡㉢㉣㉤㉥])/gu, "$1\n$2");
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
  const fractionLikeChoiceCount = choices.filter((choice) => {
    const compact = choice.trim().replace(/\s+/g, "");
    return (
      /^\d+$/.test(compact) &&
      COMPACT_FRACTION_DENOMINATORS.some(
        (denominator) =>
          compact.endsWith(denominator) &&
          compact.length > denominator.length
      )
    );
  }).length;
  const hasFractionLikeChoice = fractionLikeChoiceCount >= 2;

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
    .replace(/([①②③④⑤㉠㉡㉢㉣㉤㉥㉥])\s*/g, "\n$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeKoreanSpacing(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/=\s*/g, "= ")
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
    .replace(/일자\s+리/g, "일자리")
    .replace(/생산\s+액/g, "생산액")
    .replace(/FTA\s*수출/g, "FTA 수출")
    .replace(/제작\s+해야/g, "제작해야")
    .replace(/영양\s+분/g, "영양분")
    .replace(/생성\s+되며/g, "생성되며")
    .replace(/지닌이/g, "지닌 이")
    .replace(/국가인권위원\s+회/g, "국가인권위원회")
    .replace(/연구진들은이/g, "연구진들은 이")
    .replace(/않아\s+서/g, "않아서")
    .replace(/유행했\s+던/g, "유행했던")
    .replace(/한국적이\s+고도/g, "한국적이고도")
    .replace(/의의\s+도/g, "의의도")
    .replace(/각각\s+의/g, "각각의")
    .replace(/부분\s+만/g, "부분만")
    .replace(/응용\s+한/g, "응용한")
    .replace(/생산\s+자는/g, "생산자는")
    .replace(/공공\s+재/g, "공공재")
    .replace(/개개\s+인의/g, "개개인의")
    .replace(/존중\s+한다면/g, "존중한다면")
    .replace(/합리적이\s+며/g, "합리적이며")
    .replace(/이기적이\s+지만/g, "이기적이지만")
    .replace(/엎어\s+지는/g, "엎어지는")
    .replace(/평평\s+한/g, "평평한")
    .replace(/결과\s+가/g, "결과가")
    .replace(/%\s+지만/g, "%지만")
    .replace(/%\s+다고/g, "%다고")
    .replace(/%\s+다/g, "%다")
    .replace(/없었\s+으/g, "없었으")
    .replace(/실시\s+했다/g, "실시했다")
    .replace(/담당\s+하게/g, "담당하게")
    .replace(/반발\s+하는/g, "반발하는")
    .replace(/들어오\s+는/g, "들어오는")
    .replace(/대부분\s+의/g, "대부분의")
    .replace(/전도되\s+는/g, "전도되는")
    .replace(/생산\s+해/g, "생산해")
    .replace(/들어설\s+경우/g, "들어설 경우")
    .replace(/변하기까\s+지는/g, "변하기까지는")
    .replace(/탄생하기까\s+지는/g, "탄생하기까지는")
    .replace(/되기까\s+지는/g, "되기까지는")
    .replace(/전이\s+되지/g, "전이되지")
    .replace(/전이\s+로/g, "전이로")
    .replace(/정상세\s+포/g, "정상세포")
    .replace(/자리매\s+김/g, "자리매김")
    .replace(/잔인\s+하고/g, "잔인하고")
    .replace(/분야에\s+서/g, "분야에서")
    .replace(/전임\s+상/g, "전임상")
    .replace(/건강\s+과/g, "건강과")
    .replace(/의료기기\s+를/g, "의료기기를")
    .replace(/우울\s+증/g, "우울증")
    .replace(/디지실털/g, "디지털")
    .replace(/하지만이/g, "하지만 이")
    .replace(/때는도/g, "때는 도")
    .replace(/비트코인\s+\(bitcoin\)\s*란/g, "비트코인(bitcoin)이란")
    .replace(/저장\s+하는/g, "저장하는")
    .replace(/저장\s+된/g, "저장된")
    .replace(/저장\s+되어/g, "저장되어")
    .replace(/장점\s+들로/g, "장점들로")
    .replace(/집행해\s+야/g, "집행해야")
    .replace(/인정\s+했다/g, "인정했다")
    .replace(/인정\s+하지/g, "인정하지")
    .replace(/결과\s+론적인/g, "결과론적인")
    .replace(/결과\s+적인/g, "결과적인")
    .replace(/실시\s+하면서/g, "실시하면서")
    .replace(/고고\s+한/g, "고고한")
    .replace(/제작\s+되었다/g, "제작되었다")
    .replace(/일이\s+었다/g, "일이었다")
    .replace(/은은\s+한/g, "은은한")
    .replace(/부분\s+인/g, "부분인")
    .replace(/㉠\s+에/g, "㉠에")
    .replace(/㉡\s+은/g, "㉡은")
    .replace(/㉠\s+은/g, "㉠은")
    .replace(/㉠\s+과/g, "㉠과")
    .replace(/㉡\s+으로/g, "㉡으로")
    .replace(/㉠\s+와/g, "㉠와")
    .replace(/진경산수화에\s+관해/g, "진경산수화에 관해")
    .replace(/GW\s*P/g, "GWP")
    .replace(/GlobalW\s*arm\s*ingPotential/g, "Global Warming Potential")
    .replace(/이슬람교는 크게 ㉠ 수니파 ㉡ 나뉜다/g, "이슬람교는 크게 ㉠ 수니파와 ㉡ 시아파로 나뉜다")
    .replace(/우리나라의 전통 난방 방식인 ㉠ 온돌 다른 서양 국가들에서 주로 쓰이는 난방 방식인 ㉡ 라디에이터 방식 달리/g, "우리나라의 전통 난방 방식인 ㉠ 온돌은 다른 서양 국가들에서 주로 쓰이는 난방 방식인 ㉡ 라디에이터 방식과 달리")
    .replace(/콘텐츠솔수\s*션산\s*업/g, "콘텐츠솔루션산업")
    .replace(/콘텐츠솔루션산\s*업/g, "콘텐츠솔루션산업")
    .replace(/콘텐츠솔류션산\s*업/g, "콘텐츠솔루션산업")
    .replace(/무역수지\s*=\s*수출액\s+수입액/g, "무역수지 = 수출액 - 수입액")
    .replace(/부가가\s+치액/g, "부가가치액")
    .replace(/영양\s+소/g, "영양소")
    .replace(/취사선\s+택/g, "취사선택")
    .replace(/아리스토텔레스가\s+심신\s+이원론의\s+입장인지/g, "아리스토텔레스가 심신 이원론의 입장인지")
    .replace(/제조업의\s+분야의/g, "제조업 분야의")
    .replace(/긍정적이\s+기만/g, "긍정적이기만")
    .replace(/수행해\s+야/g, "수행해야")
    .replace(/하지\s+않은\s*것/g, "하지 않은 것")
    .replace(/하지않/g, "하지 않")
    .replace(/하지않은/g, "하지 않은")
    .replace(/않았\s+어/g, "않았어")
    .replace(/해야한다/g, "해야 한다")
    .replace(/되어있/g, "되어 있")
    .replace(/항상참인/g, "항상 참인")
    .replace(/항상거짓인/g, "항상 거짓인")
    .replace(/서로다른/g, "서로 다른")
    .replace(/서로\s+다른요일/g, "서로 다른 요일")
    .replace(/한가지/g, "한 가지")
    .replace(/점심식\s+사/g, "점심식사")
    .replace(/자동\s+차/g, "자동차")
    .replace(/온\s+도/g, "온도")
    .replace(/디스\s+플레이/g, "디스플레이")
    .replace(/가\s+속도/g, "가속도")
    .replace(/높은내구성/g, "높은 내구성")
    .replace(/할수/g, "할 수")
    .replace(/와자이\s+로스코프/g, "와 자이로스코프")
    .replace(/라이브커머\s+스/g, "라이브커머스")
    .replace(/라이\s+브커머스/g, "라이브커머스")
    .replace(/즉각\s+적인/g, "즉각적인")
    .replace(/실시\s+간/g, "실시간")
    .replace(/질\s+문/g, "질문")
    .replace(/기여\s+한다/g, "기여한다")
    .replace(/모두전동/g, "모두 전통")
    .replace(/전동\s+매체/g, "전통 매체")
    .replace(/보다높은/g, "보다 높은")
    .replace(/전통매체/g, "전통 매체")
    .replace(/조건>과같/g, "조건>과 같")
    .replace(/대해정보가/g, "대해 정보가")
    .replace(/선택하는경우/g, "선택하는 경우")
    .replace(/거짓,나머지/g, "거짓, 나머지")
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
    .replace(/([㉠㉡㉢㉣㉤㉥])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=[\s.,)]|$)/g, "$1$2")
    .replace(/([㉠㉡㉢㉣㉤㉥])\s+(에서|에게|으로|부터|까지|보다|처럼|마다|을|를|이|가|은|는|의|에|와|과|로|도|만)(?=\s+[가-힣A-Za-z0-9])/g, "$1$2")
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
    .replace(/아메리\s+카노/g, "아메리카노")
    .replace(/이익\s+을/g, "이익을")
    .replace(/전제\s+들/g, "전제들")
    .replace(/전제\s+만/g, "전제만")
    .replace(/전제\s+로/g, "전제로")
    .replace(/자인\s+지/g, "자인지")
    .replace(/첫\s*번\s*째/g, "첫 번째")
    .replace(/마지막\s+으로/g, "마지막으로")
    .replace(/잔인\s+가/g, "잔인가")
    .replace(/명인\s+가/g, "명인가")
    .replace(/개인\s+가/g, "개인가")
    .replace(/2(?=[㉠㉡㉢㉣㉤㉥])/g, "")
    .replace(/동2안/g, "동안")
    .replace(/면적2이/g, "면적이")
    .replace(/면적이\s*1백\s*m\s*만/g, "면적이 1백㎡ 미만")
    .replace(/면적이\s*3천\s*m\s*이상/g, "면적이 3천㎡ 이상")
    .replace(/3천\s*m\s*이상/g, "3천㎡ 이상")
    .replace(/해2에/g, "해에")
    .replace(/사망만\s*일율/g, "사망만인율")
    .replace(/사망만\s*인율/g, "사망만인율")
    .replace(/운수\s*·?\s*고\s+및\s+통신업/g, "운수·창고 및 통신업")
    .replace(/상병보\s+상연금/g, "상병보상연금")
    .replace(/재활용율/g, "재활용률")
    .replace(/A~H를\s+8명을/g, "A~H 8명을")
    .replace(/([A-Z])~([A-Z])(\d+)(명|권|개)/g, "$1~$2 $3$4")
    .replace(/([A-Z])~([A-Z])총/g, "$1~$2 총")
    .replace(/A~E5명/g, "A~E 5명")
    .replace(/A~F6명/g, "A~F 6명")
    .replace(/1개씩지급/g, "1개씩 지급")
    .replace(/가지이며,/g, "가지이며,")
    .replace(/E중/g, "E 중")
    .replace(/C중/g, "C 중")
    .replace(/갑이\s*다섯/g, "갑이 다섯")
    .replace(/월요\s+일/g, "월요일")
    .replace(/A는\s*을\s+지역/g, "A는 을 지역")
    .replace(/E바로/g, "E 바로")
    .replace(/여자이\s+며/g, "여자이며")
    .replace(/인접\s+하여/g, "인접하여")
    .replace(/양옆에\s+는/g, "양옆에는")
    .replace(/우유\s+도/g, "우유도")
    .replace(/우유\s+를/g, "우유를")
    .replace(/전제\s*3:\s*\(\s*결론:/g, "전제 3: ( ㉠ )\n결론:")
    .replace(/전제\s*2:\s*\(\s*전제\s*3:/g, "전제 2: ( ㉠ )\n전제 3:")
    .replace(/결론:\s*\(\s*$/g, "결론: ( ㉠ )")
    .replace(/하지만이/g, "하지만 이")
    .replace(/때는도/g, "때는 도")
    .replace(/변하기까지는/g, "변하기까지는")
    .replace(/탄생하기까지는/g, "탄생하기까지는")
    .replace(/되기까지는/g, "되기까지는")
    .replace(/정상세포/g, "정상세포")
    .replace(/제작\s+하면/g, "제작하면")
    .replace(/제작\s+후/g, "제작 후")
    .replace(/생산\s+하는/g, "생산하는")
    .replace(/생산\s+한/g, "생산한")
    .replace(/앉아\s+서/g, "앉아서")
    .replace(/되돌\s+아/g, "되돌아")
    .replace(/관광\s+지/g, "관광지")
    .replace(/km\/\s*h/g, "km/h")
    .replace(/%\s+가\?/g, "%인가?")
    .replace(/들어\s*갈/g, "들어갈")
    .replace(/알\s*수\s*있$/g, "알 수 있다")
    .replace(/알\s*수\s*없$/g, "알 수 없다")
    .replace(/연구진들은이/g, "연구진들은 이")
    .replace(/않았\s+다/g, "않았다")
    .replace(/그런데이/g, "그런데 이")
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
    [/중심\s*내용으로\s*가$/u, "중심 내용이다."],
    [/주제로\s*가$/u, "주제이다."],
    [/따라서\s*<보기>\s*에서$/u, ""],
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
      /(?:따라서\s*)?(?:글의\s*)?(?:주제로는|주제로|중심\s*내용으로는|중심\s*내용으로|내용으로는|옳은\s*것만을\s*모두\s*고르면|옳지\s*않은\s*것만을\s*모두\s*고르면|모두\s*고르|정답은).*$/u,
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
