import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const report=read("app/teacher/progress-report/page.tsx");
const teacher=read("app/teacher/student-progress/page.tsx");
const idp=read("app/components/development-plan.tsx");
test("teacher-only report uses active teacher assignments and only approved assessments",()=>{
 assert.match(report,/role\?\.role!=="teacher"/);
 assert.match(report,/teacher\.status!=="active"/);
 assert.match(report,/\.from\("teacher_assignments"\)/);
 assert.match(report,/\.eq\("teacher_id",teacher\.id\)/);
 assert.match(report,/\.in\("student_id",chunk\)\.eq\("status","reviewed"\)/);
 assert.match(report,/\.from\("assessment_results"\)/);
 assert.match(report,/\.from\("student_development_goals"\)/);
 assert.match(report,/\.from\("student_goal_progress_history"\)/);
 assert.match(report,/\.from\("student_activity_assignments"\)/);
 assert.match(report,/\.from\("learning_activities"\)/);
 assert.match(report,/\.in\("id",chunk\)/);
});
test("existing IDP and parent UI remain unchanged; print report cannot modify records",()=>{
 assert.match(report,/window\.print\(\)/);
 assert.match(report,/Print \/ Save as PDF/);
 assert.match(report,/student\.student_code|selected\.student_code/);
 assert.match(teacher,/router\.push\("\/teacher\/progress-report"\)/);
 assert.match(idp,/Individual Development Plan \(IDP\)/);
 assert.doesNotMatch(report,/\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
});
