import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("sql/phase8_clinic_session_conflict_detection.sql");
const page=read("app/staff/operations/page.tsx");
test("Clinic schedule prevents Teacher and Student overlap without touching existing data",()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.clinic_session_prevent_overlap/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/existing\.student_id=NEW\.student_id OR existing\.teacher_user_id=NEW\.teacher_user_id/);
 assert.match(sql,/existing\.status IN \('scheduled','rescheduled'\)/);
 assert.match(sql,/NEW\.scheduled_at < existing\.scheduled_at \+ existing\.duration_minutes/);
 assert.match(sql,/existing\.scheduled_at < NEW\.scheduled_at \+ NEW\.duration_minutes/);
 assert.match(sql,/BEFORE INSERT OR UPDATE OF scheduled_at,duration_minutes,student_id,teacher_user_id,status/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.clinic_session_prevent_overlap\(\) FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/TRUNCATE|DROP TABLE|UPDATE public\.clinic_sessions|DELETE FROM public\./);
});
test("Operations overview uses auth and RLS-scoped records and keeps Parent pages unchanged",()=>{
 assert.match(page,/getUser\(\)/);
 assert.match(page,/\["owner","admin","clinic_admin","teacher"\]\.includes/);
 assert.match(page,/\.from\("teacher_assignments"\)/);
 assert.match(page,/\.from\("clinic_sessions"\)/);
 assert.match(page,/\.from\("clinic_session_parent_updates"\)/);
 assert.match(page,/\.from\("assessment_assignments"\)/);
 assert.match(page,/\.eq\("status","reviewed"\)/);
 assert.match(page,/\.from\("student_development_goals"\)/);
 assert.match(page,/\.from\("appointment_enquiries"\)/);
 assert.match(page,/\.in\("student_id",chunk\)/);
 assert.match(page,/Export Session CSV/);
 assert.match(page,/Session Calendar/);
 assert.match(page,/Attendance Distribution/);
 assert.match(page,/Overdue IDP Goal Reviews/);
 assert.match(page,/Awaiting Parent Summary Approval/);
 assert.doesNotMatch(page,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
 for(const path of ["app/teacher/dashboard/page.tsx","app/admin/dashboard/page.tsx","app/clinic-admin/dashboard/page.tsx"]){
  assert.match(read(path),/\/staff\/operations/);
 }
});
test("CSV export guards formula injection and does not export private notes",()=>{
 assert.match(page,/\^\[=\+@\\-\\t\\r\]/);
 assert.match(page,/safe\.replace\(\/"\/g,'""'\)/);
 assert.match(page,/Parent summary approved/);
 assert.doesNotMatch(page,/teacher_notes|activities_done|parent_student_links/);
});
