import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const teacher=read("app/teacher/dashboard/page.tsx");
const admin=read("app/admin/dashboard/page.tsx");
const clinic=read("app/clinic-admin/dashboard/page.tsx");
const owner=read("app/owner/dashboard/page.tsx");
const staffTools=read("app/components/staff-tools-menu.tsx");
const chart=read("app/components/learning-insights-charts.tsx");
const operations=read("app/staff/operations/page.tsx");

const actions=read("app/staff/actions/page.tsx");
const parent=read("app/parent/dashboard/page.tsx");

test("Shared Staff Workspace is reused by Teacher, Clinic Admin, Super Admin and Owner",()=>{
 assert.match(teacher,/<StaffToolsMenu role="teacher"/);
 assert.match(clinic,/<StaffToolsMenu role="clinic_admin"/);
 assert.match(admin,/<StaffToolsMenu role=\{creatorMode\?"owner":"admin"\}/);
 assert.match(owner,/AdminDashboard/);
 assert.match(staffTools,/const COMMON_TOOLS/);
 for(const href of ["/staff/students","/staff/actions","/staff/in-person-assessments","/staff/assessment-certificates"]){
  assert.ok(staffTools.includes('href: "'+href+'"'),"Shared tool link missing: "+href);
 }
 assert.doesNotMatch(staffTools,/ClinicOperationsPanel/);
 assert.match(staffTools,/Session Calendar & Reports/);

 assert.doesNotMatch(parent,/StaffToolsMenu/);
});

test("One student selection per staff analytics screen; separate assessment choice remains",()=>{
 assert.equal((teacher.match(/id="teacher-analytics-student"/g)||[]).length,0);
 assert.doesNotMatch(teacher,/<LearningInsightsCharts/);
 assert.doesNotMatch(teacher,/<AssessmentAnalytics/);
 assert.match(chart,/!hideStudentSelector&&students\.length>1/);
 assert.equal((operations.match(/value=\{studentFilter\} onChange=/g)||[]).length,1);
 assert.equal((actions.match(/aria-label="Filter staff actions by student"/g)||[]).length,1);
 assert.match(read("app/teacher/assessment-analytics.tsx"),/Select assessment/);
});

test("Shared student worklists exclude soft-removed students and respect existing teacher assignment checks",()=>{
 const directory=read("app/staff/students/page.tsx");
 const student=read("app/staff/students/[id]/page.tsx");
 for(const text of [directory,student,actions,operations])assert.match(text,/\.is\("removed_at",\s*null\)/);
 for(const text of [directory,student,actions])assert.match(text,/from\("teacher_assignments"\)/);
 assert.match(student,/\.eq\("teacher_id",teacher\.id\)\.eq\("student_id",id\)/);
});

test("Existing parent workflow and staff data mutations are not changed by navigation consistency checks",()=>{
 assert.match(parent,/LearningInsightsCharts/);
 assert.match(teacher,/Grade-Based Assessments/);
 assert.match(teacher,/Learning Activities/);
 assert.match(clinic,/<TeacherManagement\/>/);
 assert.match(admin,/<AppointmentEscalations\/>/);
});
