import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const visual=read("app/components/staff-dashboard-insights.tsx");
const css=read("app/globals.css");
const teacher=read("app/teacher/dashboard/page.tsx");
const admin=read("app/admin/dashboard/page.tsx");
const clinic=read("app/clinic-admin/dashboard/page.tsx");

test("Every staff role receives the same approved live dashboard design and original clinic logo",()=>{
 assert.match(menu,/<img src="\/swastha-learning-clinic-logo\.png"/);
 assert.match(menu,/<StaffDashboardInsights role=\{role\}\/>/);
 assert.match(menu,/role="search"/);
 assert.match(menu,/onSubmit=\{event=>\{event\.preventDefault\(\)/);
 assert.match(read("app/staff/students/page.tsx"),/URLSearchParams\(window\.location\.search\)/);
 for(const s of [teacher,admin,clinic])assert.match(s,/<StaffToolsMenu/);
 assert.match(css,/swastha-staff-dashboard-kpis/);
 assert.match(css,/swastha-staff-dashboard-chart-grid/);
 assert.match(css,/swastha-staff-dashboard-donut/);
});

test("All approved overview panels are backed by scoped data; no placeholder KPI figures",()=>{
 for(const item of ["Total Students","Assessments","Learning Activities","Activities Completed","Student Learning Progress","Assessment Outcomes","Recent Student Activity","Today's Schedule"])assert.ok(visual.includes(item),"Missing "+item);
 assert.doesNotMatch(visual,/\b128\b|\b314\b|\b78%\b|Aarav S\.|Ishita M\./);
 for(const table of ["students","assessment_assignments","student_activity_assignments","clinic_sessions"])assert.ok(visual.includes('from("'+table+'")'));
 assert.match(visual,/from\("teacher_assignments"\)/);
 assert.match(visual,/from\("user_roles"\)/);
 assert.match(visual,/\.is\("removed_at",null\)/);
 assert.match(visual,/\.eq\("status","active"\)/);
 assert.match(visual,/response\.error/);
 assert.match(visual,/Records visible to your staff role/);
});

test("In-person assessment entry is immediately visible in all four staff dashboards",()=>{
 assert.match(visual,/className="swastha-staff-dashboard-quick-actions"/);
 assert.match(visual,/Open In-Person Assessments/);
 assert.match(visual,/router.push\("\/staff\/in-person-assessments"\)/);
 assert.match(menu,/href: "\/staff\/in-person-assessments"/);
});

test("Chart labels reflect workflow and current activity completion, not unvalidated clinical scores",()=>{
 assert.match(visual,/not a clinical score/);
 assert.match(visual,/Current completion of activities assigned in each month/);
 assert.match(visual,/Current workflow statuses of saved assessments/);
 assert.match(visual,/No learning activities assigned in this period/);
 assert.match(visual,/no data/);
 assert.match(visual,/today's permitted clinic sessions/i);
 assert.match(visual,/role="img"/);
});

test("Role-specific quick actions remain without duplicate headline KPI counters",()=>{
 assert.match(teacher,/Pending Reviews/);
 assert.doesNotMatch(teacher,/\{label:"Assigned Students",value:/);
 assert.match(admin,/Awaiting Teacher Assignment/);
 assert.doesNotMatch(admin,/\{label:"Total Students",value:/);
 assert.match(clinic,/Open follow-ups/);
 assert.match(clinic,/<TeacherManagement\/>/);
 assert.match(read("app/parent/dashboard/page.tsx"),/LearningInsightsCharts/);
});
