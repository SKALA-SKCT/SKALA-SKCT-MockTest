# SKCT Project Agent Guide

This file is the handoff document for AI agents working in this repository. Keep it current whenever project structure, deployment, data model, routes, or operating rules change.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Summary

SKCT 스터디용 모의고사 웹앱이다. 스터디원이 실제 SKCT처럼 과목별 15분 타이머로 문제를 풀고, 결과 페이지와 대시보드에서 점수, 정답률, 백분위, 유형별 강약점을 확인한다.

현재 운영 대표 URL은 `https://skala-skct.vercel.app` 이다. SKCT 관련 Vercel alias는 이 주소만 남기는 것을 원칙으로 한다.

## Stack

- Next.js `16.2.10` App Router
- React `19.2.4`
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Drizzle ORM
- bcryptjs password hashing
- JWT-style session cookie via `jose`
- Nodemailer for email
- Recharts for charts

## Important Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run db:push
npm run db:generate
npm run db:import
npm run db:import:reset
```

Use `npm run build` as the main validation before pushing or deploying. `npm run lint` may fail on unrelated existing code, so also run targeted lint such as:

```bash
npx eslint src/app/admin/page.tsx src/lib/actions/admin.ts
```

## Environment

Required variables are documented in `.env.example`.

- `DATABASE_URL`: Postgres connection string.
- `DATABASE_SSL`: `true` for Supabase/Vercel production connections.
- `DB_POOL_MAX`: keep low on serverless, usually `2`.
- `SESSION_SECRET`: long random secret for session cookies.
- SMTP variables are needed for real email delivery.

Development mail behavior: when SMTP is not configured and `NODE_ENV !== "production"`, `src/lib/mail.ts` skips delivery and logs only a non-sensitive warning. Do not print auth codes, password reset links, email contents, or recipient addresses to logs.

## Data Model

Schema lives in `src/db/schema.ts`.

- `users`: login identity, name, campus, class number, email verification, admin flag.
- `authTokens`: email verification, ID lookup, password reset tokens.
- `exams`: mock exam metadata.
- `questions`: exam questions. Unique by `(examId, subject, number)`.
- `attempts`: user exam attempts with `sectionState`, `startedAt`, `finishedAt`.
- `responses`: per-question saved answers and correctness.
- `chatMessages`: public chat/board messages.

Constants:

- Subjects: `언어이해`, `자료해석`, `창의수리`, `언어추리`, `수열추리`.
- Campuses: `판교`, `울산`, `광주`.
- `maxClassForCampus("판교")` is `10`; others are `4`.
- Each section is `15` minutes via `SECTION_MINUTES`.

## Routes

Important App Router files:

- `src/app/page.tsx`: main dashboard/home.
- `src/app/admin/page.tsx`: admin stats and members tab. Current admin UI has `통계` and `회원`; clicking a member opens an account modal for user info edits, attempt record management, and admin role changes.
- `src/app/exam/[id]/take/page.tsx`: exam taking page.
- `src/app/exam/[id]/result/page.tsx`: result and review page.
- `src/app/login/page.tsx`, `register`, `forgot-password`, `reset-password`, `find-id`, `verify-email`: auth flows.
- `src/app/api/chat/messages/route.ts`: chat messages API.
- `src/app/api/keepalive/route.ts`: cron keepalive route.
- `src/app/api/og-image/route.ts`: OG image route.

## Core Server Actions

- `src/lib/actions/auth.ts`: registration, login, logout, email verification, ID/password recovery.
- `src/lib/actions/exam.ts`: start attempt, start/finish section, save answer, abandon unfinished attempts.
- `src/lib/actions/admin.ts`: admin role grant/revoke, user info edit, and attempt record deletion for the account modal.

Security notes:

- The first registered user becomes admin when the user table is empty.
- Admin role cannot be removed from yourself through the admin action.
- The last admin cannot be demoted.
- Never expose password hashes, auth tokens, verification codes, or reset links in logs or UI.
- Supabase public schema tables must have RLS enabled. The app uses server-side Postgres access, so RLS is enabled without public anon/authenticated policies unless a future browser-side Supabase client is intentionally introduced.

## Exam Data

- `data/round-1.json` through `data/round-12.json`: mock exam questions.
- `data/manifest.json`: exam titles.
- `public/exam-assets/round-*/q-*.png`: question images.
- `PDF/`: source PDFs kept in the repo.
- `scripts/extract_pdf_questions.py`: extraction helper.
- `src/lib/question-overrides.ts` and `src/lib/question-text.ts`: question text/override helpers.

Warning: `npm run db:import:reset` deletes existing exams and cascades attempts/responses. Do not run against production after real users have attempts unless the user explicitly asks and understands data loss.

## UI Components

Key components:

- `ExamRunner.tsx`: exam interaction/timer/answer saving.
- `ExamStartButton.tsx`: start/resume button behavior.
- `ResultReview.tsx`: answer review.
- `AccountMenu.tsx`: user account panel.
- `AdminCharts.tsx`: admin chart/table summaries.
- `SubjectRadar.tsx`, `TrendChart.tsx`, `ScoreDistributionChart.tsx`: result/dashboard visualizations.
- `PublicChat.tsx`: public chat UI.
- `HelpGuideButton.tsx`: help guide.

## Admin Page Current Behavior

- `통계`: overall exam/user/completion statistics.
- `회원`: member list, filters, and attempt summary.
- The member list table should keep aligned fixed columns. Account names are clickable.
- Clicking an account opens a server-rendered modal via the `userId` query param.
- The account modal contains user info editing, campus/class edit, an `관리자 권한` row with a right-aligned oval toggle below the campus/class fields, a bottom-aligned info save button, and attempt record deletion. Email verification state is preserved when saving user info but is not edited in the modal UI.
- The account modal's attempt table always renders all 12 exam rounds; rounds without a record show as not attempted and have no delete action.
- Do not add a separate `응시 내역` admin tab unless explicitly requested.
- The result page places a `ResultStrategyAnalysis` card below the score summary and automatically calls `/api/ai/result-analysis` once per result view using score, subject accuracy, unanswered count, easy-question mistakes, section/question elapsed time, and question difficulty data. The route requires the server-only `GEMINI_API_KEY`, calls `gemini-3-flash-preview` by default, validates the JSON response shape, retries Gemini once when malformed, and shows an error instead of mock data when Gemini remains unavailable.
- The result page shows a Gemini strategy analysis at the top and displays each question's elapsed time in the review list, including time spent before leaving an unanswered question. It does not show separate section-time or 12-attempt trend cards. Review filters include easy-question mistakes and unanswered questions; there is no hard-question-success filter.

## Deployment

The project is linked to Vercel project `skala-skct` under `pkm021118s-projects`.
The only user-facing production URL is `https://skala-skct.vercel.app`.
Never use, report, or link the generated Vercel URL `skct-mauve.vercel.app`.

Preferred deployment flow:

```bash
npm run build
git status -sb
git add <intended files>
git commit -m "<message>"
git push origin main
vercel deploy --prod --yes --scope pkm021118s-projects
vercel alias set <deployment-url> skala-skct.vercel.app --scope pkm021118s-projects
```

After deployment, remove extra SKCT aliases if Vercel recreates them. The
generated Vercel URL must not be presented as the production address:

```bash
vercel alias rm skct-mauve.vercel.app --yes --scope pkm021118s-projects
vercel alias rm skala-skct-pkm021118s-projects.vercel.app --yes --scope pkm021118s-projects
vercel alias rm skala-skct-pkm021118-pkm021118s-projects.vercel.app --yes --scope pkm021118s-projects
```

Verify:

```bash
curl -I 'https://skala-skct.vercel.app/admin?tab=users'
vercel alias ls --scope pkm021118s-projects | rg 'skct|source|url|aliases found'
```

Expected SKCT alias state: only `skala-skct.vercel.app` should remain.

## Git Rules For Agents

- Check `git status -sb` before edits.
- Do not revert unrelated user changes.
- Stage only intended files unless the user explicitly asks to commit everything.
- If the user says to commit all existing changes, use `git add -A`.
- Keep commits descriptive and small when possible.
- After pushing/deploying, verify the real production URL, not just the generated deployment URL.

## Maintenance Rule

Always update this `AGENTS.md` when you change:

- Routes or major UI behavior.
- Data schema or migrations.
- Supabase RLS status or database security posture.
- Auth, email, security, or logging behavior.
- Exam flow, scoring, attempts, responses, or import behavior.
- Deployment URL, alias rules, or Vercel/Supabase process.
- New scripts, required env vars, or validation commands.

If the document disagrees with code, trust the code, fix the document, and mention the correction in the final response.
