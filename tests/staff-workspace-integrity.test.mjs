import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=source("app/components/staff-tools-menu.tsx");
const list=source("app/staff/students/page.tsx");
const detail=source("app/staff/students/[id]/page.tsx");
const actions=source("app/staff/actions/page.tsx");
const admin=source("app/admin/students/page.tsx");
const coordination=source("app/teacher/coordination/page.tsx");
const styles=source("app/globals.css");

test("Common staff menu exposes student record and action workspace to every staff role",()=>{
 assert.match(menu,/const COMMON_TOOLS/);
 assert.match(menu,/\/staff\/students/);
 assert.match(menu,/\/staff\/actions/);
 assert.match(menu,/function roleTools\(role: StaffRole\)/);
 assert.match(menu,/role === "teacher"/);
});

test("Student directory checks authenticated role, active teacher and assignment, never displays removed students",()=>{
 assert.match(list,/auth\.getUser\(\)/);
 assert.match(list,/from\("user_roles"\)/);
 assert.match(list,/from\("teachers"\)/);
 assert.match(list,/\.eq\("status","active"\)/);
 assert.match(list,/from\("teacher_assignments"\)/);
 assert.match(list,/\.eq\("teacher_id",teacher\.id\)/);
 assert.match(list,/\.is\("removed_at",null\)/);
 assert.doesNotMatch(list,/\.delete\(|\.update\(|\.insert\(|\.upsert\(/);
});

test("Student detail authorizes assigned teachers and blocks direct removed-student URL",()=>{
 assert.match(detail,/from\("user_roles"\)/);
 assert.match(detail,/\.eq\("teacher_id",teacher\.id\)\.eq\("student_id",id\)/);
 assert.match(detail,/\.is\("removed_at",null\)/);
 assert.match(detail,/if\(!profile\.data\)throw Error/);
 assert.match(detail,/const reviewed=as\.filter\(x=>x\.status==="reviewed"\)/);
 assert.match(detail,/\.in\("assignment_id",reviewed\)/);
 assert.doesNotMatch(detail,/\.delete\(|\.update\(|\.insert\(|\.upsert\(/);
});

test("Unified student record provides six working tabs and charts from scoped records",()=>{
 for(const text of ["Overview","Assessments","Development","Sessions","Reports","History"])assert.ok(detail.includes('"'+text+'"'));
 assert.match(detail,/<LearningInsightsCharts audience="teacher" students=\{\[student\]\}/);
 assert.match(detail,/assessment-report/);
 assert.match(detail,/student_development_goals/);
 assert.match(detail,/student_activity_assignments/);
 assert.match(detail,/clinic_sessions/);
 assert.match(detail,/StudentAppointmentHistory/);
 assert.match(detail,/aria-valuenow=/);
});

test("Action dashboard combines RLS-protected scoped work and consistent selection",()=>{
 assert.match(actions,/from\("user_roles"\)/);
 assert.match(actions,/from\("teacher_assignments"\)/);
 assert.match(actions,/\.is\("removed_at",null\)/);
 assert.match(actions,/const permitted=useMemo/);
 assert.match(actions,/permitted==="all"\|\|x\.student_id===permitted/);
 assert.match(actions,/Submitted assessments awaiting review/);
 assert.match(actions,/Overdue coordination tasks/);
 assert.doesNotMatch(actions,/\.delete\(|\.update\(|\.insert\(|\.upsert\(/);
});

test("Existing Student Management and coordination lead to the shared record",()=>{
 assert.match(admin,/Open Complete Student Record/);
 assert.match(coordination,/Open Complete Student Record/);
 assert.match(styles,/swastha-workspace-tabs/);
 assert.match(styles,/swastha-workspace-metrics/);
});

test("Removed students are filtered out of older teacher and administrative worklists",()=>{
 const teacher=source("app/teacher/dashboard/page.tsx");
 const coordination=source("app/teacher/coordination/page.tsx");
 const operations=source("app/staff/operations/page.tsx");
 const certificates=source("app/staff/assessment-certificates/page.tsx");
 const oversight=source("app/admin/assessment-oversight/page.tsx");
 assert.match(teacher,/\.is\("removed_at", null\)/);
 assert.match(teacher,/activeStudentIds\.has\(item\.student_id\)/);
 assert.match(coordination,/\.is\("removed_at",null\)/);
 assert.match(operations,/approvedAssessments=aa\.filter\(item=>allowedSet\.has\(item\.student_id\)\)/);
 assert.match(certificates,/\.is\("removed_at",null\)/);
 assert.match(oversight,/\.is\("removed_at",null\)/);
});

test("Operations charts use one accessible visualization component and respect student filters",()=>{
 const ops=source("app/staff/operations/page.tsx");
 const bars=source("app/components/staff-metric-bars.tsx");
 assert.match(ops,/import StaffMetricBars from/);
 assert.ok((ops.match(/<StaffMetricBars/g)||[]).length>=3);
 assert.match(ops,/studentFilter==="all"/);
 assert.match(ops,/const allowedStudentIds=ss\.map/);
 assert.match(bars,/role="progressbar"/);
 assert.match(bars,/aria-valuenow=\{item\.value\}/);
 assert.doesNotMatch(bars,/\.from\(|supabase/);
});
