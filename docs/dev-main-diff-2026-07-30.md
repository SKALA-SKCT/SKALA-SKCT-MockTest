# dev/main 차이 기록

작성일: 2026-07-30

이 문서는 dev 브랜치를 main과 통일하기 전에 확인한 차이를 남긴 기록입니다.

## 요약

- main은 기존 MockTest 자체 로그인, 회원가입, 아이디 찾기, 비밀번호 재설정, 이메일 인증 화면과 로직을 유지합니다.
- dev는 Mother 인증 연동 실험이 들어가면서 자체 인증 화면과 일부 인증 액션이 삭제 또는 축소되어 있었습니다.
- dev는 `/api/auth/legacy-verify`가 추가되어 기존 계정 연결 흐름을 받도록 되어 있었습니다.
- dev는 결과/대시보드 비교 화면에서 main보다 캠퍼스/분반 비교 표시가 줄어든 상태였습니다.
- dev는 `users` 스키마에 Mother 연동용 필드가 추가되고 일부 인증 필드 제약이 바뀐 상태였습니다.

## 파일 단위 차이

- `package.json`, `package-lock.json`: dev에서 메일 인증 의존성 일부가 제거되어 있었습니다.
- `src/app/api/auth/legacy-verify/route.ts`: dev에만 Mother 계정 연결용 API가 추가되어 있었습니다.
- `src/app/login/page.tsx`, `src/lib/session.ts`, `src/lib/actions/auth.ts`: dev는 Mother 로그인 리다이렉트/공유 세션 처리 중심으로 바뀌어 있었습니다.
- `src/app/register`, `src/app/find-id`, `src/app/forgot-password`, `src/app/reset-password`, `src/app/verify-email`: dev에서 기존 자체 인증 페이지들이 삭제되어 있었습니다.
- `src/components/AuthForm.tsx`, `src/components/SimpleActionForm.tsx`: dev에서 기존 자체 인증 UI 컴포넌트가 삭제되어 있었습니다.
- `src/components/AccountMenu.tsx`: dev에서 내정보 변경/계정 관리 기능이 축소되어 있었습니다.
- `src/app/page.tsx`, `src/app/exam/[id]/result/page.tsx`, `src/components/SubjectRadar.tsx`, `src/components/TrendChart.tsx`: dev에서 캠퍼스/분반 비교가 main과 다르게 축소된 상태였습니다.
- `src/db/schema.ts`: dev에서 `externalId`, `onboarded`, `pinHash` nullable 등 Mother 연동용 스키마 변경이 있었습니다.

## 통일 방향

dev는 main과 동일한 내용으로 맞춥니다. 이후 dev/main 모두 기존 MockTest 자체 로그인/회원가입 흐름을 기준으로 유지합니다.
