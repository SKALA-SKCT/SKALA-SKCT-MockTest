# Vercel + Supabase 배포 준비

최대한 비용을 줄이는 기본 조합은 Vercel Hobby + Supabase Free입니다. 개인/소규모 스터디 트래픽 기준으로 시작하기 좋고, 이 앱은 별도 파일 스토리지 없이 정적 이미지(`public/exam-assets`)를 Vercel에서 서빙하도록 구성되어 있습니다.

## 1. Supabase 프로젝트 생성

1. Supabase에서 새 프로젝트를 만듭니다.
2. Database connection string은 Vercel 배포용으로 **Transaction Pooler** URL을 사용합니다.
3. 연결 문자열에 SSL이 필요하므로 Vercel 환경변수에는 `DATABASE_SSL=true`를 둡니다.

권장 환경변수:

```bash
DATABASE_URL=postgres://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres
DATABASE_SSL=true
DB_POOL_MAX=2
SESSION_SECRET=<openssl rand -base64 32 결과>
```

`DB_POOL_MAX=2`는 서버리스 환경에서 동시에 열리는 DB 연결 수를 낮춰 Supabase Free 한도에 맞추기 위한 값입니다.

## 2. DB 스키마 반영

운영 DB에는 둘 중 하나로 스키마를 반영합니다.

```bash
npm run db:push
```

또는 Supabase SQL Editor에서 아래 파일 내용을 실행합니다.

```text
drizzle/0000_normal_ogun.sql
```

## 3. 12개 모의고사 초기 적재

초기 배포 직후, 아직 실제 응시자가 없을 때만 실행합니다.

```bash
npm run db:import:reset
```

이 명령은 기존 시험을 삭제하고 새로 넣습니다. `attempts`, `responses`는 시험 삭제에 cascade로 연결되어 있으므로 운영 중 재실행하면 응시 기록이 사라집니다.

Vercel 배포 뒤 로컬에서 Supabase 운영 DB에 넣을 때는 `.env.local`의 `DATABASE_URL`, `DATABASE_SSL`, `DB_POOL_MAX`를 운영값으로 잠시 바꾼 뒤 실행하세요. 작업 후에는 로컬 DB 값으로 되돌리는 편이 안전합니다.

## 4. Vercel 설정

Vercel 프로젝트를 GitHub 저장소와 연결한 뒤 환경변수를 설정합니다.

```bash
DATABASE_URL=<Supabase Transaction Pooler URL>
DATABASE_SSL=true
DB_POOL_MAX=2
SESSION_SECRET=<openssl rand -base64 32 결과>
```

Build Command는 기본값인 `npm run build`를 사용합니다. DB import는 빌드에 포함하지 않습니다.

## 5. 비용 줄이는 운영 기준

- Vercel은 Hobby 플랜으로 시작합니다.
- Supabase는 Free 플랜으로 시작합니다.
- 정적 이미지 480개는 `public/exam-assets`에 포함되어 별도 Storage 비용이 들지 않습니다.
- Cron, Edge Function, Supabase Storage는 현재 필요 없습니다.
- 사용자가 늘어나면 먼저 Supabase DB 용량/커넥션/일시정지 정책을 확인하고, 그다음 Vercel 사용량을 확인합니다.

## 6. 배포 후 확인

1. 첫 가입자가 자동으로 관리자 권한을 받는지 확인합니다.
2. 대시보드에 12개 모의고사가 실제 제목으로 보이는지 확인합니다.
3. 1개 시험에 들어가 문항/자료 이미지/선택지가 정상 표시되는지 확인합니다.
4. 중간 이탈 후 대시보드에서 다시 응시 버튼이 보이는지 확인합니다.
5. 시험 완료 후 결과 페이지에서 문항별 리뷰, 오답 필터, 유형별 고오답률 영역이 보이는지 확인합니다.
