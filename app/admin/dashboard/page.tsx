"use client";
import BrandLogo from "../../components/brand-logo";
import StaffNotificationsPopup from "../../components/staff-notifications-popup";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AppointmentEscalations from "../appointment-escalations";
import ClinicAdminManagement from "../clinic-admin-management";
import TeacherManagement from "../../components/teacher-management";
import SuperAdminManagement from "../../owner/super-admin-management";

type Student = {id:string;student_code:string;full_name:string;current_class:string|null;status:string;created_at:string};
type Teacher = {id:string;user_id:string;status:string;profiles?:{full_name:string|null;staff_code?:string|null}[]|{full_name:string|null;staff_code?:string|null}|null};
type Assignment = {id:string;student_id:string;teacher_id:string};
const box:React.CSSProperties={background:"white",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:14};
const action:React.CSSProperties={padding:"10px 16px",border:0,background:"#176b58",color:"white",borderRadius:8,cursor:"pointer",fontWeight:600};
export default function AdminDashboard(){
 const router=useRouter();
 const [loading,setLoading]=useState(true);
 const [students,setStudents]=useState<Student[]>([]);
 const [teachers,setTeachers]=useState<Teacher[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [selected,setSelected]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [name,setName]=useState("Super Admin");
 const [creatorMode,setCreatorMode]=useState(false);
 const [filter,setFilter]=useState<"all"|"unassigned">("unassigned");
 useEffect(()=>{async function init(){
  const db=supabase;if(!db){setError("Supabase is not configured.");setLoading(false);return;}
  try{
   const {data:auth,error:authError}=await db.auth.getUser();if(authError||!auth.user){router.replace("/login");return;}
   const role=await db.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(role.error||!role.data||!["owner","admin"].includes(role.data.role)){router.replace("/login");return;}
   setCreatorMode(role.data.role==="owner");
   const {data:currentProfile}=await db.from("profiles").select("full_name,staff_code").eq("id",auth.user.id).maybeSingle();
   setName((currentProfile?.full_name||auth.user.user_metadata?.full_name||auth.user.email||"Super Admin")+(currentProfile?.staff_code?" · "+currentProfile.staff_code:""));
   const [s,t,a]=await Promise.all([
    db.from("students").select("id,student_code,full_name,current_class,status,created_at").order("created_at",{ascending:false}),
    db.from("teachers").select("id,user_id,status").eq("status","active"),
    db.from("teacher_assignments").select("id,student_id,teacher_id")
   ]);
   if(s.error)throw s.error;if(t.error)throw t.error;if(a.error)throw a.error;
   setStudents(s.data||[]);
   setAssignments(a.data||[]);
   const list=t.data||[];
   const userIds=list.map(x=>x.user_id);
   let names:Record<string,string>={};
   if(userIds.length){
    const profiles=await db.from("profiles").select("id,full_name,staff_code").in("id",userIds);
    if(!profiles.error)names=Object.fromEntries((profiles.data||[]).map(p=>[p.id,(p.full_name||"Teacher")+(p.staff_code?" · "+p.staff_code:"")]));
   }
   setTeachers(list.map(x=>({...x,profiles:{full_name:names[x.user_id]||null}})));
  }catch(e){setError(e instanceof Error?e.message:"Unable to load administrator dashboard.");}
  finally{setLoading(false);}
 }init();},[router]);
 async function assign(s:Student){
  if(!supabase)return;
  const teacherId=selected[s.id];
  if(!teacherId){setError("Please select a teacher first.");return;}
  setError("");setNotice("");setBusy(s.id);
  try{
   const {error:rpcError}=await supabase.rpc("admin_assign_teacher_to_student",{p_student_id:s.id,p_teacher_id:teacherId});
   if(rpcError)throw rpcError;
   const {data,error:loadError}=await supabase.from("teacher_assignments").select("id,student_id,teacher_id");
   if(loadError)throw loadError;
   setAssignments(data||[]);
   setNotice("Teacher assigned to "+s.full_name+". The student should now appear in that teacher's dashboard.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to assign teacher.");}
  finally{setBusy("");}
 }
 const available=students.filter(s=>filter==="all"||!assignments.some(a=>a.student_id===s.id));
 if(loading)return <main style={{padding:35}}>Loading Super Admin dashboard...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
 <header style={{background:"white",padding:"20px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><div><strong><BrandLogo /></strong><div style={{color:"#64748b",fontSize:12,marginTop:5}}>{creatorMode?"CREATOR / OWNER PORTAL":"SUPER ADMIN PORTAL"}</div></div><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><StaffNotificationsPopup /><button style={{...action,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/my-profile")}>My Profile</button><button style={action} onClick={async()=>{if(supabase)await supabase.auth.signOut();router.replace("/login");}}>Sign out</button></div></header>
 <div style={{maxWidth:1100,margin:"auto",padding:"30px 16px"}}>
 <section style={{...box,background:"#0f4c5c",color:"white"}}><p>LEARN • GROW • THRIVE</p><h1>Welcome, {name}</h1><p>Manage student-to-teacher assignments.</p></section>
 <section style={{background:"#eef7f2",padding:16,borderRadius:12,border:"1px solid #c8e3d4",marginBottom:14}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <div><h2 style={{fontSize:19,margin:"0 0 6px"}}>Student Management & Progress</h2><p style={{margin:0,fontSize:13,color:"#527063"}}>Teachers lead assessments, activities, and development plans. Review student progress and coordinate coverage or teacher reassignment.</p></div>
    <button style={action} onClick={()=>router.push("/admin/students")}>Open Student Management</button>
   </div>
  </section>
 <section style={box}>
   <h2 style={{fontSize:19,margin:"0 0 8px"}}>Teacher Coordination Oversight</h2>
   <p style={{fontSize:13}}>Monitor shared student responsibilities, outstanding work, progress notes, assessments, and IDP goal counts without taking over teachers' work.</p>
   <button style={action} onClick={()=>router.push("/teacher/coordination")}>Open Coordination Overview</button>
  </section>
 <section style={box}>
  <h2 style={{fontSize:19,margin:"0 0 8px"}}>Assessment Oversight</h2>
  <p style={{fontSize:13}}>Monitor assessments awaiting teacher review, overdue assignments and approved reports. Review student IDs and open authorised follow-up actions without changing existing records.</p>
  <button type="button" style={action} onClick={()=>router.push("/admin/assessment-oversight")}>Open Assessment Oversight</button>
 </section>
 <section style={box}><h2 style={{fontSize:19,margin:"0 0 8px"}}>Assessment Question Bank</h2><p style={{fontSize:13}}>Review every LP, UP, HS and HSS question, amend standard wording and review custom questionnaires with revision protection.</p><button style={action} onClick={()=>router.push("/admin/questions")}>Manage All Questions</button></section>
 <section style={box}><h2 style={{fontSize:19,margin:"0 0 8px"}}>Administrator Audit Logs</h2><p style={{fontSize:13}}>Review student updates, assessment approvals, appointment changes, IDP progress and staff permission history.</p><button style={action} onClick={()=>router.push("/admin/audit")}>Open Audit Timeline</button></section>
 <section style={box}><h2 style={{fontSize:19,margin:"0 0 8px"}}>Parent Portal Announcements</h2><p style={{fontSize:13}}>Send in-portal notices to all parents or selected families without WhatsApp or email.</p><button type="button" style={action} onClick={()=>router.push("/admin/announcements")}>Manage Announcements</button></section>
 <section style={box}>
  <h2 style={{fontSize:19,margin:"0 0 8px"}}>Appointment Follow-ups & Registration History</h2>
  <p style={{fontSize:13}}>Review all appointment enquiries, including closed follow-ups. Inspect recorded changes and verified links to registered student accounts, including student IDs and earlier follow-up history.</p>
  <button type="button" style={action} onClick={()=>router.push("/teacher/appointments")}>Open Full Follow-up Queue</button>
 </section>
 <AppointmentEscalations/>
 {creatorMode&&<SuperAdminManagement/>}
 <ClinicAdminManagement/>
  <TeacherManagement/>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
 <section style={box}><small>Registered Students</small><h1>{students.length}</h1></section>
 <section style={box}><small>Awaiting Teacher Assignment</small><h1>{students.filter(s=>!assignments.some(a=>a.student_id===s.id)).length}</h1></section>
 <section style={box}><small>Active Teachers</small><h1>{teachers.length}</h1></section>
 <section style={box}><small>Teacher–Student Links</small><h1>{assignments.length}</h1></section>
 </div>
 {error&&<p role="alert" style={{...box,color:"#b42318",background:"#fff1f2"}}>{error}</p>}
 {notice&&<p role="status" style={{...box,color:"#176b58",background:"#e9f7ef"}}>{notice}</p>}
 <section style={box}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2>Assign Students to Teachers</h2><label>Show: <select value={filter} onChange={e=>setFilter(e.target.value as "all"|"unassigned")} style={{padding:10}}><option value="unassigned">Unassigned Students</option><option value="all">All Students</option></select></label></div>
 {!available.length?<p>No students in this view.</p>:available.map(s=>{
 const linked=assignments.filter(a=>a.student_id===s.id);
 return <section key={s.id} style={{...box,background:"#f8faf7"}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
 <div><h3 style={{marginTop:0}}>{s.full_name} · {s.student_code}</h3><p>Student ID: {s.student_code}</p><p>Class: {s.current_class||"Not recorded"} · Status: {s.status}</p><p style={{fontSize:13,color:"#64748b"}}>Assigned teacher(s): {linked.length?linked.map(a=>{const t=teachers.find(x=>x.id===a.teacher_id);const profile=Array.isArray(t?.profiles)?t.profiles[0]:t?.profiles;return profile?.full_name&&profile.full_name!=="Name not provided"?profile.full_name:"Teacher "+(teachers.findIndex(x=>x.id===a.teacher_id)+1)}).join(", "):"None"}</p></div>
 <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><select value={selected[s.id]||""} onChange={e=>setSelected(old=>({...old,[s.id]:e.target.value}))} style={{padding:10,maxWidth:"100%"}} aria-label={"Choose teacher for "+s.full_name}><option value="">Select a teacher</option>{teachers.map((t,i)=>{const p=Array.isArray(t.profiles)?t.profiles[0]:t.profiles;return <option value={t.id} key={t.id}>{p?.full_name&&p.full_name!=="Name not provided"?p.full_name:"Teacher "+(i+1)}</option>})}</select><button style={{...action,opacity:busy===s.id?0.6:1}} disabled={busy===s.id} onClick={()=>assign(s)}>{busy===s.id?"Assigning...":"Assign Teacher"}</button></div>
 </div></section>})}
 </section>
 <p style={{color:"#64748b",fontSize:13}}>Super Admin and Admin can assign teachers to students. Only Super Admin can change account roles. Parents cannot remove registered children. A student may have more than one assigned teacher.</p>
 </div></main>;
}
