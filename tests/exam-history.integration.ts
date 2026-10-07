import assert from "node:assert/strict";
import { Pool } from "pg";
import { SignJWT } from "jose";

async function main() {
  const databaseUrl = process.env.EXAM_TEST_DATABASE_URL ?? "";
  const appUrl = process.env.EXAM_TEST_APP_URL ?? "";
  const secret = process.env.EXAM_TEST_SESSION_SECRET ?? "";
  if (!databaseUrl || !appUrl || new URL(databaseUrl).hostname !== "127.0.0.1" || new URL(appUrl).hostname !== "127.0.0.1" || !secret) throw Error("분리된 로컬 검증 환경을 지정해 주세요.");
  const pool = new Pool({ connectionString: databaseUrl });
  const tag = `history-${Date.now()}`;
  const userIds: number[] = [];
  let createdExams = false;
  try {
    assert.equal((await pool.query('select id from exams where id in (10,13)')).rowCount, 0);
    await pool.query("insert into exams(id,title,published) values (10,$1,false),(13,$2,true)", [tag + '-archived', tag + '-current']);
    createdExams = true;
    for (let i = 0; i < 3; i++) userIds.push((await pool.query("insert into users(nickname,name,pin_hash) values($1,$1,'local-test') returning id", [tag + i])).rows[0].id);
    const questionIds = new Map<number, number[]>();
    for (const examId of [10, 13]) {
      const ids: number[] = [];
      for (let n = 1; n <= 2; n++) ids.push((await pool.query("insert into questions(exam_id,subject,number,body,choices,answer) values($1,'언어이해',$2,$3,'[\"첫 번째\",\"두 번째\"]',2) returning id", [examId, n, `검증 ${n}번`])).rows[0].id);
      questionIds.set(examId, ids);
    }
    const create = async (userId: number, examId: number, time: string, score: number) => {
      const { rows: [attempt] } = await pool.query("insert into attempts(user_id,exam_id,started_at,finished_at) values($1,$2,$3,$3::timestamptz+interval '1 minute') returning id", [userId, examId, time]);
      const qs = questionIds.get(examId)!;
      for (const [i, id] of qs.entries()) await pool.query('insert into responses(attempt_id,question_id,choice,is_correct,time_spent_seconds) values($1,$2,$3,$4,11)', [attempt.id, id, i < score ? 2 : 1, i < score]);
      const snapshot = { totalScore: score, totalQuestions: 2, subjectScores: { 언어이해: score }, subjectTotals: { 언어이해: 2 }, subjectElapsedSeconds: { 언어이해: 22 }, unanswered: 0, easyMistakes: 2 - score,
        questions: qs.map((questionId, i) => ({ questionId, choice: i < score ? 2 : 1, isCorrect: i < score, elapsedSeconds: 11 })) };
      await pool.query('insert into attempt_results(attempt_id,total_score,total_questions,snapshot) values($1,$2,2,$3)', [attempt.id, score, snapshot]);
      return attempt.id;
    };
    // 등록 ID와 응시 시각 순서를 다르게 구성합니다.
    const second = await create(userIds[0], 10, '2026-01-02T00:00:00Z', 2);
    const first = await create(userIds[0], 13, '2026-01-01T00:00:00Z', 1);
    const third = await create(userIds[0], 13, '2026-01-03T00:00:00Z', 0);
    const onlyHidden = await create(userIds[1], 10, '2026-01-01T00:00:00Z', 2);
    const hiddenFirst = await create(userIds[2], 10, '2026-01-01T00:00:00Z', 0);
    const publicSecond = await create(userIds[2], 13, '2026-01-02T00:00:00Z', 1);
    await pool.query('update users set is_admin=true where id=$1', [userIds[0]]);
    await pool.query("insert into attempts(user_id,exam_id,started_at) values($1,10,'2025-12-31T00:00:00Z')", [userIds[0]]);
    for (const examId of [10, 13]) await pool.query("insert into question_reports(question_id,reporter_id,reasons,detail) values($1,$2,'[\"정답 오류\"]',$3)", [questionIds.get(examId)![0], userIds[0], `${tag}-report-${examId}`]);
    const cookie = async (id: number) => 'skct_session=' + await new SignJWT({ uid: id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    const stored = async () => (await pool.query('select a.*,r.snapshot,r.total_score from attempts a left join attempt_results r on r.attempt_id=a.id where a.user_id=any($1) order by a.id', [userIds])).rows;
    const before = await stored();
    const related = async () => ({
      questions: (await pool.query('select * from questions where exam_id in (10,13) order by id')).rows,
      responses: (await pool.query('select * from responses where attempt_id in (select id from attempts where user_id=any($1)) order by id', [userIds])).rows,
      reports: (await pool.query('select * from question_reports where reporter_id=any($1) order by id', [userIds])).rows,
    });
    const relatedBefore = await related();
    for (const [userId, expected] of [[userIds[0], [[first, 1], [second, 2], [third, 0]]], [userIds[1], [[onlyHidden, 2]]], [userIds[2], [[hiddenFirst, 0], [publicSecond, 1]]]] as const) {
      for (const [i, [attemptId, score]] of expected.entries()) {
        const response = await fetch(`${appUrl}/exam/13/result?round=${i + 1}`, { headers: { cookie: await cookie(userId) } });
        const html = (await response.text()).replaceAll('\\"', '"');
        assert.equal(response.status, 200);
        assert.ok(html.includes(`"attemptId":${attemptId},"examTitle":"${tag}-current","round":${i + 1},"score":${score}`), `응시 ${attemptId} 차수와 점수: ${html.match(/"attemptId":\d+,"examTitle":"[^"]+","round":\d+,"score":\d+/)?.[0]}`);
        assert.ok(html.includes('"elapsedSeconds":11'));
        if (score) assert.ok(html.includes('"myChoice":2'));
        const n = i === 0 ? 3 : i === 1 ? 2 : 1;
        assert.ok(html.includes(`"participants":${n}`), '같은 응시 차수의 참여 인원');
      }
      const dashboard = (await (await fetch(appUrl, { headers: { cookie: await cookie(userId) } })).text()).replaceAll('\\"', '"');
      assert.ok(dashboard.includes('/exam/13/result'));
      assert.ok(!dashboard.includes('/exam/10/result'));
    }
    const admin = async (query: string) => {
      const response = await fetch(`${appUrl}/admin?${query}`, { headers: { cookie: await cookie(userIds[0]) } });
      assert.equal(response.status, 200);
      return (await response.text()).replaceAll('\\"', '"');
    };
    const members = await admin(`tab=users&userId=${userIds[0]}`);
    assert.ok(members.includes(`${tag}-current`) && !members.includes(`${tag}-archived`));
    for (const [i, id] of [first, second, third].entries()) assert.ok(members.includes(`data-attempt-id="${id}" data-attempt-round="${i + 1}"`));
    assert.ok(members.includes('미완료 응시') && members.includes('이전 등록 기록'));
    const reports = await admin('tab=reports&reportExam=13&reportNumber=1&reportSubject=언어이해');
    assert.ok(reports.includes(`${tag}-report-10`) && reports.includes(`${tag}-report-13`));
    assert.ok(!reports.includes(`${tag}-archived`));
    assert.ok(reports.includes('tab=questions&amp;exam=13'));
    const questionPage = await admin('tab=questions&exam=10&number=1');
    assert.ok(questionPage.includes(`${tag}-current`) && !questionPage.includes(`${tag}-archived`));
    assert.match(questionPage, /관련 신고 (?:<!-- -->)?2/);
    assert.deepEqual(await stored(), before);
    assert.deepEqual(await related(), relatedBefore);
    console.log('응시 시각순 통합, 관리자 차수와 미완료 구분, 문항과 신고 연결, 답안과 신고 원본 보존 통과');
  } finally {
    if (createdExams) await pool.query('delete from exams where id in (10,13)');
    if (userIds.length) await pool.query('delete from users where id=any($1)', [userIds]);
    await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
