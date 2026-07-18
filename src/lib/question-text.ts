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
