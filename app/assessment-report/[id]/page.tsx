"use client";

import BrandLogo from "../../components/brand-logo";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { CHECKLIST_DATA, type AssessmentLevel } from "../../../lib/assessment-data";
import {checklistForAssignment} from "../../../lib/assessment-question-versions";
import AssessmentAnalytics from "../../teacher/assessment-analytics";
import DevelopmentPlan from "../../components/development-plan";
import ShareReportWhatsApp from "../../components/share-report-whatsapp";

type Assignment={id:string;student_id:string;assessment_level:AssessmentLevel;status:string;assigned_at:string;due_date:string|null};
type Student={id:string;student_code:string;full_name:string;current_class:string|null};
type Review={overall_score:number|null;teacher_feedback:string|null;recommendations:string|null;strengths:unknown;support_needs:unknown;reviewed_at:string|null};
type Answer={question_id:string;score:string|null;observation:string|null};
const card:React.CSSProperties={background:"#fff",padding:16,marginBottom:14,border:"1px solid #e2e8f0",borderRadius:16,boxShadow:"0 1px 3px rgba(15,23,42,.04)"};
const button:React.CSSProperties={background:"#16697a",border:0,color:"white",fontWeight:700,borderRadius:9,padding:"10px 15px",cursor:"pointer"};
function list(value:unknown){return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[];}
const scoreTitle=(v:string|null)=>v==="0"?"Not demonstrated":v==="1"?"Substantial support":v==="2"?"Developing":v==="3"?"Independent":v==="NA"?"Not assessed":"Not answered";

export default function AssessmentReportPage(){
 const router=useRouter(),params=useParams<{id:string}>();
 const [role,setRole]=useState("");
 const [assignment,setAssignment]=useState<Assignment|null>(null);
 const [student,setStudent]=useState<Student|null>(null);
 const [questionBank,setQuestionBank]=useState<(typeof CHECKLIST_DATA)[AssessmentLevel]|null>(null);
 const [review,setReview]=useState<Review|null>(null);
 const [answers,setAnswers]=useState<Answer[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{async function load(){
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  try{
   const {data:auth,error:authErr}=await supabase.auth.getUser();
   if(authErr||!auth.user){router.replace("/login");return;}
   const {data:access,error:accessErr}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(accessErr||!access||!["parent","teacher","admin"].includes(access.role))throw new Error("You do not have permission to view this report.");
   const {data:a,error:assErr}=await supabase.from("assessment_assignments").select("id,student_id,assessment_level,status,assigned_at,due_date").eq("id",params.id).single();
   if(assErr||!a)throw new Error("Assessment not found or access denied.");
   if(a.status!=="reviewed")throw new Error("This report will become available after teacher approval.");
   if(!["LP","UP","HS","HSS"].includes(a.assessment_level))throw new Error("Unsupported assessment level.");
   // The database's RLS policies restrict assignments, responses and results to permitted users.
   const [s,r,answersResult]=await Promise.all([
    supabase.from("students").select("id,student_code,full_name,current_class").eq("id",a.student_id).single(),
    supabase.from("assessment_results").select("overall_score,teacher_feedback,recommendations,strengths,support_needs,reviewed_at").eq("assignment_id",a.id).maybeSingle(),
    supabase.from("assessment_responses").select("question_id,score,observation").eq("assignment_id",a.id)
   ]);
   if(s.error||!s.data)throw new Error("Student data is unavailable.");
   if(r.error)throw new Error(r.error.message);
   if(!r.data)throw new Error("No approved teacher results are available for this assessment.");
   if(answersResult.error)throw new Error(answersResult.error.message);
   setQuestionBank(await checklistForAssignment(a.assessment_level as AssessmentLevel,a.assigned_at));
   setRole(access.role);setAssignment(a as Assignment);setStudent(s.data as Student);setReview(r.data as Review);setAnswers((answersResult.data||[]) as Answer[]);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load this assessment report.");}
  finally{setLoading(false);}
 }load();},[params.id,router]);
 const back=()=>router.push(role==="parent"?"/parent/dashboard":role==="admin"?"/admin/dashboard":"/teacher/dashboard");
 if(loading)return <main style={{padding:36}}>Loading assessment report...</main>;
 if(!assignment||!student||!review)return <main style={{padding:36,fontFamily:"Arial,sans-serif"}}><h1>Assessment Report</h1><p role="alert">{error||"Report not found."}</p><button style={button} onClick={()=>router.back()}>Go Back</button></main>;
 const responses=new Map(answers.map(a=>[a.question_id,a]));
 const details=(questionBank||CHECKLIST_DATA[assignment.assessment_level]).areas.flatMap(area=>area.subDomains.flatMap(domain=>domain.items.map((q,index)=>{
  const id=domain.id+"_"+(index+1),a=responses.get(id);
  return {id,area:area.title,domain:domain.title,question:q,score:a?.score??null,observation:a?.observation||""};
 })));
 return <main style={{minHeight:"100vh",background:"#f8fafc",color:"#1e293b",fontFamily:"Arial,sans-serif"}}>
  <header className="no-print" style={{padding:"15px 4%",background:"#0f4c5c",color:"white",display:"flex",gap:12,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
   <span style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><BrandLogo /> <strong>Approved Assessment Report</strong></span>
   <div style={{display:"flex",gap:9}}>
    <button style={{...button,background:"white",color:"#0f4c5c"}} onClick={back}>Back to Dashboard</button>
    <button style={{...button,background:"#2a9d8f"}} onClick={()=>window.print()}>Print / Save PDF</button>
    <ShareReportWhatsApp reportPath={"/assessment-report/"+assignment.id}/>
   </div>
  </header>
  <div style={{maxWidth:1180,margin:"auto",padding:"24px 15px 70px"}}>
   <section style={card}>
    <h1 style={{margin:"0 0 7px",fontSize:25,color:"#0f4c5c"}}>Complete Student Assessment Report</h1>
    <p><strong>Student:</strong> {student.full_name} · {student.student_code} · <strong>Class:</strong> {student.current_class||"Not available"} · <strong>Level:</strong> {assignment.assessment_level}</p>
    <p><strong>Reviewed:</strong> {review.reviewed_at?new Date(review.reviewed_at).toLocaleDateString("en-IN"):"Not recorded"} · <strong>Status:</strong> Teacher Approved</p>
   </section>
   <DevelopmentPlan assignmentId={assignment.id} canEdit={role==="teacher"||role==="admin"}/>
   <AssessmentAnalytics hideSelector assessments={[assignment]} students={[{id:student.id,full_name:student.full_name,student_code:student.student_code}]}/>
   <section style={card}>
    <h2>Approved Teacher Observations & Recommendations</h2>
    <h3>Overall teacher-approved rating</h3>
    <p>{review.overall_score===null?"Not scored":Number(review.overall_score).toFixed(2)+" / 3"} {review.overall_score===null?"":"("+Math.round(Number(review.overall_score)/3*100)+"%)"}</p>
    <h3>Observed Strengths (Teacher Notes)</h3>
    {list(review.strengths).length?<ul>{list(review.strengths).map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>No separate teacher strengths notes recorded.</p>}
    <h3>Areas Requiring Support (Teacher Notes)</h3>
    {list(review.support_needs).length?<ul>{list(review.support_needs).map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>No separate teacher support notes recorded.</p>}
    <h3>Teacher Feedback</h3>
    <p style={{whiteSpace:"pre-wrap"}}>{review.teacher_feedback||"Not recorded."}</p>
    <h3>Recommended Activities & Next Steps</h3>
    <p style={{whiteSpace:"pre-wrap"}}>{review.recommendations||"Not recorded."}</p>
   </section>
   <section style={card}>
    <h2>Complete Question-by-Question Assessment Record</h2>
    <p style={{fontSize:13,color:"#64748b"}}>Read-only responses, including scores and any recorded observations.</p>
    {details.map(q=><div key={q.id} style={{padding:"14px 0",borderBottom:"1px solid #e2e8f0",breakInside:"avoid"}}>
     <small style={{color:"#64748b"}}>{q.area} · {q.domain}</small>
     <p style={{fontWeight:700,margin:"6px 0"}}>{q.question}</p>
     <p style={{margin:"4px 0"}}>Score: <strong>{["0","1","2","3"].includes(q.score||"")?q.score+" / 3":q.score==="NA"?"NA":"—"}</strong> · {scoreTitle(q.score)}</p>
     {q.observation&&<p style={{whiteSpace:"pre-wrap"}}>Recorded observation: {q.observation}</p>}
    </div>)}
   </section>
   <p style={{fontSize:12,color:"#64748b"}}>This report is an educational screening and development-planning aid, not a medical or psychological diagnosis.</p>
  </div>
  <style jsx global>{`@media print { .no-print {display:none!important;} body {background:white!important;} main {background:white!important;} section {box-shadow:none!important;} }`}</style>
 </main>;
}
