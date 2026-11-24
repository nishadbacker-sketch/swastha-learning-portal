import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/teacher/student-progress/page.tsx");
test("teacher-specific assigned-student progress is read-only and scoped",()=>{
 assert.match(page,/role\.role!=="teacher"/);
 assert.match(page,/teacher\.status!=="active"/);
 assert.match(page,/from\("teacher_assignments"\)/);
 assert.match(page,/\.eq\("teacher_id",teacher\.id\)/);
 assert.match(page,/from\("assessment_assignments"\)/);
 assert.match(page,/\.eq\("status","reviewed"\)/);
 assert.match(page,/from\("student_development_goals"\)/);
 assert.doesNotMatch(page,/\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
});
test("student ID and teacher goal review filters are present",()=>{
 assert.match(page,/student\.student_code/);
 assert.match(page,/Needs revision/);
 assert.match(page,/Past review date/);
 assert.match(page,/No goals have been created/);
 assert.match(read("app/teacher/dashboard/page.tsx"),/\/teacher\/student-progress/);
});
test("existing Parent development summary and IDP editor are preserved",()=>{
 assert.match(read("app/components/parent-progress-summary.tsx"),/Child Development Progress Summary/);
 assert.match(read("app/teacher/idp/page.tsx"),/<DevelopmentPlan assignmentId=\{selected\.id\} canEdit\/>/);
});
