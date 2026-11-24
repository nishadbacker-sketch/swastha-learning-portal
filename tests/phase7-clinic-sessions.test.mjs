import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("sql/phase7_clinic_sessions.sql");
const historySql=read("sql/phase7_clinic_session_history.sql");
const manager=read("app/components/session-manager.tsx");
const parent=read("app/parent/dashboard/page.tsx");
const parentUpdates=read("app/components/parent-session-updates.tsx");
test("Phase 7 stores private sessions separately from approved Parent summaries with RLS",()=>{
 for(const table of ["clinic_sessions","clinic_session_goal_links","clinic_session_parent_updates"]){
  assert.match(sql,new RegExp("CREATE TABLE IF NOT EXISTS public\\."+table));
  assert.match(sql,new RegExp("ALTER TABLE public\\."+table+" ENABLE ROW LEVEL SECURITY"));
 }
 assert.match(sql,/CREATE POLICY "Session staff read scoped"/);
 assert.match(sql,/public\.has_role\('teacher'\)/);
 assert.match(sql,/public\.has_role\('clinic_admin'\)/);
 assert.match(sql,/public\.has_role\('admin'\)/);
 assert.match(sql,/ta\.student_id=public\.clinic_sessions\.student_id/);
 assert.match(sql,/ON DELETE RESTRICT/);
 assert.match(sql,/Only attended sessions may have approved parent updates/);
 assert.match(sql,/approved_by=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/Parent update must match the actual attended session/);
 assert.doesNotMatch(sql,/GRANT (ALL|SELECT) ON public\.clinic_sessions TO anon/);
});
test("Staff session history is private; Parent sees approved summaries only",()=>{
 assert.match(historySql,/CREATE TABLE IF NOT EXISTS public\.clinic_session_history/);
 assert.match(historySql,/ALTER TABLE public\.clinic_session_history ENABLE ROW LEVEL SECURITY/);
 assert.match(historySql,/CREATE TRIGGER clinic_session_log_after_update/);
 assert.match(historySql,/Cannot change attendance after a Parent summary is approved/);
 assert.match(historySql,/REVOKE ALL ON TABLE public\.clinic_session_history FROM PUBLIC,anon,authenticated/);
 assert.match(parentUpdates,/\.from\("clinic_session_parent_updates"\)/);
 assert.doesNotMatch(parentUpdates,/\.from\("clinic_sessions"\)/);
 assert.doesNotMatch(parentUpdates,/teacher_notes|activities_done/);
 assert.match(parent,/import ParentSessionUpdates from/);
 assert.match(parent,/tab==="Learning Activities"&&<ParentSessionUpdates/);
 assert.match(parent,/import ParentNotifications from/);
 assert.match(parent,/import ParentProgressSummary from/);
});
test("Teacher/Admin/Clinic Admin routes are role-gated; no Parent staff action",()=>{
 assert.match(manager,/role==="admin"\?\["admin","owner"\]\.includes\(rr\.role\)/);
 assert.match(manager,/role:"teacher"\|"admin"\|"clinic_admin"/);
 assert.match(manager,/\.from\("teacher_assignments"\)/);
 assert.match(manager,/\.from\("clinic_sessions"\)\.update/);
 assert.match(manager,/\.from\("clinic_session_parent_updates"\)\.insert/);
 assert.match(manager,/\.from\("clinic_session_goal_links"\)\.insert/);
 assert.match(manager,/\.from\("appointment_registration_links"\)/);
 assert.match(manager,/\.from\("clinic_session_history"\)/);
 for(const r of ["teacher","admin","clinic-admin"]){
  assert.match(read("app/"+r+"/sessions/page.tsx"),/SessionManager role=/);
 }
});
