import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const teacher=read("app/teacher/dashboard/page.tsx");
const insights=read("app/components/learning-insights-charts.tsx");
const assessment=read("app/teacher/assessment-analytics.tsx");

test("Legacy teacher analytics student selector is removed from main dashboard",()=>{
 assert.doesNotMatch(teacher,/teacher-analytics-student|setAnalyticsStudentId/);
 assert.doesNotMatch(teacher,/<LearningInsightsCharts|<AssessmentAnalytics/);
 assert.match(insights,/!hideStudentSelector&&students\.length>1/);
 assert.match(assessment,/Select assessment/);
 assert.doesNotMatch(assessment,/Select student and assessment/);
 assert.match(read("app/staff/students/[id]/page.tsx"), /<LearningInsightsCharts/);
});

test("Existing distinct teaching workflows and family student chart selector stay available",()=>{
 for(const label of ["Select student *","Students & Guardian Contacts","Learning Activities","Grade-Based Assessments"])assert.ok(teacher.includes(label));
 assert.match(insights,/hideStudentSelector=false/);
 assert.match(insights,/onStudentChange/);
 assert.match(read("app/parent/dashboard/page.tsx"),/LearningInsightsCharts/);
});
