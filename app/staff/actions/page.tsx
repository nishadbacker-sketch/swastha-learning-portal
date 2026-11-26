"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";

type Role="owner"|"admin"|"clinic_admin"|"teacher";
type Student={id:string;full_name:string;student_code:string|null;removed_at:string|null};
type Assessment={id:string;student_id:string;assessment_level:string;status:string;assigned_at:string};
type Task={id:string;student_id:string;title:string;status:string;priority:string;due_date:string|null};
type Session={id:string;student_id:string;status:string;scheduled_at:string;session_type:string};
type Activity={id:string;student_id:string;status:string};
const box:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const btn:React.CSSProperties={background:"#176b58",color:"#fff",padding:"10px 14px",border:0,borderRadius:8,fontWeight:700,cursor:"pointer"};
const isOpen=(s:string)=>!["done","completed","cancelled","closed"].includes(s);
const date=(v:string)=>new Date(v).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",year:"numeric"});
const home=(r:Role)=>r==="owner"?"/owner/dashboard":r==="admin"?"/admin/dashboard":r==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";
export default function StaffActionCenter(){
 const router=useRouter();
 const [role,setRole]=useState<Role|null>(null);
 const [students,setStudents]=useState<Student[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [activities,setActivities]=useState<Activity[]>([]);
 const [studentId,setStudentId]=useState("all");
 const [error,setError]=useState("");
 const [warnings,setWarnings]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  try{
   const {data:{user},error:au}=await supabase.auth.getUser();
   if(au||!user){router.replace("/login");return;}
   const {data:ur,error:ue}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(ue||!ur||!["owner","admin","clinic_admin","teacher"].includes(ur.role)){router.replace("/login");return;}
   const current=ur.role as Role;setRole(current);
   let ids:string[]|null=null;
   if(current==="teacher"){
    const {data:t,error:te}=await supabase.from("teachers").select("id").eq("user_id",user.id).eq("status","active").maybeSingle();
    if(te||!t)throw Error("Only active teachers can access assigned work.");
    const {data:links,error:le}=await supabase.from("teacher_assignments").select("student_id").eq("teacher_id",t.id);
    if(le)throw le;
    ids=[...new Set((links||[]).map(x=>x.student_id))];
   }
   if(ids!==null&&!ids.length){setStudents([]);setAssessments([]);setTasks([]);setSessions([]);setActivities([]);return;}
   let sq=supabase.from("students").select("id,full_name,student_code,removed_at").is("removed_at",null).order("full_name");
   if(ids!==null)sq=sq.in("id",ids);
   const sr=await sq;
   if(sr.error)throw sr.error;
   const ss=(sr.data||[]) as Student[];
   setStudents(ss);
   if(!ss.length){setAssessments([]);setTasks([]);setSessions([]);setActivities([]);return;}
   const allowed=ss.map(s=>s.id),a:Assessment[]=[],t:Task[]=[],s:Session[]=[],act:Activity[]=[],warning:string[]=[];
   for(let i=0;i<allowed.length;i+=90){
    const chunk=allowed.slice(i,i+90);
    const results=await Promise.all([
     supabase.from("assessment_assignments").select("id,student_id,assessment_level,status,assigned_at").in("student_id",chunk).limit(1000),
     supabase.from("student_coordination_tasks").select("id,student_id,title,status,priority,due_date").in("student_id",chunk).limit(1000),
     supabase.from("clinic_sessions").select("id,student_id,status,scheduled_at,session_type").in("student_id",chunk).gte("scheduled_at",new Date(Date.now()-365*86400000).toISOString()).limit(1000),
     supabase.from("student_activity_assignments").select("id,student_id,status").in("student_id",chunk).limit(1000)
    ]);
    if(results[0].error)warning.push("Some assessment records are unavailable.");else a.push(...(results[0].data||[]) as Assessment[]);
    if(results[1].error)warning.push("Some coordination tasks are unavailable.");else t.push(...(results[1].data||[]) as Task[]);
    if(results[2].error)warning.push("Some sessions are unavailable.");else s.push(...(results[2].data||[]) as Session[]);
    if(results[3].error)warning.push("Some activities are unavailable.");else act.push(...(results[3].data||[]) as Activity[]);
   }
   setAssessments(a);setTasks(t);setSessions(s);setActivities(act);setWarnings([...new Set(warning)]);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load staff actions.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void refresh();},[refresh]);
 const permitted=useMemo(()=>students.some(s=>s.id===studentId)?studentId:"all",[studentId,students]);
 const current=useMemo(()=>({
  a:assessments.filter(x=>permitted==="all"||x.student_id===permitted),
  t:tasks.filter(x=>permitted==="all"||x.student_id===permitted),
  s:sessions.filter(x=>permitted==="all"||x.student_id===permitted),
  act:activities.filter(x=>permitted==="all"||x.student_id===permitted)
 }),[assessments,tasks,sessions,activities,permitted]);
 const pendingReviews=current.a.filter(x=>x.status==="submitted");
 const openTasks=current.t.filter(x=>isOpen(x.status));
 const today=new Date();
 const overdue=openTasks.filter(x=>x.due_date&&new Date(x.due_date+"T23:59:59+05:30")<today);
 const coming=current.s.filter(x=>["scheduled","rescheduled"].includes(x.status)&&new Date(x.scheduled_at)>=today).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
 const lateActivities=current.act.filter(x=>!["completed","reviewed"].includes(x.status));
 const name=(id:string)=>{const x=students.find(s=>s.id===id);return x?x.full_name+" ("+(x.student_code||"ID pending")+")":"Permitted student";};
 const metric=(label:string,count:number,href:string)=> <button type="button" onClick={()=>router.push(href)} style={{...box,textAlign:"left",cursor:"pointer"}}><small className="swastha-muted">{label}</small><strong style={{display:"block",fontSize:28,marginTop:5}}>{count}</strong><span style={{fontSize:12,color:"#176b58"}}>Open related tool</span></button>;
 const record=(key:string,title:string,info:string,id:string,href?:string,actionLabel="Student Record")=> <div key={key} className="swastha-workspace-record"><span><strong>{title}</strong><small style={{display:"block",color:"#64748b"}}>{info}</small></span><button type="button" className="swastha-secondary-button" onClick={()=>router.push(href||"/staff/students/"+encodeURIComponent(id))}>{actionLabel}</button></div>;
 return <main className="swastha-workspace-page">
  <header className="swastha-workspace-header"><BrandLogo/><div><strong>Staff Action Dashboard</strong><small>Assignments · Reviews · Sessions · Follow-ups</small></div><button style={btn} onClick={()=>router.push(role?home(role):"/login")}>Staff Tools</button></header>
  <div className="swastha-workspace-content"><h1>Staff Action Center</h1><p className="swastha-muted">Review operational tasks and pending work using the permissions of your staff role. The student selector filters every figure and queue.</p>
   {error&&<div style={{...box,color:"#b42318"}} role="alert">{error}</div>}
   {warnings.length>0&&<div style={{...box,background:"#fffaf0"}} role="status">{warnings.join(" ")}</div>}
   <div className="swastha-workspace-toolbar"><label>Student<select value={permitted} onChange={e=>setStudentId(e.target.value)} aria-label="Filter staff actions by student"><option value="all">All permitted students</option>{students.map(x=><option key={x.id} value={x.id}>{name(x.id)}</option>)}</select></label><button style={btn} onClick={()=>void refresh()} disabled={loading}>Refresh Worklist</button></div>
   {loading?<div style={box}>Loading current staff work…</div>:<>
    <div className="swastha-workspace-metrics">{metric("Submitted assessments awaiting review",pendingReviews.length,"/teacher/coordination")}{metric("Open coordination tasks",openTasks.length,"/teacher/coordination")}{metric("Overdue coordination tasks",overdue.length,"/teacher/coordination")}{metric("Upcoming sessions",coming.length,"/staff/operations")}{metric("Incomplete learning activities",lateActivities.length,role==="teacher"?"/teacher/dashboard":"/teacher/coordination")}</div>
    <div className="swastha-workspace-three">
     <section style={box}><h2>Assessment Reviews</h2>{!pendingReviews.length?<p className="swastha-muted">No assessments awaiting teacher review.</p>:pendingReviews.slice(0,15).map(x=>record(x.id,name(x.student_id),x.assessment_level+" · Submitted for review",x.student_id,role==="teacher"?"/teacher/assessment-review/"+encodeURIComponent(x.id):"/admin/assessment-oversight",role==="teacher"?"Open Teacher Review":"Open Assessment Oversight"))}{pendingReviews.length>15&&<p>Showing 15 of {pendingReviews.length} entries.</p>}</section>
     <section style={box}><h2>Coordination Tasks</h2>{!openTasks.length?<p className="swastha-muted">No open coordination tasks.</p>:openTasks.slice(0,15).map(x=>record(x.id,x.title,name(x.student_id)+" · "+x.priority+(x.due_date?" · Due "+x.due_date:""),x.student_id))}{openTasks.length>15&&<p>Showing 15 of {openTasks.length} entries.</p>}</section>
     <section style={box}><h2>Scheduled Sessions</h2>{!coming.length?<p className="swastha-muted">No upcoming sessions within the available calendar window.</p>:coming.slice(0,15).map(x=>record(x.id,name(x.student_id),date(x.scheduled_at)+" · "+x.session_type,x.student_id))}{coming.length>15&&<p>Showing 15 of {coming.length} entries.</p>}</section>
    </div>
    <p style={{fontSize:12,color:"#64748b"}}>Action counts reflect accessible records within the loaded worklist. Records do not grant editing privileges; operational actions remain in their authorized tools.</p>
   </>}
  </div>
 </main>;
}
