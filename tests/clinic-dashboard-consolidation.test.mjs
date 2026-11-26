import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const dashboard=read("app/components/staff-live-dashboard.tsx");
const teacher=read("app/teacher/dashboard/page.tsx");
const operations=read("app/staff/operations/page.tsx");
const routes=read("app/components/staff-route-frame.tsx");

test("All newly approved Clinic Dashboard KPI cards and charts stay intact",()=>{
 for(const name of ["Total Students","Assessments","Learning Activities","Progress (Avg.)",
 "Appointments","Certificates Issued","Student Progress Trend","Assessment Workflow",
 "Domain Performance (Avg.)","Assessment Outcomes","Goal Achievement (IDP)",
 "Session Attendance","Recent Student Activity","Today’s Schedule","Action Items"]){
  assert.ok(dashboard.includes(name),"Missing approved panel: "+name);
 }
 assert.match(menu,/<StaffLiveDashboard role=\{role\}/);
});

test("Old metric accordion, operations accordion and detailed teacher analytics disappear from dashboard",()=>{
 assert.doesNotMatch(menu,/Additional staff metrics|<ClinicOperationsPanel/);
 assert.doesNotMatch(teacher,/aria-label="Analytics Dashboard"|<AssessmentAnalytics|<LearningInsightsCharts/);
 assert.doesNotMatch(teacher,/Student Development Journey & Progress Overview|teacher-analytics-student/);
 assert.match(menu,/Session Calendar & Reports/);
 assert.match(menu,/\/staff\/operations/);
 assert.match(routes,/COMMON_TOOLS/);
});

test("Calendar, follow-up, reports and secure CSV export remain available off-dashboard",()=>{
 for(const name of ["Session Calendar","Weekly","Monthly","Reference date","Student","Teacher",
 "Export Session CSV","Sessions Awaiting Parent Summary Approval","Overdue IDP Goal Reviews",
 "Overdue Appointment Follow-ups","Teacher Session Workload"]){
  assert.ok(operations.includes(name),"Missing protected operations feature "+name);
 }
 for(const name of ['auth.getUser()','from("teacher_assignments")','from("clinic_sessions")',
 'from("student_development_goals")','from("appointment_enquiries")',
 'from("clinic_session_parent_updates")','csvCell']){
  assert.ok(operations.includes(name),"Missing source or protection: "+name);
 }
 assert.doesNotMatch(operations,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});

test("Student assessments, reports, custom builder and certificates remain accessible",()=>{
 assert.match(menu,/Certificates & Verification/);
 assert.match(menu,/Assessment Builder/);
 assert.match(menu,/In-Person Assessments/);
 assert.match(read("app/staff/in-person-assessments/page.tsx"),/Published custom assessment/);
 assert.match(read("app/staff/students\/\[id\]\/page.tsx".replaceAll("\\","")) , /LearningInsightsCharts/);
 assert.match(teacher,/activeTab === "assessments"/);
 assert.match(teacher,/activeTab === "activities"/);
 assert.match(teacher,/activeTab === "students"/);
});
