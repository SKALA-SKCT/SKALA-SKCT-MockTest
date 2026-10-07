import assert from "node:assert/strict";
import { Pool } from "pg";
import { SignJWT } from "jose";

async function main() {
  const databaseUrl = process.env.EXAM_TEST_DATABASE_URL;
  let appUrl = process.env.EXAM_TEST_APP_URL ?? "";
  const nextAppUrl = process.env.EXAM_TEST_NEXT_APP_URL;
  const secret = process.env.EXAM_TEST_SESSION_SECRET;
  if (!databaseUrl || !appUrl || !secret || new URL(databaseUrl).hostname !== "127.0.0.1" || new URL(appUrl).hostname !== "127.0.0.1") {
    throw new Error("분리된 로컬 DB와 로컬 앱 주소를 지정해 주세요.");
  }
  if (nextAppUrl && new URL(nextAppUrl).hostname !== "127.0.0.1") throw new Error("후속 앱도 로컬 주소여야 합니다.");
  const pool = new Pool({ connectionString: databaseUrl });
  const tag = `safety-${Date.now()}`;
  const { rows: [user] } = await pool.query("insert into users(nickname,name,pin_hash) values($1,$1,'local-test') returning id", [tag]);
  const { rows: [other] } = await pool.query("insert into users(nickname,name,pin_hash) values($1,$1,'local-test') returning id", [tag + '-other']);
  const { rows: [exam] } = await pool.query("insert into exams(title,published) values($1,true) returning id", [tag]);
  try {
    const { rows: [question] } = await pool.query("insert into questions(exam_id,subject,number,body,choices,answer) values($1,'언어이해',1,'검증 문항입니다. 답은 무엇입니까?','[\"첫 번째\",\"두 번째\"]',2) returning id", [exam.id]);
    const { rows: [secondQuestion] } = await pool.query("insert into questions(exam_id,subject,number,body,choices,answer) values($1,'언어이해',2,'위치 복원 검증 문항입니다.','[\"첫 번째\",\"두 번째\"]',2) returning id", [exam.id]);
    const cookie = async (id: number) => 'skct_session=' + await new SignJWT({ uid: id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    const session = await cookie(user.id);
    const send = (body: object, token = session, origin = appUrl) => fetch(`${appUrl}/api/exam/${exam.id}/session`, { method: 'POST', headers: { cookie: token, origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const take = async (query = "?restart=1") => {
      const response = await fetch(`${appUrl}/exam/${exam.id}/take${query}`, { headers: { cookie: session }, redirect: "manual" });
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes("검증 문항입니다."));
      return html.replaceAll('\\"', '"');
    };
    assert.equal((await send({ action: 'startSection', attemptId: 1, subject: '언어이해' }, '')).status, 401);
    await take();
    let records = (await pool.query('select * from attempts where user_id=$1 and exam_id=$2', [user.id, exam.id])).rows;
    assert.equal(records.length, 1);
    const attemptId = records[0].id;
    const body = { attemptId, subject: '언어이해' };
    assert.equal((await send({ ...body, action: 'startSection' })).status, 200);
    const state = (await pool.query('select section_state from attempts where id=$1', [attemptId])).rows[0].section_state;
    assert.equal((await send({ action: 'saveAnswer', attemptId, questionId: question.id, choice: 2 })).status, 200);
    assert.deepEqual(await (await send({ action: 'saveAnswer', attemptId, questionId: question.id, choice: 99 })).json(), { ok: false });
    assert.deepEqual(await (await send({ action: 'saveAnswer', attemptId, questionId: question.id, choice: 1 }, await cookie(other.id))).json(), { ok: false });
    assert.equal((await send({ action: 'abandon', attemptId }, session, 'https://invalid.example')).status, 403);
    assert.equal((await send({ action: 'abandon', attemptId }, session, 'invalid')).status, 403);
    assert.equal((await fetch(`${appUrl}/api/exam/${exam.id}/abandon`, { method: 'POST', headers: { cookie: session } })).status, 410);
    if (nextAppUrl) {
      appUrl = nextAppUrl;
      assert.equal((await fetch(`${appUrl}/dev-preview`)).status, 404);
    }
    assert.deepEqual(await (await send({ action: 'saveAnswer', attemptId, questionId: question.id, choice: 2 })).json(), { ok: true });
    const reconnect = await fetch(`${appUrl}/exam/${exam.id}/take`, { headers: { cookie: session } });
    assert.match(await reconnect.text(), /응시 중인 데이터가 있습니다. 이어서 하시겠습니까\?/);
    assert.equal((await pool.query('select choice from responses where attempt_id=$1', [attemptId])).rows[0].choice, 2);
    assert.deepEqual(await (await send({ action: 'startQuestion', attemptId, questionId: secondQuestion.id })).json(), { ok: true });
    assert.ok((await take(`?resume=${attemptId}`)).includes('"initialQuestionIndex":1'));
    await pool.query('update exams set published=false where id=$1', [exam.id]);
    const preserved = async () => ({
      attempts: (await pool.query('select * from attempts where exam_id=$1 order by id', [exam.id])).rows,
      responses: (await pool.query('select * from responses where attempt_id=$1 order by id', [attemptId])).rows,
      results: (await pool.query('select * from attempt_results where attempt_id=$1', [attemptId])).rows,
    });
    const before = await preserved();
    const assertBlockedPage = async (path: string, token = session) => {
      const response = await fetch(`${appUrl}${path}`, { headers: { cookie: token }, redirect: 'manual' });
      const html = await response.text();
      assert.ok(response.status === 404 || html.includes('NEXT_HTTP_ERROR_FALLBACK;404'));
      assert.ok(!html.includes('검증 문항입니다.'));
    };
    for (const query of ['', '?restart=1', `?resume=${attemptId}`]) {
      await assertBlockedPage(`/exam/${exam.id}/take${query}`);
    }
    await assertBlockedPage(`/exam/${exam.id}/take`, await cookie(other.id));
    await assertBlockedPage(`/exam/${exam.id}/result`);
    for (const action of ['startSection', 'finishSection', 'startQuestion', 'saveAnswer', 'abandon']) {
      const denied = await send({ ...body, action, questionId: question.id, choice: 1 });
      assert.deepEqual(await denied.json(), { ok: false });
    }
    assert.deepEqual(await preserved(), before);
    const dashboard = await fetch(appUrl, { headers: { cookie: session } });
    assert.ok(!(await dashboard.text()).includes(`/exam/${exam.id}/`));
    await pool.query('update exams set published=true where id=$1', [exam.id]);
    await take(`?resume=${attemptId}`);
    records = (await pool.query('select * from attempts where user_id=$1 and exam_id=$2', [user.id, exam.id])).rows;
    assert.equal(records.length, 1);
    assert.equal(records[0].id, attemptId);
    assert.deepEqual(records[0].section_state, state);
    assert.equal((await pool.query('select choice from responses where attempt_id=$1', [attemptId])).rows[0].choice, 2);
    assert.equal((await (await send({ ...body, action: 'finishSection' })).json()).finished, true);
    await pool.query('update exams set published=false where id=$1', [exam.id]);
    const completed = await preserved();
    await assertBlockedPage(`/exam/${exam.id}/result`);
    const analysis = await fetch(`${appUrl}/api/ai/result-analysis`, {
      method: 'POST', headers: { cookie: session, 'content-type': 'application/json' },
      body: JSON.stringify({ attemptId, subjects: [] }),
    });
    assert.equal(analysis.status, 404);
    assert.deepEqual(await preserved(), completed);
    await pool.query('update exams set published=true where id=$1', [exam.id]);
    assert.equal((await pool.query('select total_score from attempt_results where attempt_id=$1', [attemptId])).rows[0].total_score, 1);
    assert.equal((await (await send({ ...body, action: 'finishSection' })).json()).finished, true);
    await take();
    let fresh = (await pool.query('select id from attempts where user_id=$1 and exam_id=$2 and finished_at is null', [user.id, exam.id])).rows[0].id;
    assert.notEqual(fresh, attemptId);
    assert.deepEqual(await (await send({ action: 'saveAnswer', attemptId, questionId: question.id, choice: 1 })).json(), { ok: false });
    assert.equal((await send({ action: 'startSection', attemptId: fresh, subject: '언어이해' })).status, 200);
    assert.deepEqual(await (await send({ action: 'saveAnswer', attemptId: fresh, questionId: question.id, choice: 2 })).json(), { ok: true });
    const previousFresh = fresh;
    await take();
    fresh = (await pool.query('select id from attempts where user_id=$1 and exam_id=$2 and finished_at is null', [user.id, exam.id])).rows[0].id;
    assert.notEqual(fresh, previousFresh);
    assert.equal((await pool.query('select id from responses where attempt_id=$1', [previousFresh])).rows.length, 0);
    assert.deepEqual((await pool.query('select section_state from attempts where id=$1', [fresh])).rows[0].section_state, {});
    assert.deepEqual(await (await send({ action: 'abandon', attemptId: fresh })).json(), { ok: true });
    assert.equal((await pool.query('select id from attempts where id=$1', [fresh])).rows.length, 0);
    console.log('재접속 확인, 이어서 응시, 재응시 초기화, 답안 보존, 권한과 중단 검증 통과');
  } finally {
    await pool.query('delete from exams where id=$1', [exam.id]);
    await pool.query('delete from users where id=any($1)', [[user.id, other.id]]);
    await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
