import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const api=readFileSync("app/api/staff/free-assessment-results/route.ts","utf8");
const ui=readFileSync("app/staff/free-assessment-results/page.tsx","utf8");
const menu=readFileSync("app/components/staff-tools-menu.tsx","utf8");
const courses=readFileSync("app/staff/courses/page.tsx","utf8");

test("free screening staff API requires verified Supabase authentication and staff role",()=>{
 assert.match(api,/auth\.getUser\(match\[1\]\)/);
 assert.match(api,/\.from\("user_roles"\)/);
 assert.match(api,/staffRoles\.has\(roleRow\.role\)/);
 assert.match(api,/403/);
 assert.match(api,/Cache-Control/);
 assert.doesNotMatch(api,/user_metadata|raw_user_meta_data/);
});
test("teacher screening results are limited to active assigned students",()=>{
 assert.match(api,/\.from\("teachers"\)/);
 assert.match(api,/\.eq\("status","active"\)/);
 assert.match(api,/\.from\("teacher_assignments"\)/);
 assert.match(api,/\.in\("student_id",assignedIds\)/);
});
test("free assessment results link in shared staff menu and course catalogue",()=>{
 assert.match(menu,/\/staff\/free-assessment-results/);
 assert.match(courses,/Open Free Assessment Results/);
});
test("screening staff result shows 25 responses, student ID and dashboard PDF action",()=>{
 assert.match(ui,/PERMANENT STUDENT ID/);
 assert.match(ui,/QUESTIONS\.map\(q=>/);
 assert.match(ui,/Download \/ Print Dashboard \(PDF\)/);
 assert.match(ui,/window\.print\(\)/);
});
