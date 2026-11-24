import assert from "node:assert/strict";
import test from "node:test";
import {createClient} from "@supabase/supabase-js";

// Intentionally READ ONLY against a dedicated non-production Supabase project.
// No signups, inserts, updates, deletions, writes to production, or real family data.
// The suite is explicitly skipped unless every staging credential is configured.
const required=[
 "SWASTHA_STAGING_SUPABASE_URL","SWASTHA_STAGING_SUPABASE_ANON_KEY",
 "SWASTHA_STAGING_PARENT_A_EMAIL","SWASTHA_STAGING_PARENT_A_PASSWORD",
 "SWASTHA_STAGING_PARENT_B_EMAIL","SWASTHA_STAGING_PARENT_B_PASSWORD",
 "SWASTHA_STAGING_TEACHER_EMAIL","SWASTHA_STAGING_TEACHER_PASSWORD"
];
const missing=required.filter(name=>!process.env[name]);
const url=process.env.SWASTHA_STAGING_SUPABASE_URL||"";
const productionRef="cyhfsfwwpqgsxefcxkzp";
const host=(()=>{
 try{return new URL(url).hostname;}catch{return "";}
})();
const safeHost=/^[a-z0-9-]+\.supabase\.co$/.test(host)&&host!==productionRef+".supabase.co";

if(missing.length){
 test("authenticated staging checks were NOT RUN (configure isolated staging accounts)",{
  skip:"Missing "+missing.join(", ")
 },()=>{});
}else if(!safeHost){
 test("authenticated tests require a separate, non-production Supabase project",()=>{
  assert.fail("Staging Supabase URL is missing, invalid or points to the known production project");
 });
}else{
 const anonKey=process.env.SWASTHA_STAGING_SUPABASE_ANON_KEY;
 const makeClient=()=>createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

 async function signIn(label,email,password,expectedRole){
  const client=makeClient();
  const {data,error}=await client.auth.signInWithPassword({email,password});
  assert.ifError(error);
  assert.ok(data.user?.id,label+" sign-in did not return a user");
  const {data:role,error:roleError}=await client.from("user_roles").select("role").eq("user_id",data.user.id).single();
  assert.ifError(roleError);
  assert.equal(role.role,expectedRole,label+" must be a dedicated "+expectedRole+" staging account");
  return {client,userId:data.user.id};
 }

 async function ownChildren(session){
  const {data:links,error:linkError}=await session.client.from("parent_student_links")
   .select("student_id").eq("parent_user_id",session.userId);
  assert.ifError(linkError);
  assert.ok(links?.length,"Seed a fake child linked to each staging parent account");
  return [...new Set(links.map(x=>x.student_id))];
 }

 test("two staging parents have isolated children, assessments, reports and notifications",async()=>{
  const parentA=await signIn("parent A",process.env.SWASTHA_STAGING_PARENT_A_EMAIL,
   process.env.SWASTHA_STAGING_PARENT_A_PASSWORD,"parent");
  const parentB=await signIn("parent B",process.env.SWASTHA_STAGING_PARENT_B_EMAIL,
   process.env.SWASTHA_STAGING_PARENT_B_PASSWORD,"parent");
  const idsA=await ownChildren(parentA);
  const idsB=await ownChildren(parentB);
  assert.ok(idsA.every(id=>!idsB.includes(id)),"Staging test children must be distinct");

  for(const [current,ownIds,foreignIds,label] of [
   [parentA,idsA,idsB,"parent A"],[parentB,idsB,idsA,"parent B"]
  ]){
   const {client,userId}=current;
   const checks=[
    ["students","id"],["assessment_assignments","student_id"],
    ["custom_assessment_assignments","student_id"],
    ["student_activity_assignments","student_id"]
   ];
   for(const [table,col] of checks){
    const {data,error}=await client.from(table).select(col).in(col,foreignIds).limit(1);
    assert.ifError(error);
    assert.equal(data?.length,0,label+" could see another family's "+table);
   }
   const {data:links,error:linksError}=await client.from("parent_student_links").select("student_id");
   assert.ifError(linksError);
   assert.ok((links||[]).every(item=>ownIds.includes(item.student_id)),label+" could see another family's links");
   const {data:assignments,error:assignmentsError}=await client.from("assessment_assignments")
    .select("id,student_id,status").in("student_id",ownIds).limit(500);
   assert.ifError(assignmentsError);
   const visibleIds=new Set((assignments||[]).map(a=>a.id));
   const approvedIds=new Set((assignments||[]).filter(a=>a.status==="reviewed").map(a=>a.id));
   const {data:reports,error:reportsError}=await client.from("assessment_results")
    .select("assignment_id").limit(500);
   assert.ifError(reportsError);
   assert.ok((reports||[]).every(item=>approvedIds.has(item.assignment_id)),
    label+" could read an unapproved or unlinked assessment result");
   const {data:goals,error:goalsError}=await client.from("student_development_goals")
    .select("assignment_id").limit(500);
   assert.ifError(goalsError);
   assert.ok((goals||[]).every(item=>approvedIds.has(item.assignment_id)),
    label+" could read an unapproved or unlinked IDP");
   const {data:ack,error:ackError}=await client.from("parent_notification_acknowledgements")
    .select("parent_user_id").limit(500);
   assert.ifError(ackError);
   assert.ok((ack||[]).every(item=>item.parent_user_id===userId),
    label+" could read another parent's notification acknowledgements");
   const {data:announcements,error:announceError}=await client.from("parent_announcements")
    .select("target_parent_user_id,active,expires_at").limit(500);
   assert.ifError(announceError);
   assert.ok((announcements||[]).every(item=>item.active&&
    (item.target_parent_user_id===null||item.target_parent_user_id===userId)&&
    (item.expires_at===null||Date.parse(item.expires_at)>Date.now())),
    label+" could read an inactive, expired, or other parent's announcement");
   const {data:allAssessments,error:allError}=await client.from("assessment_assignments")
    .select("id,student_id").limit(500);
   assert.ifError(allError);
   assert.ok((allAssessments||[]).every(item=>ownIds.includes(item.student_id)),
    label+" could list an unrelated assessment");
   assert.ok(visibleIds.size>=0);
  }
  await Promise.all([parentA.client.auth.signOut(),parentB.client.auth.signOut()]);
 });

 test("staging teacher reads only assigned students and cannot see parent acknowledgements",async()=>{
  const teacher=await signIn("teacher",process.env.SWASTHA_STAGING_TEACHER_EMAIL,
   process.env.SWASTHA_STAGING_TEACHER_PASSWORD,"teacher");
  const {data:staff,error:staffError}=await teacher.client.from("teachers").select("id,status")
   .eq("user_id",teacher.userId).single();
  assert.ifError(staffError);assert.equal(staff.status,"active");
  const {data:assigned,error:assignedError}=await teacher.client.from("teacher_assignments")
   .select("student_id").eq("teacher_id",staff.id);
  assert.ifError(assignedError);
  assert.ok(assigned?.length,"Seed an active teacher and assigned fake students in staging");
  const allowed=new Set(assigned.map(item=>item.student_id));
  const {data:students,error:studentsError}=await teacher.client.from("students")
   .select("id").limit(500);
  assert.ifError(studentsError);
  assert.ok((students||[]).every(s=>allowed.has(s.id)),"Teacher could view unassigned student");
  const {data:notifications,error:notificationError}=await teacher.client.from("parent_notification_acknowledgements")
   .select("parent_user_id").limit(1);
  assert.ok(notificationError||!notifications?.length,"Teacher could read private parent acknowledgements");
  await teacher.client.auth.signOut();
 });
}
