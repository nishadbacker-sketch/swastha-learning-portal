import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const migration=read("sql/phase5_owner_identity_helper_hardening.sql");
const inventory=read("docs/security/phase5-definer-audit.md");
test("Owner identity helper is role gated without removing secure staff/RLS use",()=>{
 assert.match(migration,/CREATE OR REPLACE FUNCTION public\.is_creator_account\(p_user_id uuid\)/);
 assert.match(migration,/\(SELECT auth\.uid\(\)\) IS NOT NULL/);
 assert.match(migration,/public\.has_role\('admin'\) OR public\.has_role\('clinic_admin'\)/);
 assert.match(migration,/ur\.user_id = p_user_id AND ur\.role = 'owner'/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.is_creator_account\(uuid\) FROM PUBLIC, anon/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.is_creator_account\(uuid\) TO authenticated/);
 assert.doesNotMatch(migration,/UPDATE public\.user_roles|DELETE FROM public\.user_roles/);
 assert.doesNotMatch(migration,/DROP FUNCTION|DROP TABLE/);
});
test("audit enumerates all privileged RPCs and documents staged release limits",()=>{
 for(const name of ["has_role","is_creator_account","creator_set_super_admin","admin_assign_teacher_to_student",
 "save_custom_assessment","approve_assessment","swastha_link_appointment_to_student",
 "swastha_visible_staff_codes","coordination_transition_task"])
  assert.ok(inventory.includes("`"+name+"`"),name);
 assert.match(inventory,/31 functions/);
 assert.match(inventory,/Production unchanged pending release/);
 assert.match(inventory,/Leaked Password Protection/);
});
