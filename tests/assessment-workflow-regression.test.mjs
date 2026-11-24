import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const parentDashboard=source("app/parent/dashboard/page.tsx");
const parentAssessment=source("app/parent/assessment/[id]/page.tsx");
const teacherDashboard=source("app/teacher/dashboard/page.tsx");
const teacherReview=source("app/teacher/assessment-review/[id]/page.tsx");
const approvedReport=source("app/assessment-report/[id]/page.tsx");
const questionVersions=source("lib/assessment-question-versions.ts");

// Static/source regressions only. These are NOT live authenticated RLS or E2E tests.
test("assessment assignment is tied to a student and initially assigned",()=>{
 assert.match(teacherDashboard,/from\("assessment_assignments"\)/);
 assert.match(teacherDashboard,/status:\s*"assigned"/);
 assert.match(teacherDashboard,/assigned_by:\s*userId/);
});

test("parent assessment checks role and loads the historical question bank",()=>{
 assert.match(parentAssessment,/role\?\.role !== "parent"/);
 assert.match(parentAssessment,/checklistForAssignment\(assigned\.assessment_level as AssessmentLevel,assigned\.assigned_at\)/);
 assert.match(parentAssessment,/from\("assessment_responses"\)/);
 assert.match(parentAssessment,/\.in\("status", \["assigned", "in_progress"\]\)/);
});

test("teacher review only opens submitted or reviewed assessments and uses approval RPC",()=>{
 assert.match(teacherReview,/\["submitted","reviewed"\]\.includes\(a\.status\)/);
 assert.match(teacherReview,/rpc\("save_assessment_review"/);
 assert.match(teacherReview,/rpc\("approve_assessment"/);
 assert.match(teacherReview,/assignment\.status!=="submitted"/);
});

test("parent and report pages expose details only after teacher approval",()=>{
 assert.match(parentDashboard,/assigned\.filter\(x=>x\.status==="reviewed"\)/);
 assert.match(approvedReport,/a\.status!=="reviewed"/);
 assert.match(approvedReport,/from\("assessment_results"\)/);
 assert.match(approvedReport,/checklistForAssignment\(a\.assessment_level as AssessmentLevel,a\.assigned_at\)/);
});

test("question revisions use assignment-time cutoff and stable question keys",()=>{
 assert.match(questionVersions,/\.lte\("effective_at",assignedAt\)/);
 assert.match(questionVersions,/\.order\("effective_at",\{ascending:true\}\)/);
 assert.match(questionVersions,/\.order\("id",\{ascending:true\}\)/);
 assert.match(questionVersions,/domain\.id\+"_"\+\(index\+1\)/);
});

test("both teacher and parent pages display the unique student identifier",()=>{
 assert.match(teacherReview,/student\.student_code/);
 assert.match(parentAssessment,/student\.student_code/);
 assert.match(approvedReport,/student\.student_code/);
});
