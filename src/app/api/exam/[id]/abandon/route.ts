import { NextResponse } from "next/server";

// 이전 배포의 화면 이탈 알림으로 진행 중인 응시가 삭제되는 것을 막는다.
export async function POST() {
  return NextResponse.json({ ok: false }, { status: 410 });
}
