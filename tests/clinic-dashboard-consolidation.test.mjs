import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const dashboard=read("app/components/staff-live-dashboard.tsx");
const panel=read("app/components/clinic-operations-panel.tsx");
const redirect=read("app/staff/operations/page.tsx");
const routes=read("app/components/staff-route-frame.tsx");
test("Newly approved Clinic Dashboard charts remain intact",()=>{
 for(const name of ["Total Students","Assessments","Learning Activities","Progress (Avg.)","Appointments","Certificates Issued","Student Progress Trend","Assessment Workflow","Domain Performance (Avg.)","Assessment Outcomes","Goal Achievement (IDP)","Session Attendance","Recent Student Activity","Today’s Schedule","Action Items"]){
  assert.ok(dashboard.includes(name),"Missing approved panel: "+name);
 }
 assert.match(menu,/<StaffLiveDashboard role=\{role\}/);
});
test("Operations are integrated in all staff dashboards without duplicate menu entry",()=>{
 assert.match(menu,/import ClinicOperationsPanel from/);
 assert.match(menu,/<ClinicOperationsPanel\/>/);
 assert.match(menu,/Clinic Operations — Session Calendar, Pending Actions, Workload & CSV Export/);
 assert.doesNotMatch(menu,/label: "Clinic Operations & Analytics"/);
 assert.match(routes,/COMMON_TOOLS/);
});
test("Calendar, approval queues, workload, filters and original CSV export are preserved",()=>{
 for(const name of ["Session Calendar","Weekly","Monthly","Reference date","Student","Teacher","Export Session CSV","Sessions Awaiting Parent Summary Approval","Overdue IDP Goal Reviews","Overdue Appointment Follow-ups","Teacher Session Workload"]){
  assert.ok(panel.includes(name),"Missing moved feature "+name);
 }
 assert.match(panel,/from\("students"\).*select/);
 assert.match(panel,/\.is\("removed_at",null\)/);
 assert.match(panel,/from\("clinic_sessions"\)/);
 assert.match(panel,/from\("student_development_goals"\)/);
 assert.match(panel,/from\("clinic_session_parent_updates"\)/);
 assert.match(panel,/from\("appointment_enquiries"\)/);
 assert.match(panel,/auth\.getUser\(\)/);
 assert.match(panel,/Export Session CSV/);
 assert.match(panel,/csvCell/);
 assert.match(panel,/teacher_assignments/);
 assert.doesNotMatch(panel,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
test("Old operations links redirect after role verification",()=>{
 for(const segment of ["owner/dashboard","admin/dashboard","clinic-admin/dashboard","teacher/dashboard"]){
  assert.ok(redirect.includes(segment),"Missing redirect "+segment);
 }
 assert.match(redirect,/user_roles/);
 assert.match(redirect,/router\.replace\(target/);
 assert.match(redirect,/clinic:"operations"/);
});
test("Certificates and custom-made assessments remain accessible",()=>{
 assert.match(menu,/Certificates & Verification/);
 assert.match(menu,/Assessment Builder/);
 assert.match(menu,/In-Person Assessments/);
 assert.match(read("app/staff/in-person-assessments/page.tsx"),/Published custom assessment/);
});
