"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { CHECKLIST_DATA, type AssessmentLevel } from "../../../../lib/assessment-data";

type Assignment={id:string;student_id:string;assessment_level:AssessmentLevel;status:string;assigned_at:string;due_date:string|null};
type Student={full_name:string;current_class:string|null};
type Response={question_id:string;score:string|null;observation:string|null};
type PriorReview={teacher_feedback:string|null;recommendations:string|null;strengths:unknown;support_needs:unknown};
type Question={id:string;title:string;domain:string;area:string;score:string|null;observation:string};
const card:React.CSSProperties={background:"#fff",padding:20,border:"1px solid #dce8e1",borderRadius:12,marginBottom:18};
const btn:React.CSSProperties={border:0,borderRadius:8,background:"#176b58",padding:"11px 16px",color:"#fff",fontWeight:700,cursor:"pointer"};
const field:React.CSSProperties={width:"100%",boxSizing:"border-box",minHeight:95,padding:12,borderRadius:8,border:"1px solid #cbd5e1",fontFamily:"inherit"};
const date=(value:string|null)=>value?new Date(value).toLocaleDateString("en-IN"):"—";
function lines(raw:string){return raw.split("\n").map(x=>x.trim()).filter(Boolean);}
function readList(value:unknown){return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string").join("\n"):"";}

const scoreLabels:Record<string,string>={
 "0":"Not demonstrated",
 "1":"Substantial support",
 "2":"Developing",
 "3":"Independent",
 "NA":"Not assessed"
};
const scoreColors:Record<string,{bg:string;fg:string}>={
 "0":{bg:"#fee2e2",fg:"#991b1b"},
 "1":{bg:"#ffedd5",fg:"#9a3412"},
 "2":{bg:"#dbeafe",fg:"#1d4ed8"},
 "3":{bg:"#dcfce7",fg:"#166534"},
 "NA":{bg:"#f1f5f9",fg:"#475569"}
};
function ScoringBadge({score}:{score:string|null}){
 const value=score===null?"":score;
 const label=scoreLabels[value]||"No answer recorded";
 const colors=scoreColors[value]||{bg:"#fff1f2",fg:"#b42318"};
 const numeric=["0","1","2","3"].includes(value);
 return <div style={{display:"inline-flex",alignItems:"center",gap:9,flexWrap:"wrap",padding:"8px 12px",borderRadius:10,background:colors.bg,color:colors.fg}}>
  <strong style={{fontSize:19}}>{numeric?value+" / 3":value==="NA"?"NA":"—"}</strong>
  <span style={{fontSize:13,fontWeight:600}}>{label}</span>
 </div>;
}

export default function TeacherAssessmentReview(){
 const router=useRouter();const params=useParams<{id:string}>();
 const [assignment,setAssignment]=useState<Assignment|null>(null);
 const [student,setStudent]=useState<Student|null>(null);
 const [responses,setResponses]=useState<Response[]>([]);
 const [feedback,setFeedback]=useState("");
 const [recommendations,setRecommendations]=useState("");
 const [strengths,setStrengths]=useState("");
 const [supportNeeds,setSupportNeeds]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [confirm,setConfirm]=useState(false);
 useEffect(()=>{async function load(){
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(roleError||!role||!["teacher","admin"].includes(role.role))throw new Error("Only authorised teachers and administrators can review assessments.");
   const {data:a,error:ae}=await supabase.from("assessment_assignments").select("id,student_id,assessment_level,status,assigned_at,due_date").eq("id",params.id).single();
   if(ae||!a)throw new Error("Assignment not found or access denied.");
   if(!["submitted","reviewed"].includes(a.status))throw new Error("Only submitted assessments can be reviewed.");
   if(!["LP","UP","HS","HSS"].includes(a.assessment_level))throw new Error("Unsupported assessment level.");
   const [s,r,prior]=await Promise.all([
    supabase.from("students").select("full_name,current_class").eq("id",a.student_id).single(),
    supabase.from("assessment_responses").select("question_id,score,observation").eq("assignment_id",a.id),
    supabase.from("assessment_results").select("teacher_feedback,recommendations,strengths,support_needs").eq("assignment_id",a.id).maybeSingle()
   ]);
   if(s.error||!s.data)throw new Error("Could not load student details.");
   if(r.error)throw new Error(r.error.message);
   if(prior.error)throw new Error(prior.error.message);
   setAssignment(a as Assignment);setStudent(s.data as Student);setResponses((r.data||[]) as Response[]);
   const saved=prior.data as PriorReview|null;
   if(saved){setFeedback(saved.teacher_feedback||"");setRecommendations(saved.recommendations||"");setStrengths(readList(saved.strengths));setSupportNeeds(readList(saved.support_needs));}
  }catch(e){setError(e instanceof Error?e.message:"Unable to open review.");}
  finally{setLoading(false);}
 }load();},[params.id,router]);
 const questions=useMemo<Question[]>(()=>{
  if(!assignment)return [];
  const byId=new Map(responses.map(r=>[r.question_id,r]));
  return CHECKLIST_DATA[assignment.assessment_level].areas.flatMap(area=>area.subDomains.flatMap(domain=>domain.items.map((title,index)=>{
   const id=domain.id+"_"+(index+1),response=byId.get(id);
   return {id,title,domain:domain.title,area:area.title,score:response?.score||null,observation:response?.observation||""};
  })));
 },[assignment,responses]);
 const answered=questions.filter(q=>["0","1","2","3"].includes(q.score||""));
 const total=answered.reduce((sum,q)=>sum+Number(q.score),0);
 const average=answered.length?Math.round(total/answered.length*100)/100:null;
 const na=questions.filter(q=>q.score==="NA").length;
 const domains=useMemo(()=>{
  const map=new Map<string,{name:string;area:string;sum:number;count:number;na:number}>();
  for(const q of questions){
   let d=map.get(q.domain);
   if(!d){d={name:q.domain,area:q.area,sum:0,count:0,na:0};map.set(q.domain,d);}
   if(["0","1","2","3"].includes(q.score||"")){d.sum+=Number(q.score);d.count++;}
   if(q.score==="NA")d.na++;
  }
  return Array.from(map.values());
 },[questions]);
 const save=async(approve:boolean)=>{
  if(!supabase||!assignment||busy)return;
  if(assignment.status!=="submitted"){setError("This assessment is already reviewed.");return;}
  if(average===null){setError("At least one scored answer is required before saving a review.");return;}
  if(!feedback.trim()){setError("Enter teacher observations before saving.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   const domainScores:Object=Object.fromEntries(domains.filter(d=>d.count).map(d=>[d.name,Math.round(d.sum/d.count*100)/100]));
   const chartData:Object={domains:domains.map(d=>({name:d.name,score:d.count?Math.round(d.sum/d.count*100)/100:null,answered:d.count,na:d.na}))};
   const {error:saveError}=await supabase.rpc("save_assessment_review",{
    p_assignment_id:assignment.id,p_overall_score:average,p_domain_scores:domainScores,p_chart_data:chartData,
    p_strengths:lines(strengths),p_support_needs:lines(supportNeeds),
    p_teacher_feedback:feedback.trim(),p_recommendations:recommendations.trim()
   });
   if(saveError)throw saveError;
   if(approve){
    const {error:approvalError}=await supabase.rpc("approve_assessment",{p_assignment_id:assignment.id});
    if(approvalError)throw approvalError;
    setAssignment(a=>a?{...a,status:"reviewed"}:a);
    setConfirm(false);setMessage("Assessment approved. The parent can now view the results.");
   }else setMessage("Review saved privately. Parent results remain unpublished until approval.");
  }catch(e){setError(e instanceof Error?e.message:"Review could not be saved.");}
  finally{setBusy(false);}
 };
 if(loading)return <main style={{padding:32}}>Loading submitted assessment...</main>;
 if(error&&!assignment)return <main style={{padding:32}}><h2>Assessment Review</h2><p role="alert">{error}</p><button style={btn} onClick={()=>router.push("/teacher/dashboard")}>Back to Teacher Dashboard</button></main>;
 if(!assignment||!student)return null;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{background:"#0f4c5c",color:"white",padding:"18px 5%",display:"flex",gap:14,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
   <strong>Swastha Learning Clinic · Teacher Assessment Review</strong>
   <button style={{...btn,background:"#fff",color:"#0f4c5c"}} onClick={()=>router.push("/teacher/dashboard")}>Back to Dashboard</button>
  </header>
  <div style={{maxWidth:1080,margin:"auto",padding:"25px 16px 70px"}}>
   <section style={card}><h1 style={{marginTop:0}}>Review Submitted Assessment</h1>
    <p><strong>Student:</strong> {student.full_name} · <strong>Class:</strong> {student.current_class||"—"} · <strong>Level:</strong> {assignment.assessment_level}</p>
    <p><strong>Status:</strong> {assignment.status} · <strong>Assigned:</strong> {date(assignment.assigned_at)} · <strong>Due:</strong> {date(assignment.due_date)}</p>
    <p><strong>Automatically calculated rating total:</strong> {total} / {answered.length*3} across {answered.length} numerically scored questions · <strong>NA:</strong> {na} · <strong>Average:</strong> {average===null?"Not scored":average.toFixed(2)+"/3"} · <strong>Unanswered:</strong> {questions.length-answered.length-na}</p>
    <div style={{display:"flex",gap:9,flexWrap:"wrap",margin:"12px 0"}}>
     {["0","1","2","3","NA"].map(value=><span key={value} style={{padding:"7px 10px",borderRadius:8,background:scoreColors[value].bg,color:scoreColors[value].fg,fontSize:13}}><strong>{value==="NA"?"NA":value+"/3"}</strong> · {scoreLabels[value]}: {questions.filter(q=>q.score===value).length}</span>)}
    </div>
    <p style={{color:"#64748b",fontSize:13}}>Read-only student answers. Scores are calculated from submitted ratings; NA is excluded. No response can be changed from this review page.</p>
   </section>
   {error&&<section role="alert" style={{...card,color:"#b42318",background:"#fff4f3"}}>{error}</section>}
   {message&&<section role="status" style={{...card,background:"#eaf6ed",color:"#176b58"}}>{message}</section>}
   <section style={card}><h2>Domain-wise Rating Summary</h2>
    {domains.map(d=><div key={d.name} style={{padding:"10px 0",borderBottom:"1px solid #e2e8f0"}}>
     <strong>{d.name}</strong><p style={{margin:"5px 0",fontSize:13}}>Auto-calculated total: <strong>{d.sum} / {d.count*3}</strong> · Rated {d.count} · NA {d.na} · Average <strong>{d.count?(d.sum/d.count).toFixed(2)+"/3":"Not scored"}</strong></p>
    </div>)}
   </section>
   <section style={card}><h2>Student Responses</h2>
    {questions.map(q=><div key={q.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}>
     <small style={{color:"#64748b"}}>{q.area} / {q.domain} · {q.id}</small>
     <p style={{fontWeight:700,margin:"6px 0"}}>{q.title}</p>
     <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",margin:"8px 0"}}><span style={{fontSize:13,color:"#475569"}}>Recorded question score</span><ScoringBadge score={q.score}/></div>
     {q.observation&&<p style={{whiteSpace:"pre-wrap",margin:"6px 0"}}>Parent observation: {q.observation}</p>}
    </div>)}
   </section>
   <section style={card}><h2>Teacher Review & Recommendations</h2>
    <label style={{display:"block",marginBottom:15}}>Teacher feedback / observation *<textarea style={{...field,display:"block",marginTop:6}} value={feedback} maxLength={5000} onChange={e=>setFeedback(e.target.value)} disabled={assignment.status==="reviewed"} placeholder="Child's strengths, learning patterns and teacher observations"/></label>
    <label style={{display:"block",marginBottom:15}}>Observed strengths (one per line)<textarea style={{...field,display:"block",marginTop:6}} value={strengths} maxLength={4000} onChange={e=>setStrengths(e.target.value)} disabled={assignment.status==="reviewed"}/></label>
    <label style={{display:"block",marginBottom:15}}>Areas needing support (one per line)<textarea style={{...field,display:"block",marginTop:6}} value={supportNeeds} maxLength={4000} onChange={e=>setSupportNeeds(e.target.value)} disabled={assignment.status==="reviewed"}/></label>
    <label style={{display:"block",marginBottom:15}}>Recommended activities / next steps<textarea style={{...field,display:"block",marginTop:6}} value={recommendations} maxLength={5000} onChange={e=>setRecommendations(e.target.value)} disabled={assignment.status==="reviewed"}/></label>
    {assignment.status==="submitted"?<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
     <button style={{...btn,background:"#0f4c5c"}} disabled={busy||average===null} onClick={()=>save(false)}>{busy?"Saving...":"Save Review (Not Published)"}</button>
     <button style={btn} disabled={busy||average===null} onClick={()=>{setError("");setConfirm(true);}}>Approve & Publish to Parent</button>
    </div>:<p style={{color:"#176b58",fontWeight:700}}>This assessment has been approved. Results are visible to the parent.</p>}
    {confirm&&<div style={{border:"1px solid #d0dce3",padding:18,borderRadius:10,marginTop:17,background:"#fffaf0"}}>
     <strong>Publish reviewed results to parent?</strong><p>This will lock the review and make the score and feedback available to the parent.</p>
     <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button style={btn} disabled={busy} onClick={()=>save(true)}>{busy?"Publishing...":"Confirm Approval"}</button>
      <button style={{...btn,background:"#64748b"}} disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button>
     </div>
    </div>}
   </section>
   <p style={{color:"#64748b",fontSize:12}}>This is an educational assessment, not a clinical or psychological diagnosis.</p>
  </div>
 </main>;
}
