"use client";

import BrandLogo from "../../components/brand-logo";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import DevelopmentPlan from "../../components/development-plan";

type Student = {id:string;student_code:string;full_name:string;current_class:string|null};
type Assessment = {id:string;student_id:string;assessment_level:string;assigned_at:string;status:string};
const card:React.CSSProperties={padding:16,background:"#fff",border:"1px solid #dce8e1",borderRadius:13,marginBottom:14};
const button:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:8,padding:"10px 15px",fontWeight:700,cursor:"pointer",fontSize:13};

export default function TeacherIDPPage(){
 const router=useRouter();
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [students,setStudents]=useState<Student[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [childId,setChildId]=useState("");
 const [assessmentId,setAssessmentId]=useState("");

 useEffect(()=>{
  let live=true;
  setChildId(new URLSearchParams(window.location.search).get("student")||"");
  async function load(){
   if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
   try{
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user){router.replace("/login");return;}
    const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
    if(roleError||!role||role.role!=="teacher")throw Error("Only teachers can manage development plans here.");
    const {data:teacher,error:teacherError}=await supabase.from("teachers").select("id,status").eq("user_id",auth.user.id).single();
    if(teacherError||!teacher||teacher.status!=="active")throw Error("Teacher account is not active.");
    const {data:links,error:linksError}=await supabase.from("teacher_assignments").select("student_id").eq("teacher_id",teacher.id);
    if(linksError)throw linksError;
    const ids=[...new Set((links||[]).map(x=>x.student_id))];
    if(!ids.length){if(live){setStudents([]);setAssessments([]);}return;}
    const [s,a]=await Promise.all([
     supabase.from("students").select("id,student_code,full_name,current_class").in("id",ids).order("full_name"),
     supabase.from("assessment_assignments").select("id,student_id,assessment_level,assigned_at,status").in("student_id",ids).eq("status","reviewed").order("assigned_at",{ascending:false}),
    ]);
    if(s.error)throw s.error;
    if(a.error)throw a.error;
    if(live){setStudents((s.data||[]) as Student[]);setAssessments((a.data||[]) as Assessment[]);}
   }catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load development plans.");}
   finally{if(live)setLoading(false);}
  }
  void load();
  return ()=>{live=false;};
 },[router]);

 const readyStudents=useMemo(()=>students.filter(s=>assessments.some(a=>a.student_id===s.id)),[students,assessments]);
 const selectedChild=readyStudents.some(s=>s.id===childId)?childId:readyStudents[0]?.id||"";
 const available=assessments.filter(a=>a.student_id===selectedChild);
 const selected=available.find(a=>a.id===assessmentId)||available[0];
 const student=readyStudents.find(s=>s.id===selectedChild);

 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"15px 5%"}}>
   <div style={{maxWidth:1120,margin:"auto",display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
    <div><BrandLogo /><div style={{fontSize:12,color:"#64748b",marginTop:4}}>INDIVIDUAL DEVELOPMENT PLAN</div></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <button style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/teacher/custom-assessments")}>+ Custom Assessment Builder</button>
     <button style={{...button,background:"#edf2f5",color:"#183a35"}} onClick={()=>router.push("/teacher/dashboard")}>Back to Teacher Dashboard</button>
    </div>
   </div>
  </header>
  <div style={{maxWidth:1120,margin:"auto",padding:"20px 16px 60px"}}>
   <h1 style={{fontSize:26,margin:"0 0 8px"}}>Individual Development Plan (IDP)</h1>
   <p style={{color:"#64748b",fontSize:13}}>Manage targeted learning goals and progress for students with teacher-approved assessments.</p>
   {loading?<p>Loading approved assessments...</p>:error?<section role="alert" style={{...card,color:"#b42318"}}>{error}</section>:!readyStudents.length?<section style={card}><h2>No approved assessments yet</h2><p>Once a student's assessment is reviewed and approved, their development plan can be managed here.</p></section>:<>
    <section style={{...card,background:"#132838",color:"#fff"}}>
      <h2 style={{marginTop:0}}>Development Plan Workspace</h2>
      <p>{readyStudents.length} students with approved assessments · {assessments.length} approved assessment records</p>
      <button type="button" style={button} onClick={()=>router.push("/teacher/student-progress")}>Goal progress & overdue reviews</button>
    </section>
    <section style={card}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:12}}>
      <label style={{fontSize:13,fontWeight:700}}>Select Student
       <select value={selectedChild} onChange={e=>{setChildId(e.target.value);setAssessmentId("");}} style={{display:"block",marginTop:6,padding:10,width:"100%",borderRadius:8,border:"1px solid #cbd5e1"}}>
        {readyStudents.map(s=><option key={s.id} value={s.id}>{s.full_name} · {s.student_code}{s.current_class?" · Class "+s.current_class:""}</option>)}
       </select>
      </label>
      <label style={{fontSize:13,fontWeight:700}}>Approved Assessment
       <select value={selected?.id||""} onChange={e=>setAssessmentId(e.target.value)} style={{display:"block",marginTop:6,padding:10,width:"100%",borderRadius:8,border:"1px solid #cbd5e1"}}>
        {available.map(a=><option key={a.id} value={a.id}>{a.assessment_level} · {new Date(a.assigned_at).toLocaleDateString("en-IN")}</option>)}
       </select>
      </label>
     </div>
    </section>
    {selected&&<div key={selected.id}>
     <section style={{...card,background:"#f3f9f6"}}>
      <strong>{student?.full_name} · {student?.student_code} · {selected.assessment_level} Assessment</strong>
      <p style={{fontSize:12,color:"#64748b",margin:"6px 0 10px"}}>Plan changes are saved to this approved assessment. Parents can view goals and progress in their approved report.</p>
      <button style={{...button,background:"#0f4c5c"}} onClick={()=>router.push("/assessment-report/"+selected.id)}>Open Complete Assessment Report</button>
     </section>
     <DevelopmentPlan assignmentId={selected.id} canEdit/>
    </div>}
   </>}
  </div>
 </main>;
}
