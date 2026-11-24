import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const trigger=read("sql/staging_only_phase6_goal_history_parity.sql");
const policy=read("sql/staging_only_phase6_goal_permissions_parity.sql");
const report=read("app/teacher/progress-report/page.tsx");
const teacher=read("app/teacher/student-progress/page.tsx");
test("staging history parity mirrors production without deleting or backfilling data",()=>{
 assert.match(trigger,/CREATE OR REPLACE FUNCTION public\.record_student_goal_progress_change/);
 assert.match(trigger,/SECURITY DEFINER/);
 assert.match(trigger,/SET search_path TO ''/);
 assert.match(trigger,/INSERT INTO public\.student_goal_progress_history/);
 assert.match(trigger,/AFTER UPDATE OF status,current_percent,progress_notes,target_date,responsible_staff_user_id/);
 assert.match(trigger,/REVOKE ALL ON FUNCTION public\.record_student_goal_progress_change\(\) FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(trigger,/DELETE FROM public\.|TRUNCATE TABLE|UPDATE public\.student_development_goals/i);
});
test("staging IDP parity denies parent writes and unassigned teacher writes",()=>{
 assert.match(policy,/GRANT INSERT,UPDATE ON public\.student_development_goals TO authenticated/);
 assert.match(policy,/public\.has_role\('teacher'\)/);
 assert.match(policy,/ta\.student_id=aa\.student_id/);
 assert.match(policy,/t\.user_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(policy,/t\.status='active'/);
 assert.match(policy,/aa\.status='reviewed'/);
 assert.match(policy,/FOR UPDATE TO authenticated/);
 assert.match(policy,/WITH CHECK/);
 assert.doesNotMatch(policy,/GRANT ALL|TO anon|TRUNCATE|DELETE FROM|DROP TABLE/i);
});
test("report stays read only and teacher-only with reviewed assessment scoping",()=>{
 assert.match(report,/role\?\.role!=="teacher"/);
 assert.match(report,/teacher\.status!=="active"/);
 assert.match(report,/\.eq\("teacher_id",teacher\.id\)/);
 assert.match(report,/\.eq\("status","reviewed"\)/);
 assert.match(report,/\.from\("student_goal_progress_history"\)/);
 assert.match(report,/\.from\("learning_activities"\)/);
 assert.match(report,/window\.print\(\)/);
 assert.match(teacher,/\/teacher\/progress-report/);
 assert.doesNotMatch(report,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
