"use client";

import {useCallback,useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";

type Student={id:string;full_name:string;current_class:string|null;status:string};
type Teacher={id:string;user_id:string;status:string};
type Assignment={id:string;student_id:string;teacher_id:string};
const panel:React.CSSProperties={background:"#fff",padding:16,border:"1px solid #dce8e1",borderRadius:13,marginBottom:14};
const button:React.CSSProperties={background:"#176b58",border:0,color:"white",borderRadius:8,padding:"9px 12px",fontWeight:700,fontSize:13,cursor:"pointer"};

export default function TeacherStudentAssignments(){
 const [students,setStudents]=useState<Student[]>([]);
 const [teachers,setTeachers]=useState<Teacher[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [teacherNames,setTeacherNames]=useState<Record<string,string>>({});
 const [selected,setSelected]=useState<Record<string,string>>({});
 const [filter,setFilter]=useState<"unassigned"|"all">("unassigned");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const refresh=useCallback(async()=>{
  if(!supabase){setError("Database is unavailable.");setLoading(false);return;}
  setError("");
  try{
   const [studentResult,teacherResult,assignmentResult]=await Promise.all([
    supabase.from("students").select("id,full_name,current_class,status").order("full_name"),
    supabase.from("teachers").select("id,user_id,status").eq("status","active"),
    supabase.from("teacher_assignments").select("id,student_id,teacher_id")
   ]);
   if(studentResult.error)throw studentResult.error;
   if(teacherResult.error)throw teacherResult.error;
   if(assignmentResult.error)throw assignmentResult.error;
   const active=(teacherResult.data||[]) as Teacher[];
   let names:Record<string,string>={};
   if(active.length){
    const {data:profiles,error:profilesError}=await supabase.from("profiles")
      .select("id,full_name").in("id",active.map(t=>t.user_id));
    if(profilesError)throw profilesError;
    names=Object.fromEntries((profiles||[]).map(p=>[p.id,p.full_name||""]));
   }
   setStudents((studentResult.data||[]) as Student[]);
   setTeachers(active);
   setAssignments((assignmentResult.data||[]) as Assignment[]);
   setTeacherNames(names);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load teacher assignments.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);

 async function assign(s:Student){
  if(!supabase)return;
  const teacherId=selected[s.id];
  if(!teacherId){setError("Please select a teacher.");return;}
  setBusy(s.id);setError("");setNotice("");
  const {error:e}=await supabase.rpc("admin_assign_teacher_to_student",{p_student_id:s.id,p_teacher_id:teacherId});
  if(e)setError(e.message);
  else{setNotice("Teacher assignment saved for "+s.full_name+".");await refresh();}
  setBusy("");
 }
 const visible=students.filter(s=>filter==="all"||!assignments.some(a=>a.student_id===s.id));
 const displayTeacher=(t:Teacher)=>teacherNames[t.user_id]?.trim()||"Teacher "+(teachers.findIndex(x=>x.id===t.id)+1);
 return <section style={panel}>
  <div style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
   <div>
    <h2 style={{fontSize:19,margin:"0 0 5px"}}>Assign Teachers to Students</h2>
    <p style={{fontSize:12,color:"#64748b",margin:0}}>Assign active teachers to registered students. A student may have multiple teachers. User roles remain under Super Admin control.</p>
   </div>
   <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setLoading(true);void refresh();}}>Refresh</button>
  </div>
  <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"14px 0",fontSize:13}}>
   <strong>{students.length} students</strong>
   <strong>{teachers.length} active teachers</strong>
   <strong>{students.filter(s=>!assignments.some(a=>a.student_id===s.id)).length} unassigned</strong>
  </div>
  <label style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:12,fontWeight:700,marginBottom:12}}>Show
   <select value={filter} onChange={e=>setFilter(e.target.value as "all"|"unassigned")} style={{padding:8,borderRadius:7,border:"1px solid #cbd5e1"}}>
    <option value="unassigned">Unassigned students</option><option value="all">All students</option>
   </select>
  </label>
  {error&&<p role="alert" style={{fontSize:13,color:"#b42318"}}>{error}</p>}
  {notice&&<p role="status" style={{fontSize:13,color:"#176b58"}}>{notice}</p>}
  {loading?<p style={{fontSize:13}}>Loading students and teachers...</p>:!visible.length?<p style={{fontSize:13}}>No students to display. Choose All students to see existing assignments.</p>:
   <div style={{display:"grid",gap:9}}>
    {visible.map(s=>{
     const linked=assignments.filter(a=>a.student_id===s.id);
     return <div key={s.id} style={{padding:12,borderRadius:10,border:"1px solid #e2e8e0",background:"#f8faf7",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <div style={{flex:"1 1 210px"}}>
       <strong style={{fontSize:14}}>{s.full_name}</strong>
       <p style={{fontSize:12,margin:"5px 0",color:"#64748b"}}>Class: {s.current_class||"—"} · {s.status}</p>
       <p style={{fontSize:12,margin:0}}>Assigned: {linked.length?linked.map(a=>{const teacher=teachers.find(t=>t.id===a.teacher_id);return teacher?displayTeacher(teacher):"Previously assigned teacher";}).join(", "):"None"}</p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
       <select aria-label={"Select teacher for "+s.full_name} value={selected[s.id]||""} onChange={e=>setSelected(p=>({...p,[s.id]:e.target.value}))} style={{padding:10,borderRadius:8,border:"1px solid #cbd5e1",maxWidth:"100%"}}>
        <option value="">Select teacher</option>
        {teachers.map(t=><option key={t.id} value={t.id}>{displayTeacher(t)}{linked.some(a=>a.teacher_id===t.id)?" (already assigned)":""}</option>)}
       </select>
       <button type="button" style={{...button,opacity:busy?0.6:1}} disabled={!!busy||!selected[s.id]} onClick={()=>void assign(s)}>{busy===s.id?"Assigning...":"Assign Teacher"}</button>
      </div>
     </div>;
    })}
   </div>}
 </section>;
}
