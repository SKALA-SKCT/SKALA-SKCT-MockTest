# SKCT 스터디

스터디원끼리 SKCT 모의고사를 실전처럼 풀고, 문항별 정답률·백분위·유형별 강약점을 비교 분석하는 사이트.

## 구성

| 탭 | 내용 |
|---|---|
| 모의고사 | 실제 온라인 SKCT 방식 응시 (과목별 15분 타이머, 뒤로가기 불가, 메모장/그림판/계산기) |
| 유형별 문제 | 유형별 연습 문제은행. 즉시 채점, 평가/분석 미반영 |
| 게시판 | 공지/잡담, 댓글 |
| 마이페이지 | 내 정보, 유형별 정답률 분석(vs 그룹), 응시 기록, 비밀번호 변경(모달), 로그아웃 |
| 관리 (관리자) | 시험 생성/공개, 모의고사 문항 JSON 등록, 연습 문제 JSON 등록 |

## 기술 스택

- Next.js 16 (App Router) + React 19 + Tailwind 4
- PostgreSQL + Drizzle ORM
- 인증: 아이디 + 비밀번호(영문/숫자/특수기호 6~32자), JWT 세션 쿠키 (bcrypt 해시)
- 차트: recharts

## 로컬 실행

```bash
createdb skct                # 로컬 Postgres 필요
cp .env.example .env.local   # DATABASE_URL, SESSION_SECRET 설정
npm install
npm run db:push              # 스키마 반영
npm run db:import:reset      # PDF에서 추출한 12회차 모의고사 등록
npm run dev                  # http://localhost:3000
```

- **첫 가입자가 자동으로 관리자**가 됩니다 (시드 없이 시작할 때 기준).
- 아이디/비밀번호 찾기 기능이 없으므로 분실 시 관리자가 DB에서 직접 처리해야 합니다.

## 문항 데이터

- `data/round-1.json` ~ `data/round-12.json`: 12개 모의고사 문항
- `data/manifest.json`: 각 회차의 실제 시험 제목
- `public/exam-assets/round-*/q-*.png`: 자료/표/그림 이미지

`npm run db:import:reset`은 기존 시험과 그에 연결된 응시 기록을 삭제한 뒤 다시 넣습니다. 운영 배포 후 사용자가 응시를 시작한 뒤에는 실행하지 마세요.

## 문항 등록 포맷

모의고사 문항:

```json
[
  {
    "subject": "수열추리",
    "number": 1,
    "body": "다음 수열의 규칙을 찾아 빈칸에 들어갈 수를 고르시오.\n\n2, 5, 8, 11, ( ? )",
    "choices": ["12", "13", "14", "15", "16"],
    "answer": 3,
    "explanation": "공차 3인 등차수열"
  }
]
```

- `subject`: 언어이해 / 자료해석 / 창의수리 / 언어추리 / 수열추리
- `answer`: 1~5 (choices의 1-based 정답 번호)
- 같은 (시험, 과목, 번호)에 다시 등록하면 덮어씀
- 유형별 연습 문제는 `number` 없이 동일 포맷

## 저비용 배포

Vercel Hobby + Supabase Free 기준으로 준비되어 있습니다. 자세한 절차는 [DEPLOYMENT.md](/Users/parkkunmin/Documents/DEV/SKCT/DEPLOYMENT.md)를 참고하세요.

## 주의

기출/교재 문제는 저작권 문제가 있을 수 있으므로 로그인한 스터디원만 접근하는 비공개 용도로 운영하세요.
