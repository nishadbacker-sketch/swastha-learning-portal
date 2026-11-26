"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";
import type {StaffRole} from "./staff-tools-menu";

type Student={id:string;full_name:string;student_code:string|null;created_at:string};
type Assessment={id:string;student_id:string;status:string;assigned_at:string;assessment_level:string};
type Result={assignment_id:string;overall_score:number|null;reviewed_at:string|null;domain_scores:Record<string,unknown>|null};
type Goal={id:string;assignment_id:string;status:string;target_date:string|null};
type Appointment={id:string;created_at:string;status:string};
type Certificate={id:string;student_id:string;issued_at:string;revoked_at:string|null};
type Activity={id:string;student_id:string;status:string;assigned_at:string};
type Session={id:string;student_id:string;session_type:string;status:string;scheduled_at:string};
type InPerson={id:string;student_id:string;assessment_level:string;status:string;created_at:string};
type Feed={id:string;student_id:string;title:string;detail:string;at:string;href:string};
type Dataset={students:Student[];assessments:Assessment[];results:Result[];activities:Activity[];sessions:Session[];inPerson:InPerson[];goals:Goal[];appointments:Appointment[];certificates:Certificate[]};
const empty:Dataset={students:[],assessments:[],results:[],activities:[],sessions:[],inPerson:[],goals:[],appointments:[],certificates:[]};
const good=(s:string)=>["reviewed","completed"].includes(s);
const monthLabel=(d:Date)=>d.toLocaleDateString("en-IN",{month:"short",timeZone:"Asia/Kolkata"});
const timeLabel=(s:string)=>new Date(s).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Asia/Kolkata"});
const dateKey=(s:Date|string)=>new Date(s).toLocaleDateString("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Kolkata"});
const colors=["#087c4a","#55c972","#b4ee9b","#e4e8e7"];
const statuses=[{key:"reviewed",label:"Reviewed"},{key:"submitted",label:"Awaiting review"},{key:"in_progress",label:"In progress"},{key:"assigned",label:"Assigned"}] as const;
const within=(ids:string[])=>new Set(ids);
const card:React.CSSProperties={border:"1px solid #e1ebe5",borderRadius:16,padding:18,background:"#fff",boxShadow:"0 2px 13px #1435280a",minWidth:0};
const action=(role:StaffRole)=>role==="teacher"?"/teacher/dashboard":"/staff/students";

/** Live, RLS-scoped staff metrics. No demo counts, clinical diagnoses or invented growth figures. */
export default function StaffLiveDashboard({role}:{role:StaffRole}){
 const router=useRouter();
 const [data,setData]=useState<Dataset>(empty);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [period,setPeriod]=useState<"6"|"3">("6");
 const [selection,setSelection]=useState("all");
 useEffect(()=>{
  let live=true;
  async function fetchData(){
   if(!supabase){if(live){setError("Dashboard data connection is unavailable.");setLoading(false);}return;}
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user)throw Error("Sign in to see current staff analytics.");
    const {data:roleRow,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
    if(roleError||!roleRow||roleRow.role!==role)throw Error("Staff analytics are not available for this account.");
    let ids:string[]|null=null;
    if(role==="teacher"){
     const {data:t,error:te}=await supabase.from("teachers").select("id").eq("user_id",user.id).eq("status","active").maybeSingle();
     if(te||!t)throw Error("Active teacher profile is required for assigned student analytics.");
     const {data:links,error:le}=await supabase.from("teacher_assignments").select("student_id").eq("teacher_id",t.id);
     if(le)throw le;
     ids=[...new Set((links||[]).map(x=>x.student_id))];
    }
    let query=supabase.from("students").select("id,full_name,student_code,created_at").is("removed_at",null).order("full_name").limit(2000);
    if(ids!==null&&ids.length===0){if(live)setData(empty);return;}
    if(ids!==null)query=query.in("id",ids);
    const {data:students,error:se}=await query;
    if(se)throw se;
    const ss=(students||[]) as Student[];
    if(!ss.length){if(live)setData(empty);return;}
    const result:Dataset={students:ss,assessments:[],results:[],activities:[],sessions:[],inPerson:[],goals:[],appointments:[],certificates:[]};
    // Batch every foreign-key list to avoid PostgREST URL and in() limits.
    for(let start=0;start<ss.length;start+=80){
     const chunk=ss.slice(start,start+80).map(s=>s.id);
     const [aa,act,sess]=await Promise.all([
      supabase.from("assessment_assignments").select("id,student_id,status,assigned_at,assessment_level").in("student_id",chunk).order("assigned_at",{ascending:false}).limit(2000),
      supabase.from("student_activity_assignments").select("id,student_id,status,assigned_at").in("student_id",chunk).order("assigned_at",{ascending:false}).limit(2000),
      supabase.from("clinic_sessions").select("id,student_id,status,session_type,scheduled_at").in("student_id",chunk).order("scheduled_at",{ascending:false}).limit(2000)
     ]);
     if(aa.error||act.error||sess.error)throw Error("Some student metrics could not be loaded. Check role permissions.");
     result.assessments.push(...(aa.data||[]) as Assessment[]);
     result.activities.push(...(act.data||[]) as Activity[]);
     result.sessions.push(...(sess.data||[]) as Session[]);
    }
    // A failure to read optional score and in-person details never exposes them or invents values.
    const reviewed=result.assessments.filter(a=>a.status==="reviewed").map(a=>a.id);
    for(let start=0;start<reviewed.length;start+=80){
     const {data:scored,error:re}=await supabase.from("assessment_results").select("assignment_id,overall_score,reviewed_at,domain_scores").in("assignment_id",reviewed.slice(start,start+80)).limit(2000);
     if(!re)result.results.push(...(scored||[]) as Result[]);
    }
    // Optional dashboard sources are loaded under the staff member's existing RLS permissions.
    // Missing permissions result in an unavailable metric, never a widened access policy.
    const relevantAssignments=result.assessments.map(a=>a.id);
    for(let start=0;start<relevantAssignments.length;start+=80){
     const {data:goals,error:goalError}=await supabase.from("student_development_goals")
      .select("id,assignment_id,status,target_date").in("assignment_id",relevantAssignments.slice(start,start+80)).limit(2000);
     if(!goalError)result.goals.push(...(goals||[]) as Goal[]);
    }
    for(let start=0;start<ss.length;start+=80){
     const {data:certs,error:certError}=await supabase.from("assessment_completion_certificates")
      .select("id,student_id,issued_at,revoked_at").in("student_id",ss.slice(start,start+80).map(x=>x.id)).limit(2000);
     if(!certError)result.certificates.push(...(certs||[]) as Certificate[]);
    }
    // Appointments are clinic-level data; teachers must not receive unrelated enquiry records.
    if(role!=="teacher"){
     const {data:appointments,error:appointmentError}=await supabase.from("appointment_enquiries")
      .select("id,created_at,status").order("created_at",{ascending:false}).limit(2000);
     if(!appointmentError)result.appointments=(appointments||[]) as Appointment[];
    }
    const ip=await supabase.rpc("staff_assessment_sessions_list");
    if(!ip.error){
     const allowed=within(ss.map(x=>x.id));
     result.inPerson=((ip.data||[]) as InPerson[]).filter(x=>allowed.has(x.student_id));
    }
    if(live){setData(result);setError("");}
   }catch(e){if(live)setError(e instanceof Error?e.message:"Dashboard data is unavailable.");}
   finally{if(live)setLoading(false);}
  }
  void fetchData();
  return()=>{live=false;};
 },[role]);

 const studentIds=new Set(data.students.filter(student=>selection==="all"||student.id===selection).map(student=>student.id));
 const assessments=data.assessments.filter(item=>studentIds.has(item.student_id));
 const activities=data.activities.filter(item=>studentIds.has(item.student_id));
 const sessions=data.sessions.filter(item=>studentIds.has(item.student_id));
 const inPerson=data.inPerson.filter(item=>studentIds.has(item.student_id));
 const studentMap=new Map(data.students.map(student=>[student.id,student]));
 const scopedStudents=data.students.filter(item=>studentIds.has(item.id));
 const goals=data.goals.filter(item=>assessments.some(a=>a.id===item.assignment_id));
 const certificates=data.certificates.filter(item=>studentIds.has(item.student_id)&&!item.revoked_at);
 const appointments=data.appointments;
 const resultsById=new Map(data.results.filter(x=>typeof x.overall_score==="number"&&x.overall_score>=0&&x.overall_score<=3)
  .map(x=>[x.assignment_id,x]));
 const reviewedAssessments=assessments.filter(x=>x.status==="reviewed"&&resultsById.has(x.id));
 const scored=reviewedAssessments.map(x=>resultsById.get(x.id)!);
 const avg=scored.length?Math.round(scored.reduce((sum,x)=>sum+Number(x.overall_score),0)/scored.length/3*100):null;
 const today=dateKey(new Date());
 const todaySessions=sessions.filter(x=>dateKey(x.scheduled_at)===today).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
 const monthOf=(value:string)=>dateKey(value).slice(0,7);
 const thisMonth=today.slice(0,7);
 const previous=new Date();previous.setDate(1);previous.setMonth(previous.getMonth()-1);
 const previousMonth=dateKey(previous).slice(0,7);
 const monthlyCount=(items:{created_at?:string;assigned_at?:string}[],month:string)=>
  items.filter(x=>monthOf(x.created_at||x.assigned_at||"")===month).length;
 const percentChange=(current:number,prior:number)=>prior>0?Math.round((current-prior)/prior*100):null;
 const studentGrowth=percentChange(monthlyCount(data.students,thisMonth),monthlyCount(data.students,previousMonth));
 const assessmentGrowth=percentChange(monthlyCount(assessments,thisMonth),monthlyCount(assessments,previousMonth));
 const activityGrowth=percentChange(monthlyCount(activities,thisMonth),monthlyCount(activities,previousMonth));
 const trend=Array.from({length:Number(period)},(_,index)=>{
  const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(Number(period)-1-index));
  const key=dateKey(date).slice(0,7);
  const monthScores=reviewedAssessments
   .map(item=>resultsById.get(item.id))
   .filter((score):score is Result=>Boolean(score?.reviewed_at&&monthOf(score.reviewed_at)===key));
  return {name:monthLabel(date),value:monthScores.length?
   Math.round(monthScores.reduce((sum,score)=>sum+Number(score.overall_score),0)/monthScores.length/3*100):null};
 });
 const previousAvg=trend.length>1?trend[trend.length-2].value:null;
 const avgGrowth=avg!==null&&previousAvg!==null?avg-previousAvg:null;
 const outcomes=[
  {label:"Proficient",count:reviewedAssessments.filter(x=>Number(resultsById.get(x.id)?.overall_score)===3).length},
  {label:"Developing",count:reviewedAssessments.filter(x=>Number(resultsById.get(x.id)?.overall_score)===2).length},
  {label:"Beginning",count:reviewedAssessments.filter(x=>Number(resultsById.get(x.id)?.overall_score)<2).length},
  {label:"Not Assessed",count:assessments.length-reviewedAssessments.length}
 ];
 const outcomeTotal=outcomes.reduce((sum,item)=>sum+item.count,0);
 let cumulative=0;
 const arcs=outcomes.map((entry,index)=>{
  const start=cumulative; cumulative+=outcomeTotal?entry.count/outcomeTotal*100:0;
  return colors[index]+" "+start+"% "+cumulative+"%";
 });
 const feed:Feed[]=[
  ...assessments.map(item=>({id:"a"+item.id,student_id:item.student_id,title:"Assessment "+item.status.replace(/_/g," "),
   detail:item.assessment_level,at:item.assigned_at,href:"/staff/students/"+item.student_id})),
  ...activities.map(item=>({id:"l"+item.id,student_id:item.student_id,
   title:"Learning activity "+item.status.replace(/_/g," "),detail:"Learning activities",at:item.assigned_at,
   href:"/staff/students/"+item.student_id})),
  ...inPerson.map(item=>({id:"i"+item.id,student_id:item.student_id,title:"In-person assessment "+item.status,
   detail:item.assessment_level,at:item.created_at,href:"/staff/in-person-assessments?session="+item.id}))
 ].filter(entry=>Number.isFinite(new Date(entry.at).valueOf()))
  .sort((a,b)=>b.at.localeCompare(a.at)).slice(0,4);
 const growth=(delta:number|null,suffix="%")=>
  delta===null?"No prior-month comparison":(delta>=0?"↑ +":"↓ ")+delta+suffix+" vs. last month";
 const growthClass=(delta:number|null)=>delta===null?"neutral":delta>=0?"positive":"negative";
 const pictogram=(type:"students"|"assessments"|"activities"|"progress"|"appointments"|"certificates")=>{
  const common={width:34,height:34,viewBox:"0 0 32 32",fill:"none",stroke:"currentColor",strokeWidth:2.1,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  if(type==="students")return <svg {...common} aria-hidden="true"><circle cx="16" cy="8" r="4" fill="currentColor" stroke="none"/><circle cx="5.8" cy="11" r="3.2" fill="currentColor" stroke="none"/><circle cx="26.2" cy="11" r="3.2" fill="currentColor" stroke="none"/><path d="M8 25v-3c0-4.8 3-7.5 8-7.5s8 2.7 8 7.5v3H8Z" fill="currentColor" stroke="none"/><path d="M1.2 24v-3c0-3.3 1.8-5.4 5.3-5.4M30.8 24v-3c0-3.3-1.8-5.4-5.3-5.4"/></svg>;
  if(type==="assessments")return <svg {...common} aria-hidden="true"><rect x="6" y="5" width="20" height="24" rx="2"/><path d="M12 5V3h8v2M10 18l4 4 8-9"/></svg>;
  if(type==="activities")return <svg {...common} aria-hidden="true"><path d="M16 29c-3.5-2.8-7.3-3.7-13-3.5V5c5.9-.5 9.5.3 13 3.5 3.5-3.2 7.1-4 13-3.5v20.5c-5.7-.2-9.5.7-13 3.5ZM16 8.5V29"/></svg>;
  if(type==="appointments")return <svg {...common} aria-hidden="true"><rect x="4" y="6" width="24" height="22" rx="2"/><path d="M9 3v7M23 3v7M4 12h24m-18 5h3m5 0h3"/></svg>;
  if(type==="certificates")return <svg {...common} aria-hidden="true"><circle cx="16" cy="12" r="8"/><path d="m11 19-2 11 7-4 7 4-2-11m-9-7 3 3 5-6"/></svg>;
  return <svg {...common} aria-hidden="true"><rect x="5" y="17" width="4.6" height="10" rx="2" fill="currentColor" stroke="none"/><rect x="14" y="10" width="4.6" height="17" rx="2" fill="currentColor" stroke="none"/><rect x="23" y="3" width="4.6" height="24" rx="2" fill="currentColor" stroke="none"/></svg>;
 };
 const statItems=[
  {kind:"students" as const,title:"Total Students",value:scopedStudents.length,delta:selection==="all"?studentGrowth:null,suffix:"%"},
  {kind:"assessments" as const,title:"Assessments",value:assessments.length,delta:selection==="all"?assessmentGrowth:null,suffix:"%"},
  {kind:"activities" as const,title:"Learning Activities",value:activities.length,delta:selection==="all"?activityGrowth:null,suffix:"%"},
  {kind:"progress" as const,title:"Progress (Avg.)",value:avg===null?"—":avg+"%",delta:avgGrowth,suffix:" pp"},
  {kind:"appointments" as const,title:"Appointments",value:role==="teacher"?"—":appointments.length,delta:null,suffix:"%"},
  {kind:"certificates" as const,title:"Certificates Issued",value:certificates.length,delta:null,suffix:"%"}
 ];

 const sessionOutcomes=[
  {label:"Attended",count:sessions.filter(s=>["completed","attended"].includes(s.status)).length},
  {label:"Cancelled",count:sessions.filter(s=>["cancelled","canceled"].includes(s.status)).length},
  {label:"Rescheduled",count:sessions.filter(s=>s.status==="rescheduled").length},
  {label:"Missed / Other",count:sessions.filter(s=>!["completed","attended","cancelled","canceled","rescheduled"].includes(s.status)).length}
 ];
 let attendanceRunning=0;
 const attendanceArcs=sessionOutcomes.map((o,i)=>{const from=attendanceRunning;attendanceRunning+=sessions.length?o.count/sessions.length*100:0;return colors[i]+" "+from+"% "+attendanceRunning+"%";});
 const domainMap=new Map<string,{sum:number;count:number}>();
 for(const assessment of reviewedAssessments){
  const domains=resultsById.get(assessment.id)?.domain_scores;
  if(!domains||typeof domains!=="object"||Array.isArray(domains))continue;
  for(const [key,value] of Object.entries(domains)){
   const score=typeof value==="number"?value:typeof value==="object"&&value!==null&&"score" in value?Number((value as {score:unknown}).score):NaN;
   if(!Number.isFinite(score)||score<0||score>3)continue;
   const existing=domainMap.get(key)||{sum:0,count:0};
   domainMap.set(key,{sum:existing.sum+score,count:existing.count+1});
  }
 }
 const domainResults=[...domainMap.entries()].slice(0,7).map(([name,d])=>({name,value:Math.round(d.sum/d.count/3*100)}));
 const radarPoint=(index:number,total:number,radius:number)=>[(180+100*radius*Math.cos(-Math.PI/2+index*2*Math.PI/total)).toFixed(1),(128+100*radius*Math.sin(-Math.PI/2+index*2*Math.PI/total)).toFixed(1)].join(",");
 const axisBottom=196,axisTop=22,left=56,right=626;
 const chartX=(index:number)=>left+(right-left)*index/Math.max(1,trend.length-1);
 const chartY=(value:number)=>axisBottom-(value-50)/50*(axisBottom-axisTop);
 const chartDots=trend.map((item,index)=>item.value===null?null:{x:chartX(index),y:chartY(item.value),value:item.value});
 const chartRuns:{x:number;y:number;value:number}[][]=[];
 chartDots.forEach(dot=>{if(!dot){return;}if(chartRuns.length===0||chartDots[chartDots.indexOf(dot)-1]===null)chartRuns.push([]);chartRuns[chartRuns.length-1].push(dot);});
 const formatFeedDate=(value:string)=>{
  const item=dateKey(value);
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const clock=timeLabel(value);
  return item===today?"Today, "+clock:item===dateKey(yesterday)?"Yesterday, "+clock:
   new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",timeZone:"Asia/Kolkata"});
 };
 return <section aria-label="Live staff dashboard" className="swastha-live-dashboard swastha-live-dashboard--reference">
  {loading?<div className="swastha-dashboard-loading" role="status">Loading current student and assessment data…</div>:
  error?<div className="swastha-dashboard-loading" role="alert">{error}</div>:<>
  <div className="swastha-approved-dashboard__toolbar"><div><h2>Dashboard – Clinic Overview (Staff)</h2><p>Student progress, assessments, learning activities and clinic operations at a glance.</p></div><div className="swastha-approved-dashboard__filters"><label><span className="sr-only">Select student</span><select aria-label="Filter dashboard by student" value={selection} onChange={e=>setSelection(e.target.value)}><option value="all">All Students</option>{data.students.map(item=><option key={item.id} value={item.id}>{item.full_name} ({item.student_code||"ID pending"})</option>)}</select></label><label><span className="sr-only">Select period</span><select aria-label="Dashboard time period" value={period} onChange={e=>setPeriod(e.target.value as "3"|"6")}><option value="6">Last 6 Months</option><option value="3">Last 3 Months</option></select></label></div></div>
  <div className="swastha-live-dashboard__stats">
   {statItems.map(item=><article key={item.kind} className="swastha-live-stat">
    <div className="swastha-live-stat__icon">{pictogram(item.kind)}</div>
    <div className="swastha-live-stat__body"><div className="swastha-live-stat__label">{item.title}</div>
     <strong>{item.value}</strong>
     <small className={"swastha-live-stat__change "+growthClass(item.delta)}>{growth(item.delta,item.suffix)}</small>
    </div>
   </article>)}
  </div>

  <div className="swastha-live-dashboard__charts swastha-live-dashboard__charts--top swastha-approved-dashboard__three">
   <article className="swastha-live-panel">
    <div className="swastha-live-dashboard__panel-heading">
     <div><h3>Student Progress Trend</h3><p>Average learning progress across all students</p></div>
     <label className="swastha-live-dashboard__period"><span className="sr-only">Progress trend period</span>
      <select value={period} onChange={event=>setPeriod(event.target.value as "6"|"3")} aria-label="Progress trend period"><option value="6">Last 6 Months</option><option value="3">Last 3 Months</option></select>
     </label>
    </div>
    {trend.every(item=>item.value===null)?<div className="swastha-live-dashboard__empty">No teacher-reviewed scores for this period yet.</div>:
    <svg className="swastha-dashboard-trend" role="img" viewBox="0 0 672 254" preserveAspectRatio="xMidYMid meet" aria-label={"Monthly reviewed assessment progress: "+trend.map(x=>x.name+" "+(x.value===null?"not available":x.value+" percent")).join("; ")}>
     <defs><linearGradient id="swastha-progress-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5ac977" stopOpacity=".43"/><stop offset="100%" stopColor="#5ac977" stopOpacity=".035"/></linearGradient></defs>
     {[50,60,70,80,90,100].map(n=><g key={n}><line x1={left} y1={chartY(n)} x2={right} y2={chartY(n)} stroke="#e4e8e7" strokeWidth="1"/><text x="44" y={chartY(n)+4} textAnchor="end" fontSize="13" fill="#29313a">{n}%</text></g>)}
     <line x1={left} x2={left} y1={axisTop} y2={axisBottom} stroke="#9ca3af"/><line x1={left} x2={right} y1={axisBottom} y2={axisBottom} stroke="#9ca3af"/>
     {chartRuns.map((run,i)=><g key={i}>{run.length>1&&<path d={"M"+run[0].x+","+axisBottom+" L"+run.map(p=>p.x+","+p.y).join(" L")+" L"+run[run.length-1].x+","+axisBottom+" Z"} fill="url(#swastha-progress-fill)"/>}{run.length>1&&<polyline points={run.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke="#00894a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>}{run.map((p,j)=><circle key={j} cx={p.x} cy={p.y} r="5.1" fill="#fff" stroke="#00894a" strokeWidth="2.7"/>)}</g>)}
     {trend.map((item,index)=><text key={index} x={chartX(index)} y="227" textAnchor="middle" fontSize="14" fill="#29313a">{item.name}</text>)}
    </svg>}
   </article>

   <article className="swastha-live-panel">
    <h3>Assessment Workflow</h3><p>Assessment status and completion flow</p>
    <div className="swastha-approved-dashboard__funnel">{[
      {label:"Assigned",count:assessments.length},
      {label:"In Progress",count:assessments.filter(x=>x.status!=="assigned").length},
      {label:"Submitted",count:assessments.filter(x=>["submitted","reviewed"].includes(x.status)).length},
      {label:"Reviewed",count:assessments.filter(x=>x.status==="reviewed").length},
      {label:"Approved",count:assessments.filter(x=>x.status==="reviewed").length}
     ].map((item,index)=><div className="swastha-approved-dashboard__funnel-step" key={item.label} style={{["--funnel-step" as string]:String(index)}}><span>{item.label} <strong>{item.count}</strong></span><small>{assessments.length?Math.round(item.count/assessments.length*100):0}%</small></div>)}</div>
    <small>Reviewed is the final approval stage for standard assessments.</small>
   </article>
   <article className="swastha-live-panel">
    <h3>Domain Performance (Avg.)</h3><p>Teacher-reviewed scores by learning domain</p>
    {domainResults.length<3?<div className="swastha-live-dashboard__empty">Insufficient reviewed domain scores to display a valid comparison.</div>:
     <div className="swastha-approved-dashboard__radar"><svg role="img" viewBox="0 0 360 260" aria-label={domainResults.map(d=>d.name+" "+d.value+"%").join("; ")}>
      {[.25,.5,.75,1].map(r=><polygon key={r} points={domainResults.map((d,i)=>radarPoint(i,domainResults.length,r)).join(" ")} fill="none" stroke="#d9e6dd" strokeWidth="1.2"/>)}
      {domainResults.map((d,i)=><line key={d.name} x1="180" y1="128" x2={radarPoint(i,domainResults.length,1).split(",")[0]} y2={radarPoint(i,domainResults.length,1).split(",")[1]} stroke="#d9e6dd"/>)}
      <polygon points={domainResults.map((d,i)=>radarPoint(i,domainResults.length,d.value/100)).join(" ")} fill="#6ad48f" fillOpacity=".27" stroke="#00934c" strokeWidth="2.5"/>
      {domainResults.map((d,i)=><g key={d.name}><circle cx={Number(radarPoint(i,domainResults.length,d.value/100).split(",")[0])} cy={Number(radarPoint(i,domainResults.length,d.value/100).split(",")[1])} r="3.5" fill="#fff" stroke="#008d4e" strokeWidth="2"/><text x={Number(radarPoint(i,domainResults.length,1.19).split(",")[0])} y={Number(radarPoint(i,domainResults.length,1.19).split(",")[1])} fontSize="10.5" fontWeight="600" textAnchor="middle" fill="#144435">{d.name.slice(0,16)}</text></g>)}
     </svg></div>}
   </article>
  </div>
  <div className="swastha-live-dashboard__charts swastha-approved-dashboard__three swastha-approved-dashboard__middle">
   <article className="swastha-live-panel">
    <div><h3>Assessment Outcomes</h3><p>Latest completed assessments</p></div>
    {outcomeTotal?<div className="swastha-live-dashboard__donut-row">
     <div className="swastha-live-dashboard__donut" role="img" aria-label={outcomes.map(x=>x.label+": "+x.count).join("; ")} style={{background:"conic-gradient("+arcs.join(",")+")"}}>
      <div><strong>{outcomeTotal}</strong><small>Assessments</small></div>
     </div>
     <div className="swastha-live-dashboard__legend">{outcomes.map((item,index)=><div key={item.label}><i style={{background:colors[index]}}/><span>{item.label}</span><strong>{Math.round(item.count/outcomeTotal*100)}%</strong></div>)}</div>
    </div>:<div className="swastha-live-dashboard__empty">No assessments have been assigned yet.</div>}
   </article>

   <article className="swastha-live-panel"><h3>Goal Achievement (IDP)</h3><p>Individual development plan goal status</p>
    <div className="swastha-approved-dashboard__goals">{[
      {label:"Achieved",count:goals.filter(g=>["completed","achieved","met"].includes(g.status)).length,kind:"achieved"},
      {label:"In Progress",count:goals.filter(g=>["in_progress","ongoing","active"].includes(g.status)).length,kind:"progress"},
      {label:"Needs Review",count:goals.filter(g=>!["completed","achieved","met","in_progress","ongoing","active"].includes(g.status)).length,kind:"review"}
    ].map(item=><div className={"swastha-approved-dashboard__goal "+item.kind} key={item.label}><span aria-hidden="true">{item.kind==="achieved"?"◎":item.kind==="progress"?"↻":"⚑"}</span><strong>{item.count}</strong><small>{item.label}</small><em>{goals.length?Math.round(item.count/goals.length*100):0}%</em></div>)}</div>
    {!goals.length&&<small>No IDP goals in accessible records yet.</small>}
   </article>
   <article className="swastha-live-panel"><h3>Session Attendance</h3><p>Therapy / learning session attendance</p>
    {sessions.length===0?<div className="swastha-live-dashboard__empty">No sessions recorded yet.</div>:
     <div className="swastha-live-dashboard__donut-row"><div className="swastha-live-dashboard__donut" role="img" aria-label={sessionOutcomes.map(x=>x.label+" "+x.count).join(", ")} style={{background:"conic-gradient("+attendanceArcs.join(",")+")"}}><div><strong>{Math.round(sessionOutcomes[0].count/sessions.length*100)}%</strong><small>Attendance</small></div></div><div className="swastha-live-dashboard__legend">{sessionOutcomes.map((o,i)=><div key={o.label}><i style={{background:colors[i]}}/><span>{o.label}</span><strong>{Math.round(o.count/sessions.length*100)}%</strong></div>)}</div></div>}
   </article>
  </div>
  <div className="swastha-live-dashboard__charts swastha-live-dashboard__charts--bottom swastha-approved-dashboard__three">
   <article className="swastha-live-panel">
    <div className="swastha-live-dashboard__panel-heading">
     <div><h3>Recent Student Activity</h3><p>Latest learning and assessment updates</p></div>
     <button type="button" onClick={()=>router.push(action(role))}>View All <span aria-hidden="true">→</span></button>
    </div>
    {feed.length===0?<div className="swastha-live-dashboard__empty">No recent student activity recorded yet.</div>:
    <div className="swastha-live-dashboard__feed">{feed.map(entry=><button key={entry.id} className="swastha-live-dashboard__record" type="button" onClick={()=>router.push(entry.href)}>
     <span className="swastha-live-dashboard__avatar" aria-hidden="true">{pictogram("students")}</span>
     <span className="swastha-live-dashboard__record-copy"><strong>{studentMap.get(entry.student_id)?.full_name||"Student"}</strong><small>{entry.title} · {entry.detail}</small></span>
     <time>{formatFeedDate(entry.at)}</time><span className="swastha-live-dashboard__record-check" aria-hidden="true">✓</span>
    </button>)}</div>}
   </article>
   <article className="swastha-live-panel">
    <div className="swastha-live-dashboard__panel-heading">
     <span className="swastha-live-dashboard__calendar-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.3"><rect x="4" y="7" width="24" height="21" rx="2"/><path d="M10 3v8M22 3v8M4 14h24M10 19h3m5 0h3m-11 5h3"/></svg></span>
     <div><h3>Today’s Schedule</h3><p>Your sessions, assessments and key activities</p></div>
    </div>
    {todaySessions.length===0?<div className="swastha-live-dashboard__empty">No sessions scheduled for today.</div>:
    <div className="swastha-live-dashboard__schedule">{todaySessions.slice(0,5).map(item=><button key={item.id} type="button" className="swastha-live-dashboard__schedule-row" onClick={()=>router.push("/staff/students/"+item.student_id)}>
     <time className="swastha-live-dashboard__time">{timeLabel(item.scheduled_at)}</time>
     <span className="swastha-live-dashboard__schedule-symbol" aria-hidden="true">◉</span>
     <strong>{item.session_type.replace(/_/g," ")}</strong><small>{studentMap.get(item.student_id)?.full_name||"Student"} · {item.status}</small>
    </button>)}</div>}
   </article>

   <article className="swastha-live-panel"><h3>Action Items</h3><p>Pending tasks and important follow-ups</p>
    <div className="swastha-approved-dashboard__actions">{[
     {label:"Assessments to Review",count:assessments.filter(a=>a.status==="submitted").length,href:role==="teacher"?"/teacher/dashboard":"/staff/actions"},
     {label:"IDP Goals Due for Update",count:goals.filter(g=>g.target_date&&g.target_date<today&&!["completed","achieved","met"].includes(g.status)).length,href:role==="teacher"?"/teacher/idp":"/staff/actions"},
     {label:"Follow-up Appointments",count:role==="teacher"?null:appointments.filter(a=>a.status==="new").length,href:"/staff/operations"},
     {label:"Certificates Ready to Issue",count:assessments.filter(a=>a.status==="reviewed"&&!certificates.some(c=>c.student_id===a.student_id)).length,href:"/staff/assessment-certificates"}
    ].map((item,i)=><button type="button" key={item.label} onClick={()=>router.push(item.href)} className="swastha-approved-dashboard__action"><span className={"swastha-approved-dashboard__count n"+i}>{item.count===null?"—":item.count}</span><span>{item.label}</span><strong aria-hidden="true">›</strong></button>)}</div>
   </article>
  </div>
  <small className="swastha-live-dashboard__note">Dashboard totals reflect current records visible to your staff role. Progress is based only on teacher-reviewed scores (0–3 scale); categories are visualization groupings, not clinical diagnoses.</small>
  </>}
 </section>;
}
