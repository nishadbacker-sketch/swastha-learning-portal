import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const teacher=read("app/teacher/dashboard/page.tsx");
const admin=read("app/admin/dashboard/page.tsx");
const clinic=read("app/clinic-admin/dashboard/page.tsx");
const css=read("app/globals.css");

test("One Staff Workspace contains role-scoped tools and navigation without legacy metric blocks",()=>{
 assert.match(menu,/summary\?:Summary\[\]/);
 assert.match(menu,/sections\?:Section\[\]/);
 assert.doesNotMatch(menu,/aria-label="Dashboard summary"/);
 assert.doesNotMatch(menu,/Additional staff metrics|<ClinicOperationsPanel/);
 assert.match(menu,/<StaffLiveDashboard role=\{role\}/);
 assert.match(menu,/aria-label="Teacher dashboard sections"/);
 assert.match(menu,/aria-label="Role-based staff tools"/);
 assert.match(menu,/const tools = \[\.\.\.COMMON_TOOLS, \.\.\.roleTools\(role\)\]/);
 assert.doesNotMatch(menu,/groups\.map/);
});

test("Teacher preserves working tabs but removes duplicate analytics and summary metrics",()=>{
 assert.match(teacher,/<StaffToolsMenu role="teacher" name=\{teacherName\}/);
 assert.match(teacher,/activeSection=\{activeTab\}/);
 assert.match(teacher,/onSectionChange=\{id=>setActiveTab\(id as Tab\)\}/);
 const sidebar=teacher.slice(teacher.indexOf('sections={['),teacher.indexOf('activeSection={activeTab}'));
 assert.match(sidebar,/id:"overview",label:"Overview"/);
 for(const label of ["My Students","Assessments","Learning Activities"])assert.doesNotMatch(sidebar,new RegExp('label:"'+label+'"'));
 // Only sidebar links are removed: existing tab views and their actions stay intact.
 for(const tab of ["students","assessments","activities"])assert.match(teacher,new RegExp('activeTab === "'+tab+'"'));
 assert.doesNotMatch(teacher,/<nav aria-label="Teacher dashboard sections"/);
 assert.doesNotMatch(teacher,/<Metric\s+label=/);
 assert.doesNotMatch(teacher,/<AssessmentAnalytics|<LearningInsightsCharts|Student Development Journey & Progress Overview/);



});

test("Super Admin and Owner show all dashboard counters within Staff Workspace only",()=>{
 assert.match(admin,/<StaffToolsMenu role=\{creatorMode\?"owner":"admin"\} name=\{name\}/);
 for(const label of ["Registered Students","Awaiting Teacher Assignment","Active Teachers","Teacher–Student Links"])assert.match(admin,new RegExp('label:"'+label+'"'));
 assert.doesNotMatch(admin,/<section style=\{box\}><h2>Student Management<\/h2>/);
 assert.match(admin,/<AppointmentEscalations\/>\s*<\/StaffToolsMenu>/);
});

test("Clinic Admin keeps teacher activation, escalation workflow and counters inside Staff Workspace",()=>{
 assert.match(clinic,/<StaffToolsMenu role="clinic_admin" name=\{name\}/);
 for(const label of ["New queries","Open follow-ups","Total enquiries"])assert.match(clinic,new RegExp('label:"'+label+'"'));
 assert.match(clinic,/<TeacherManagement\/>\s*<AppointmentEscalations\/>\s*<\/StaffToolsMenu>/);
 assert.match(css,/swastha-staff-workspace__summary/);
 assert.match(css,/swastha-staff-workspace__sections/);
});
