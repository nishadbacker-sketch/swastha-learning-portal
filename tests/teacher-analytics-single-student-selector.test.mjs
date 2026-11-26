import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const teacher=read("app/teacher/dashboard/page.tsx");
const insights=read("app/components/learning-insights-charts.tsx");
const assessment=read("app/teacher/assessment-analytics.tsx");

test("Teacher analytics has one student selector controlling both chart components",()=>{
 assert.match(teacher,/id="teacher-analytics-student"/);
 assert.match(teacher,/aria-label="Select student for all analytics"/);
 assert.equal((teacher.match(/id="teacher-analytics-student"/g)||[]).length,1);
 assert.match(teacher,/onChange=\{event=>setAnalyticsStudentId\(event\.target\.value\)\}/);
 assert.match(teacher,/<LearningInsightsCharts audience="teacher"[^>]*hideStudentSelector\/>/);
 assert.match(teacher,/<AssessmentAnalytics assessments=\{assessments\} students=\{students\} studentFilterId=\{analyticsStudentId\}/);
 assert.match(insights,/!hideStudentSelector&&students\.length>1/);
 assert.match(assessment,/Select assessment/);
 assert.doesNotMatch(assessment,/Select student and assessment/);
});

test("Existing distinct teaching workflows and family student chart selector stay available",()=>{
 for(const label of ["Select student *","Students & Guardian Contacts","Learning Activities","Grade-Based Assessments"])assert.ok(teacher.includes(label));
 assert.match(insights,/hideStudentSelector=false/);
 assert.match(insights,/onStudentChange/);
 assert.match(read("app/parent/dashboard/page.tsx"),/LearningInsightsCharts/);
});
