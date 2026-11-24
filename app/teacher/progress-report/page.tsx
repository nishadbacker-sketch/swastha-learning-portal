"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";

type Student={id:string;full_name:string;student_code:string|null;current_class:string|null};
type Assessment={id:string;student_id:string;assessment_level:string;assigned_at:string};
type Result={assignment_id:string;overall_score:number|null;reviewed_at:string|null;teacher_feedback:string|null;recommendations:string|null};
type Goal={id:string;assignment_id:string;title:string;status:string;baseline_percent:number|null;current_percent:number|null;target_percent:number|null;target_date:string|null;progress_notes:string};
type Activity={id:string;student_id:string;activity_id:string;status:string;due_date:string|null;assigned_at:string};
type ActivityName={id:string;title:string};
type Change={id:number;goal_id:string;recorded_at:string;old_current_percent:number|null;new_current_percent:number|null;old_status:string|null;new_status:string|null};
const action:React.CSSProperties={border:0,borderRadius:8,padding:"10px 14px",background:"#176b58",color:"#fff",fontWeight:700,cursor:"pointer"};
const card:React.CSSProperties={padding:15,border:"1px solid #dce8e1",background:"#fff",borderRadius:12,marginBottom:12};
const fmt=(date:string|null)=>date?new Date(date.length===10?date+"T00:00:00":date).toLocaleDateString("en-IN"):"Not recorded";
const batches=<T,>(items:T[],n=100)=>Array.from({length:Math.ceil(items.length/n)},(_,i)=>items.slice(i*n,(i+1)*n));
const localToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()).replace(/\//g,"-");

export default function TeacherProgressReport(){
 const router=useRouter();
 const [students,setStudents]=useState<Student[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [goals,setGoals]=useState<Goal[]>([]);
 const [activities,setActivities]=useState<Activity[]>([]);
 const [activityNames,setActivityNames]=useState<Record<string,string>>({});
 const [changes,setChanges]=useState<Change[]>([]);
 const [studentId,setStudentId]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  const db=supabase;
  if(!db){setError("Database unavailable.");setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await db.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:role,error:roleError}=await db.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(roleError||role?.role!=="teacher"){router.replace("/login");return;}
   const {data:teacher,error:teacherError}=await db.from("teachers").select("id,status").eq("user_id",auth.user.id).single();
   if(teacherError||!teacher||teacher.status!=="active")throw Error("An active teacher account is required.");
   const {data:links,error:linksError}=await db.from("teacher_assignments").select("student_id").eq("teacher_id",teacher.id);
   if(linksError)throw linksError;
   const ids=[...new Set((links||[]).map(a=>a.student_id))];
   if(!ids.length){setStudents([]);setAssessments([]);setResults([]);setGoals([]);setActivities([]);setActivityNames({});setChanges([]);return;}
   const loadedStudents:Student[]=[];
   const loadedAssessments:Assessment[]=[];
   const loadedActivities:Activity[]=[];
   for(const chunk of batches(ids)){
    const [s,a,activity]=await Promise.all([
     db.from("students").select("id,full_name,student_code,current_class").in("id",chunk),
     db.from("assessment_assignments").select("id,student_id,assessment_level,assigned_at").in("student_id",chunk).eq("status","reviewed"),
     db.from("student_activity_assignments").select("id,student_id,activity_id,status,due_date,assigned_at").in("student_id",chunk)
    ]);
    if(s.error||a.error||activity.error)throw Error("Unable to load assigned student data.");
    loadedStudents.push(...(s.data||[]) as Student[]);
    loadedAssessments.push(...(a.data||[]) as Assessment[]);
    loadedActivities.push(...(activity.data||[]) as Activity[]);
   }
   const loadedResults:Result[]=[];
   const loadedGoals:Goal[]=[];
   for(const chunk of batches(loadedAssessments.map(a=>a.id))){
    const [r,g]=await Promise.all([
     db.from("assessment_results").select("assignment_id,overall_score,reviewed_at,teacher_feedback,recommendations").in("assignment_id",chunk),
     db.from("student_development_goals").select("id,assignment_id,title,status,baseline_percent,current_percent,target_percent,target_date,progress_notes").in("assignment_id",chunk)
    ]);
    if(r.error||g.error)throw Error("Unable to load approved assessment or IDP details.");
    loadedResults.push(...(r.data||[]) as Result[]);
    loadedGoals.push(...(g.data||[]) as Goal[]);
   }
   const loadedChanges:Change[]=[];
   for(const chunk of batches(loadedGoals.map(g=>g.id))){
    const r=await db.from("student_goal_progress_history").select("id,goal_id,recorded_at,old_current_percent,new_current_percent,old_status,new_status").in("goal_id",chunk).order("recorded_at",{ascending:false}).limit(1000);
    if(r.error)throw Error("Unable to load IDP progress history.");
    loadedChanges.push(...(r.data||[]) as Change[]);
   }
   const labels:Record<string,string>={};
   for(const chunk of batches([...new Set(loadedActivities.map(a=>a.activity_id))])){
    const a=await db.from("learning_activities").select("id,title").in("id",chunk);
    if(a.error)throw Error("Unable to load learning activity names.");
    for(const item of (a.data||[]) as ActivityName[])labels[item.id]=item.title;
   }
   loadedStudents.sort((a,b)=>a.full_name.localeCompare(b.full_name));
   setStudents(loadedStudents);setAssessments(loadedAssessments);setActivities(loadedActivities);
   setResults(loadedResults);setGoals(loadedGoals);setActivityNames(labels);setChanges(loadedChanges);
  }catch(e){setError(e instanceof Error?e.message:"Could not load progress report.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 const selected=students.find(s=>s.id===studentId)||students[0];
 const report=useMemo(()=>{
  if(!selected)return null;
  const ownAssessments=assessments.filter(a=>a.student_id===selected.id).sort((a,b)=>a.assigned_at.localeCompare(b.assigned_at));
  const approvedIds=new Set(ownAssessments.map(a=>a.id));
  const ownResults=results.filter(r=>approvedIds.has(r.assignment_id));
  const ownGoals=goals.filter(g=>approvedIds.has(g.assignment_id));
  const goalIds=new Set(ownGoals.map(g=>g.id));
  const ownChanges=changes.filter(c=>goalIds.has(c.goal_id)).sort((a,b)=>b.recorded_at.localeCompare(a.recorded_at));
  const ownActivities=activities.filter(a=>a.student_id===selected.id);
  const scores=ownAssessments.flatMap(a=>ownResults.filter(r=>r.assignment_id===a.id&&r.overall_score!==null).map(r=>({date:r.reviewed_at||a.assigned_at,score:r.overall_score!,level:a.assessment_level})));
  const today=localToday();
  return {ownAssessments,ownResults,ownGoals,ownChanges,ownActivities,scores,
    achieved:ownGoals.filter(g=>g.status==="achieved").length,
    dueReview:ownGoals.filter(g=>g.target_date&&g.target_date<today&&g.status!=="achieved").length,
    completedActivities:ownActivities.filter(a=>a.status==="completed").length};
 },[selected,assessments,results,goals,changes,activities]);
 return <main style={{background:"#f8faf7",color:"#183a35",minHeight:"100vh",padding:"24px 16px",fontFamily:"Arial,sans-serif"}}>
  <style>{`@media print { .no-print {display:none!important} body {background:white!important} main {padding:0!important} .print-section {break-inside:avoid} }`}</style>
  <div style={{maxWidth:1000,margin:"auto"}}>
   <header className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
    <BrandLogo/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <button style={action} onClick={()=>void load()} disabled={loading}>Refresh</button>
     <button style={{...action,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/teacher/student-progress")}>Back to Progress</button>
    </div>
   </header>
   <h1 style={{fontSize:26,marginBottom:5}}>Student Development Progress Report</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Teacher-only view of approved assessment results, IDP goals, learning activities, and dated progress changes. Scores reflect each assessment's own scale and are not directly comparable across different levels or assessment versions.</p>
   {error&&<section role="alert" style={{...card,color:"#b42318"}}>{error}</section>}
   {loading?<p>Loading progress report...</p>:!students.length?<section style={card}>No students assigned to this teacher.</section>:<>
    <div className="no-print" style={{...card,display:"flex",alignItems:"end",gap:12,flexWrap:"wrap"}}>
     <label style={{fontSize:13}}>Select assigned student
      <select aria-label="Select assigned student" value={selected?.id||""} onChange={e=>setStudentId(e.target.value)} style={{display:"block",padding:10,borderRadius:8,border:"1px solid #cbd5e1",minWidth:220,marginTop:5}}>
       {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.student_code||"ID pending"})</option>)}
      </select>
     </label>
     <button style={action} onClick={()=>window.print()}>Print / Save as PDF</button>
    </div>
    {selected&&report&&<>
     <section style={{...card,background:"#edf7f1"}} className="print-section">
      <h2 style={{fontSize:19,margin:"0 0 5px"}}>{selected.full_name} ({selected.student_code||"ID pending"})</h2>
      <p style={{margin:0,fontSize:12}}>Class: {selected.current_class||"Not recorded"} · Report date: {fmt(localToday())}</p>
     </section>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:9,marginBottom:12}}>
      {[
       ["Reviewed assessments",report.ownAssessments.length],
       ["IDP goals",report.ownGoals.length],
       ["Goals achieved",report.achieved],
       ["Past review date",report.dueReview],
       ["Activities completed",report.completedActivities+" / "+report.ownActivities.length]
      ].map(([name,value])=><section key={String(name)} style={{...card,marginBottom:0}}><small>{name}</small><h3 style={{margin:"6px 0 0",color:"#176b58"}}>{value}</h3></section>)}
     </div>
     <section style={card} className="print-section">
      <h2 style={{fontSize:18}}>Approved Assessment Results</h2>
      {!report.ownAssessments.length?<p>No approved assessments yet.</p>:report.ownAssessments.map(a=>{
       const r=report.ownResults.find(x=>x.assignment_id===a.id);
       return <div key={a.id} style={{borderTop:"1px solid #e2e8f0",padding:"10px 0",fontSize:13}}>
        <strong>{a.assessment_level} · {fmt(r?.reviewed_at||a.assigned_at)}</strong>
        <p style={{margin:"5px 0"}}>Recorded overall score: {r?.overall_score===null||r?.overall_score===undefined?"Not recorded":r.overall_score}</p>
        {r?.teacher_feedback&&<p style={{whiteSpace:"pre-wrap"}}>Teacher feedback: {r.teacher_feedback}</p>}
        {r?.recommendations&&<p style={{whiteSpace:"pre-wrap"}}>Recommendations: {r.recommendations}</p>}
       </div>;
      })}
     </section>
     <section style={card} className="print-section">
      <h2 style={{fontSize:18}}>Individual Development Goals</h2>
      {!report.ownGoals.length?<p>No goals added from approved assessments yet.</p>:report.ownGoals.map(g=><div key={g.id} style={{borderTop:"1px solid #e2e8f0",padding:"10px 0",fontSize:13}}>
       <strong>{g.title}</strong> · {g.status.replace(/_/g," ")}
       <p style={{margin:"5px 0"}}>Baseline: {g.baseline_percent??"Not set"}% · Current: {g.current_percent??"Not set"}% · Target: {g.target_percent??"Not set"}% · Review: {fmt(g.target_date)}</p>
       {g.current_percent!==null&&<div role="progressbar" aria-label={"Achievement: "+g.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.current_percent} style={{height:7,background:"#e2e8f0",borderRadius:8}}><div style={{height:"100%",width:g.current_percent+"%",background:"#176b58",borderRadius:8}}/></div>}
       {g.progress_notes&&<p style={{whiteSpace:"pre-wrap"}}>Progress notes: {g.progress_notes}</p>}
      </div>)}
     </section>
     <section style={card} className="print-section">
      <h2 style={{fontSize:18}}>Assigned Learning Activities</h2>
      {!report.ownActivities.length?<p>No activities assigned.</p>:report.ownActivities.map(a=><div key={a.id} style={{padding:"7px 0",borderTop:"1px solid #e2e8f0",fontSize:13}}>
       <strong>{activityNames[a.activity_id]||"Assigned learning activity"}</strong> · {a.status} · Due: {fmt(a.due_date)}
      </div>)}
     </section>
     <section style={card} className="print-section">
      <h2 style={{fontSize:18}}>Goal Progress History</h2>
      {!report.ownChanges.length?<p>No goal progress updates recorded yet.</p>:report.ownChanges.slice(0,100).map(c=><p key={c.id} style={{fontSize:12,borderTop:"1px solid #e2e8f0",paddingTop:7}}>
       {fmt(c.recorded_at)} · {c.old_status||"—"} → {c.new_status||"—"} · {c.old_current_percent??"Not set"}% → {c.new_current_percent??"Not set"}%
      </p>)}
      {report.ownChanges.length>100&&<p style={{fontSize:12}}>Showing the 100 most recent changes.</p>}
     </section>
     <p style={{fontSize:11,color:"#64748b"}}>For developmental support planning only. Review assessment scores alongside their relevant scoring guide; they are not medical diagnoses.</p>
    </>}
   </>}
  </div>
 </main>;
}
