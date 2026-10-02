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
    const cookie = async (id: number) => 'skct_session=' + await new SignJWT({ uid: id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    const session = await cookie(user.id);
    const send = (body: object, token = session, origin = appUrl) => fetch(`${appUrl}/api/exam/${exam.id}/session`, { method: 'POST', headers: { cookie: token, origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const take = async () => {
      const response = await fetch(`${appUrl}/exam/${exam.id}/take`, { headers: { cookie: session }, redirect: "manual" });
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes("검증 문항입니다."));
    };
    assert.equal((await send({ action: 'startSection', attemptId: 1, subject: '언어이해' }, '')).status, 401);
    await Promise.all([take(), take()]);
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
    await take();
    records = (await pool.query('select * from attempts where user_id=$1 and exam_id=$2', [user.id, exam.id])).rows;
    assert.equal(records.length, 1);
    assert.equal(records[0].id, attemptId);
    assert.deepEqual(records[0].section_state, state);
    assert.equal((await pool.query('select choice from responses where attempt_id=$1', [attemptId])).rows[0].choice, 2);
    assert.equal((await (await send({ ...body, action: 'finishSection' })).json()).finished, true);
    assert.equal((await pool.query('select total_score from attempt_results where attempt_id=$1', [attemptId])).rows[0].total_score, 1);
    assert.equal((await (await send({ ...body, action: 'finishSection' })).json()).finished, true);
    await take();
    const fresh = (await pool.query('select id from attempts where user_id=$1 and exam_id=$2 and finished_at is null', [user.id, exam.id])).rows[0].id;
    assert.notEqual(fresh, attemptId);
    assert.deepEqual(await (await send({ action: 'saveAnswer', attemptId, questionId: question.id, choice: 1 })).json(), { ok: false });
    assert.deepEqual(await (await send({ action: 'abandon', attemptId: fresh })).json(), { ok: true });
    assert.equal((await pool.query('select id from attempts where id=$1', [fresh])).rows.length, 0);
    console.log('응시 복원, 제한시간 유지, 답안 보존, 권한 검증, 제출과 명시적 중단 검증 통과');
  } finally {
    await pool.query('delete from exams where id=$1', [exam.id]);
    await pool.query('delete from users where id=any($1)', [[user.id, other.id]]);
    await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
