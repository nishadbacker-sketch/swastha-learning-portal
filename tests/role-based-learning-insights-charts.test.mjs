import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const charts=read("app/components/learning-insights-charts.tsx");
const parent=read("app/parent/dashboard/page.tsx");
const teacher=read("app/teacher/dashboard/page.tsx");
const login=read("app/login/page.tsx");

test("Shared Parent/Learner dashboard contains the new data visualisations without changing Parent notifications",()=>{
 assert.match(login,/roleData\.role === "student"/);
 assert.match(login,/router\.push\("\/parent\/dashboard"\)/);
 assert.match(parent,/import LearningInsightsCharts from/);
 assert.match(parent,/<LearningInsightsCharts audience="family" students=\{visibleStudents\} assessments=\{aa\} activities=\{act\} reviewedResults=\{rr\}\/>/);
 assert.match(parent,/rr=results\.filter\(x=>aa\.some\(a=>a\.id===x\.assignment_id&&a\.status==="reviewed"\)\)/);
 assert.match(parent,/import ParentNotifications from/);
 assert.match(parent,/import ParentProgressSummary from/);
 assert.match(parent,/import ParentSessionUpdates from/);
});

test("Teacher dashboard hides duplicate analytics, preserving scoped student detail insights",()=>{
 assert.doesNotMatch(teacher,/import LearningInsightsCharts from|<LearningInsightsCharts|<AssessmentAnalytics|analyticsStudentId/);
 assert.match(teacher,/\.from\("teacher_assignments"\)/);
 const details=read("app/staff/students/[id]/page.tsx");
 assert.match(details,/<LearningInsightsCharts audience="teacher"/);
 assert.match(details,/\.is\("removed_at",null\)/);
 assert.match(read("app/teacher/assessment-analytics.tsx"),/Holistic Sub-Domain Competency Radar/);
});

test("Shared charts do not fetch or write records, and expose approved scores only to family audiences",()=>{
 assert.doesNotMatch(charts,/supabase|\.from\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
 assert.match(charts,/audience==="family"&&<section/);
 assert.match(charts,/a\.status==="reviewed"/);
 assert.match(charts,/reviewedResults\.filter\(r=>reviewed\.has\(r\.assignment_id\)/);
 assert.match(charts,/Number\.isFinite/);
 assert.match(charts,/r\.overall_score>=0&&r\.overall_score<=3/);
 assert.match(charts,/No Teacher-approved assessment scores available yet/);
});

test("Charts show a true no-data state, preserve student ID and use accessible values",()=>{
 assert.match(charts,/No learning activities have been assigned yet/);
 assert.match(charts,/No assessments have been assigned yet/);
 assert.match(charts,/Absence of records is not evidence of low ability/);
 assert.match(charts,/student_code\|\|"ID pending"/);
 assert.match(charts,/role="progressbar"/);
 assert.match(charts,/aria-label=/);
 assert.match(charts,/No permitted student records available/);
});
