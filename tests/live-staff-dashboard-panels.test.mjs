import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const dashboard=read("app/components/staff-live-dashboard.tsx");
const css=read("app/globals.css");
test("All role dashboards display the same live KPI and chart component",()=>{
 assert.match(menu,/import StaffLiveDashboard from/);
 assert.match(menu,/<StaffLiveDashboard role=\{role\}\/>/);
 for(const role of ["teacher","admin","clinic-admin"]){
  assert.match(read("app/"+role+"/dashboard/page.tsx"),/StaffToolsMenu/);
 }
 assert.match(read("app/owner/dashboard/page.tsx"),/AdminDashboard/);
});
test("Live dashboard has all six approved panels without invented demo values",()=>{
 for(const heading of ["Total Students","Assessments","Learning Activities","Progress (Avg.)","Student Progress Trend","Assessment Outcomes","Recent Student Activity","Today’s Schedule"])assert.ok(dashboard.includes(heading),heading);
 for(const invented of ["128","314","78%","52%","+12%"])assert.doesNotMatch(dashboard,new RegExp(invented.replace(/[+]/g,"\\+")));
 assert.match(dashboard,/No teacher-reviewed scores for this period yet/);
 assert.match(dashboard,/No sessions scheduled for today/);
});
test("Every staff analytics query is scoped to active role and authorized students",()=>{
 assert.match(dashboard,/auth\.getUser\(\)/);
 assert.match(dashboard,/from\("user_roles"\)/);
 assert.match(dashboard,/from\("teachers"\)/);
 assert.match(dashboard,/eq\("status","active"\)/);
 assert.match(dashboard,/from\("teacher_assignments"\)/);
 assert.match(dashboard,/\.is\("removed_at",null\)/);
 assert.match(dashboard,/from\("assessment_results"\)/);
 assert.match(dashboard,/result\.assessments\.filter\(a=>a\.status==="reviewed"\)/);
 assert.match(dashboard,/staff_assessment_sessions_list/);
 assert.match(dashboard,/const result:Dataset=\{students:ss,assessments:\[\],results:\[\],activities:\[\],sessions:\[\],inPerson:\[\]\}/);
 assert.doesNotMatch(dashboard,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
test("Parent portal unchanged and In-Person Assessment continues as a separate staff tool",()=>{
 assert.doesNotMatch(read("app/parent/dashboard/page.tsx"),/StaffLiveDashboard/);
 assert.match(menu,/In-Person Assessments/);
 assert.match(read("app/staff/in-person-assessments/page.tsx"),/staff_assessment_save/);
 assert.match(css,/swastha-live-dashboard__charts/);
});
