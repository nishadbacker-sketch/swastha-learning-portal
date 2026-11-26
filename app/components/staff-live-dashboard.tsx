"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";
import type {StaffRole} from "./staff-tools-menu";

type Student={id:string;full_name:string;student_code:string|null;created_at:string};
type Assessment={id:string;student_id:string;status:string;assigned_at:string;assessment_level:string};
type Result={assignment_id:string;overall_score:number|null;reviewed_at:string|null};
type Activity={id:string;student_id:string;status:string;assigned_at:string};
type Session={id:string;student_id:string;session_type:string;status:string;scheduled_at:string};
type InPerson={id:string;student_id:string;assessment_level:string;status:string;created_at:string};
type Feed={id:string;student_id:string;title:string;detail:string;at:string;href:string};
type Dataset={students:Student[];assessments:Assessment[];results:Result[];activities:Activity[];sessions:Session[];inPerson:InPerson[]};
const empty:Dataset={students:[],assessments:[],results:[],activities:[],sessions:[],inPerson:[]};
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
    const result:Dataset={students:ss,assessments:[],results:[],activities:[],sessions:[],inPerson:[]};
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
     const {data:scored,error:re}=await supabase.from("assessment_results").select("assignment_id,overall_score,reviewed_at").in("assignment_id",reviewed.slice(start,start+80)).limit(2000);
     if(!re)result.results.push(...(scored||[]) as Result[]);
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

 const studentIds=new Set(data.students.map(student=>student.id));
 const assessments=data.assessments.filter(item=>studentIds.has(item.student_id));
 const activities=data.activities.filter(item=>studentIds.has(item.student_id));
 const sessions=data.sessions.filter(item=>studentIds.has(item.student_id));
 const inPerson=data.inPerson.filter(item=>studentIds.has(item.student_id));
 const studentMap=new Map(data.students.map(student=>[student.id,student]));
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
 const pictogram=(type:"students"|"assessments"|"activities"|"progress")=>{
  const common={width:34,height:34,viewBox:"0 0 32 32",fill:"none",stroke:"currentColor",strokeWidth:2.1,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  if(type==="students")return <svg {...common} aria-hidden="true"><circle cx="16" cy="8" r="4" fill="currentColor" stroke="none"/><circle cx="5.8" cy="11" r="3.2" fill="currentColor" stroke="none"/><circle cx="26.2" cy="11" r="3.2" fill="currentColor" stroke="none"/><path d="M8 25v-3c0-4.8 3-7.5 8-7.5s8 2.7 8 7.5v3H8Z" fill="currentColor" stroke="none"/><path d="M1.2 24v-3c0-3.3 1.8-5.4 5.3-5.4M30.8 24v-3c0-3.3-1.8-5.4-5.3-5.4"/></svg>;
  if(type==="assessments")return <svg {...common} aria-hidden="true"><rect x="6" y="5" width="20" height="24" rx="2"/><path d="M12 5V3h8v2M10 18l4 4 8-9"/></svg>;
  if(type==="activities")return <svg {...common} aria-hidden="true"><path d="M16 29c-3.5-2.8-7.3-3.7-13-3.5V5c5.9-.5 9.5.3 13 3.5 3.5-3.2 7.1-4 13-3.5v20.5c-5.7-.2-9.5.7-13 3.5ZM16 8.5V29"/></svg>;
  return <svg {...common} aria-hidden="true"><rect x="5" y="17" width="4.6" height="10" rx="2" fill="currentColor" stroke="none"/><rect x="14" y="10" width="4.6" height="17" rx="2" fill="currentColor" stroke="none"/><rect x="23" y="3" width="4.6" height="24" rx="2" fill="currentColor" stroke="none"/></svg>;
 };
 const statItems=[
  {kind:"students" as const,title:"Total Students",value:data.students.length,delta:studentGrowth,suffix:"%"},
  {kind:"assessments" as const,title:"Assessments",value:assessments.length,delta:assessmentGrowth,suffix:"%"},
  {kind:"activities" as const,title:"Learning Activities",value:activities.length,delta:activityGrowth,suffix:"%"},
  {kind:"progress" as const,title:"Progress (Avg.)",value:avg===null?"—":avg+"%",delta:avgGrowth,suffix:" pp"}
 ];
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
  <div className="swastha-live-dashboard__stats">
   {statItems.map(item=><article key={item.kind} className="swastha-live-stat">
    <div className="swastha-live-stat__icon">{pictogram(item.kind)}</div>
    <div className="swastha-live-stat__body"><div className="swastha-live-stat__label">{item.title}</div>
     <strong>{item.value}</strong>
     <small className={"swastha-live-stat__change "+growthClass(item.delta)}>{growth(item.delta,item.suffix)}</small>
    </div>
   </article>)}
  </div>
  <div className="swastha-live-dashboard__charts swastha-live-dashboard__charts--top">
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
    <div><h3>Assessment Outcomes</h3><p>Latest completed assessments</p></div>
    {outcomeTotal?<div className="swastha-live-dashboard__donut-row">
     <div className="swastha-live-dashboard__donut" role="img" aria-label={outcomes.map(x=>x.label+": "+x.count).join("; ")} style={{background:"conic-gradient("+arcs.join(",")+")"}}>
      <div><strong>{outcomeTotal}</strong><small>Assessments</small></div>
     </div>
     <div className="swastha-live-dashboard__legend">{outcomes.map((item,index)=><div key={item.label}><i style={{background:colors[index]}}/><span>{item.label}</span><strong>{Math.round(item.count/outcomeTotal*100)}%</strong></div>)}</div>
    </div>:<div className="swastha-live-dashboard__empty">No assessments have been assigned yet.</div>}
   </article>
  </div>
  <div className="swastha-live-dashboard__charts swastha-live-dashboard__charts--bottom">
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
  </div>
  <small className="swastha-live-dashboard__note">Dashboard totals reflect current records visible to your staff role. Progress is based only on teacher-reviewed scores (0–3 scale); categories are visualization groupings, not clinical diagnoses.</small>
  </>}
 </section>;
}
