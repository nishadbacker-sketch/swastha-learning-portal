"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import StaffMetricBars from "./staff-metric-bars";
import {supabase} from "../../lib/supabase";

type Student={id:string;full_name:string;student_code:string|null};
type Teacher={id:string;user_id:string;status:string};
type Link={teacher_id:string;student_id:string};
type Session={id:string;student_id:string;teacher_user_id:string;scheduled_at:string;duration_minutes:number;session_type:string;status:string};
type Summary={session_id:string;student_id:string};
type Assessment={id:string;student_id:string};
type Goal={id:string;assignment_id:string;title:string;target_date:string|null;status:string;current_percent:number|null};
type Enquiry={id:string;status:string;next_followup_date:string|null};
const card:React.CSSProperties={padding:16,background:"#fff",border:"1px solid #dce8e1",borderRadius:12};
const action:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:"pointer"};
const d=(value:string)=>new Date(value).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
const toDate=(value:Date)=>{const f=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const get=(t:string)=>f.find(x=>x.type===t)?.value||"";return get("year")+"-"+get("month")+"-"+get("day");};
const csvCell=(x:unknown)=>{const v=String(x??"");const safe=/^[=+@\-\t\r]/.test(v)?"'"+v:v;return '"'+safe.replace(/"/g,'""')+'"';};
const dlCsv=(filename:string,rows:unknown[][])=>{const blob=new Blob([rows.map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);};
function countBy<T>(a:T[],key:(v:T)=>string){const m:Record<string,number>={};for(const item of a){const k=key(item);m[k]=(m[k]||0)+1;}return m;}

export default function ClinicOperationsPanel(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [students,setStudents]=useState<Student[]>([]);
 const [teachers,setTeachers]=useState<Teacher[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [summaries,setSummaries]=useState<Summary[]>([]);
 const [goals,setGoals]=useState<Goal[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [enquiries,setEnquiries]=useState<Enquiry[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [view,setView]=useState<"week"|"month">("week");
 const [anchor,setAnchor]=useState(toDate(new Date()));
 const [studentFilter,setStudentFilter]=useState("all");
 const [teacherFilter,setTeacherFilter]=useState("all");
 const [tab,setTab]=useState<"calendar"|"attention"|"workload">("calendar");
 useEffect(()=>{const next=new URLSearchParams(window.location.search).get("view");if(next==="attention"||next==="workload"||next==="calendar")setTab(next);},[]);
 const load=useCallback(async()=>{
  const db=supabase;
  if(!db){setError("Supabase unavailable.");setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await db.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const rr=await db.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(rr.error||!rr.data||!["owner","admin","clinic_admin","teacher"].includes(rr.data.role)){router.replace("/login");return;}
   const currentRole=rr.data.role as string;
   setRole(currentRole);
   const [t,l]=await Promise.all([
    db.from("teachers").select("id,user_id,status"),
    db.from("teacher_assignments").select("teacher_id,student_id")
   ]);
   if(t.error||l.error)throw Error("Teacher assignments could not be loaded.");
   const teacherRows=(t.data||[]) as Teacher[];
   const links=(l.data||[]) as Link[];
   const ids=[...new Set((currentRole==="teacher"?links.filter(x=>teacherRows.some(t=>t.id===x.teacher_id&&t.user_id===auth.user!.id&&t.status==="active")):links).map(x=>x.student_id))];
   const staffTeachers=currentRole==="teacher"?teacherRows.filter(t=>t.user_id===auth.user!.id):teacherRows;
   const chunks=<T,>(arr:T[])=>Array.from({length:Math.ceil(arr.length/100)},(_,i)=>arr.slice(i*100,(i+1)*100));
   const ss:Student[]=[];
   // Administrative roles see all active students permitted by RLS, including unassigned students.
   // Teachers are restricted further to active teacher assignment links.
   if(currentRole==="teacher"){
    for(const chunk of chunks(ids)){
     const r=await db.from("students").select("id,full_name,student_code").in("id",chunk).is("removed_at",null);
     if(r.error)throw Error("Assigned student records could not be loaded.");
     ss.push(...(r.data||[]) as Student[]);
    }
   }else{
    const r=await db.from("students").select("id,full_name,student_code").is("removed_at",null).order("full_name").limit(2000);
    if(r.error)throw Error("Authorised student records could not be loaded.");
    ss.push(...(r.data||[]) as Student[]);
   }
   const aa:Assessment[]=[];
   for(const chunk of chunks(ss.map(item=>item.id))){
    const r=await db.from("assessment_assignments").select("id,student_id").in("student_id",chunk).eq("status","reviewed");
    if(r.error)throw Error("Authorised reviewed assessments could not be loaded.");
    aa.push(...(r.data||[]) as Assessment[]);
   }
   const allowedStudentIds=ss.map(student=>student.id);
   const allowedSet=new Set(allowedStudentIds);
   const approvedAssessments=aa.filter(item=>allowedSet.has(item.student_id));
   const from=new Date();from.setUTCFullYear(from.getUTCFullYear()-1);
   const until=new Date();until.setUTCFullYear(until.getUTCFullYear()+2);
   const allSessions:Session[]=[];
   for(const chunk of chunks(allowedStudentIds)){
    const r=await db.from("clinic_sessions").select("id,student_id,teacher_user_id,scheduled_at,duration_minutes,session_type,status")
      .in("student_id",chunk).gte("scheduled_at",from.toISOString()).lte("scheduled_at",until.toISOString()).order("scheduled_at").limit(1000);
    if(r.error)throw Error("Session information could not be loaded.");
    allSessions.push(...(r.data||[]) as Session[]);
    if(r.data?.length===1000)throw Error("Too many sessions for a complete report. Narrow the reporting period.");
   }
   const reviewIds=approvedAssessments.map(a=>a.id);
   const gg:Goal[]=[];
   for(const chunk of chunks(reviewIds)){
    const g=await db.from("student_development_goals").select("id,assignment_id,title,target_date,status,current_percent").in("assignment_id",chunk).limit(1000);
    if(g.error)throw Error("Approved IDP goals could not be loaded.");
    gg.push(...(g.data||[]) as Goal[]);
    if(g.data?.length===1000)throw Error("Too many goals to include safely.");
   }
   const summaryRows:Summary[]=[];
   for(const chunk of chunks(allSessions.map(s=>s.id))){
    const p=await db.from("clinic_session_parent_updates").select("session_id,student_id").in("session_id",chunk);
    if(p.error)throw Error("Session approval information unavailable.");
    summaryRows.push(...(p.data||[]) as Summary[]);
   }
   const pending:Enquiry[]=[];
   if(currentRole!=="teacher"){
    const e=await db.from("appointment_enquiries").select("id,status,next_followup_date").limit(1000);
    if(e.error)throw Error("Follow-up queue could not be loaded.");
    pending.push(...(e.data||[]) as Enquiry[]);
   }
   ss.sort((a,b)=>a.full_name.localeCompare(b.full_name));
   setStudents(ss);setTeachers(staffTeachers);setSessions(allSessions);setSummaries(summaryRows);setGoals(gg);setAssessments(approvedAssessments);setEnquiries(pending);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load clinic operations.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 const ownGoals=useMemo(()=>{
  const allowed=new Set(assessments.filter(a=>studentFilter==="all"||a.student_id===studentFilter).map(a=>a.id));
  return goals.filter(g=>allowed.has(g.assignment_id));
 },[goals,assessments,studentFilter]);
 const visible=useMemo(()=>sessions.filter(s=>(studentFilter==="all"||s.student_id===studentFilter)&&(teacherFilter==="all"||s.teacher_user_id===teacherFilter)),[sessions,studentFilter,teacherFilter]);
 const today=toDate(new Date());
 const pendingReviews=ownGoals.filter(g=>g.target_date&&g.target_date<today&&g.status!=="achieved");
 const sessionSummaryIds=new Set(summaries.map(s=>s.session_id));
 const awaiting=visible.filter(s=>s.status==="attended"&&!sessionSummaryIds.has(s.id));
 const statusCounts=countBy(visible,s=>s.status);
 const done=visible.filter(s=>s.status==="attended").length;
 const attendanceDenom=done+(statusCounts.absent||0);
 const attendancePct=attendanceDenom?Math.round(done/attendanceDenom*100):null;
 const openFollowups=enquiries.filter(e=>!["completed","not_interested"].includes(e.status));
 const overdueFollowups=openFollowups.filter(e=>e.next_followup_date&&e.next_followup_date<today);
 const shiftDate=(iso:string,days:number)=>{const x=new Date(iso+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+days);return x.toISOString().slice(0,10);};
 const firstDate=anchor||today;
 const calendarStart=view==="week"?shiftDate(firstDate,-((new Date(firstDate+"T12:00:00Z").getUTCDay()+6)%7)):firstDate.slice(0,7)+"-01";
 const calendarEnd=view==="week"?shiftDate(calendarStart,7):(()=>{const x=new Date(calendarStart+"T12:00:00Z");x.setUTCMonth(x.getUTCMonth()+1);return x.toISOString().slice(0,10);})();
 const dayCount=Math.round((Date.parse(calendarEnd+"T12:00:00Z")-Date.parse(calendarStart+"T12:00:00Z"))/86400000);
 const dateSeries=Array.from({length:dayCount},(_,i)=>shiftDate(calendarStart,i));
 const inWindow=visible.filter(s=>{const day=toDate(new Date(s.scheduled_at));return day>=calendarStart&&day<calendarEnd;});
 const grouped=Object.groupBy(inWindow,s=>toDate(new Date(s.scheduled_at)));
 const student=(id:string)=>{const s=students.find(x=>x.id===id);return s?s.full_name+" ("+(s.student_code||"ID pending")+")":"Student";};
 const sessionRoute=role==="teacher"?"/teacher/sessions":role==="clinic_admin"?"/clinic-admin/sessions":"/admin/sessions";
 const exportRows=()=>dlCsv("swastha-clinic-sessions-"+today+".csv",[
  ["Student","Student ID","Teacher user ID","Session date (ISO)","Duration minutes","Session type","Attendance status","Parent summary approved"],
  ...visible.map(s=>{const child=students.find(x=>x.id===s.student_id);return [child?.full_name||"Unknown",child?.student_code||"",s.teacher_user_id,s.scheduled_at,s.duration_minutes,s.session_type,s.status,sessionSummaryIds.has(s.id)?"Yes":"No"];})
 ]);
 return <section aria-label="Clinic Operations" className="swastha-clinic-operations-panel">
  <div className="swastha-clinic-operations-panel__heading"><div>
   <h2>Clinic Operations</h2><p>Session calendar, outstanding approvals, follow-ups and detailed workload reporting</p>
  </div><button type="button" style={action} onClick={()=>router.push(sessionRoute)}>Manage Sessions</button></div>
   {error&&<section role="alert" style={{...card,marginBottom:12,color:"#b42318"}}>{error}</section>}
   {loading?<p>Loading authorised clinic records...</p>:<>
    <div style={{...card,display:"flex",gap:12,alignItems:"end",flexWrap:"wrap",marginBottom:12}}>
     <label style={{fontSize:13}}>Student
      <select style={{display:"block",padding:9,marginTop:4}} value={studentFilter} onChange={e=>setStudentFilter(e.target.value)}>
       <option value="all">All permitted students</option>
       {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.student_code||"ID pending"})</option>)}
      </select>
     </label>
     <label style={{fontSize:13}}>Teacher
      <select style={{display:"block",padding:9,marginTop:4}} value={teacherFilter} onChange={e=>setTeacherFilter(e.target.value)}>
       <option value="all">All permitted Teachers</option>
       {teachers.map(t=><option key={t.id} value={t.user_id}>{t.user_id.slice(0,8)}</option>)}
      </select>
     </label>
     <button style={action} onClick={exportRows} disabled={!visible.length}>Export Session CSV</button>
    </div>
    <nav aria-label="Operations view" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
     {(["calendar","attention","workload"] as const).map(v=><button key={v} style={{...action,background:v===tab?"#176b58":"#eaf4ef",color:v===tab?"white":"#176b58"}} onClick={()=>setTab(v)}>{v==="calendar"?"Session Calendar":v==="attention"?"Follow-up & Reviews":"Teacher Workload"}</button>)}
    </nav>
    {tab==="calendar"&&<section style={card}>
     <h2>Session Calendar</h2>
     <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",marginBottom:12}}>
      <label>Calendar period<select style={{display:"block",padding:9,marginTop:4}} value={view} onChange={e=>setView(e.target.value as "week"|"month")}><option value="week">Weekly</option><option value="month">Monthly</option></select></label>
      <label>Reference date<input type="date" style={{display:"block",padding:9,marginTop:4}} value={anchor} onChange={e=>setAnchor(e.target.value)}/></label>
      <span style={{fontSize:12,color:"#64748b"}}>{inWindow.length} scheduled record(s) in selected period</span>
     </div>
     <div style={{display:"grid",gridTemplateColumns:view==="week"?"repeat(auto-fit,minmax(135px,1fr))":"repeat(auto-fit,minmax(145px,1fr))",gap:8}}>
      {dateSeries.map(day=><div key={day} style={{padding:10,background:"#f8faf7",border:"1px solid #dce8e1",borderRadius:8,minHeight:100}}>
       <strong style={{fontSize:12}}>{day}</strong>
       {(grouped[day]||[]).map(s=><div key={s.id} style={{fontSize:11,marginTop:8,padding:7,background:"#eaf4ef",borderRadius:7}}>
        <b>{d(s.scheduled_at).split(",").slice(-1).join(",").trim()}</b><div>{student(s.student_id)}</div><div>{s.status.replace(/_/g," ")}</div>
       </div>)}
      </div>)}
     </div>
    </section>}
    {tab==="attention"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(285px,1fr))",gap:12}}>
     <section style={card}><h2>Sessions Awaiting Parent Summary Approval</h2>
      {!awaiting.length?<p>No approvals currently due.</p>:awaiting.map(s=><p key={s.id} style={{borderTop:"1px solid #e2e8f0",paddingTop:8}}>{student(s.student_id)} · {d(s.scheduled_at)}</p>)}
     </section>
     <section style={card}><h2>Overdue IDP Goal Reviews</h2>
      {!pendingReviews.length?<p>No overdue IDP goals for these students.</p>:pendingReviews.map(g=><p key={g.id} style={{borderTop:"1px solid #e2e8f0",paddingTop:8}}><strong>{g.title}</strong> · Review {g.target_date}</p>)}
     </section>
     {role!=="teacher"&&<section style={card}><h2>Overdue Appointment Follow-ups</h2>
      {!overdueFollowups.length?<p>No overdue follow-ups recorded.</p>:overdueFollowups.map(e=><p key={e.id} style={{borderTop:"1px solid #e2e8f0",paddingTop:8}}>Enquiry {e.id.slice(0,8)} · Due {e.next_followup_date} · {e.status}</p>)}
     </section>}
    </div>}
    {tab==="workload"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
     <section style={card}><h2>Teacher Session Workload</h2>
      <StaffMetricBars items={teachers.map(t=>({label:"Teacher "+t.user_id.slice(0,8),value:visible.filter(s=>s.teacher_user_id===t.user_id).length}))} emptyMessage="No assigned teacher sessions in this view."/>
      <p style={{fontSize:12,color:"#64748b"}}>Authorized session counts by staff member; use the teacher filter to narrow results.</p>
     </section>
     <section style={card}><h2>Session Summary</h2>
      <p>Scheduled sessions: <strong>{visible.length}</strong></p><p>Attended: <strong>{done}</strong> · Absent: <strong>{statusCounts.absent||0}</strong></p>
      <p>Attendance rate: <strong>{attendancePct===null?"No completed attendance records":attendancePct+"%"}</strong></p>
      <p style={{fontSize:12,color:"#64748b"}}>Calculated from attended and absent records only. Future, cancelled and rescheduled sessions are excluded from the rate.</p>
     </section>
    </div>}
    <p style={{fontSize:12,color:"#64748b",marginTop:15}}>Operational data is limited to accessible records and the reporting horizon; no clinical diagnosis is implied.</p>
   </>}
 </section>;
}
