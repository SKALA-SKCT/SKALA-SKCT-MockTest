const underlines: Record<string, string[]> = {
  "2:4": ["비트코인"],
  "2:12": ["수니파", "시아파"],
  "2:16": ["온돌", "라디에이터 방식"],
};

export default function PdfPassage({ text, round, number }: { text: string; round: number; number: number }) {
  const words = underlines[`${round}:${number}`];
  if (!words) return text;
  const pattern = new RegExp(`([㉠㉡]\\s*)(${words.join("|")})`, "g");
  const parts = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(offset, match.index), match[1], <u key={match.index}>{match[2]}</u>);
    offset = match.index + match[0].length;
  }
  parts.push(text.slice(offset));
  return parts;
}
