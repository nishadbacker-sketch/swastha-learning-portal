"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";

type Student={id:string;student_code:string;full_name:string;current_class:string|null};
type Assessment={id:string;student_id:string;status:string};
type Goal={id:string;assignment_id:string;title:string;status:string;current_percent:number|null;target_percent:number|null;target_date:string|null;updated_at:string};
type Summary={student:Student;goals:Goal[];overdue:number;needsRevision:number;inProgress:number;achieved:number};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const button:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:9,padding:"10px 14px",fontWeight:700,cursor:"pointer"};
const statusLabels:Record<string,string>={planned:"Planned",in_progress:"In progress",achieved:"Achieved",needs_revision:"Needs revision"};
const dateText=(v:string)=>new Date(v+"T00:00:00").toLocaleDateString("en-IN");
const isOverdue=(g:Goal,today:string)=>Boolean(g.target_date&&g.target_date<today&&g.status!=="achieved");

export default function TeacherStudentProgress(){
 const router=useRouter();
 const [students,setStudents]=useState<Student[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [goals,setGoals]=useState<Goal[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState<"all"|"review"|"active"|"achieved">("all");
 const [search,setSearch]=useState("");
 const refresh=useCallback(async()=>{
  const db=supabase;
  if(!db){setError("Supabase is unavailable.");setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await db.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:role,error:roleError}=await db.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(roleError||role?.role!=="teacher"){router.replace("/login");return;}
   const {data:teacher,error:teacherError}=await db.from("teachers").select("id,status").eq("user_id",auth.user.id).single();
   if(teacherError||!teacher||teacher.status!=="active")throw new Error("An active teacher account is required.");
   const {data:links,error:linksError}=await db.from("teacher_assignments").select("student_id").eq("teacher_id",teacher.id);
   if(linksError)throw linksError;
   const ids=[...new Set((links||[]).map(row=>row.student_id))];
   if(!ids.length){setStudents([]);setAssessments([]);setGoals([]);return;}
   const studentsOut:Student[]=[];
   const assessmentsOut:Assessment[]=[];
   for(let i=0;i<ids.length;i+=100){
    const [s,a]=await Promise.all([
     db.from("students").select("id,student_code,full_name,current_class").in("id",ids.slice(i,i+100)),
     db.from("assessment_assignments").select("id,student_id,status").in("student_id",ids.slice(i,i+100)).eq("status","reviewed")
    ]);
    if(s.error||a.error)throw new Error("Assigned student progress could not be loaded.");
    studentsOut.push(...(s.data||[]) as Student[]);
    assessmentsOut.push(...(a.data||[]) as Assessment[]);
   }
   const approvedIds=assessmentsOut.map(a=>a.id);
   const goalsOut:Goal[]=[];
   for(let i=0;i<approvedIds.length;i+=100){
    const g=await db.from("student_development_goals").select("id,assignment_id,title,status,current_percent,target_percent,target_date,updated_at").in("assignment_id",approvedIds.slice(i,i+100)).limit(1000);
    if(g.error)throw new Error("Development goals could not be loaded.");
    goalsOut.push(...(g.data||[]) as Goal[]);
   }
   setStudents(studentsOut);setAssessments(assessmentsOut);setGoals(goalsOut);
  }catch(e){setError(e instanceof Error?e.message:"Progress overview could not be loaded.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void refresh();},[refresh]);
 const today=new Date().toLocaleDateString("en-CA");
 const summaries=useMemo(()=>{
  const assessmentToStudent=new Map(assessments.map(a=>[a.id,a.student_id]));
  const byStudent=new Map<string,Goal[]>();
  for(const goal of goals){
   const id=assessmentToStudent.get(goal.assignment_id);
   if(id)byStudent.set(id,[...(byStudent.get(id)||[]),goal]);
  }
  return students.map(student=>{
   const own=byStudent.get(student.id)||[];
   return {student,goals:own,overdue:own.filter(g=>isOverdue(g,today)).length,
    needsRevision:own.filter(g=>g.status==="needs_revision").length,
    inProgress:own.filter(g=>g.status==="in_progress").length,
    achieved:own.filter(g=>g.status==="achieved").length};
  }).sort((a,b)=>(b.overdue+b.needsRevision)-(a.overdue+a.needsRevision)||a.student.full_name.localeCompare(b.student.full_name));
 },[students,assessments,goals,today]);
 const matching=summaries.filter(s=>{
  const term=search.trim().toLowerCase();
  const named=!term||s.student.full_name.toLowerCase().includes(term)||s.student.student_code.toLowerCase().includes(term);
  return named&&(filter==="all"||(filter==="review"&&(s.overdue>0||s.needsRevision>0))||(filter==="active"&&s.inProgress>0)||(filter==="achieved"&&s.achieved>0));
 });
 const totals={goals:goals.length,achieved:goals.filter(x=>x.status==="achieved").length,
  overdue:goals.filter(x=>isOverdue(x,today)).length,revision:goals.filter(x=>x.status==="needs_revision").length};
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif",padding:"22px 16px"}}>
  <div style={{maxWidth:1100,margin:"0 auto"}}>
   <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:20}}>
    <div><BrandLogo/><div style={{fontSize:12,color:"#64748b"}}>TEACHER · STUDENT PROGRESS</div></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <button type="button" style={button} onClick={()=>router.push("/teacher/idp")}>Manage IDP goals</button>
     <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/teacher/dashboard")}>Back to dashboard</button>
    </div>
   </header>
   <h1 style={{fontSize:26,marginBottom:6}}>Student Progress Tracking</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Progress for students assigned to your teacher account. Only approved standard assessments and their existing IDP goals are included. Review dates and percentages are teacher-entered measures, not clinical diagnoses.</p>
   <div style={{display:"flex",gap:8,margin:"14px 0",flexWrap:"wrap"}}>
    <button type="button" style={button} disabled={loading} onClick={()=>void refresh()}>{loading?"Loading...":"Refresh progress"}</button>
   </div>
   {error&&<section role="alert" style={{...card,color:"#b42318",marginBottom:14}}>{error}</section>}
   {!loading&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:16}}>
    {[
     ["Assigned students",students.length],
     ["IDP goals",totals.goals],
     ["Goals achieved",totals.achieved],
     ["Past review date",totals.overdue],
     ["Needs revision",totals.revision]
    ].map(([label,count])=><section key={String(label)} style={card}><small style={{color:"#64748b"}}>{label}</small><div style={{fontSize:26,fontWeight:750,color:"#176b58",marginTop:5}}>{count}</div></section>)}
   </div>
   <section style={{...card,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
    <label style={{fontSize:13}}>Search student or ID <input aria-label="Search student or ID" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or student ID" style={{display:"block",padding:9,marginTop:5,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
    <label style={{fontSize:13}}>Show <select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} style={{display:"block",padding:9,marginTop:5,border:"1px solid #cbd5e1",borderRadius:8}}>
     <option value="all">All assigned students</option>
     <option value="review">Overdue or needs revision</option>
     <option value="active">Goals in progress</option>
     <option value="achieved">Students with achieved goals</option>
    </select></label>
   </section>
   {!matching.length&&<section style={card}>No students match this filter.</section>}
   <div style={{display:"grid",gap:12}}>
    {matching.map(({student,goals:own,overdue,needsRevision,inProgress,achieved})=><section key={student.id} style={card}>
     <h2 style={{fontSize:17,margin:"0 0 5px"}}>{student.full_name} <span style={{fontSize:13,fontWeight:500,color:"#64748b"}}>({student.student_code})</span></h2>
     <p style={{fontSize:12,color:"#64748b"}}>{student.current_class?"Class "+student.current_class+" · ":""}{own.length} IDP goals · {achieved} achieved · {inProgress} in progress · {overdue} past review date · {needsRevision} need revision</p>
     {!own.length?<p style={{fontSize:13}}>No goals have been created from approved assessments yet.</p>:
      <div style={{display:"grid",gap:8}}>{own.map(g=><div key={g.id} style={{padding:10,border:"1px solid #e2e8f0",borderRadius:9}}>
       <strong style={{fontSize:13}}>{g.title}</strong>
       <p style={{fontSize:12,margin:"6px 0"}}>{statusLabels[g.status]||g.status} · Current: {g.current_percent===null?"Not measured":g.current_percent+"%"} · Target: {g.target_percent===null?"Not set":g.target_percent+"%"} · Review: {g.target_date?dateText(g.target_date):"Not scheduled"}{isOverdue(g,today)?" · Review date passed":""}</p>
       {g.current_percent!==null&&<div role="progressbar" aria-label={"Current progress for "+g.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.current_percent} style={{height:8,background:"#e2e8f0",borderRadius:9,overflow:"hidden"}}><div style={{width:g.current_percent+"%",height:"100%",background:"#176b58"}}/></div>}
      </div>)}</div>}
     <button type="button" style={{...button,marginTop:12}} onClick={()=>router.push("/teacher/idp")}>Open IDP editor</button>
    </section>)}
   </div></>}
  </div>
 </main>;
}
