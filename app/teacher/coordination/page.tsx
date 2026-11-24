"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

type Student={id:string;student_code:string;full_name:string;current_class:string|null;status:string};
type Task={id:string;student_id:string;title:string;description:string;category:string;status:"open"|"in_progress"|"blocked"|"done";priority:string;due_date:string|null;assigned_to:string|null;created_by:string;created_at:string};
type Note={id:string;student_id:string;task_id:string|null;category:string;body:string;author_id:string;created_at:string};
type Work={student_id:string;assessment_pending:number;assessment_submitted:number;assessment_reviewed:number;activity_pending:number;activity_completed:number;idp_open:number;idp_completed:number};
type Staff={user_id:string;full_name:string;teacher_status:string};
const sheet:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:17};
const btn:React.CSSProperties={background:"#176b58",border:0,borderRadius:9,padding:"10px 13px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"};
const field:React.CSSProperties={background:"#fff",color:"#183a35",border:"1px solid #cbd5e1",padding:"10px 12px",borderRadius:8,width:"100%",fontSize:13};
const caption:React.CSSProperties={fontSize:12,color:"#64748b"};
const count=(n:number|null|undefined)=>Number(n||0);
const time=(s:string)=>new Date(s).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});
const categories=[["general","General coordination"],["assessment","Assessment"],["activity","Learning activity"],["idp","IDP goal"],["parent_followup","Parent follow-up"]];
export default function TeacherCoordination(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [userId,setUserId]=useState("");
 const [students,setStudents]=useState<Student[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [notes,setNotes]=useState<Note[]>([]);
 const [staff,setStaff]=useState<Staff[]>([]);
 const [work,setWork]=useState<Record<string,Work>>({});
 const [selectedStudent,setSelectedStudent]=useState("");
 const [query,setQuery]=useState("");
 const [show,setShow]=useState("all");
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [category,setCategory]=useState("general");
 const [priority,setPriority]=useState("normal");
 const [due,setDue]=useState("");
 const [noteBody,setNoteBody]=useState("");
 const [noteCategory,setNoteCategory]=useState("progress");
 const [noteTask,setNoteTask]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const isTeacher=role==="teacher";
 const displayName=(id:string|null)=>id?staff.find(t=>t.user_id===id)?.full_name||"Teacher":"Unclaimed";

 const refresh=useCallback(async()=>{
  if(!supabase)throw new Error("Supabase is not configured");
  const [a,b,c,d,e]=await Promise.all([
   supabase.from("students").select("id,student_code,full_name,current_class,status").order("full_name"),
   supabase.from("student_coordination_tasks").select("id,student_id,title,description,category,status,priority,due_date,assigned_to,created_by,created_at").order("created_at",{ascending:false}).limit(1500),
   supabase.from("student_coordination_notes").select("id,student_id,task_id,category,body,author_id,created_at").order("created_at",{ascending:false}).limit(1500),
   supabase.rpc("coordination_staff_directory"),
   supabase.rpc("coordination_student_work_summary")
  ]);
  for(const result of [a,b,c,d,e])if(result.error)throw result.error;
  setStudents((a.data||[]) as Student[]);
  setTasks((b.data||[]) as Task[]);
  setNotes((c.data||[]) as Note[]);
  setStaff((d.data||[]) as Staff[]);
  setWork(Object.fromEntries(((e.data||[]) as Work[]).map(x=>[x.student_id,x])));
 },[]);
 useEffect(()=>{
  let active=true;
  async function start(){
   if(!supabase){setError("Database unavailable");setLoading(false);return;}
   try{
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user){router.replace("/login");return;}
    const {data:ur,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
    if(roleError||!ur||!["teacher","admin","clinic_admin","owner"].includes(ur.role)){router.replace("/login");return;}
    if(ur.role==="teacher"){
     const {data:teacher,error:teacherError}=await supabase.from("teachers").select("id").eq("user_id",auth.user.id).eq("status","active").maybeSingle();
     if(teacherError||!teacher){router.replace("/login");return;}
    }
    if(active){setRole(ur.role);setUserId(auth.user.id);}
    await refresh();
   }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load coordination dashboard.");}
   finally{if(active)setLoading(false);}
  }
  void start();
  return()=>{active=false;};
 },[refresh,router]);
 async function reload(){
  setBusy("refresh");setError("");
  try{await refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to refresh.");}
  finally{setBusy("");}
 }
 async function createTask(){
  if(!supabase||!selectedStudent||!title.trim()||!isTeacher)return;
  setBusy("create");setError("");setNotice("");
  try{
   const {error:e}=await supabase.from("student_coordination_tasks").insert({
    student_id:selectedStudent,title:title.trim(),description:description.trim(),
    category,priority,due_date:due||null,created_by:userId
   });
   if(e){if(e.code==="23505")throw Error("An unfinished task with the same title already exists for this student. Please use the shared task instead.");throw e;}
   setTitle("");setDescription("");setDue("");setNotice("Added to shared task queue. Any assigned teacher can claim this work.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not create task.");}
  finally{setBusy("");}
 }
 async function transition(task:Task,action:"claim"|"complete"|"block"|"resume"|"release"){
  if(!supabase||!isTeacher)return;
  setBusy(task.id);setError("");setNotice("");
  try{
   const {data,error:e}=await supabase.rpc("coordination_transition_task",{p_task_id:task.id,p_action:action});
   if(e)throw e;
   setNotice(typeof data==="string"?data:"Task updated.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not update task.");}
  finally{setBusy("");}
 }
 async function addNote(){
  if(!supabase||!isTeacher||!selectedStudent||!noteBody.trim())return;
  setBusy("note");setError("");setNotice("");
  try{
   const {error:e}=await supabase.from("student_coordination_notes").insert({
    student_id:selectedStudent,task_id:noteTask||null,category:noteCategory,body:noteBody.trim(),author_id:userId
   });
   if(e)throw e;
   setNoteBody("");setNoteTask("");setNotice("Progress note shared with the assigned teachers.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not save note.");}
  finally{setBusy("");}
 }
 const visible=useMemo(()=>students.filter(s=>(s.full_name+" "+s.student_code+" "+(s.current_class||"")).toLowerCase().includes(query.toLowerCase())),[students,query]);
 const student=students.find(s=>s.id===selectedStudent);
 const studentTasks=tasks.filter(t=>t.student_id===selectedStudent&&
  (show==="all"||(show==="open"&&t.status!=="done")||(show==="mine"&&t.assigned_to===userId)||(show==="done"&&t.status==="done")));
 const studentNotes=notes.filter(n=>n.student_id===selectedStudent);
 const summary=work[selectedStudent];
 const outstanding=tasks.filter(t=>t.status!=="done");
 const mine=outstanding.filter(t=>t.assigned_to===userId);
 const unclaimed=outstanding.filter(t=>t.assigned_to===null);
 const blocked=outstanding.filter(t=>t.status==="blocked");
 const goBack=role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";
 if(loading)return <main style={{padding:32}}>Loading coordination workspace...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",fontFamily:"Arial, sans-serif",color:"#183a35"}}>
  <header style={{background:"#fff",padding:"15px 5%",borderBottom:"1px solid #dce8e1"}}>
   <div style={{maxWidth:1220,margin:"auto",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
    <div><strong style={{color:"#176b58"}}>SWASTHA LEARNING CLINIC</strong><div style={caption}>{isTeacher?"TEACHER COORDINATION":"COORDINATION OVERSIGHT · READ ONLY"}</div></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" style={{...btn,background:"#eaf4ef",color:"#176b58"}} disabled={!!busy} onClick={()=>void reload()}>Refresh</button><button type="button" style={btn} onClick={()=>router.push(goBack)}>Back to Dashboard</button></div>
   </div>
  </header>
  <div style={{maxWidth:1220,margin:"auto",padding:"22px 15px 75px",display:"grid",gap:15}}>
   <div><h1 style={{fontSize:26,margin:"0 0 7px"}}>{isTeacher?"Teacher Coordination Dashboard":"Teacher Coordination Overview"}</h1>
    <p style={{...caption,fontSize:13,margin:0}}>All active teachers share student access. Claim tasks to prevent duplicated work, add handover/progress notes, and track assessment and IDP status. {isTeacher?"":"Creator and Admin can monitor progress without editing teacher notes."}</p></div>
   {error&&<div role="alert" style={{...sheet,color:"#b42318"}}>{error}</div>}
   {notice&&<div role="status" style={{...sheet,color:"#176b58"}}>{notice}</div>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
    {[[ "Students",students.length],["Open tasks",outstanding.length],["Unclaimed",unclaimed.length],["Blocked",blocked.length],["My tasks",isTeacher?mine.length:"—"]].map(([label,n])=><div key={label} style={sheet}><div style={caption}>{label}</div><strong style={{fontSize:27,display:"block",marginTop:7}}>{n}</strong></div>)}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"minmax(230px,300px) minmax(0,1fr)",gap:14,alignItems:"start"}}>
    <section style={sheet}>
     <h2 style={{fontSize:17,margin:"0 0 11px"}}>Shared Students</h2>
     <input aria-label="Find student" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, ID or class" style={field}/>
     <div style={{display:"grid",gap:7,marginTop:11,maxHeight:650,overflowY:"auto"}}>
      {visible.map(s=>{const waiting=tasks.filter(t=>t.student_id===s.id&&t.status!=="done").length;return <button type="button" key={s.id} onClick={()=>{setSelectedStudent(s.id);setNotice("");setShow("all");}} style={{textAlign:"left",padding:11,borderRadius:9,background:selectedStudent===s.id?"#eaf4ef":"#fff",border:selectedStudent===s.id?"2px solid #176b58":"1px solid #dce8e1",cursor:"pointer",color:"#183a35"}}>
       <strong style={{fontSize:13}}>{s.full_name}</strong><div style={{...caption,marginTop:4}}>{s.student_code} · {s.current_class||"Class not set"} · {waiting} open task(s)</div>
      </button>;})}
      {!visible.length&&<p style={caption}>No students match this search.</p>}
     </div>
    </section>
    <div style={{display:"grid",gap:13,minWidth:0}}>
     {!student?<section style={sheet}>Select a student to coordinate work and view progress.</section>:<>
      <section style={sheet}>
       <h2 style={{fontSize:21,margin:"0 0 4px"}}>{student.full_name}</h2>
       <p style={caption}>Student ID: {student.student_code} · Class: {student.current_class||"Not recorded"} · Student status: {student.status}</p>
       <h3 style={{fontSize:15,margin:"17px 0 9px"}}>Learning pipeline</h3>
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:9}}>
        {[
         ["Assessments awaiting response",count(summary?.assessment_pending)],
         ["Submitted for review",count(summary?.assessment_submitted)],
         ["Reviewed assessments",count(summary?.assessment_reviewed)],
         ["Activities pending",count(summary?.activity_pending)],
         ["Activities completed",count(summary?.activity_completed)],
         ["IDP goals open",count(summary?.idp_open)],
         ["IDP goals completed",count(summary?.idp_completed)]
        ].map(([label,value])=><div key={label} style={{background:"#f4f8f5",borderRadius:8,padding:10}}><div style={caption}>{label}</div><strong style={{fontSize:22}}>{value}</strong></div>)}
       </div>
       {isTeacher&&<div style={{display:"flex",gap:8,marginTop:15,flexWrap:"wrap"}}>
        <button type="button" style={btn} onClick={()=>router.push("/teacher/dashboard")}>Assessments & Activities</button>
        <button type="button" style={{...btn,background:"#0f4c5c"}} onClick={()=>router.push("/teacher/idp")}>Manage IDP Goals</button>
       </div>}
      </section>
      <section style={sheet}>
       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:9}}>
        <h3 style={{fontSize:17,margin:0}}>Shared Task Queue</h3>
        <select aria-label="Task status filter" value={show} onChange={e=>setShow(e.target.value)} style={{...field,width:"auto"}}>
         <option value="all">All tasks</option><option value="open">Outstanding</option>{isTeacher&&<option value="mine">My tasks</option>}<option value="done">Completed</option>
        </select>
       </div>
       <div style={{display:"grid",gap:9,marginTop:12}}>
        {studentTasks.map(t=><div key={t.id} style={{padding:12,borderRadius:9,border:"1px solid #dce8e1",background:t.status==="blocked"?"#fffaf0":"#fff"}}>
         <div style={{display:"flex",gap:9,justifyContent:"space-between",alignItems:"start",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:160}}><strong style={{fontSize:14}}>{t.title}</strong><div style={{...caption,marginTop:5}}>{t.category.replace(/_/g," ")} · {t.priority} priority · {t.status.replace(/_/g," ")}</div></div>
          <span style={{fontSize:12,fontWeight:700,color:t.status==="done"?"#176b58":t.status==="blocked"?"#b45309":"#64748b"}}>{displayName(t.assigned_to)}</span>
         </div>
         {t.description&&<p style={{fontSize:13,whiteSpace:"pre-wrap",margin:"9px 0"}}>{t.description}</p>}
         {t.due_date&&<p style={{...caption,margin:"7px 0"}}>Due: {t.due_date}</p>}
         {isTeacher&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}>
          {t.status==="open"&&<button type="button" style={btn} disabled={!!busy} onClick={()=>void transition(t,"claim")}>Claim Task</button>}
          {t.assigned_to===userId&&t.status==="in_progress"&&<>
           <button type="button" style={btn} disabled={!!busy} onClick={()=>void transition(t,"complete")}>Mark Complete</button>
           <button type="button" style={{...btn,background:"#b45309"}} disabled={!!busy} onClick={()=>void transition(t,"block")}>Mark Blocked</button>
           <button type="button" style={{...btn,background:"#e2e8f0",color:"#334155"}} disabled={!!busy} onClick={()=>void transition(t,"release")}>Release</button>
          </>}
          {t.assigned_to===userId&&t.status==="blocked"&&<>
           <button type="button" style={btn} disabled={!!busy} onClick={()=>void transition(t,"resume")}>Resume</button>
           <button type="button" style={btn} disabled={!!busy} onClick={()=>void transition(t,"complete")}>Mark Complete</button>
           <button type="button" style={{...btn,background:"#e2e8f0",color:"#334155"}} disabled={!!busy} onClick={()=>void transition(t,"release")}>Release</button>
          </>}
         </div>}
        </div>)}
        {!studentTasks.length&&<p style={caption}>No tasks in this view. Teachers can add shared work below.</p>}
       </div>
       {isTeacher&&<form onSubmit={e=>{e.preventDefault();void createTask();}} style={{display:"grid",gap:9,marginTop:18,paddingTop:15,borderTop:"1px solid #e2e8f0"}}>
        <strong style={{fontSize:14}}>Create a coordination task</strong>
        <input required minLength={3} maxLength={180} placeholder="Task title (e.g., review literacy assessment)" style={field} value={title} onChange={e=>setTitle(e.target.value)}/>
        <textarea maxLength={2000} rows={2} placeholder="Instructions or handover information (optional)" style={field} value={description} onChange={e=>setDescription(e.target.value)}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
         <select aria-label="Task category" style={field} value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
         <select aria-label="Task priority" style={field} value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select>
         <input aria-label="Due date" type="date" value={due} onChange={e=>setDue(e.target.value)} style={field}/>
        </div>
        <button style={btn} type="submit" disabled={!!busy||!title.trim()}>Add to Shared Task Queue</button>
       </form>}
      </section>
      <section style={sheet}>
       <h3 style={{fontSize:17,margin:"0 0 9px"}}>Shared Progress & Handover Notes</h3>
       <p style={caption}>Internal professional notes are visible to the assigned teachers and authorised administrators, not parents.</p>
       {isTeacher&&<form onSubmit={e=>{e.preventDefault();void addNote();}} style={{display:"grid",gap:9,marginBottom:18}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
         <select aria-label="Note type" value={noteCategory} style={{...field,flex:"1 1 140px"}} onChange={e=>setNoteCategory(e.target.value)}>
          {["progress","assessment","activity","idp","handover","parent_followup"].map(x=><option key={x} value={x}>{x.replace(/_/g," ")}</option>)}
         </select>
         <select aria-label="Related task" value={noteTask} style={{...field,flex:"1 1 150px"}} onChange={e=>setNoteTask(e.target.value)}>
          <option value="">General student note</option>{tasks.filter(t=>t.student_id===selectedStudent).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
         </select>
        </div>
        <textarea required minLength={3} maxLength={3000} rows={3} value={noteBody} onChange={e=>setNoteBody(e.target.value)} placeholder="Observation, progress update, next steps, or teacher handover..." style={field}/>
        <button type="submit" disabled={!!busy||!noteBody.trim()} style={btn}>Save Shared Note</button>
       </form>}
       <div style={{display:"grid",gap:9}}>
        {studentNotes.map(n=><div key={n.id} style={{padding:11,background:"#f8faf7",borderRadius:8,border:"1px solid #e2e8e0"}}>
         <div style={{...caption,marginBottom:6}}><strong>{displayName(n.author_id)}</strong> · {n.category.replace(/_/g," ")} · {time(n.created_at)}</div>
         <p style={{fontSize:13,whiteSpace:"pre-wrap",margin:0}}>{n.body}</p>
        </div>)}
        {!studentNotes.length&&<p style={caption}>No progress or handover notes recorded for this student yet.</p>}
       </div>
      </section>
     </>}
    </div>
   </div>
  </div>
 </main>;
}
