export function normalizeQuestionText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/\s+(?=<보기>|<조건>|※)/g, "\n")
    .replace(/(<보기>|<조건>)/g, "\n$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function repairQuestionBody(value: string) {
  let text = normalizeQuestionText(value);
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
