import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../sql/phase7_clinic_admin_approved_idp_visibility.sql",import.meta.url),"utf8");
test("Clinic Admin can read only reviewed assessment records and corresponding IDP goals",()=>{
 assert.match(sql,/ON public\.assessment_assignments FOR SELECT TO authenticated/);
 assert.match(sql,/public\.has_role\('clinic_admin'\) AND status='reviewed'/);
 assert.match(sql,/ON public\.student_development_goals FOR SELECT TO authenticated/);
 assert.match(sql,/WHERE a\.id=assignment_id AND a\.status='reviewed'/);
 assert.doesNotMatch(sql,/FOR INSERT|FOR UPDATE|FOR DELETE|DROP TABLE|TRUNCATE|UPDATE public\./);
});
