import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const staff=source("app/staff/in-person-assessments/page.tsx");
const record=source("app/staff/students/[id]/page.tsx");
const menu=source("app/components/staff-tools-menu.tsx");

test("In-person assessment remains a core staff tool",()=>{
 assert.match(menu,/In-Person Assessments/);
 assert.match(menu,/\/staff\/in-person-assessments/);
 assert.match(staff,/staff_assessment_start/);
 assert.match(staff,/staff_assessment_save/);
 assert.match(staff,/staff_assessment_session_get/);
 assert.match(staff,/Start In-Person Assessment/);
});
test("Deep links reuse authorized student and staff-session loading",()=>{
 assert.match(staff,/URLSearchParams\(window\.location\.search\)/);
 assert.match(staff,/requestedStudent&&available\.some\(item=>item\.student_id===requestedStudent\)/);
 assert.match(staff,/requestedSession\)await openSessionDirect\(requestedSession\)/);
 assert.match(staff,/supabase\.rpc\("staff_assessment_session_get"/);
});
test("Unified student record shows staff in-person sessions and does not publish results to family",()=>{
 assert.match(record,/supabase\.rpc\("staff_assessment_sessions_list"\)/);
 assert.match(record,/\.filter\(item=>item\.student_id===id\)/);
 assert.match(record,/In-person assessments/);
 assert.match(record,/Start In-Person Assessment/);
 assert.match(record,/Continue Session/);
 assert.match(record,/View Session/);
 assert.match(record,/not automatically published as an approved family report/);
 assert.doesNotMatch(record,/supabase\.from\("staff_assessment_sessions"\)\.select/);
});
