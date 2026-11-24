import assert from "node:assert/strict";
import test from "node:test";
import {createClient} from "@supabase/supabase-js";

// Opt-in, read-only against isolated staging. This test deliberately fails closed
// if enabled without all accounts. Never create accounts or alter permissions.
const env=process.env;
const required=[
 "SWASTHA_STAGING_SUPABASE_URL","SWASTHA_STAGING_SUPABASE_ANON_KEY",
 "SWASTHA_STAGING_OWNER_USER_ID",
 "SWASTHA_STAGING_PARENT_A_EMAIL","SWASTHA_STAGING_PARENT_A_PASSWORD",
 "SWASTHA_STAGING_TEACHER_EMAIL","SWASTHA_STAGING_TEACHER_PASSWORD",
 "SWASTHA_STAGING_ADMIN_EMAIL","SWASTHA_STAGING_ADMIN_PASSWORD",
 "SWASTHA_STAGING_CLINIC_ADMIN_EMAIL","SWASTHA_STAGING_CLINIC_ADMIN_PASSWORD"
];
const missing=required.filter(k=>!env[k]);
const url=env.SWASTHA_STAGING_SUPABASE_URL||"";
const hostname=(()=>{try{return new URL(url).hostname;}catch{return "";}})();
const safe=/^[a-z0-9-]+\.supabase\.co$/.test(hostname)
 && hostname==="cuxftykygloeczviknbn.supabase.co";
test("Phase 5 role-positive checks require dedicated staging credentials",()=>{
 assert.deepEqual(missing,[],"Missing required staging secrets: "+missing.join(", "));
 assert.ok(safe,"Refuse to run against production or an unknown Supabase project");
 assert.match(env.SWASTHA_STAGING_OWNER_USER_ID,/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
});
const client=()=>createClient(url,env.SWASTHA_STAGING_SUPABASE_ANON_KEY||"",{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
async function login(role,email,password){
 const db=client();
 const {data,error}=await db.auth.signInWithPassword({email,password});
 assert.ifError(error);
 assert.ok(data.user?.id,role+" must sign in");
 const roles=await db.from("user_roles").select("role").eq("user_id",data.user.id).single();
 assert.ifError(roles.error);
 assert.equal(roles.data.role,role,"Use a dedicated "+role+" staging account");
 return db;
}
test("Parent and Teacher cannot probe the Owner identity",async()=>{
 if(missing.length||!safe)return;
 const who=env.SWASTHA_STAGING_OWNER_USER_ID;
 for(const [role,prefix] of [["parent","PARENT_A"],["teacher","TEACHER"]]){
  const db=await login(role,env["SWASTHA_STAGING_"+prefix+"_EMAIL"],env["SWASTHA_STAGING_"+prefix+"_PASSWORD"]);
  const result=await db.rpc("is_creator_account",{p_user_id:who});
  assert.ifError(result.error);
  assert.equal(result.data,false,role+" must not identify the Owner");
  await db.auth.signOut();
 }
});
test("Admin and Clinic Admin retain legitimate Owner identity lookups",async()=>{
 if(missing.length||!safe)return;
 const who=env.SWASTHA_STAGING_OWNER_USER_ID;
 for(const [role,prefix] of [["admin","ADMIN"],["clinic_admin","CLINIC_ADMIN"]]){
  const db=await login(role,env["SWASTHA_STAGING_"+prefix+"_EMAIL"],env["SWASTHA_STAGING_"+prefix+"_PASSWORD"]);
  const result=await db.rpc("is_creator_account",{p_user_id:who});
  assert.ifError(result.error);
  assert.equal(result.data,true,role+" must retain trusted identity lookup");
  const fake=await db.rpc("is_creator_account",{p_user_id:"00000000-0000-4000-8000-000000000001"});
  assert.ifError(fake.error);
  assert.equal(fake.data,false);
  await db.auth.signOut();
 }
});
