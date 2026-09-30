const underlines: Record<string, string[]> = {
  "2:4": ["비트코인"],
  "2:12": ["수니파", "시아파"],
  "2:16": ["온돌", "라디에이터 방식"],
  "4:12": ["공정공시", "수시공시"],
  "4:16": ["후각 능력"],
  "8:3": ["플라톤의 대화편에 나오는 소크라테스", "역사적 실존 인물인 소크라테스"],
  "8:14": ["능력주의를 비판하는 입장", "능력주의"],
  "9:7": ["「논어」에 등장하는 공자", "실제 역사적 인물로서의 공자"],
  "9:19": ["학벌주의", "업적주의"],
  "11:2": ["진정한 자유"],
  "11:15": ["이황", "조식"],
  "12:7": ["이데아"],
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
