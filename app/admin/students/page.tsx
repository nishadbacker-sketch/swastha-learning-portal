"use client";
import BrandLogo from "../../components/brand-logo";


import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import StudentAppointmentHistory from "../../components/student-appointment-history";

type Student={id:string;student_code:string|null;full_name:string;date_of_birth:string|null;current_class:string|null;preferred_language:"en"|"ml";status:string;created_at:string};
type Teacher={id:string;user_id:string;status:string;name:string};
type Link={id:string;student_id:string;teacher_id:string};
type StudentContact={school_name:string;emergency_contact_name:string;emergency_contact_phone:string};
type StudentChange={id:number;student_id:string;changed_by:string|null;changed_at:string;previous_values:Record<string,string|null>;updated_values:Record<string,string|null>};
type Progress={student_id:string;standard_total:number;standard_reviewed:number;custom_total:number;custom_reviewed:number;activity_total:number;activity_completed:number;goal_total:number;goal_completed:number};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:16};
const button:React.CSSProperties={background:"#176b58",border:0,borderRadius:8,color:"#fff",padding:"10px 13px",fontWeight:700,cursor:"pointer",fontSize:13};
const field:React.CSSProperties={padding:10,border:"1px solid #cbd5e1",borderRadius:8,maxWidth:"100%",background:"#fff",color:"#183a35"};
const zero=(x:number|undefined|null)=>Number(x||0);
export default function StudentManagementPage(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [loading,setLoading]=useState(true);
 const [students,setStudents]=useState<Student[]>([]);
 const [teachers,setTeachers]=useState<Teacher[]>([]);
 const [links,setLinks]=useState<Link[]>([]);
 const [progress,setProgress]=useState<Record<string,Progress>>({});
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("all");
 const [expandedStudent,setExpandedStudent]=useState<string|null>(null);
 const [selected,setSelected]=useState<Record<string,string>>({});
 const [replacements,setReplacements]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [confirmRemove,setConfirmRemove]=useState<Link|null>(null);
 const [editingChild,setEditingChild]=useState<Student|null>(null);
 const [editingContactId,setEditingContactId]=useState<string|null>(null);
 const [contact,setContact]=useState<StudentContact>({school_name:"",emergency_contact_name:"",emergency_contact_phone:""});
 const [contactLoading,setContactLoading]=useState(false);
 const [historyStudent,setHistoryStudent]=useState<string|null>(null);
 const [history,setHistory]=useState<StudentChange[]>([]);
 const [historyBusy,setHistoryBusy]=useState(false);
 const [historyError,setHistoryError]=useState("");

 const load=useCallback(async()=>{
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  setError("");
  try{
   const [s,t,l,p]=await Promise.all([
    supabase.from("students").select("id,student_code,full_name,date_of_birth,current_class,preferred_language,status,created_at").order("full_name"),
    supabase.from("teachers").select("id,user_id,status").order("created_at"),
    supabase.from("teacher_assignments").select("id,student_id,teacher_id"),
    supabase.rpc("admin_student_progress_summary")
   ]);
   for(const item of [s,t,l,p])if(item.error)throw item.error;
   const staff=(t.data||[]) as {id:string;user_id:string;status:string}[];
   const ids=staff.map(x=>x.user_id);
   let names:Record<string,string>={};
   if(ids.length){
    const r=await supabase.from("profiles").select("id,full_name,staff_code").in("id",ids);
    if(r.error)throw r.error;
    names=Object.fromEntries((r.data||[]).map(x=>[x.id,(x.full_name||"Teacher")+(x.staff_code?" · "+x.staff_code:"")]));
   }
   setStudents((s.data||[]) as Student[]);
   setLinks((l.data||[]) as Link[]);
   setTeachers(staff.map((x,i)=>({...x,name:names[x.user_id]?.trim()||"Teacher "+(i+1)})));
   setProgress(Object.fromEntries(((p.data||[]) as Progress[]).map(x=>[x.student_id,x])));
  }catch(e){setError(e instanceof Error?e.message:"Unable to load students.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  let mounted=true;
  async function start(){
   if(!supabase){setError("Database unavailable.");setLoading(false);return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/login");return;}
   const r=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(r.error||!["owner","admin","clinic_admin"].includes(r.data?.role||"")){router.replace("/login");return;}
   if(mounted){setRole(r.data!.role);void load();}
  }
  void start();
  return()=>{mounted=false;};
 },[load,router]);

 async function change(studentId:string,teacherId:string,action:"assign"|"remove"|"replace",replacementId?:string){
  if(!supabase)return;
  setBusy(studentId);setError("");setNotice("");
  try{
   const {data,error:e}=await supabase.rpc("admin_change_student_teacher",{
    p_student_id:studentId,p_teacher_id:teacherId,p_action:action,
    p_replacement_teacher_id:replacementId||null
   });
   if(e)throw e;
   await load();
   setNotice(typeof data==="string"?data:"Teacher assignment updated.");
   setSelected(x=>({...x,[studentId]:""}));
   setReplacements(x=>({...x,[studentId+":"+teacherId]:""}));
  }catch(e){setError(e instanceof Error?e.message:"Unable to update teacher assignment.");}
  finally{setBusy("");setConfirmRemove(null);}
 }

 async function openContactDetails(studentId:string){
  if(editingContactId===studentId){setEditingContactId(null);return;}
  if(!supabase)return;
  setEditingContactId(studentId);setContactLoading(true);setError("");
  setContact({school_name:"",emergency_contact_name:"",emergency_contact_phone:""});
  const {data,error:e}=await supabase.from("student_contact_details")
   .select("school_name,emergency_contact_name,emergency_contact_phone")
   .eq("student_id",studentId).maybeSingle();
  if(e){setError(e.message);setEditingContactId(null);}
  else setContact({school_name:data?.school_name||"",emergency_contact_name:data?.emergency_contact_name||"",emergency_contact_phone:data?.emergency_contact_phone||""});
  setContactLoading(false);
 }
 async function saveContactDetails(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!supabase||!editingContactId||busy)return;
  const id=editingContactId;setBusy(id);setError("");setNotice("");
  try{
   const {data,error:e}=await supabase.rpc("admin_save_student_contact_details",{
    p_student_id:id,p_school_name:contact.school_name,p_emergency_contact_name:contact.emergency_contact_name,p_emergency_contact_phone:contact.emergency_contact_phone
   });
   if(e)throw e;
   setEditingContactId(null);setNotice(typeof data==="string"?data:"Student contact details saved.");
  }catch(err){setError(err instanceof Error?err.message:"Unable to save student contacts.");}
  finally{setBusy("");}
 }

 async function toggleHistory(studentId:string){
  if(historyStudent===studentId){setHistoryStudent(null);return;}
  if(!supabase)return;
  setHistoryStudent(studentId);setHistory([]);setHistoryError("");setHistoryBusy(true);
  const {data,error:e}=await supabase.from("student_detail_change_log")
   .select("id,student_id,changed_by,changed_at,previous_values,updated_values")
   .eq("student_id",studentId).order("changed_at",{ascending:false}).limit(30);
  if(e)setHistoryError(e.message);
  else setHistory((data||[]) as StudentChange[]);
  setHistoryBusy(false);
 }

 async function saveChildDetails(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!supabase||!editingChild||busy)return;
  const student=editingChild;
  setBusy(student.id);setError("");setNotice("");
  try {
   const {data,error:rpcError}=await supabase.rpc("admin_update_child_details",{
    p_student_id:student.id,
    p_full_name:student.full_name.trim(),
    p_date_of_birth:student.date_of_birth||null,
    p_current_class:student.current_class||"",
    p_preferred_language:student.preferred_language,
    p_status:student.status
   });
   if(rpcError)throw rpcError;
   await load();
   setEditingChild(null);
   setNotice(typeof data==="string"?data:"Child details saved.");
  }catch(err){setError(err instanceof Error?err.message:"Unable to update child details.");}
  finally{setBusy("");}
 }

 const visible=useMemo(()=>students.filter(s=>{
  const assigned=links.filter(a=>a.student_id===s.id);
  const active=assigned.filter(a=>teachers.some(t=>t.id===a.teacher_id&&t.status==="active"));
  const matches=(s.full_name+" "+(s.student_code||"")+" "+(s.current_class||"")).toLowerCase().includes(query.trim().toLowerCase());
  return matches&&(filter==="all"||(filter==="unassigned"&&active.length===0)||(filter==="inactive_teacher"&&assigned.some(a=>teachers.some(t=>t.id===a.teacher_id&&t.status!=="active")))||(filter==="active"&&s.status==="active"));
 }),[students,links,teachers,query,filter]);
 const activeTeachers=teachers.filter(t=>t.status==="active");
 const toggleDetails=(id:string)=>{setExpandedStudent(previous=>previous===id?null:id);setEditingChild(null);setEditingContactId(null);setHistoryStudent(null);setConfirmRemove(null);};
 const unassigned=students.filter(s=>!links.some(a=>a.student_id===s.id&&activeTeachers.some(t=>t.id===a.teacher_id))).length;
 if(!role&&!error)return <main style={{padding:30}}>Verifying administration access...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"14px 5%"}}>
   <div style={{maxWidth:1180,margin:"auto",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
    <div><strong style={{color:"#176b58"}}><BrandLogo /></strong><div style={{fontSize:12,color:"#667a74",marginTop:4}}>STUDENT MANAGEMENT · {role==="owner"?"CREATOR":role==="admin"?"SUPER ADMIN":"ADMIN"}</div></div>
    <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push(role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":"/clinic-admin/dashboard")}>Back to Dashboard</button>
   </div>
  </header>
  <div style={{maxWidth:1180,margin:"auto",padding:"22px 16px 80px",display:"grid",gap:15}}>
   <div><h1 style={{fontSize:27,margin:"0 0 8px"}}>Student Management</h1>
    <p style={{color:"#64748b",fontSize:13,margin:0}}>One place for student records, progress, appointment history and teacher assignments. Select View student to open details and actions. Students are automatically linked to active teachers.</p></div>
   {error&&<div role="alert" style={{...card,color:"#b42318"}}>{error}</div>}
   {notice&&<div role="status" style={{...card,color:"#176b58"}}>{notice}</div>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
    {[["Students",students.length],["Active teachers",activeTeachers.length],["Without active teacher",unassigned],["Assignments",links.length]].map(([label,value])=><div key={label} style={card}><div style={{fontSize:12,color:"#64748b"}}>{label}</div><strong style={{fontSize:27,display:"block",marginTop:7}}>{value}</strong></div>)}
   </div>
   <section style={card}>
    <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
     <input aria-label="Search students" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, class or student code" style={{...field,flex:"1 1 250px"}}/>
     <select aria-label="Filter students" style={field} value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="all">All students</option><option value="unassigned">Without active teacher</option>
      <option value="inactive_teacher">Inactive teacher assigned</option><option value="active">Active students</option>
     </select>
     <button type="button" style={button} onClick={()=>{setLoading(true);void load();}}>Refresh</button>
    </div>
   </section>
   {loading?<div style={card}>Loading student progress...</div>:visible.length===0?<div style={card}>No students match this view.</div>:visible.map(s=>{
    const assigned=links.filter(x=>x.student_id===s.id);
    const p=progress[s.id];
    const standardTotal=zero(p?.standard_total)+zero(p?.custom_total);
    const reviewed=zero(p?.standard_reviewed)+zero(p?.custom_reviewed);
    const activities=zero(p?.activity_total),done=zero(p?.activity_completed);
    const goals=zero(p?.goal_total),achieved=zero(p?.goal_completed);
    return <section key={s.id} style={card}>
     <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div><h2 style={{fontSize:19,margin:"0 0 5px"}}>{s.full_name} · {s.student_code}</h2>
       <p style={{fontSize:12,color:"#64748b",margin:0}}>ID: {s.student_code||"Not assigned"} · Class: {s.current_class||"Not recorded"} · Status: {s.status}</p>
      </div>
      <button type="button" aria-expanded={expandedStudent===s.id} aria-controls={"student-details-"+s.id} style={button} onClick={()=>toggleDetails(s.id)}>{expandedStudent===s.id?"Close details":"View student"}</button>
     </div>
     {expandedStudent===s.id&&<div id={"student-details-"+s.id} style={{marginTop:14,paddingTop:14,borderTop:"1px solid #dce8e1"}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
       <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setEditingChild(editingChild?.id===s.id?null:{...s});setEditingContactId(null);setHistoryStudent(null);}}>Edit student profile</button>
       <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setEditingChild(null);setHistoryStudent(null);void openContactDetails(s.id);}}>{editingContactId===s.id?"Close contacts":"School & emergency contacts"}</button>
       <button type="button" style={{...button,background:"#edf2f5",color:"#183a35"}} onClick={()=>{setEditingChild(null);setEditingContactId(null);void toggleHistory(s.id);}}>{historyStudent===s.id?"Close history":"Profile change history"}</button>
      </div>
     {editingContactId===s.id&&<form onSubmit={saveContactDetails} style={{...card,background:"#f4f8f5",margin:"14px 0"}}>
      <h3 style={{margin:"0 0 7px"}}>School & Emergency Contact</h3>
      <p style={{fontSize:12,color:"#64748b"}}>Administrator-only contact information. Optional fields; only collect details needed for clinic communication.</p>
      {contactLoading?<p>Loading details...</p>:<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
       <label style={{display:"grid",gap:5,fontSize:13}}>School name
        <input style={field} maxLength={150} value={contact.school_name} onChange={e=>setContact(x=>({...x,school_name:e.target.value}))}/>
       </label>
       <label style={{display:"grid",gap:5,fontSize:13}}>Emergency contact name
        <input style={field} maxLength={150} value={contact.emergency_contact_name} onChange={e=>setContact(x=>({...x,emergency_contact_name:e.target.value}))}/>
       </label>
       <label style={{display:"grid",gap:5,fontSize:13}}>Emergency contact phone
        <input style={field} type="tel" maxLength={20} value={contact.emergency_contact_phone} onChange={e=>setContact(x=>({...x,emergency_contact_phone:e.target.value}))}/>
       </label>
      </div>
      <div style={{display:"flex",gap:9,marginTop:13,flexWrap:"wrap"}}>
       <button style={button} type="submit" disabled={!!busy}>{busy===s.id?"Saving...":"Save Contact Details"}</button>
       <button type="button" style={{...button,background:"#e2e8f0",color:"#334155"}} onClick={()=>setEditingContactId(null)} disabled={!!busy}>Cancel</button>
      </div></>}
     </form>}
     {historyStudent===s.id&&<section style={{...card,background:"#f8faf7",margin:"14px 0"}}>
      <h3 style={{margin:"0 0 8px"}}>Student Profile Change History</h3>
      <p style={{fontSize:12,color:"#64748b"}}>Records edits made since change-history tracking was activated. Student ID remains unchanged.</p>
      {historyBusy?<p>Loading change history...</p>:historyError?<p role="alert" style={{color:"#b42318"}}>{historyError}</p>:history.length===0?<p>No recorded changes yet.</p>:history.map(h=>{
       const fields=[...new Set([...Object.keys(h.previous_values||{}),...Object.keys(h.updated_values||{})])];
       const changed=fields.filter(k=>h.previous_values?.[k]!==h.updated_values?.[k]);
       return <div key={h.id} style={{borderTop:"1px solid #dce8e1",padding:"10px 0",fontSize:13}}>
        <strong>{new Date(h.changed_at).toLocaleString("en-IN")}</strong>
        <div style={{color:"#64748b",fontSize:12}}>Changed by: {h.changed_by||"System / administrator"}</div>
        {changed.map(k=><div key={k}><strong>{k.replace(/_/g," ")}:</strong> {h.previous_values?.[k]||"—"} → {h.updated_values?.[k]||"—"}</div>)}
       </div>;
      })}
     </section>}
     {editingChild?.id===s.id&&<form onSubmit={saveChildDetails} style={{padding:15,margin:"14px 0",border:"1px solid #cce3d5",borderRadius:10,background:"#f4f8f5"}}>
       <h3 style={{margin:"0 0 7px"}}>Edit Child Details</h3>
       <p style={{fontSize:12,color:"#64748b",margin:"0 0 13px"}}>Student ID: <strong>{s.student_code}</strong> (permanent). Editing does not remove the child or change their assessment, appointment, or teacher-assignment history.</p>
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        <label style={{display:"grid",gap:5,fontSize:13}}>Child's full name *
         <input required minLength={2} maxLength={150} style={field} value={editingChild.full_name} onChange={e=>setEditingChild(v=>v?{...v,full_name:e.target.value}:v)}/>
        </label>
        <label style={{display:"grid",gap:5,fontSize:13}}>Date of birth
         <input type="date" max={new Date().toLocaleDateString("en-CA")} style={field} value={editingChild.date_of_birth||""} onChange={e=>setEditingChild(v=>v?{...v,date_of_birth:e.target.value||null}:v)}/>
        </label>
        <label style={{display:"grid",gap:5,fontSize:13}}>Current class
         <input maxLength={80} style={field} value={editingChild.current_class||""} onChange={e=>setEditingChild(v=>v?{...v,current_class:e.target.value}:v)}/>
        </label>
        <label style={{display:"grid",gap:5,fontSize:13}}>Preferred language
         <select style={field} value={editingChild.preferred_language} onChange={e=>setEditingChild(v=>v?{...v,preferred_language:e.target.value as "en"|"ml"}:v)}><option value="en">English</option><option value="ml">Malayalam</option></select>
        </label>
        <label style={{display:"grid",gap:5,fontSize:13}}>Student status
         <select style={field} value={editingChild.status} onChange={e=>setEditingChild(v=>v?{...v,status:e.target.value}:v)}><option value="pending">Pending</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </label>
       </div>
       <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
        <button type="submit" style={button} disabled={!!busy}>{busy===s.id?"Saving...":"Save Changes"}</button>
        <button type="button" style={{...button,background:"#e2e8f0",color:"#334155"}} disabled={!!busy} onClick={()=>setEditingChild(null)}>Cancel</button>
       </div>
      </form>}
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:9,margin:"14px 0"}}>
      {[["Assessments reviewed",reviewed,standardTotal],["Activities completed",done,activities],["IDP goals completed",achieved,goals]].map(([title,value,total])=><div key={title} style={{padding:11,borderRadius:9,background:"#f4f8f5",fontSize:12}}>
       <div style={{color:"#64748b",marginBottom:6}}>{title}</div><strong style={{fontSize:18}}>{value} / {total}</strong>
       <div style={{height:5,background:"#dce8e1",borderRadius:8,marginTop:9,overflow:"hidden"}}><div style={{width:(Number(total)>0?Math.min(100,Math.round(100*Number(value)/Number(total))):0)+"%",height:"100%",background:"#176b58"}}/></div>
      </div>)}
     </div>
     <StudentAppointmentHistory studentId={s.id}/>
     <strong style={{fontSize:13}}>Assigned teachers</strong>
     <div style={{display:"grid",gap:8,marginTop:9}}>
      {assigned.length===0?<p style={{fontSize:12,color:"#b45309"}}>No teacher assigned. Assign an active teacher below.</p>:assigned.map(link=>{
       const teacher=teachers.find(t=>t.id===link.teacher_id);
       const key=s.id+":"+link.teacher_id;
       return <div key={link.id} style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"center",padding:10,border:"1px solid #e2e8e0",borderRadius:8}}>
        <div style={{flex:"1 1 170px",fontSize:13}}><strong>{teacher?.name||"Former teacher"}</strong><span style={{color:teacher?.status==="active"?"#176b58":"#b45309",fontSize:12}}> · {teacher?.status||"Unavailable"}</span></div>
        <select aria-label={"Replace "+(teacher?.name||"teacher")+" for "+s.full_name} style={field} value={replacements[key]||""} onChange={e=>setReplacements(x=>({...x,[key]:e.target.value}))}>
         <option value="">Replacement teacher</option>
         {activeTeachers.filter(t=>t.id!==link.teacher_id).map(t=><option key={t.id} value={t.id}>{t.name}{assigned.some(l=>l.teacher_id===t.id)?" (already assigned)":""}</option>)}
        </select>
        <button type="button" style={{...button,opacity:replacements[key]&&busy!==s.id?1:0.5}} disabled={!replacements[key]||!!busy} onClick={()=>void change(s.id,link.teacher_id,"replace",replacements[key])}>Reassign</button>
        <button type="button" style={{...button,background:"#fff1f2",color:"#9f1239",border:"1px solid #fecdd3"}} disabled={!!busy} onClick={()=>setConfirmRemove(link)}>Remove</button>
       </div>;
      })}
     </div>
     <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:12,alignItems:"center"}}>
      <select aria-label={"Assign a teacher to "+s.full_name} style={{...field,flex:"1 1 210px"}} value={selected[s.id]||""} onChange={e=>setSelected(x=>({...x,[s.id]:e.target.value}))}>
       <option value="">Select active teacher to assign</option>
       {activeTeachers.filter(t=>!assigned.some(l=>l.teacher_id===t.id)).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button type="button" style={button} disabled={!selected[s.id]||!!busy} onClick={()=>void change(s.id,selected[s.id],"assign")}>{busy===s.id?"Saving...":"Assign Teacher"}</button>
     </div>
     </div>}
    </section>;
   })}
   {confirmRemove&&<section role="dialog" aria-modal="true" aria-label="Confirm remove teacher" style={{...card,border:"2px solid #b45309"}}>
    <h2 style={{fontSize:18}}>Remove teacher assignment?</h2><p style={{fontSize:13}}>This only removes this student–teacher link. The teacher account, completed assessments, and historical learning records will remain.</p>
    <div style={{display:"flex",gap:9}}><button type="button" style={button} disabled={!!busy} onClick={()=>void change(confirmRemove.student_id,confirmRemove.teacher_id,"remove")}>Confirm Remove</button>
    <button type="button" style={{...button,background:"#e2e8f0",color:"#334155"}} onClick={()=>setConfirmRemove(null)}>Cancel</button></div>
   </section>}
  </div>
 </main>;
}
