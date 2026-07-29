# SKALA-SKCT MockTest

SKALA-SKCT 서비스의 실전 모의고사 페이지입니다. 사용자가 실제 시험과 가까운 환경에서 모의고사를 응시하고, 완료 후 대시보드와 AI 분석을 통해 현재 위치와 다음 학습 방향을 확인할 수 있도록 돕습니다.

## Service Structure

SKALA-SKCT는 랜딩페이지를 중심으로 여러 학습 페이지가 연결되는 구조입니다.

| 영역 | 역할 |
| --- | --- |
| 랜딩페이지 | 서비스 소개, 로그인, 하위 페이지 이동을 담당하는 마더페이지 |
| 실전 모의고사 | 실제 시험 환경에 가까운 응시 기능과 결과 대시보드, AI 분석을 제공 |
| 모의고사 문제 연습 | 더 자유로운 환경에서 모의고사 문제를 연습하는 페이지 |
| 유형별 문제 연습 | 문제 유형별로 응시하고 반복 학습하는 페이지 |

하위 3개 페이지는 랜딩페이지에서 제공하는 로그인 인증 흐름을 공유하는 구조를 전제로 합니다. 이 레포는 그중 실전 모의고사 영역을 담당합니다.

## This Repository

이 레포는 SKALA-SKCT 전체 구조 중 실전 모의고사 앱을 담당합니다.

- 로그인된 사용자의 메인 대시보드
- 회차별 실전 모의고사 응시
- 5개 유형 기반 시험 진행
- 메모장, 그림판, 계산기 등 응시 보조 도구
- 회차별 점수 추이
- 유형별 누적 점수와 평균 비교
- 전체, 캠퍼스, 분반 기준 비교 분석
- 문항별 결과 리뷰와 해설 확인
- AI 기반 결과 분석 및 학습 방향 제안
- 관리자용 시험/문항/통계 관리 화면

## Authentication Flow

이 앱은 자체 랜딩페이지와 자체 로그인/회원가입 화면을 제공하지 않습니다.

- 로그인된 사용자가 `/`에 접근하면 바로 메인 대시보드가 표시됩니다.
- 로그인되지 않은 사용자가 `/`에 접근하면 마더페이지 로그인 화면으로 이동합니다.
- 로그인과 계정 관련 화면은 마더페이지 레포에서 관리합니다.

로컬 개발에서는 마더페이지를 `http://localhost:3000`으로 봅니다.

배포 환경에서는 마더페이지를 `https://skala-skct-landing.vercel.app`으로 봅니다.

## Routes

| Route | Description |
| --- | --- |
| `/` | 메인 대시보드 |
| `/exam/[id]/take` | 실전 모의고사 응시 |
| `/exam/[id]/result` | 응시 결과 및 리뷰 |
| `/admin` | 관리자 화면 |

## Exam Model

실전 모의고사는 다음 유형을 기준으로 구성됩니다.

- 언어이해
- 자료해석
- 창의수리
- 언어추리
- 수열추리

각 유형은 제한 시간 안에서 진행되며, 응시 기록과 답안은 결과 분석과 대시보드 통계에 사용됩니다.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Drizzle ORM
- Jose JWT
- Recharts
- Vercel

## Environment

`.env.example`을 기준으로 `.env.local`을 구성합니다.

주요 환경 변수:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `DATABASE_SSL` | 배포 DB SSL 사용 여부 |
| `DB_POOL_MAX` | DB pool 최대 연결 수 |
| `SESSION_SECRET` | 세션 쿠키 서명용 secret |
| `GEMINI_API_KEY` | AI 결과 분석용 API key |
| `GEMINI_MODEL` | AI 분석에 사용할 모델 |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager ID |
| `MOTHER_PAGE_URL` | 마더페이지 URL override |

## Getting Started

```bash
npm install
npm run dev -- -p 3001
```

로컬에서 마더페이지와 함께 볼 때는 다음처럼 실행합니다.

```bash
# landing repository
npm run dev

# mock test repository
npm run dev -- -p 3001
```

## Database

```bash
npm run db:push
npm run db:import
```

`db:import:reset`은 기존 시험/응시 데이터를 초기화할 수 있으므로 로컬 또는 명확히 의도한 환경에서만 사용합니다.

## Build

```bash
npm run build
```

## Deployment

프로덕션 배포는 Vercel 프로젝트에 연결되어 있습니다.

- Production: `https://skala-skct.vercel.app`

저장소가 GitHub organization으로 이전된 뒤에도 배포 URL은 유지됩니다. 자동 배포가 멈추면 Vercel GitHub App이 `SKALA-SKCT` organization 저장소에 접근할 수 있는지 확인해야 합니다.

## Repository Role

이 레포는 SKALA-SKCT의 실전 모의고사 경험을 담당합니다. 랜딩과 인증 UI의 중심 역할은 마더페이지 레포가 맡고, 모의고사 문제 연습과 유형별 문제 연습은 별도 하위 페이지로 연결되는 구조입니다.
