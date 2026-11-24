"use client";

import {useCallback,useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";

type Teacher={id:string;user_id:string;status:string};
type TeacherView=Teacher&{name:string;assignedCount:number};
const panel:React.CSSProperties={background:"#fff",padding:16,border:"1px solid #dce8e1",borderRadius:13,marginBottom:14};
const btn:React.CSSProperties={border:0,background:"#176b58",color:"white",padding:"9px 12px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"};

export default function TeacherManagement(){
 const [teachers,setTeachers]=useState<TeacherView[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [selected,setSelected]=useState<TeacherView|null>(null);

 const refresh=useCallback(async()=>{
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  try{
   const {data:staff,error:e}=await supabase.from("teachers").select("id,user_id,status").order("created_at",{ascending:false});
   if(e)throw e;
   const rows=(staff||[]) as Teacher[];
   const ids=rows.map(t=>t.user_id);
   const [p,a]=await Promise.all([
    ids.length?supabase.from("profiles").select("id,full_name").in("id",ids):Promise.resolve({data:[],error:null}),
    supabase.from("teacher_assignments").select("teacher_id")
   ]);
   if(p.error)throw p.error;
   if(a.error)throw a.error;
   const names=new Map((p.data||[]).map(x=>[x.id,x.full_name||""]));
   const assignments=(a.data||[]) as {teacher_id:string}[];
   setTeachers(rows.map(t=>({...t,name:names.get(t.user_id)||"Teacher account",assignedCount:assignments.filter(x=>x.teacher_id===t.id).length})));
   setError("");
  }catch(e){setError(e instanceof Error?e.message:"Could not load teacher accounts.");}
  finally{setLoading(false);}
 },[]);

 useEffect(()=>{void refresh();},[refresh]);
 async function toggle(){
  if(!supabase||!selected)return;
  const item=selected;setBusy(item.id);setError("");setMessage("");
  const active=item.status!=="active";
  const {data,error:e}=await supabase.rpc("admin_set_teacher_active",{p_teacher_id:item.id,p_active:active});
  if(e)setError(e.message);
  else{setMessage((typeof data==="string"?data:active?"Teacher reactivated":"Teacher deactivated")+". Existing teacher-to-student assignments were preserved.");await refresh();}
  setBusy("");setSelected(null);
 }
 return <section style={panel}>
  <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
   <div><h2 style={{fontSize:19,margin:"0 0 6px"}}>Manage Teacher Accounts</h2>
    <p style={{fontSize:12,color:"#64748b",margin:0}}>Deactivate or reactivate existing teachers without deleting their accounts or student assignments. Only active teachers can access teacher functions.</p>
   </div>
   <button type="button" style={{...btn,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setLoading(true);void refresh();}}>Refresh</button>
  </div>
  {error&&<p role="alert" style={{fontSize:13,color:"#b42318",marginTop:12}}>{error}</p>}
  {message&&<p role="status" style={{fontSize:13,color:"#176b58",marginTop:12}}>{message}</p>}
  {loading?<p style={{fontSize:13,marginTop:14}}>Loading teachers...</p>:teachers.length===0?<p style={{fontSize:13,marginTop:14}}>No teacher accounts found.</p>:
   <div style={{display:"grid",gap:9,marginTop:15}}>
    {teachers.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between",flexWrap:"wrap",border:"1px solid #e2e8e0",borderRadius:9,padding:12,background:"#f8faf7"}}>
     <div><strong style={{fontSize:14}}>{t.name}</strong>
      <div style={{fontSize:12,marginTop:5,color:"#64748b"}}>{t.assignedCount} assigned student(s) · <strong style={{color:t.status==="active"?"#176b58":"#b45309"}}>{t.status==="active"?"Active":"Inactive"}</strong></div>
     </div>
     <button type="button" style={{...btn,background:t.status==="active"?"#fff1f2":"#eaf4ef",color:t.status==="active"?"#9f1239":"#176b58",border:"1px solid #e2e8f0"}} disabled={!!busy} onClick={()=>setSelected(t)}>{t.status==="active"?"Deactivate":"Reactivate"}</button>
    </div>)}
   </div>}
  {selected&&<div role="dialog" aria-modal="true" aria-label="Confirm teacher status change" style={{marginTop:15,border:"1px solid #dfdac6",background:"#fffaf0",borderRadius:10,padding:14}}>
   <strong>{selected.status==="active"?"Deactivate":"Reactivate"} {selected.name}?</strong>
   <p style={{fontSize:13,margin:"9px 0"}}>{selected.status==="active"
    ?"This teacher will immediately lose teacher-level access. Their account, assessment history, and existing student assignments are preserved. Consider assigning another active teacher to their students."
    :"This teacher will regain teacher-level access to their existing student assignments."}</p>
   <div style={{display:"flex",gap:9}}>
    <button type="button" style={btn} disabled={!!busy} onClick={()=>void toggle()}>{busy?"Saving...":"Confirm"}</button>
    <button type="button" style={{...btn,background:"#e2e8f0",color:"#334155"}} disabled={!!busy} onClick={()=>setSelected(null)}>Cancel</button>
   </div>
  </div>}
 </section>;
}
