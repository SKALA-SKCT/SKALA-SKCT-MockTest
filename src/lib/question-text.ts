export function normalizeQuestionText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/에서(?=모두)/g, "에서 ")
    .replace(/\s+(?=<보기>|<조건>|※)/g, "\n")
    .replace(/(<보기>|<조건>)/g, "\n$1\n")
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

  if (!hasFractionLikeChoice) return choices;

  return choices.map((choice) => {
    const trimmed = normalizeQuestionText(choice);
    if (!/^\d[\d\s]*$/.test(trimmed)) return trimmed;
    return expandCompactFraction(trimmed);
  });
}
