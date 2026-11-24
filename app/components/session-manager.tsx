"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";
import BrandLogo from "./brand-logo";

type Student={id:string;full_name:string;student_code:string|null};
type Teacher={id:string;user_id:string;status:string};
type TeacherLink={teacher_id:string;student_id:string};
type Session={id:string;student_id:string;teacher_user_id:string;appointment_enquiry_id:string|null;scheduled_at:string;duration_minutes:number;session_type:string;status:string;activities_done:string;teacher_notes:string};
type Goal={id:string;assignment_id:string;title:string};
type Assessment={id:string;student_id:string;status:string};
type GoalLink={session_id:string;goal_id:string};
type Published={id:string;session_id:string;student_id:string;summary:string;approved_at:string};
type AppointmentLink={enquiry_id:string;student_id:string};
type Change={id:number;session_id:string;changed_at:string;previous_status:string;new_status:string;previous_activities:string;new_activities:string;previous_notes:string;new_notes:string};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16,marginBottom:12};
const button:React.CSSProperties={padding:"10px 14px",border:0,borderRadius:8,color:"white",background:"#176b58",cursor:"pointer",fontWeight:700};
const field:React.CSSProperties={padding:10,border:"1px solid #cbd5e1",borderRadius:8,maxWidth:"100%",width:"100%",background:"#fff",color:"#183a35"};
const types=["individual","group","review","follow_up"];
const statuses=["scheduled","attended","absent","cancelled","rescheduled"];
const fmt=(d:string)=>new Date(d).toLocaleString("en-IN");
const dateInput=(d:string)=>{const x=new Date(d);const local=new Date(x.getTime()-x.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);};
export default function SessionManager({role}:{role:"teacher"|"admin"|"clinic_admin"}){
 const router=useRouter();
 const [students,setStudents]=useState<Student[]>([]);
 const [teachers,setTeachers]=useState<Teacher[]>([]);
 const [links,setLinks]=useState<TeacherLink[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [assessments,setAssessments]=useState<Assessment[]>([]);
 const [goals,setGoals]=useState<Goal[]>([]);
 const [goalLinks,setGoalLinks]=useState<GoalLink[]>([]);
 const [published,setPublished]=useState<Published[]>([]);
 const [appointments,setAppointments]=useState<AppointmentLink[]>([]);
 const [changes,setChanges]=useState<Change[]>([]);
 const [appointmentId,setAppointmentId]=useState("");
 const [uid,setUid]=useState("");
 const [studentId,setStudentId]=useState("");
 const [teacherId,setTeacherId]=useState("");
 const [when,setWhen]=useState("");
 const [duration,setDuration]=useState(45);
 const [sessionType,setSessionType]=useState("individual");
 const [drafts,setDrafts]=useState<Record<string,{status:string;activities_done:string;teacher_notes:string;summary:string;goal_id:string}>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const isLeadership=role!=="teacher";
 const home=role==="teacher"?"/teacher/dashboard":role==="admin"?"/admin/dashboard":"/clinic-admin/dashboard";
 const refresh=useCallback(async()=>{
  const db=supabase;
  if(!db){setError("Supabase is not configured.");setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const {data:auth,error:authError}=await db.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:rr,error:roleError}=await db.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(roleError||!rr||!(role==="admin"?["admin","owner"].includes(rr.role):rr.role===role)){router.replace("/login");return;}
   setUid(auth.user.id);
   const [t,l]=await Promise.all([
    db.from("teachers").select("id,user_id,status").eq("status","active"),
    db.from("teacher_assignments").select("teacher_id,student_id")
   ]);
   if(t.error||l.error)throw Error("Could not load active Teacher assignments.");
   const activeTeachers=(t.data||[]) as Teacher[];
   const teacherLinks=(l.data||[]) as TeacherLink[];
   const allowedTeacherIds=activeTeachers.filter(t=>t.user_id===auth.user.id).map(t=>t.id);
   const ids=[...new Set((isLeadership?teacherLinks:teacherLinks.filter(x=>allowedTeacherIds.includes(x.teacher_id))).map(x=>x.student_id))];
   let ss:Student[]=[];
   if(ids.length){
    const s=await db.from("students").select("id,full_name,student_code").in("id",ids).order("full_name");
    if(s.error)throw s.error;ss=(s.data||[]) as Student[];
   }
   const sessionsQuery=db.from("clinic_sessions").select("id,student_id,teacher_user_id,appointment_enquiry_id,scheduled_at,duration_minutes,session_type,status,activities_done,teacher_notes").order("scheduled_at",{ascending:false}).limit(300);
   const raw=await sessionsQuery;
   if(raw.error)throw raw.error;
   const visible=(raw.data||[]) as Session[];
   const ownSessions=visible.filter(s=>ids.includes(s.student_id));
   const sessionIds=ownSessions.map(x=>x.id);
   let publishedRows:Published[]=[];let goalRows:GoalLink[]=[];let historyRows:Change[]=[];let appointmentRows:AppointmentLink[]=[];
   if(sessionIds.length){
    const [p,g,h]=await Promise.all([
     db.from("clinic_session_parent_updates").select("id,session_id,student_id,summary,approved_at").in("session_id",sessionIds),
     db.from("clinic_session_goal_links").select("session_id,goal_id").in("session_id",sessionIds),
     db.from("clinic_session_history").select("id,session_id,changed_at,previous_status,new_status,previous_activities,new_activities,previous_notes,new_notes").in("session_id",sessionIds).order("changed_at",{ascending:false}).limit(500)
    ]);
    if(p.error||g.error||h.error)throw Error("Unable to load approved summaries, IDP links or session history.");
    publishedRows=(p.data||[]) as Published[];
    goalRows=(g.data||[]) as GoalLink[];
    historyRows=(h.data||[]) as Change[];
   }
   let as:Assessment[]=[];let gg:Goal[]=[];
   if(ids.length){const a=await db.from("appointment_registration_links").select("enquiry_id,student_id").in("student_id",ids).limit(500);if(!a.error)appointmentRows=(a.data||[]) as AppointmentLink[];}
   if(ids.length){
    const r=await db.from("assessment_assignments").select("id,student_id,status").in("student_id",ids).eq("status","reviewed").limit(1000);
    if(r.error)throw r.error;as=(r.data||[]) as Assessment[];
    if(as.length){
     const goalsResult=await db.from("student_development_goals").select("id,assignment_id,title").in("assignment_id",as.map(x=>x.id)).limit(1000);
     if(goalsResult.error)throw goalsResult.error;gg=(goalsResult.data||[]) as Goal[];
    }
   }
   setStudents(ss);setTeachers(activeTeachers);setLinks(teacherLinks);setSessions(ownSessions);
   setPublished(publishedRows);setGoalLinks(goalRows);setAssessments(as);setGoals(gg);setChanges(historyRows);setAppointments(appointmentRows);
   setDrafts(Object.fromEntries(ownSessions.map(s=>[s.id,{
    status:s.status,activities_done:s.activities_done,teacher_notes:s.teacher_notes,
    summary:publishedRows.find(x=>x.session_id===s.id)?.summary||"",goal_id:""
   }])));
  }catch(e){setError(e instanceof Error?e.message:"Unable to load sessions.");}
  finally{setLoading(false);}
 },[role,router,isLeadership]);
 useEffect(()=>{void refresh();},[refresh]);
 const chosenStudent=students.some(s=>s.id===studentId)?studentId:students[0]?.id||"";
 const availableTeachers=useMemo(()=>{
  const teacherIds=new Set(links.filter(l=>l.student_id===chosenStudent).map(l=>l.teacher_id));
  return teachers.filter(t=>teacherIds.has(t.id));
 },[teachers,links,chosenStudent]);
 const eligibleAppointments=appointments.filter(x=>x.student_id===chosenStudent);
 const chosenAppointment=eligibleAppointments.some(x=>x.enquiry_id===appointmentId)?appointmentId:"";
 const chosenTeacher=isLeadership?(availableTeachers.some(t=>t.user_id===teacherId)?teacherId:availableTeachers[0]?.user_id||""):uid;
 const studentName=(id:string)=>{const s=students.find(s=>s.id===id);return s?s.full_name+" ("+(s.student_code||"ID pending")+")":"Student";};
 const eligibleGoals=(id:string)=>{const approved=new Set(assessments.filter(a=>a.student_id===id).map(a=>a.id));return goals.filter(g=>approved.has(g.assignment_id));};
 async function createSession(e:React.FormEvent){
  e.preventDefault();if(!supabase||!chosenStudent||!chosenTeacher||!when)return;
  if(!Number.isInteger(duration)||duration<5||duration>240){setError("Duration must be 5–240 minutes.");return;}
  setBusy("create");setError("");setNotice("");
  const {error:e1}=await supabase.from("clinic_sessions").insert({
   student_id:chosenStudent,teacher_user_id:chosenTeacher,scheduled_at:new Date(when).toISOString(),
   duration_minutes:duration,session_type:sessionType,created_by:uid,
   appointment_enquiry_id:chosenAppointment||null
  });
  if(e1)setError(e1.message);else{setNotice("Student session scheduled.");setWhen("");setAppointmentId("");await refresh();}
  setBusy("");
 }
 async function saveSession(s:Session){
  if(!supabase)return;const d=drafts[s.id];if(!d)return;
  setBusy(s.id);setError("");setNotice("");
  const {data,error:e}=await supabase.from("clinic_sessions").update({
   status:d.status,activities_done:d.activities_done,teacher_notes:d.teacher_notes
  }).eq("id",s.id).select("id");
  if(e)setError(e.message);else if(!data?.length)setError("Session was not saved. Check your permissions.");
  else{setNotice("Attendance and private Teacher notes saved.");await refresh();}
  setBusy("");
 }
 async function linkGoal(s:Session){
  if(!supabase)return;const goal=drafts[s.id]?.goal_id;
  if(!goal)return;setBusy("goal-"+s.id);setError("");setNotice("");
  const {error:e}=await supabase.from("clinic_session_goal_links").insert({session_id:s.id,goal_id:goal,linked_by:uid});
  if(e)setError(e.message);else{setNotice("IDP goal linked to this session.");await refresh();}
  setBusy("");
 }
 async function approve(s:Session){
  if(!supabase||!isLeadership||s.status!=="attended")return;
  const summary=drafts[s.id]?.summary.trim()||"";
  if(summary.length<10||summary.length>3000){setError("Approved summary must be 10–3000 characters.");return;}
  setBusy("approve-"+s.id);setError("");setNotice("");
  const existing=published.find(x=>x.session_id===s.id);
  const response=existing
   ?await supabase.from("clinic_session_parent_updates").update({summary}).eq("id",existing.id).select("id")
   :await supabase.from("clinic_session_parent_updates").insert({
    session_id:s.id,student_id:s.student_id,session_date:s.scheduled_at,summary,approved_by:uid
   }).select("id");
  if(response.error)setError(response.error.message);
  else if(!response.data?.length)setError("No summary was published. Check permissions.");
  else{setNotice("Parent-visible session summary approved.");await refresh();}
  setBusy("");
 }
 return <main style={{background:"#f8faf7",color:"#183a35",minHeight:"100vh",padding:"22px 16px",fontFamily:"Arial,sans-serif"}}>
  <div style={{maxWidth:1050,margin:"auto"}}>
   <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
    <BrandLogo/>
    <button style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push(home)}>Back to Dashboard</button>
   </header>
   <h1>Student Sessions & Interventions</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Attendance, private Teacher observations, learning activities and approved Parent updates. Session notes are never automatically shared with Parents.</p>
   {error&&<section role="alert" style={{...card,color:"#b42318"}}>{error}</section>}
   {notice&&<section role="status" style={{...card,color:"#176b58"}}>{notice}</section>}
   {loading?<p>Loading student sessions...</p>:<>
    <section style={card}>
     <h2 style={{fontSize:18}}>Schedule Session</h2>
     {!students.length?<p>No assigned students available.</p>:
     <form onSubmit={createSession} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,alignItems:"end"}}>
      <label>Student<select required style={field} value={chosenStudent} onChange={e=>{setStudentId(e.target.value);setTeacherId("");}}>{students.map(x=><option key={x.id} value={x.id}>{studentName(x.id)}</option>)}</select></label>
      {eligibleAppointments.length>0&&<label>Linked Appointment (optional)<select style={field} value={chosenAppointment} onChange={e=>setAppointmentId(e.target.value)}><option value="">No appointment linked</option>{eligibleAppointments.map(x=><option key={x.enquiry_id} value={x.enquiry_id}>Appointment {x.enquiry_id.slice(0,8)}</option>)}</select></label>}
      {isLeadership&&<label>Assigned Teacher<select required style={field} value={chosenTeacher} onChange={e=>setTeacherId(e.target.value)}>{availableTeachers.map(x=><option key={x.user_id} value={x.user_id}>{x.user_id===uid?"My Teacher account":x.user_id.slice(0,8)}</option>)}</select></label>}
      <label>Date and Time<input required type="datetime-local" style={field} value={when} onChange={e=>setWhen(e.target.value)}/></label>
      <label>Duration (minutes)<input required type="number" min={5} max={240} style={field} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>
      <label>Type<select style={field} value={sessionType} onChange={e=>setSessionType(e.target.value)}>{types.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></label>
      <button type="submit" style={button} disabled={!!busy||!chosenTeacher}>{busy==="create"?"Saving...":"Schedule Session"}</button>
     </form>}
    </section>
    <section style={card}>
     <h2 style={{fontSize:18}}>Student Session History</h2>
     {!sessions.length&&<p>No sessions recorded yet.</p>}
     {sessions.map(s=>{
      const d=drafts[s.id]||{status:s.status,activities_done:s.activities_done,teacher_notes:s.teacher_notes,summary:"",goal_id:""};
      const already=published.find(x=>x.session_id===s.id);
      const linksForSession=goalLinks.filter(g=>g.session_id===s.id);
      return <article key={s.id} style={{...card,background:"#fcfefd"}}>
       <h3 style={{fontSize:16,margin:"0 0 5px"}}>{studentName(s.student_id)} · {fmt(s.scheduled_at)}</h3>
       <p style={{fontSize:12,color:"#64748b"}}>{s.session_type.replace(/_/g," ")} · {s.duration_minutes} min · Teacher: {s.teacher_user_id.slice(0,8)} · {s.status}{s.appointment_enquiry_id?" · Linked appointment "+s.appointment_enquiry_id.slice(0,8):""}</p>
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
        <label>Attendance / Session Status<select style={field} value={d.status} onChange={e=>setDrafts(x=>({...x,[s.id]:{...d,status:e.target.value}}))}>{statuses.map(v=><option key={v} value={v}>{v.replace(/_/g," ")}</option>)}</select></label>
        <label>Activities Conducted<textarea rows={3} style={field} maxLength={4000} value={d.activities_done} onChange={e=>setDrafts(x=>({...x,[s.id]:{...d,activities_done:e.target.value}}))}/></label>
        <label>Private Teacher Observations<textarea rows={3} style={field} maxLength={6000} value={d.teacher_notes} onChange={e=>setDrafts(x=>({...x,[s.id]:{...d,teacher_notes:e.target.value}}))}/></label>
       </div>
       <button style={{...button,marginTop:9}} disabled={!!busy} onClick={()=>void saveSession(s)}>Save Session & Attendance</button>
       <div style={{borderTop:"1px solid #dce8e1",paddingTop:10,marginTop:12}}>
        <strong>Linked IDP goals</strong>
        {linksForSession.length?<p>{linksForSession.map(x=>goals.find(g=>g.id===x.goal_id)?.title||"Goal").join("; ")}</p>:<p style={{fontSize:12}}>No IDP goal linked yet.</p>}
        {eligibleGoals(s.student_id).filter(g=>!linksForSession.some(x=>x.goal_id===g.id)).length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
         <select aria-label="Select IDP goal" style={{...field,maxWidth:350}} value={d.goal_id} onChange={e=>setDrafts(x=>({...x,[s.id]:{...d,goal_id:e.target.value}}))}>
          <option value="">Select approved IDP goal</option>
          {eligibleGoals(s.student_id).filter(g=>!linksForSession.some(x=>x.goal_id===g.id)).map(g=><option key={g.id} value={g.id}>{g.title}</option>)}
         </select>
         <button type="button" style={button} disabled={!d.goal_id||!!busy} onClick={()=>void linkGoal(s)}>Link Goal</button>
        </div>}
       </div>
       <details style={{marginTop:12}}><summary style={{cursor:"pointer",fontWeight:700}}>Session change history ({changes.filter(x=>x.session_id===s.id).length})</summary>{changes.filter(x=>x.session_id===s.id).map(x=><div key={x.id} style={{borderTop:"1px solid #dce8e1",marginTop:7,paddingTop:7,fontSize:12}}><strong>{fmt(x.changed_at)}</strong> · {x.previous_status} → {x.new_status}<p style={{whiteSpace:"pre-wrap"}}>Activities: {x.new_activities||"Not recorded"} · Private observation: {x.new_notes||"Not recorded"}</p></div>)}</details>
       {isLeadership&&<section style={{...card,background:"#f0f8f3",marginTop:12,marginBottom:0}}>
        <h4 style={{margin:"0 0 6px"}}>Approve Parent-Visible Summary</h4>
        <p style={{fontSize:12}}>Only leadership approval publishes a summary. Private notes remain restricted. Session must be attended.</p>
        <textarea rows={3} style={field} maxLength={3000} value={d.summary} onChange={e=>setDrafts(x=>({...x,[s.id]:{...d,summary:e.target.value}}))} placeholder="Write a suitable parent-facing summary. Do not copy private clinical notes."/>
        <button style={{...button,marginTop:9}} disabled={!!busy||s.status!=="attended"} onClick={()=>void approve(s)}>{already?"Update Approved Summary":"Approve and Publish Summary"}</button>
        {already&&<p style={{fontSize:12,color:"#176b58"}}>Approved on {fmt(already.approved_at)}</p>}
       </section>}
      </article>;
     })}
    </section>
   </>}
  </div>
 </main>;
}
