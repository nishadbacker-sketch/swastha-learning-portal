"use client";

import {useCallback,useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import BrandLogo from "../../../components/brand-logo";
import LearningInsightsCharts from "../../../components/learning-insights-charts";
import StudentAppointmentHistory from "../../../components/student-appointment-history";
import {supabase} from "../../../../lib/supabase";

type Role="owner"|"admin"|"clinic_admin"|"teacher";
type Student={id:string;student_code:string|null;full_name:string;current_class:string|null;date_of_birth:string|null;preferred_language:string;status:string;removed_at:string|null};
type Assessment={id:string;student_id:string;status:string;assessment_level:string;assigned_at:string};
type Custom={id:string;student_id:string;status:string;assigned_at:string;template_id:string};
type Activity={id:string;student_id:string;status:string;assigned_at:string};
type Goal={id:string;assignment_id:string;title:string;status:string;current_percent:number|null;target_percent:number|null;target_date:string|null};
type Session={id:string;student_id:string;status:string;scheduled_at:string;session_type:string;duration_minutes:number};
type Task={id:string;student_id:string;title:string;status:string;priority:string;due_date:string|null};
type Result={assignment_id:string;overall_score:number|null};
type Tab="overview"|"assessments"|"development"|"sessions"|"reports"|"history";
const tabs:[Tab,string][]=[["overview","Overview"],["assessments","Assessments"],["development","Development"],["sessions","Sessions"],["reports","Reports"],["history","History"]];
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const btn:React.CSSProperties={border:0,borderRadius:8,background:"#176b58",color:"#fff",padding:"10px 14px",cursor:"pointer",fontWeight:700};
const date=(s:string)=>new Date(s).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric"});
const percent=(n:number|null|undefined)=>Math.max(0,Math.min(100,Number(n)||0));
const home=(role:Role)=>role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";

export default function StaffStudentWorkspace(){
 const params=useParams<{id:string}>();
 const id=params.id;
 const router=useRouter();
 const [role,setRole]=useState<Role|null>(null);
 const [student,setStudent]=useState<Student|null>(null);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [custom,setCustom]=useState<Custom[]>([]);
 const [activities,setActivities]=useState<Activity[]>([]);
 const [goals,setGoals]=useState<Goal[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [tab,setTab]=useState<Tab>("overview");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [warnings,setWarnings]=useState<string[]>([]);
 const load=useCallback(async()=>{
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  setLoading(true);setError("");setWarnings([]);setStudent(null);
  try {
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace("/login");return;}
   const {data:access,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(roleError||!access||!["owner","admin","clinic_admin","teacher"].includes(access.role)){router.replace("/login");return;}
   const currentRole=access.role as Role;
   setRole(currentRole);
   if(currentRole==="teacher"){
    const {data:teacher,error:teacherError}=await supabase.from("teachers").select("id").eq("user_id",user.id).eq("status","active").maybeSingle();
    if(teacherError||!teacher)throw Error("Access requires an active teacher account.");
    const {data:link,error:linkError}=await supabase.from("teacher_assignments").select("id").eq("teacher_id",teacher.id).eq("student_id",id).maybeSingle();
    if(linkError||!link)throw Error("This student is not assigned to your teacher account.");
   }
   const profile=await supabase.from("students").select("id,student_code,full_name,current_class,date_of_birth,preferred_language,status,removed_at").eq("id",id).is("removed_at",null).maybeSingle();
   if(profile.error)throw profile.error;
   if(!profile.data)throw Error("Student is unavailable or has been removed.");
   setStudent(profile.data as Student);
   const queries=await Promise.all([
    supabase.from("assessment_assignments").select("id,student_id,status,assessment_level,assigned_at").eq("student_id",id).order("assigned_at",{ascending:false}).limit(500),
    supabase.from("custom_assessment_assignments").select("id,student_id,status,assigned_at,template_id").eq("student_id",id).order("assigned_at",{ascending:false}).limit(500),
    supabase.from("student_activity_assignments").select("id,student_id,status,assigned_at").eq("student_id",id).order("assigned_at",{ascending:false}).limit(500),
    supabase.from("clinic_sessions").select("id,student_id,status,scheduled_at,session_type,duration_minutes").eq("student_id",id).order("scheduled_at",{ascending:false}).limit(500),
    supabase.from("student_coordination_tasks").select("id,student_id,title,status,priority,due_date").eq("student_id",id).limit(500)
   ]);
   const warning:string[]=[];
   const [a,c,act,s,t]=queries;
   if(a.error)warning.push("Standard assessments are not available for this role.");
   if(c.error)warning.push("Custom assessments are not available for this role.");
   if(act.error)warning.push("Learning activities are not available.");
   if(s.error)warning.push("Session history is not available for this role.");
   if(t.error)warning.push("Coordination tasks are not available.");
   const as=(a.data||[]) as Assessment[];
   setAssessments(as);setCustom((c.data||[]) as Custom[]);setActivities((act.data||[]) as Activity[]);
   setSessions((s.data||[]) as Session[]);setTasks((t.data||[]) as Task[]);
   const reviewed=as.filter(x=>x.status==="reviewed").map(x=>x.id);
   if(as.length){
    const goalQuery=await supabase.from("student_development_goals").select("id,assignment_id,title,status,current_percent,target_percent,target_date").in("assignment_id",as.map(x=>x.id)).limit(500);
    if(goalQuery.error)warning.push("Development goals are not available for this role.");
    setGoals((goalQuery.data||[]) as Goal[]);
   }else setGoals([]);
   if(reviewed.length){
    const resultQuery=await supabase.from("assessment_results").select("assignment_id,overall_score").in("assignment_id",reviewed);
    if(resultQuery.error)warning.push("Approved scores are not available for this role.");
    setResults((resultQuery.data||[]) as Result[]);
   }else setResults([]);
   setWarnings(warning);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load this student.");}
  finally{setLoading(false);}
 },[id,router]);
 useEffect(()=>{void load();},[load]);
 const reviewed=assessments.filter(a=>a.status==="reviewed").length;
 const pending=assessments.filter(a=>a.status==="submitted").length;
 const completedActivities=activities.filter(a=>["completed","reviewed"].includes(a.status)).length;
 const completedGoals=goals.filter(g=>["completed","achieved","done"].includes(g.status)).length;
 const attended=sessions.filter(s=>["attended","completed"].includes(s.status)).length;
 const attendance=sessions.filter(s=>["attended","completed","absent"].includes(s.status));
 const allowedAdmin=role==="owner"||role==="admin"||role==="clinic_admin";
 const metric=(label:string,value:string|number)=> <div style={{...card,background:"#f2f8f4"}}><small style={{color:"#64748b"}}>{label}</small><strong style={{display:"block",marginTop:6,fontSize:25}}>{value}</strong></div>;
 return <main className="swastha-workspace-page">
  <header className="swastha-workspace-header"><BrandLogo/><div><strong>Student Development Workspace</strong><small>One authorized student record · Read-only summary</small></div><button type="button" style={btn} onClick={()=>router.push("/staff/students")}>All Students</button></header>
  <div className="swastha-workspace-content">
   {loading?<section style={card}>Loading student development history…</section>:error?<section role="alert" style={{...card,color:"#b42318"}}><h1>Student unavailable</h1><p>{error}</p><button type="button" style={btn} onClick={()=>router.push(role?home(role):"/login")}>Back to Staff Tools</button></section>:student&&<>
    <div className="swastha-workspace-heading"><div><h1>{student.full_name}</h1><p className="swastha-muted"><strong>{student.student_code||"ID pending"}</strong> · {student.current_class||"Class not recorded"} · {student.status}</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" style={btn} onClick={()=>void load()}>Refresh</button>{allowedAdmin&&<button type="button" className="swastha-secondary-button" onClick={()=>router.push("/admin/students")}>Edit Student in Management</button>}</div></div>
    {warnings.length>0&&<section role="status" style={{...card,background:"#fffaf0"}}>{warnings.join(" ")}</section>}
    <nav className="swastha-workspace-tabs" aria-label="Student record sections">{tabs.map(([key,title])=><button key={key} type="button" aria-current={tab===key?"page":undefined} className={tab===key?"active":""} onClick={()=>setTab(key)}>{title}</button>)}</nav>
    {tab==="overview"&&<>
     <div className="swastha-workspace-metrics">{metric("Assessments reviewed",reviewed+" / "+assessments.length)}{metric("Pending reviews",pending)}{metric("Learning activities completed",completedActivities+" / "+activities.length)}{metric("IDP goals completed",completedGoals+" / "+goals.length)}{metric("Attended sessions",attended)}{metric("Open coordination tasks",tasks.filter(t=>t.status!=="done").length)}</div>
     <LearningInsightsCharts audience="teacher" students={[student]} assessments={assessments} activities={activities} reviewedResults={results}/>
     <section style={card}><h2>Student profile</h2><p>Permanent ID: <strong>{student.student_code||"ID pending"}</strong></p><p>Class: {student.current_class||"Not recorded"} · Preferred language: {student.preferred_language==="ml"?"Malayalam":"English"} · Date of birth: {student.date_of_birth||"Not recorded"}</p><p className="swastha-muted">Student records are maintained in Student Management; this view does not modify personal data.</p></section>
    </>}
    {tab==="assessments"&&<section style={card}><h2>Standard & Custom Assessments</h2><p className="swastha-muted">Only teacher-reviewed results are presented as approved. Assigned and submitted assessments remain separate.</p><div className="swastha-workspace-metrics">{metric("Standard",assessments.length)}{metric("Custom",custom.length)}{metric("Reviewed standard",reviewed)}{metric("Awaiting review",pending)}</div><h3>Standard assessments</h3>{!assessments.length?<p>No standard assessments recorded.</p>:assessments.map(a=><div className="swastha-workspace-record" key={a.id}><span>{a.assessment_level} · {a.status} · {date(a.assigned_at)}</span>{a.status==="reviewed"&&<button type="button" className="swastha-secondary-button" onClick={()=>router.push("/assessment-report/"+encodeURIComponent(a.id))}>Approved report</button>}</div>)}<h3 style={{marginTop:17}}>Custom assessments</h3>{!custom.length?<p>No custom assessments recorded.</p>:custom.map(a=><div className="swastha-workspace-record" key={a.id}><span>Custom assessment · {a.status} · {date(a.assigned_at)}</span>{a.status==="reviewed"&&<button type="button" className="swastha-secondary-button" onClick={()=>router.push("/custom-assessment-report/"+encodeURIComponent(a.id))}>Reviewed report</button>}</div>)}</section>}
    {tab==="development"&&<><section style={card}><h2>Individual Development Plans</h2><div className="swastha-workspace-metrics">{metric("Total IDP goals",goals.length)}{metric("Completed goals",completedGoals)}{metric("Activities completed",completedActivities+" / "+activities.length)}</div>{!goals.length?<p>No development goals are available for this student.</p>:goals.map(g=><div key={g.id} className="swastha-workspace-goal"><div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong>{g.title}</strong><span>{g.status}</span></div><p className="swastha-muted">Current: {g.current_percent??"Not scored"}{g.current_percent!==null?"%":""} · Target: {g.target_percent??"Not set"} · Review date: {g.target_date||"Not set"}</p>{g.current_percent!==null&&<div role="progressbar" aria-label={"Progress for "+g.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(g.current_percent)} className="swastha-workspace-progress"><div style={{width:percent(g.current_percent)+"%"}}/></div>}</div>)}{role==="teacher"&&<button type="button" style={btn} onClick={()=>router.push("/teacher/idp?student="+encodeURIComponent(student.id))}>Open IDP Editor</button>}</section></>}
    {tab==="sessions"&&<section style={card}><h2>Session & Attendance History</h2><div className="swastha-workspace-metrics">{metric("Sessions",sessions.length)}{metric("Attended",attended)}{metric("Recorded attendance rate",attendance.length?Math.round(attended/attendance.length*100)+"%":"No data")}</div>{!sessions.length?<p>No session records are available.</p>:sessions.map(s=><div className="swastha-workspace-record" key={s.id}><span>{date(s.scheduled_at)} · {s.session_type.replace(/_/g," ")} · {s.duration_minutes} min</span><strong>{s.status.replace(/_/g," ")}</strong></div>)}</section>}
    {tab==="reports"&&<section style={card}><h2>Reviewed Reports & Certificates</h2><p className="swastha-muted">Only reviewed assessment reports are linked. Certificate issuance and verification remain in the authorized Staff Certificates tool.</p>{assessments.filter(a=>a.status==="reviewed").map(a=><div className="swastha-workspace-record" key={a.id}><span>{a.assessment_level} · Reviewed {date(a.assigned_at)}</span><button type="button" className="swastha-secondary-button" onClick={()=>router.push("/assessment-report/"+encodeURIComponent(a.id))}>Open report</button></div>)}{!reviewed&&<p>No reviewed standard reports available.</p>}<button style={btn} onClick={()=>router.push("/staff/assessment-certificates")}>Assessment Certificates</button></section>}
    {tab==="history"&&<><section style={card}><h2>Coordination & Follow-up</h2><p className="swastha-muted">Read-only student coordination tasks and recorded appointment history.</p>{!tasks.length?<p>No coordination tasks recorded.</p>:tasks.map(t=><div className="swastha-workspace-record" key={t.id}><span>{t.title} · {t.priority} · {t.due_date||"No due date"}</span><strong>{t.status}</strong></div>)}<button style={btn} onClick={()=>router.push("/teacher/coordination")}>Open Coordination</button></section><StudentAppointmentHistory studentId={student.id}/></>}
    <p style={{fontSize:12,color:"#64748b"}}>Educational support indicators only. Missing records are not a measure of ability. Student access is controlled by staff role, active teacher assignments and database row permissions.</p>
   </>}
  </div>
 </main>;
}
