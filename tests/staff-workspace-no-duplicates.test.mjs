import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const teacher=read("app/teacher/dashboard/page.tsx");
const admin=read("app/admin/dashboard/page.tsx");
const clinic=read("app/clinic-admin/dashboard/page.tsx");
const css=read("app/globals.css");

test("One Staff Workspace contains role-scoped tools, summary metrics, and teacher section tabs",()=>{
 assert.match(menu,/summary\?:Summary\[\]/);
 assert.match(menu,/sections\?:Section\[\]/);
 assert.match(menu,/aria-label="Dashboard summary"/);
 assert.match(menu,/aria-label="Teacher dashboard sections"/);
 assert.match(menu,/aria-label="Role-based staff tools"/);
 assert.match(menu,/const tools = \[\.\.\.COMMON_TOOLS, \.\.\.roleTools\(role\)\]/);
 assert.doesNotMatch(menu,/groups\.map/);
});

test("Teacher has one tab navigation and one set of summary metrics inside Staff Workspace",()=>{
 assert.match(teacher,/<StaffToolsMenu role="teacher" name=\{teacherName\}/);
 assert.match(teacher,/activeSection=\{activeTab\}/);
 assert.match(teacher,/onSectionChange=\{id=>setActiveTab\(id as Tab\)\}/);
 for(const label of ["Overview","My Students","Assessments","Learning Activities"])assert.match(teacher,new RegExp('label:"'+label+'"'));
 assert.doesNotMatch(teacher,/<nav aria-label="Teacher dashboard sections"/);
 assert.doesNotMatch(teacher,/<Metric\s+label=/);
 assert.match(teacher,/assessments\.filter\(a=>a\.status==="submitted"\)/);
 assert.match(teacher,/setActiveTab\("students"\)/);
 assert.match(teacher,/setActiveTab\("activities"\)/);
});

test("Super Admin and Owner show all dashboard counters within Staff Workspace only",()=>{
 assert.match(admin,/<StaffToolsMenu role=\{creatorMode\?"owner":"admin"\} name=\{name\}/);
 for(const label of ["Awaiting Teacher Assignment","Active Teachers","Teacher–Student Links"])assert.match(admin,new RegExp('label:"'+label+'"'));
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
