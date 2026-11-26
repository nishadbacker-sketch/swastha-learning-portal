"use client";
import BrandLogo from "../../components/brand-logo";
import StaffNotificationsPopup from "../../components/staff-notifications-popup";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AppointmentEscalations from "../appointment-escalations";

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
 <header style={{background:"white",padding:"20px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><div><strong><BrandLogo /></strong><div style={{color:"#64748b",fontSize:12,marginTop:5}}>{creatorMode?"CREATOR / OWNER PORTAL":"SUPER ADMIN PORTAL"}</div></div><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><StaffNotificationsPopup/><button type="button" style={{...action,background:"#176b58",color:"white",margin:0}} onClick={()=>router.push("/teacher/appointments")}>Appointment</button><button style={{...action,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/my-profile")}>My Profile</button><button style={action} onClick={async()=>{if(supabase)await supabase.auth.signOut();router.replace("/login");}}>Sign out</button></div></header>
 <div style={{maxWidth:1100,margin:"auto",padding:"30px 16px"}}>
 
 <section aria-label="Staff tools" style={{background:"linear-gradient(120deg,#132838,#0f4c5c)",color:"#fff",padding:16,borderRadius:12,marginBottom:18,minWidth:0}}>
 <h1 style={{fontSize:20,margin:"0 0 12px",overflowWrap:"anywhere"}}>Welcome to Staff Tools, {name}!</h1>
 
 <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))"}}>
 <button type="button" style={{...action,margin:0}} onClick={()=>router.push("/admin/users")}>User Management</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/operations")}>Clinic Operations & Calendar</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/courses")}>Courses</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/in-person-assessments")}>In-Person Assessments</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/assessment-certificates")}>Assessment Certificates</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/sessions")}>Sessions & Attendance</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/students")}>Student Management</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/teacher/coordination")}>Open Coordination Overview</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/assessment-oversight")}>Open Assessment Oversight</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/notifications")}>Staff Notifications</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/questions")}>Manage All Questions</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/audit")}>Open Audit Timeline</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/notification-history")}>Open Notification History</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/announcements")}>Manage Announcements</button>
 </div></section>
 <AppointmentEscalations/>

 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
 <section style={box}><small>Registered Students</small><h1>{students.length}</h1></section>
 <section style={box}><small>Awaiting Teacher Assignment</small><h1>{students.filter(s=>!assignments.some(a=>a.student_id===s.id)).length}</h1></section>
 <section style={box}><small>Active Teachers</small><h1>{teachers.length}</h1></section>
 <section style={box}><small>Teacher–Student Links</small><h1>{assignments.length}</h1></section>
 </div>
 {error&&<p role="alert" style={{...box,color:"#b42318",background:"#fff1f2"}}>{error}</p>}
 {notice&&<p role="status" style={{...box,color:"#176b58",background:"#e9f7ef"}}>{notice}</p>}
 <section style={box}><h2>Student Management</h2><p>Student records, progress and teacher assignments are managed in one place.</p><button style={action} onClick={()=>router.push("/admin/students")}>Student Management</button></section>
 <p style={{color:"#64748b",fontSize:13}}>Super Admin and Admin can assign teachers to students. Only Super Admin can change account roles. Parents cannot remove registered children. A student may have more than one assigned teacher.</p>
 </div></main>;
}
