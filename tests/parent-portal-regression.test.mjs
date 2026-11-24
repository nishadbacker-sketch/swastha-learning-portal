import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const file=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const parent=file("app/parent/dashboard/page.tsx");
const notifications=file("app/components/parent-notifications.tsx");
const summary=file("app/components/parent-progress-summary.tsx");
const assessment=file("app/parent/assessment/[id]/page.tsx");
const report=file("app/assessment-report/[id]/page.tsx");
const registration=file("app/login/page.tsx");

test("parent dashboard verifies signed-in role and loads linked children only",()=>{
 assert.match(parent,/auth\.getUser\(\)/);
 assert.match(parent,/from\("user_roles"\)/);
 assert.match(parent,/from\("parent_student_links"\)/);
 assert.match(parent,/eq\("parent_user_id",user\.id\)/);
 assert.match(parent,/students.*\.in\("id",ids\)/);
});

test("parent child management uses a controlled server RPC and shows no child deletion",()=>{
 assert.match(parent,/rpc\("add_child_for_parent"/);
 assert.doesNotMatch(parent,/from\("students"\)\.delete\(/);
 assert.match(parent,/Child deletion is restricted to administrators/);
});

test("parent notifications use scoped acknowledgement keys and target-aware announcements",()=>{
 assert.match(notifications,/parent_notification_acknowledgements/);
 assert.match(notifications,/parent_announcements/);
 assert.match(notifications,/parent_user_id:userId/);
 assert.match(notifications,/announcement:"\+a\.id/);
 assert.match(notifications,/eq\("parent_user_id",auth\.user\.id\)/);
});

test("progress summary selects only approved assessment goals and offers bilingual printing",()=>{
 assert.match(summary,/assessments\.filter\(a=>a\.status==="reviewed"\)/);
 assert.match(summary,/from\("student_development_goals"\)/);
 assert.match(summary,/\.in\("assignment_id",approvedIds\)/);
 assert.match(summary,/window\.print\(\)/);
 assert.match(summary,/മലയാളം/);
 assert.match(summary,/@media print/);
});

test("assessment report gates publication on teacher review and loads historical question versions",()=>{
 assert.match(report,/a\.status!=="reviewed"/);
 assert.match(report,/checklistForAssignment\(a\.assessment_level as AssessmentLevel,a\.assigned_at\)/);
 assert.match(assessment,/checklistForAssignment\(assigned\.assessment_level as AssessmentLevel,assigned\.assigned_at\)/);
});

test("registration uses Supabase and does not expose service-role credentials",()=>{
 assert.match(registration,/supabase/);
 for(const content of [registration,parent,summary,notifications])assert.doesNotMatch(content,/SUPABASE_SERVICE_ROLE_KEY|service_role/);
});
