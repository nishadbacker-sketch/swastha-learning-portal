"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";
import type {StaffRole} from "./staff-tools-menu";

type Student={id:string;full_name:string;student_code:string|null};
type Assessment={id:string;student_id:string;status:string;assigned_at:string};
type Activity={id:string;student_id:string;status:string;assigned_at:string};
type Session={id:string;student_id:string;scheduled_at:string;session_type:string;status:string};
type Status={label:string;value:number;color:string};
type Data={students:Student[];assessments:Assessment[];activities:Activity[];sessions:Session[];warnings:string[];limits:string[]};
const empty:Data={students:[],assessments:[],activities:[],sessions:[],warnings:[],limits:[]};
const keyParts=(v:string)=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(v));const value=(type:string)=>parts.find(p=>p.type===type)?.value||"";return [value("year"),value("month"),value("day")];};
const dateKey=(v:string)=>keyParts(v).join("-");
const monthKey=(v:string)=>keyParts(v).slice(0,2).join("-");
const readableDate=(v:string)=>new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",year:"numeric"}).format(new Date(v));
const readableTime=(v:string)=>new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit"}).format(new Date(v));
const complete=(s:string)=>s==="completed"||s==="reviewed";
const nav=(r:StaffRole)=>r==="teacher"?"/teacher/dashboard":r==="clinic_admin"?"/clinic-admin/dashboard":r==="owner"?"/owner/dashboard":"/admin/dashboard";
const colors=["#08784f","#59bd75","#aadf9a","#dce7e0","#d9a34f"];
const statusList=[["reviewed","Reviewed"],["submitted","Awaiting review"],["in_progress","In progress"],["assigned","Assigned"]] as const;
const shortMonth=(key:string)=>new Intl.DateTimeFormat("en-IN",{month:"short",timeZone:"UTC"}).format(new Date(key+"-01T12:00:00Z"));

function CardIcon({name}:{name:"students"|"assessments"|"activities"|"progress"}){
 const props={width:28,height:28,viewBox:"0 0 32 32",stroke:"currentColor",strokeWidth:2,fill:"none",strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
 return <svg {...props}>{name==="students"?<><circle cx="16" cy="10" r="4"/><path d="M8 26v-4c0-5 3-8 8-8s8 3 8 8v4H8ZM7 13a4 4 0 0 1 0-7M25 13a4 4 0 0 0 0-7M3 25v-4c0-3 2-5 5-6m21 10v-4c0-3-2-5-5-6"/></>:name==="assessments"?<><rect x="6" y="6" width="20" height="23" rx="2"/><path d="M12 6V3h8v3M11 18l3 3 7-9"/></>:name==="activities"?<><path d="M16 8C12 5 6 6 3 8v19c5-2 9-1 13 2 4-3 8-4 13-2V8c-3-2-9-3-13 0Zm0 0v21"/></>:<><path d="M3 26h26M6 23v-7h4v7m3 0V11h5v12m4 0V5h5v18"/></>}</svg>;
}

export default function StaffDashboardInsights({role}:{role:StaffRole}){
 const router=useRouter();
 const [data,setData]=useState<Data>(empty);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [selectedPeriod,setSelectedPeriod]=useState("6");
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!supabase){if(active){setError("Dashboard data is unavailable.");setLoading(false);}return;}
   setLoading(true);setError("");
   try{
    const db=supabase;
    const {data:{user},error:authError}=await db.auth.getUser();
    if(authError||!user){router.replace("/login");return;}
    const {data:roleRow,error:roleError}=await db.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
    if(roleError||!roleRow||roleRow.role!==role)throw Error("Dashboard role verification failed.");
    let ids:string[]|null=null;
    if(role==="teacher"){
     const {data:teacher,error:te}=await db.from("teachers").select("id").eq("user_id",user.id).eq("status","active").maybeSingle();
     if(te||!teacher)throw Error("An active Teacher account is required.");
     const {data:links,error:le}=await db.from("teacher_assignments").select("student_id").eq("teacher_id",teacher.id);
     if(le)throw le;
     ids=[...new Set((links||[]).map(x=>x.student_id))];
    }
    if(ids!==null&&!ids.length){if(active)setData(empty);return;}
    let query=db.from("students").select("id,full_name,student_code").is("removed_at",null).order("full_name").limit(1000);
    if(ids!==null)query=query.in("id",ids);
    const result=await query;
    if(result.error)throw result.error;
    const students=(result.data||[]) as Student[];
    if(!students.length){if(active)setData(empty);return;}
    const now=new Date();
    const day=dateKey(now.toISOString());
    const warnings:string[]=[],limits:string[]=[];
    if(students.length===1000)limits.push("Student list may be incomplete: 1,000-record display limit.");
    const as:Assessment[]=[],act:Activity[]=[],sessions:Session[]=[];
    // Use ID-scoped reads for all staff and active teacher assignment checks; Supabase RLS also applies.
    const allIds=students.map(s=>s.id);
    for(let i=0;i<allIds.length;i+=80){
     const chunk=allIds.slice(i,i+80);
     const responses=await Promise.all([
      db.from("assessment_assignments").select("id,student_id,status,assigned_at").in("student_id",chunk).order("assigned_at",{ascending:false}).limit(1000),
      db.from("student_activity_assignments").select("id,student_id,status,assigned_at").in("student_id",chunk).order("assigned_at",{ascending:false}).limit(1000),
      db.from("clinic_sessions").select("id,student_id,scheduled_at,session_type,status").in("student_id",chunk).gte("scheduled_at",day+"T00:00:00+05:30").lt("scheduled_at",new Date(new Date(day+"T00:00:00+05:30").getTime()+86400000).toISOString()).limit(1000)
     ]);
     const labels=["Assessment","Learning activity","Session"];
     for(let j=0;j<responses.length;j++){
      const response=responses[j];
      if(response.error)warnings.push(labels[j]+" records may be unavailable for this role.");
      if((response.data||[]).length===1000)limits.push(labels[j]+" records reached a 1,000-row limit; charts may be partial.");
     }
     if(!responses[0].error)as.push(...(responses[0].data||[]) as Assessment[]);
     if(!responses[1].error)act.push(...(responses[1].data||[]) as Activity[]);
     if(!responses[2].error)sessions.push(...(responses[2].data||[]) as Session[]);
    }
    if(active)setData({students,assessments:as,activities:act,sessions,warnings:[...new Set(warnings)],limits:[...new Set(limits)]});
   }catch(e){if(active)setError(e instanceof Error?e.message:"Could not load dashboard insights.");}
   finally{if(active)setLoading(false);}
  }
  void load();
  return()=>{active=false;};
 },[role,router]);
 const stats=useMemo(()=>{
  const today=new Date();
  const month=monthKey(today.toISOString());
  const months=Array.from({length:6},(_,i)=>{
   const d=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1-(5-i),1,12));
   return d.toISOString().slice(0,7);
  });
  const outcome:Status[]=statusList.map(([key,label],i)=>({label,value:data.assessments.filter(a=>a.status===key).length,color:colors[i]}));
  const unknown=Math.max(0,data.assessments.length-outcome.reduce((n,s)=>n+s.value,0));
  if(unknown)outcome.push({label:"Other",value:unknown,color:colors[4]});
  const cohort=months.map(key=>{
   const assigned=data.activities.filter(a=>monthKey(a.assigned_at)===key);
   return {key,assigned:assigned.length,done:assigned.filter(a=>complete(a.status)).length,rate:assigned.length?Math.round(100*assigned.filter(a=>complete(a.status)).length/assigned.length):null};
  });
  const people=new Map(data.students.map(s=>[s.id,s]));
  const recent=[
   ...data.assessments.map(a=>({id:"ass-"+a.id,studentId:a.student_id,label:"Assessment · "+a.status.replace(/_/g," "),date:a.assigned_at})),
   ...data.activities.map(a=>({id:"act-"+a.id,studentId:a.student_id,label:"Learning activity · "+a.status.replace(/_/g," "),date:a.assigned_at}))
  ].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(a=>({...a,student:people.get(a.studentId)}));
  const appointments=data.sessions.filter(s=>!["cancelled","completed"].includes(s.status)).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).slice(0,8).map(s=>({...s,student:people.get(s.student_id)}));
  return {cohort,outcome,recent,appointments,complete:data.activities.filter(a=>complete(a.status)).length};
 },[data]);
 const total=data.assessments.length||1;
 const filled=stats.outcome.filter(x=>x.value>0);
 let offset=0;
 const donut=filled.map(s=>{const start=offset;offset+=s.value/total*100;return {color:s.color,start,end:offset};});
 const chartMonths=stats.cohort.slice(-Number(selectedPeriod));
 const gap=14,chartHeight=132,width=540;
 const points=chartMonths.map((x,i)=>({x:chartMonths.length===1?width/2:gap+i*(width-gap*2)/(chartMonths.length-1),y:x.rate===null?null:chartHeight-(x.rate/100)*chartHeight,key:x.key,rate:x.rate}));
 const segments:typeof points[]=[];
 for(const p of points){if(p.y===null)continue;const last=segments[segments.length-1];if(last&&points.indexOf(p)>0&&points[points.indexOf(p)-1].y!==null)last.push(p);else segments.push([p]);}
 return <section aria-label="Live staff dashboard" className="swastha-staff-dashboard-visual">
  {error&&<p role="alert" className="swastha-staff-dashboard-warning">{error}</p>}
  {(data.warnings.length>0||data.limits.length>0)&&<p role="status" className="swastha-staff-dashboard-warning">{[...data.warnings,...data.limits].join(" ")}</p>}
  <div className="swastha-staff-dashboard-kpis">
   {([
    ["students","Total Students",data.students.length,"/staff/students"],
    ["assessments","Assessments",data.assessments.length,"/staff/courses"],
    ["activities","Learning Activities",data.activities.length,role==="teacher"?"/teacher/dashboard":"/staff/courses"],
    ["progress","Activities Completed",data.activities.length?Math.round(stats.complete/data.activities.length*100)+"%":"—","/staff/operations"]
   ] as const).map(([icon,label,value,path])=><button type="button" key={label} className="swastha-staff-dashboard-kpi" onClick={()=>router.push(path)}>
    <span className="swastha-staff-dashboard-kpi-icon"><CardIcon name={icon}/></span>
    <span><small>{label}</small><strong>{loading?"…":error?"—":value}</strong><em>{icon==="progress"?"Completion of recorded assignments":"Records visible to your staff role"}</em></span>
   </button>)}
  </div>
  <div className="swastha-staff-dashboard-chart-grid">
   <article className="swastha-staff-dashboard-panel">
    <div className="swastha-staff-dashboard-panel-heading"><div><h2>Student Learning Progress</h2><p>Current completion of activities assigned in each month — not a clinical score</p></div>
     <select aria-label="Select chart period" value={selectedPeriod} onChange={e=>setSelectedPeriod(e.target.value)}><option value="6">Last 6 months</option><option value="3">Last 3 months</option></select>
    </div>
    {chartMonths.every(m=>m.rate===null)?<p className="swastha-muted">No learning activities assigned in this period.</p>:
    <div className="swastha-staff-dashboard-chart-wrap"><svg role="img" aria-label={"Learning activity completion by assignment month: "+chartMonths.map(m=>shortMonth(m.key)+" "+(m.rate===null?"no data":m.rate+" percent")).join(", ")} viewBox="0 0 580 190" preserveAspectRatio="xMidYMid meet">
     {[0,25,50,75,100].map(t=><g key={t}><line x1="35" y1={157-t*1.3} x2="575" y2={157-t*1.3} stroke="#e2e8e6"/><text x="1" y={161-t*1.3} fontSize="12" fill="#61756c">{t}%</text></g>)}
     {segments.map((s,i)=><polyline key={i} points={s.map(p=>(p.x+35)+","+((p.y??0)+25)).join(" ")} fill="none" stroke="#0b8d57" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>)}
     {points.map(p=><g key={p.key}><text x={p.x+35} y="181" textAnchor="middle" fontSize="12" fill="#61756c">{shortMonth(p.key)}</text>{p.y!==null&&<circle cx={p.x+35} cy={p.y+25} r="5" stroke="#08784f" strokeWidth="3" fill="#fff"/>}</g>)}
    </svg></div>}
    <p className="swastha-staff-dashboard-footnote">A month without assignments is shown as missing data, not 0% progress.</p>
   </article>
   <article className="swastha-staff-dashboard-panel">
    <div className="swastha-staff-dashboard-panel-heading"><div><h2>Assessment Outcomes</h2><p>Current workflow statuses of saved assessments</p></div></div>
    {!data.assessments.length?<p className="swastha-muted">No permitted assessment records available.</p>:<div className="swastha-staff-dashboard-donut-layout">
      <div className="swastha-staff-dashboard-donut" role="img" aria-label={stats.outcome.map(x=>x.label+": "+x.value).join(", ")}
       style={{background:"conic-gradient("+donut.map(x=>x.color+" "+x.start+"% "+x.end+"%").join(",")+")"}}>
       <div><strong>{data.assessments.length}</strong><small>Assessments</small></div>
      </div>
      <div className="swastha-staff-dashboard-legend">{stats.outcome.map(x=><div key={x.label}><span style={{background:x.color}}/><span>{x.label}</span><strong>{x.value}</strong></div>)}</div>
    </div>}
   </article>
  </div>
  <div className="swastha-staff-dashboard-chart-grid">
   <article className="swastha-staff-dashboard-panel"><div className="swastha-staff-dashboard-panel-heading"><div><h2>Recent Student Activity</h2><p>Latest assignments and their current recorded statuses</p></div><button type="button" onClick={()=>router.push("/staff/students")}>View all</button></div>
    {stats.recent.length===0?<p className="swastha-muted">No activity has been recorded yet.</p>:<div className="swastha-staff-dashboard-feed">{stats.recent.map(x=><div key={x.id} className="swastha-staff-dashboard-feed-row"><span className="swastha-staff-dashboard-avatar" aria-hidden="true">●</span><span><strong>{x.student?.full_name||"Permitted student"}</strong><small>{x.label} · Assigned {readableDate(x.date)}</small></span></div>)}</div>}
   </article>
   <article className="swastha-staff-dashboard-panel"><div className="swastha-staff-dashboard-panel-heading"><div><h2>Today's Schedule</h2><p>Today's permitted clinic sessions (India time)</p></div><button type="button" onClick={()=>router.push("/staff/operations")}>Calendar</button></div>
    {stats.appointments.length===0?<p className="swastha-muted">No active sessions scheduled for today.</p>:<div className="swastha-staff-dashboard-feed">{stats.appointments.map(x=><div key={x.id} className="swastha-staff-dashboard-session"><time dateTime={x.scheduled_at}>{readableTime(x.scheduled_at)}</time><span><strong>{x.session_type.replace(/_/g," ")}</strong><small>{x.student?.full_name||"Permitted student"} · {x.status.replace(/_/g," ")}</small></span></div>)}</div>}
   </article>
  </div>
  <p className="swastha-staff-dashboard-footnote">All figures use accessible saved records. Charts show educational activity and workflow indicators, not diagnoses or fabricated performance trends.</p>
 </section>;
}
