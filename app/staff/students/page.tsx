"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import { supabase } from "../../../lib/supabase";

type Student = { id:string; student_code:string|null; full_name:string; current_class:string|null; status:string; removed_at:string|null };
type Role = "owner"|"admin"|"clinic_admin"|"teacher";
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const btn:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:"pointer"};
const home=(role:Role)=>role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";

/** All reads are additionally protected by Supabase RLS. Teachers are scoped through active assignments. */
export default function StaffStudentDirectory(){
 const router=useRouter();
 const [role,setRole]=useState<Role|null>(null);
 const [students,setStudents]=useState<Student[]>([]);
 const [search,setSearch]=useState("");
 const [status,setStatus]=useState("all");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database is unavailable.");setLoading(false);return;}
  setError("");setLoading(true);
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace("/login");return;}
   const {data:access,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(roleError||!access||!["owner","admin","clinic_admin","teacher"].includes(access.role)){router.replace("/login");return;}
   const currentRole=access.role as Role;
   setRole(currentRole);
   let studentIds:string[]|null=null;
   if(currentRole==="teacher"){
    const {data:teacher,error:te}=await supabase.from("teachers").select("id").eq("user_id",user.id).eq("status","active").maybeSingle();
    if(te||!teacher)throw Error("An active teacher profile is required.");
    const {data:links,error:le}=await supabase.from("teacher_assignments").select("student_id").eq("teacher_id",teacher.id);
    if(le)throw le;
    studentIds=[...new Set((links||[]).map(x=>x.student_id))];
   }
   if(studentIds!==null&&!studentIds.length){setStudents([]);return;}
   let query=supabase.from("students").select("id,student_code,full_name,current_class,status,removed_at").is("removed_at",null).order("full_name");
   if(studentIds!==null)query=query.in("id",studentIds);
   const {data,error:se}=await query;
   if(se)throw se;
   setStudents((data||[]) as Student[]);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load permitted students.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 const visible=useMemo(()=>students.filter(s=>(status==="all"||s.status===status)&&(s.full_name+" "+(s.student_code||"")+" "+(s.current_class||"")).toLowerCase().includes(search.trim().toLowerCase())),[students,search,status]);
 return <main className="swastha-workspace-page">
  <header className="swastha-workspace-header"><BrandLogo/><div><strong>Student Development Workspace</strong><small>Staff-only · Authorized student records</small></div><button style={btn} onClick={()=>router.push(role?home(role):"/login")}>Back to Staff Tools</button></header>
  <div className="swastha-workspace-content">
   <h1>Students & Progress</h1>
   <p className="swastha-muted">Select a student to review assessments, learning activities, individual development goals, sessions, reports and coordination history in one place.</p>
   {error&&<div style={{...panel,color:"#b42318"}} role="alert">{error}</div>}
   <div className="swastha-workspace-toolbar">
    <label>Search student<input aria-label="Search student name, code, class" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, permanent ID, class"/></label>
    <label>Status<select aria-label="Student status filter" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select></label>
    <button style={btn} type="button" onClick={()=>void load()}>Refresh</button>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,270px),1fr))",gap:12}}>
    {loading?<section style={panel}>Loading permitted students…</section>:!visible.length?<section style={panel}>No students match the selected filters.</section>:visible.map(s=><section key={s.id} style={panel}>
     <h2 style={{fontSize:19,margin:"0 0 7px"}}>{s.full_name}</h2>
     <p style={{fontSize:13,color:"#64748b",margin:"0 0 12px"}}>{s.student_code||"ID pending"} · {s.current_class||"Class not recorded"} · {s.status}</p>
     <button type="button" style={btn} onClick={()=>router.push("/staff/students/"+encodeURIComponent(s.id))}>Open Student Workspace</button>
    </section>)}
   </div>
   <p style={{fontSize:12,color:"#64748b"}}>{visible.length} student(s) shown. Removed students are excluded from current worklists. Teachers see only assigned students.</p>
  </div>
 </main>;
}
