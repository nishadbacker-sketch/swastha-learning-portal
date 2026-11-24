"use client";
import BrandLogo from "../../components/brand-logo";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { CHECKLIST_DATA } from "../../../lib/assessment-data";
import AssessmentAnalytics from "../../teacher/assessment-analytics";
import ParentNotifications from "../../components/parent-notifications";
import ParentProgressSummary from "../../components/parent-progress-summary";
import LearningInsightsCharts from "../../components/learning-insights-charts";
import ParentSessionUpdates from "../../components/parent-session-updates";

type Student={id:string;student_code:string;full_name:string;date_of_birth:string|null;current_class:string|null;status:string};
type Profile={full_name:string|null;phone:string|null;contact_number_differs:boolean;additional_contact_number:string|null};
type Details={title:string;description:string|null};
type Activity={id:string;student_id:string;assigned_at:string;due_date:string|null;status:string;learning_activities:Details[]|Details|null};
type Assessment={id:string;student_id:string;assessment_level:keyof typeof CHECKLIST_DATA;assigned_at:string;due_date:string|null;status:string};
type CustomAssessment={id:string;student_id:string;assigned_at:string;due_date:string|null;status:string;teacher_feedback:string|null;answers:Record<string,{score:string|null;observation:string}>;custom_assessment_templates:{title:string}|{title:string}[]|null};
type Response={assignment_id:string;question_id:string;score:string|null};
type Result={assignment_id:string;overall_score:number|null;domain_scores:Record<string,unknown>;strengths:unknown[];support_needs:unknown[];teacher_feedback:string|null;recommendations:string|null;reviewed_at:string|null};
const green="#176b58",blue="#0284c7",orange="#f97316",gray="#64748b",teal="#2a9d8f";
const card:React.CSSProperties={background:"white",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:14};
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:12};
const btn:React.CSSProperties={background:green,color:"white",border:0,borderRadius:10,padding:"12px 18px",cursor:"pointer",fontWeight:700,fontSize:14};
const levels={LP:"Lower Primary",UP:"Upper Primary",HS:"High School",HSS:"Higher Secondary"};
const statuses:Record<string,string>={assigned:"Assigned",in_progress:"In Progress",submitted:"Awaiting Review",reviewed:"Reviewed",completed:"Completed",pending:"Pending",active:"Active"};
const date=(v:string|null)=>v?new Date(v).toLocaleDateString("en-IN"):"Not specified";
const label=(v:string)=>statuses[v]||v;
function Progress({value,color=teal}:{value:number;color?:string}){return <div style={{height:10,background:"#e2e8f0",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:Math.max(0,Math.min(100,value))+"%",background:color}}/></div>}
type Item={label:string;value:number;color?:string};
function Bars({title,items}:{title:string;items:Item[]}){return <section style={card}><h3>{title}</h3>{items.length?items.map((x,i)=><div key={i} style={{marginBottom:16}}><p>{x.label} — <strong>{Math.round(x.value)}%</strong></p><Progress value={x.value} color={x.color}/></div>):<p>No data available yet.</p>}</section>}
function Donut({title,items}:{title:string;items:Item[]}){const total=items.reduce((s,x)=>s+x.value,0);let pos=0;const stops=items.map(x=>{const start=pos;pos+=total?100*x.value/total:0;return (x.color||teal)+" "+start+"% "+pos+"%"});return <section style={card}><h3>{title}</h3><div style={{width:150,height:150,borderRadius:"50%",margin:"20px auto",background:total?"conic-gradient("+stops.join(",")+")":"#e2e8f0",display:"grid",placeItems:"center"}}><div style={{width:106,height:106,borderRadius:"50%",background:"white",display:"grid",placeItems:"center",fontSize:28,fontWeight:700}}>{total}</div></div>{items.map(x=><p key={x.label}><span style={{color:x.color||teal}}>●</span> {x.label}: <strong>{x.value}</strong></p>)}</section>}
function List({items}:{items:unknown[]}){return items?.length?<ul>{items.map((x,i)=><li key={i}>{typeof x==="string"?x:JSON.stringify(x)}</li>)}</ul>:<p>No observations published yet.</p>}
export default function ParentDashboard(){
 const router=useRouter();
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[profile,setProfile]=useState<Profile|null>(null);
 const [students,setStudents]=useState<Student[]>([]),[activities,setActivities]=useState<Activity[]>([]),[assessments,setAssessments]=useState<Assessment[]>([]),[responses,setResponses]=useState<Response[]>([]),[results,setResults]=useState<Result[]>([]);
 const [customAssessments,setCustomAssessments]=useState<CustomAssessment[]>([]);
 const [tab,setTab]=useState("Overview"),[child,setChild]=useState("all"),[opened,setOpened]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [showAddChild,setShowAddChild]=useState(false);
 const [childFullName,setChildFullName]=useState("");
 const [childDob,setChildDob]=useState("");
 const [childClass,setChildClass]=useState("");
 const [childLanguage,setChildLanguage]=useState<"en"|"ml">("en");
 const [addingChild,setAddingChild]=useState(false);
 const [childMessage,setChildMessage]=useState("");
 const [childError,setChildError]=useState("");
 async function addChild(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setChildError("");setChildMessage("");
  if(!supabase){setChildError("Supabase is not configured.");return;}
  if(!childFullName.trim()||!childDob||!childClass.trim()||childDob>new Date().toLocaleDateString("en-CA")){setChildError("Enter a valid name, date of birth and class.");return;}
  setAddingChild(true);
  try {
   const {data:newId,error:saveError}=await supabase.rpc("add_child_for_parent",{p_full_name:childFullName.trim(),p_date_of_birth:childDob,p_current_class:childClass.trim(),p_preferred_language:childLanguage});
   if(saveError)throw saveError;
   const {data:created,error:readError}=await supabase.from("students").select("id,student_code,full_name,date_of_birth,current_class,status").eq("id",newId).single();
   if(readError)throw readError;
   setStudents(old=>[...old.filter(x=>x.id!==created.id),created as Student]);
   setChild("all");setChildFullName("");setChildDob("");setChildClass("");setChildLanguage("en");
   setShowAddChild(false);setChildMessage("Child registered successfully. Assessments will appear after a teacher assigns them.");
  }catch(e){setChildError(e instanceof Error?e.message:"Unable to register child.");}
  finally{setAddingChild(false);}
 }
 useEffect(()=>{async function load(){const db=supabase;if(!db){setError("Supabase is not configured.");setLoading(false);return;}const errors:string[]=[];try{
 const {data:auth,error:authError}=await db.auth.getUser();if(authError||!auth.user){router.replace("/login");return;}const user=auth.user;
 const role=await db.from("user_roles").select("role").eq("user_id",user.id).single();if(role.error||!role.data){router.replace("/login");return;}if(!["parent","student"].includes(role.data.role)){router.replace(role.data.role==="admin"?"/admin/dashboard":role.data.role==="teacher"?"/teacher/dashboard":"/login");return;}
 setName(user.user_metadata?.full_name||user.email||"Learner");setEmail(user.email||"");
 const pr=await db.from("profiles").select("full_name,phone,contact_number_differs,additional_contact_number").eq("id",user.id).single();if(pr.error)errors.push("Unable to load profile.");else{setProfile(pr.data);if(pr.data.full_name)setName(pr.data.full_name);}
 const links=await db.from("parent_student_links").select("student_id").eq("parent_user_id",user.id);if(links.error)throw new Error(links.error.message);const ids=(links.data||[]).map(x=>x.student_id);if(!ids.length)return;
 const [s,a,q]=await Promise.all([db.from("students").select("id,student_code,full_name,date_of_birth,current_class,status").in("id",ids),db.from("student_activity_assignments").select("id,student_id,assigned_at,due_date,status,learning_activities(title,description)").in("student_id",ids).order("assigned_at",{ascending:false}),db.from("assessment_assignments").select("id,student_id,assessment_level,assigned_at,due_date,status").in("student_id",ids).order("assigned_at",{ascending:false})]);
 if(s.error)errors.push("Unable to load children.");else setStudents(s.data||[]);
 if(a.error)errors.push("Unable to load activities.");else setActivities((a.data||[]) as Activity[]);
 if(q.error){errors.push("Unable to load assessments.");return;}const assigned=(q.data||[]) as Assessment[];setAssessments(assigned);
 const custom=await db.from("custom_assessment_assignments").select("id,student_id,assigned_at,due_date,status,teacher_feedback,answers,custom_assessment_templates(title)").in("student_id",ids).order("assigned_at",{ascending:false});
 if(custom.error)errors.push("Unable to load custom assessments.");
 else setCustomAssessments((custom.data||[]) as CustomAssessment[]);
 const editable=assigned.filter(x=>["assigned","in_progress"].includes(x.status)).map(x=>x.id);if(editable.length){const rr=await db.from("assessment_responses").select("assignment_id,question_id,score").in("assignment_id",editable);if(rr.error)errors.push("Unable to load saved progress.");else setResponses(rr.data||[]);}
 const approved=assigned.filter(x=>x.status==="reviewed").map(x=>x.id);if(approved.length){const rr=await db.from("assessment_results").select("assignment_id,overall_score,domain_scores,strengths,support_needs,teacher_feedback,recommendations,reviewed_at").in("assignment_id",approved);if(rr.error)errors.push("Unable to load approved results.");else setResults((rr.data||[]) as Result[]);}
 }catch(e){errors.push(e instanceof Error?e.message:"Unable to load dashboard.");}finally{setError(errors.join(" "));setLoading(false);}}load();},[router]);
 const visibleStudents=students.filter(x=>child==="all"||x.id===child),aa=assessments.filter(x=>child==="all"||x.student_id===child),act=activities.filter(x=>child==="all"||x.student_id===child),rr=results.filter(x=>aa.some(a=>a.id===x.assignment_id&&a.status==="reviewed"));
 const visibleStudentCodes=[...new Set(visibleStudents.map(s=>s.student_code).filter(Boolean))];
 const visibleCustom=customAssessments.filter(x=>child==="all"||x.student_id===child);
 const childName=(id:string)=>{const s=students.find(x=>x.id===id);return s?s.full_name+" ("+s.student_code+")":"Student";};
 function progress(a:Assessment){if(["submitted","reviewed"].includes(a.status))return 100;const c=CHECKLIST_DATA[a.assessment_level];if(!c)return 0;const ids=c.areas.flatMap(area=>area.subDomains.flatMap(d=>d.items.map((_,i)=>d.id+"_"+(i+1))));const done=new Set(responses.filter(x=>x.assignment_id===a.id&&x.score!==null&&ids.includes(x.question_id)).map(x=>x.question_id));return ids.length?Math.round(100*done.size/ids.length):0;}
 const count=(status:string)=>aa.filter(x=>x.status===status).length,completed=act.filter(x=>x.status==="completed").length,activityRate=act.length?100*completed/act.length:0;
 const metrics:[string,number,string,string][]=[["My Children",visibleStudents.length,green,"My Child"],["Assessments",aa.length,blue,"Assessments"],["Awaiting Teacher Review",count("submitted"),orange,"Assessments"],["Approved Assessments",count("reviewed"),teal,"Assessments"],["Learning Activities",act.length,green,"Learning Activities"],["Completed Activities",completed,blue,"Learning Activities"]];
 if(loading)return <main style={{padding:40}}>Loading your dashboard...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
 <header style={{background:"white",padding:"20px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><strong><BrandLogo /></strong><p style={{fontSize:12}}>PARENT & LEARNER PORTAL</p></div><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><ParentNotifications students={students} assessments={assessments} customAssessments={customAssessments} activities={activities} onShowActivities={()=>setTab("Learning Activities")}/><button style={btn} onClick={()=>router.push("/my-profile")}>My Profile</button><button style={btn} onClick={async()=>{if(supabase)await supabase.auth.signOut();router.replace("/login");}}>Sign out</button></div></header>
 <div style={{maxWidth:1250,margin:"auto",padding:"24px 16px"}}>
 <section style={{...card,background:"#0f4c5c",color:"white",padding:"22px 20px",marginBottom:20}}><small style={{letterSpacing:1,fontWeight:700}}>LEARN • GROW • THRIVE</small><h1 style={{margin:"10px 0 8px",fontSize:29,overflowWrap:"anywhere"}}>Welcome, {name}!{visibleStudentCodes.length>0&&<span style={{fontSize:"0.58em",fontWeight:500}}> ({visibleStudentCodes.length===1?"Student ID: ":"Student IDs: "}{visibleStudentCodes.join(", ")})</span>}</h1><p style={{margin:0}}>Track your child's learning journey, assessments and development.</p></section>
 {error&&<p role="alert" style={{...card,color:"#b42318"}}>{error}</p>}
 <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{["Overview","My Child","Assessments","Learning Activities","Progress Summary"].map(t=><button key={t} style={{...btn,background:tab===t?green:"#e8f2ed",color:tab===t?"white":"#183a35"}} onClick={()=>setTab(t)}>{t}</button>)}</nav>
 {tab!=="My Profile"&&<section style={card}><label>Select Child {" "}<select value={child} onChange={e=>{setChild(e.target.value);setOpened("");}} style={{padding:10,maxWidth:"100%"}}><option value="all">All Children</option>{students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>)}</select></label></section>}
 {tab==="Overview"&&<><section style={{...card,background:"#eef7f2",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
   <div><h2 style={{fontSize:18,margin:"0 0 5px"}}>Child Development Progress Summary</h2><p style={{fontSize:13,margin:0,color:"#64748b"}}>Approved assessments, learning activities and IDP goals for each child in one view.</p></div>
   <button type="button" style={btn} onClick={()=>setTab("Progress Summary")}>View Progress Summary</button>
  </section><div style={{...grid,marginBottom:20}}>{metrics.map(([l,v,c,t])=><button key={l} onClick={()=>setTab(t)} style={{...card,marginBottom:0,textAlign:"left",cursor:"pointer",borderTop:"4px solid "+c}}><span>{l}</span><h1 style={{color:c}}>{v}</h1><small>View details →</small></button>)}</div><div style={grid}><Donut title="Assessment Status" items={[{label:"Assigned",value:count("assigned"),color:gray},{label:"In Progress",value:count("in_progress"),color:blue},{label:"Awaiting Review",value:count("submitted"),color:orange},{label:"Reviewed",value:count("reviewed"),color:green}]}/><Donut title="Learning Activity Status" items={[{label:"Completed",value:completed,color:green},{label:"Pending / Other",value:act.length-completed,color:orange}]}/><Bars title="Overall Completion" items={[{label:"Assessments",value:aa.length?aa.reduce((s,x)=>s+progress(x),0)/aa.length:0},{label:"Activities",value:activityRate,color:blue}]}/><Bars title="Individual Assessment Progress" items={aa.map(x=>({label:childName(x.student_id)+" — "+x.assessment_level,value:progress(x)}))}/></div><Bars title="Approved Assessment Performance" items={rr.filter(x=>x.overall_score!==null).map(x=>({label:childName(aa.find(a=>a.id===x.assignment_id)?.student_id||"")+" — "+(aa.find(a=>a.id===x.assignment_id)?.assessment_level||""),value:100*Number(x.overall_score)/3}))}/><LearningInsightsCharts audience="family" students={visibleStudents} assessments={aa} activities={act} reviewedResults={rr}/><AssessmentAnalytics hideDetailedInsights assessments={aa.filter(a=>a.status==="reviewed"&&rr.some(r=>r.assignment_id===a.id))} students={visibleStudents.map(s=>({id:s.id,full_name:s.full_name,student_code:s.student_code}))}/><p style={{fontSize:12,color:gray}}>Only teacher-approved assessment answers appear in the student home analytics. Pending reviews remain private until approval.</p></>}
 {tab==="Progress Summary"&&<ParentProgressSummary students={visibleStudents} assessments={aa} customAssessments={visibleCustom} activities={act} results={rr}/>}
 {tab==="My Child"&&<section style={card}>
 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><h2>My Child</h2><button style={btn} type="button" onClick={()=>{setShowAddChild(v=>!v);setChildError("");}}>{showAddChild?"Close Form":"+ Add Child"}</button></div>
 {childMessage&&<p role="status" style={{color:green}}>{childMessage}</p>}
 {showAddChild&&<form onSubmit={addChild} style={{...card,background:"#f8faf7",maxWidth:650}}>
 <h3>Register a Child</h3>
 <p style={{fontSize:13,color:gray}}>Each child will have separate assessments and learning activities. Child deletion is restricted to administrators.</p>
 <label style={{display:"block",marginBottom:13}}>Child's full name *<input required maxLength={150} value={childFullName} onChange={e=>setChildFullName(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:12,marginTop:6,border:"1px solid #cbd5e1",borderRadius:8}} placeholder="Full name"/></label>
 <label style={{display:"block",marginBottom:13}}>Date of birth *<input required type="date" value={childDob} max={new Date().toLocaleDateString("en-CA")} onChange={e=>setChildDob(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:12,marginTop:6,border:"1px solid #cbd5e1",borderRadius:8}}/></label>
 <label style={{display:"block",marginBottom:13}}>Current class *<input required maxLength={80} value={childClass} onChange={e=>setChildClass(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",padding:12,marginTop:6,border:"1px solid #cbd5e1",borderRadius:8}} placeholder="e.g. Class 5, LKG, UKG"/></label>
 <label style={{display:"block",marginBottom:15}}>Preferred language *<select value={childLanguage} onChange={e=>setChildLanguage(e.target.value as "en"|"ml")} style={{display:"block",padding:12,marginTop:6,width:"100%",border:"1px solid #cbd5e1",borderRadius:8}}><option value="en">English</option><option value="ml">Malayalam</option></select></label>
 {childError&&<p role="alert" style={{color:"#b42318"}}>{childError}</p>}
 <button disabled={addingChild} type="submit" style={{...btn,opacity:addingChild?0.6:1}}>{addingChild?"Registering...":"Register Child"}</button>
 </form>}{!visibleStudents.length&&<p>No child information was found.</p>}{visibleStudents.map(s=><section key={s.id} style={{...card,background:"#f8faf7"}}><h3>{s.full_name} ({s.student_code})</h3><p><strong>Student ID: {s.student_code}</strong></p><p>Date of birth: {date(s.date_of_birth)}</p><p>Current class: {s.current_class||"Not available"}</p><p>Status: {label(s.status)}</p><button style={btn} onClick={()=>{setChild(s.id);setTab("Assessments");}}>View Assessments</button> <button style={{...btn,background:"#0f4c5c"}} onClick={()=>router.push("/student/history/"+s.id)}>Development History</button></section>)}<small>Child information is managed by authorised administrators.</small></section>}
 {tab==="Assessments"&&<section style={card}><h2>My Assessments</h2>{!aa.length&&!visibleCustom.length&&<p>No assessments have been assigned yet.</p>}{aa.map(a=>{const result=rr.find(x=>x.assignment_id===a.id);return <section key={a.id} style={{...card,background:"#f8faf7"}}><h3>{levels[a.assessment_level]||a.assessment_level} Assessment</h3><p>Student: {childName(a.student_id)}</p><p>Status: <strong>{label(a.status)}</strong></p><p>Assigned: {date(a.assigned_at)} · Due: {date(a.due_date)}</p><p>Completion: {progress(a)}%</p><Progress value={progress(a)}/><div style={{marginTop:16}}>{a.status==="reviewed"?result?<button style={btn} onClick={()=>router.push("/assessment-report/"+a.id)}>View Full Analytics & Approved Report</button>:<p>Results not available yet.</p>:<button style={btn} onClick={()=>router.push("/parent/assessment/"+a.id)}>{a.status==="assigned"?"Start Assessment":a.status==="in_progress"?"Continue Assessment":"View Submission Summary"}</button>}</div>{a.status==="submitted"&&<p>Successfully submitted. Awaiting teacher review.</p>}{a.status==="reviewed"&&result&&opened===a.id&&<section style={{...card,marginTop:20}}><h2>Approved Assessment Result</h2><h3>Overall readiness: {result.overall_score===null?"Not scored":Math.round(100*Number(result.overall_score)/3)+"%"}</h3><p>Reviewed: {date(result.reviewed_at)}</p><h3>Domain-wise Scores</h3>{Object.entries(result.domain_scores||{}).map(([k,v])=><p key={k}>{k}: {typeof v==="number"?v:JSON.stringify(v)}</p>)}<h3>Observed Strengths</h3><List items={result.strengths}/><h3>Priority Support Needs</h3><List items={result.support_needs}/><h3>Teacher Feedback</h3><p style={{whiteSpace:"pre-wrap"}}>{result.teacher_feedback||"No feedback published yet."}</p><h3>Recommendations</h3><p style={{whiteSpace:"pre-wrap"}}>{result.recommendations||"No recommendations published yet."}</p><small>Educational screening and development planning aid. Not a medical or psychological diagnosis.</small></section>}</section>})}</section>}

 {tab==="Assessments"&&visibleCustom.length>0&&<section style={card}>
  <h2>Custom Assessments</h2>
  <p style={{color:gray}}>Additional assessments created by Swastha teachers.</p>
  {visibleCustom.map(a=>{
   const t=Array.isArray(a.custom_assessment_templates)?a.custom_assessment_templates[0]:a.custom_assessment_templates;
   return <section key={a.id} style={{...card,background:"#f8faf7"}}>
    <h3>{t?.title||"Custom Assessment"}</h3>
    <p>Student: {childName(a.student_id)}</p>
    <p>Status: <strong>{label(a.status)}</strong></p>
    <p>Assigned: {date(a.assigned_at)} · Due: {date(a.due_date)}</p>
    <button style={btn} onClick={()=>router.push("/parent/custom-assessment/"+a.id)}>
     {a.status==="assigned"?"Start Assessment":a.status==="in_progress"?"Continue Assessment":a.status==="reviewed"?"View Approved Review":"View Submission"}
    </button>
    {a.status==="reviewed"&&<button style={{...btn,marginLeft:10}} onClick={()=>router.push("/custom-assessment-report/"+a.id)}>View Progress Report / PDF</button>}
    {a.status==="submitted"&&<p>Submitted successfully. Awaiting teacher review.</p>}
    {a.status==="reviewed"&&<p style={{whiteSpace:"pre-wrap"}}>Teacher feedback: {a.teacher_feedback||"No written feedback provided."}</p>}
   </section>;
  })}
 </section>}
 {tab==="Learning Activities"&&<section style={card}><h2>Learning Activities</h2><p>Completed: {completed}/{act.length}</p><Progress value={activityRate}/>{!act.length&&<p>No learning activities have been assigned yet.</p>}{act.map(a=>{const d=Array.isArray(a.learning_activities)?a.learning_activities[0]:a.learning_activities;return <section key={a.id} style={{...card,marginTop:16,background:"#f8faf7"}}><h3>{d?.title||"Untitled activity"}</h3><p>Student: {childName(a.student_id)}</p><p style={{whiteSpace:"pre-wrap"}}>{d?.description||"No description provided."}</p><p>Assigned: {date(a.assigned_at)} · Due: {date(a.due_date)}</p><p>Status: {label(a.status)}</p></section>})}<small>Learning activities are displayed for viewing only.</small></section>}
 {tab==="Learning Activities"&&<ParentSessionUpdates studentIds={visibleStudents.map(s=>s.id)}/>}
 {tab==="My Profile"&&<section style={card}><h2>My Profile</h2>{profile?<><p>Parent / Guardian name: {profile.full_name||"Not available"}</p><p>WhatsApp number: {profile.phone||"Not available"}</p><p>Contact number differs: {profile.contact_number_differs?"Yes":"No"}</p>{profile.contact_number_differs&&<p>Additional contact number: {profile.additional_contact_number||"Not available"}</p>}<p>Login email: {email||"Not available"}</p></>:<p>Profile information is not available.</p>}<small>Your profile information is currently read-only.</small></section>}
 </div></main>;
}
