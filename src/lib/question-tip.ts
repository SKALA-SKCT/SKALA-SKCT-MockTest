export const TIP_MAX = 1000;
export const TIP_REPORT_REASONS = ["욕설 또는 비방", "광고 또는 도배", "잘못된 풀이 정보", "개인정보 노출", "기타"];
export type QuestionTip = { id: string; questionId: number; name: string; text: string; createdAt: string; likes: number; liked: boolean; mine: boolean; reported: boolean };

export function validTipText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= TIP_MAX;
}
