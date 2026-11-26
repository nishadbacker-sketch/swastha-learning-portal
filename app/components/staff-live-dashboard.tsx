"use client";

import {useEffect,useMemo,useState} from "react";
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
    const result:Dataset={...empty,students:ss};
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
 const ids=useMemo(()=>within(selection==="all"?data.students.map(s=>s.id):data.students.filter(s=>s.id===selection).map(s=>s.id)),[data.students,selection]);
 const assessments=data.assessments.filter(x=>ids.has(x.student_id));
 const activities=data.activities.filter(x=>ids.has(x.student_id));
 const sessions=data.sessions.filter(x=>ids.has(x.student_id));
 const inPerson=data.inPerson.filter(x=>ids.has(x.student_id));
 const resultsById=new Map(data.results.filter(x=>typeof x.overall_score==="number"&&x.overall_score>=0&&x.overall_score<=3).map(x=>[x.assignment_id,x]));
 const scored=assessments.filter(x=>x.status==="reviewed").map(x=>resultsById.get(x.id)).filter((x):x is Result=>Boolean(x));
 const avg=scored.length?Math.round(scored.reduce((s,x)=>s+Number(x.overall_score),0)/scored.length/3*100):null;
 const studentMap=new Map(data.students.map(x=>[x.id,x]));
 const today=dateKey(new Date());
 const todaySessions=sessions.filter(s=>dateKey(s.scheduled_at)===today).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
 const outcomes=statuses.map(s=>({label:s.label,count:assessments.filter(x=>x.status===s.key).length}));
 const total=outcomes.reduce((s,x)=>s+x.count,0);
 let running=0;
 const segments=outcomes.map((x,i)=>{const percent=total?x.count/total*100:0;const start=running;running+=percent;return colors[i]+" "+start+"% "+running+"%";});
 const trend=Array.from({length:6},(_,i)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(5-i));const key=dateKey(date).slice(0,7);const points=assessments.filter(x=>x.status==="reviewed").map(x=>({a:x,r:resultsById.get(x.id)})).filter(x=>x.r?.reviewed_at&&dateKey(x.r.reviewed_at).slice(0,7)===key);
  return {name:monthLabel(date),value:points.length?Math.round(points.reduce((sum,x)=>sum+Number(x.r?.overall_score||0),0)/points.length/3*100):null,count:points.length};
 });
 const points=trend.map((x,i)=>x.value===null?null:{x:48+i*102,y:190-x.value*1.45,v:x.value}).filter((p):p is {x:number;y:number;v:number}=>p!==null);
 const feed:Feed[]=[
  ...assessments.map(a=>({id:"a"+a.id,student_id:a.student_id,title:"Assessment "+a.status.replace(/_/g," "),detail:a.assessment_level,at:a.assigned_at,href:"/staff/students/"+a.student_id})),
  ...activities.map(a=>({id:"l"+a.id,student_id:a.student_id,title:"Learning activity "+a.status.replace(/_/g," "),detail:"Learning activities",at:a.assigned_at,href:"/staff/students/"+a.student_id})),
  ...inPerson.map(a=>({id:"i"+a.id,student_id:a.student_id,title:"In-person assessment "+a.status,detail:a.assessment_level,at:a.created_at,href:"/staff/in-person-assessments?session="+a.id}))
 ].filter(x=>Number.isFinite(new Date(x.at).valueOf())).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,5);
 const icon=(kind:string)=><span aria-hidden="true" className="swastha-live-stat__icon">{kind}</span>;
 return <section aria-label="Live staff dashboard" className="swastha-live-dashboard">
  <div className="swastha-live-dashboard__heading"><div><h2>Learning & Clinic Dashboard</h2><p>Current records available to your staff role. Figures update from existing student, assessment and session data.</p></div>
   <label>View student<select aria-label="Filter live staff dashboard by student" value={data.students.some(s=>s.id===selection)?selection:"all"} onChange={e=>setSelection(e.target.value)}><option value="all">All permitted students</option>{data.students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.student_code||"ID pending"})</option>)}</select></label>
  </div>
  {loading?<div style={card} role="status">Loading current dashboard data…</div>:error?<div style={card} role="alert">{error}</div>:<>
   <div className="swastha-live-dashboard__stats">
    <div style={card}>{icon("♟")}<div><span>Total Students</span><strong>{ids.size}</strong><small>Accessible student records</small></div></div>
    <div style={card}>{icon("☑")}<div><span>Assessments</span><strong>{assessments.length}</strong><small>{outcomes[0].count} reviewed</small></div></div>
    <div style={card}>{icon("▤")}<div><span>Learning Activities</span><strong>{activities.length}</strong><small>{activities.filter(x=>good(x.status)).length} completed</small></div></div>
    <div style={card}>{icon("▥")}<div><span>Reviewed Score (Avg.)</span><strong>{avg===null?"—":avg+"%"}</strong><small>{scored.length} reviewed scores on a 0–3 scale</small></div></div>
   </div>
   <div className="swastha-live-dashboard__charts">
    <section style={card}><h3>Student Progress Trend</h3><p>Monthly average of reviewed assessment scores (past six months)</p>{points.length===0?<div className="swastha-live-dashboard__empty">No reviewed scores for this period yet.</div>:<svg role="img" aria-label={"Six-month reviewed assessment score trend: "+trend.map(x=>x.name+" "+(x.value===null?"no data":x.value+"%")).join("; ")} viewBox="0 0 600 230" preserveAspectRatio="xMidYMid meet" style={{width:"100%",height:"auto",maxHeight:270}}>
      {[0,25,50,75,100].map(n=><g key={n}><line x1="48" y1={190-n*1.45} x2="575" y2={190-n*1.45} stroke="#e2e8e5"/><text x="41" y={194-n*1.45} fontSize="11" textAnchor="end" fill="#65756b">{n}%</text></g>)}
      <polyline fill="none" stroke="#07844a" strokeWidth="3.5" points={points.map(p=>p.x+","+p.y).join(" ")}/>
      {points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#07844a" strokeWidth="3"/>)}
      {trend.map((x,i)=><text key={i} x={48+i*102} y="220" fontSize="12" textAnchor="middle" fill="#4e6158">{x.name}</text>)}
     </svg>}<small>Only reviewed scores are included; missing months are not estimated.</small></section>
    <section style={card}><h3>Assessment Outcomes</h3><p>Current standard assessment workflow stages</p>{total? <div className="swastha-live-dashboard__donut-row"><div className="swastha-live-dashboard__donut" role="img" aria-label={outcomes.map(x=>x.label+" "+x.count).join(", ")} style={{background:"conic-gradient("+segments.join(",")+")"}}><div><strong>{total}</strong><small>Assessments</small></div></div><div className="swastha-live-dashboard__legend">{outcomes.map((x,i)=><div key={x.label}><i style={{background:colors[i]}}/><span>{x.label}</span><strong>{Math.round(x.count/total*100)}%</strong></div>)}</div></div>:<div className="swastha-live-dashboard__empty">No assessments have been assigned yet.</div>}</section>
   </div>
   <div className="swastha-live-dashboard__charts">
    <section style={card}><div className="swastha-live-dashboard__panel-heading"><div><h3>Recent Student Activity</h3><p>Latest assessment and learning updates</p></div><button type="button" onClick={()=>router.push(action(role))}>View All</button></div>
     {feed.length===0?<div className="swastha-live-dashboard__empty">No recent activity records are available.</div>:feed.map(f=><button key={f.id} type="button" className="swastha-live-dashboard__record" onClick={()=>router.push(f.href)}><span className="swastha-live-dashboard__avatar">●</span><span><strong>{studentMap.get(f.student_id)?.full_name||"Student"}</strong><small>{f.title} · {f.detail}</small></span><time>{new Date(f.at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",timeZone:"Asia/Kolkata"})}</time></button>)}
    </section>
    <section style={card}><div className="swastha-live-dashboard__panel-heading"><div><h3>Today’s Schedule</h3><p>Sessions scheduled for today (India time)</p></div><button type="button" onClick={()=>router.push("/staff/operations")}>Calendar</button></div>
     {todaySessions.length===0?<div className="swastha-live-dashboard__empty">No sessions scheduled for today.</div>:todaySessions.slice(0,8).map(s=><button key={s.id} type="button" className="swastha-live-dashboard__record" onClick={()=>router.push("/staff/students/"+s.student_id)}><time className="swastha-live-dashboard__time">{timeLabel(s.scheduled_at)}</time><span><strong>{s.session_type.replace(/_/g," ")}</strong><small>{studentMap.get(s.student_id)?.full_name||"Student"} · {s.status}</small></span></button>)}
    </section>
   </div>
   <small className="swastha-live-dashboard__note">In-Person Assessment records remain available under Staff Tools. Reviewed-score percentages describe saved assessment ratings, not clinical diagnoses or validated ability scores.</small>
  </>}
 </section>;
}
