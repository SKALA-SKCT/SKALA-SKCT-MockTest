export const NOTE_TEXT_MAX = 5000;
// 서버 액션 요청 본문 기본 한도(1MB) 안에 들어가도록 제한한다.
export const NOTE_DRAWING_MAX = 700_000;
export const NOTE_DRAWING_PREFIX = "data:image/png;base64,";

export type QuestionNote = { text: string; drawing: string | null };
