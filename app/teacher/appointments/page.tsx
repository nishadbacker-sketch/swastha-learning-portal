"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

type Status="new"|"contacted"|"appointment_scheduled"|"completed"|"not_interested";
type Enquiry={
 id:string;guardian_name:string;whatsapp_number:string;contact_differs:boolean;contact_number:string|null;
 child_name:string;date_of_birth:string;current_class:string;preferred_date:string|null;preferred_time:string|null;
 reason:string;status:Status;followup_notes:string;next_followup_date:string|null;contacted_at:string|null;
 created_at:string;handled_by:string|null;source:string;
};
const statusList:{key:Status;label:string}[]=[
 {key:"new",label:"New enquiry"},{key:"contacted",label:"Contacted"},{key:"appointment_scheduled",label:"Appointment scheduled"},
 {key:"completed",label:"Completed"},{key:"not_interested",label:"Not interested"}
];
const panel:React.CSSProperties={border:"1px solid #dce8e1",background:"#fff",borderRadius:12,padding:15,marginBottom:12};
const input:React.CSSProperties={width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #cbd5e1",fontSize:13};
const button:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:8,padding:"9px 13px",fontSize:13,fontWeight:700,cursor:"pointer"};
const date=(s:string|null)=>s?new Date(s).toLocaleDateString("en-IN"):"Not specified";
const phoneUrl=(raw:string)=>"https://wa.me/"+raw.replace(/\D/g,"");

export default function TeacherAppointments(){
 const router=useRouter();
 const [records,setRecords]=useState<Enquiry[]>([]);
 const [drafts,setDrafts]=useState<Record<string,{status:Status;followup_notes:string;next_followup_date:string}>>({});
 const [busy,setBusy]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [filter,setFilter]=useState("open");
 const [userId,setUserId]=useState("");

 async function refresh(){
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("appointment_enquiries")
    .select("id,guardian_name,whatsapp_number,contact_differs,contact_number,child_name,date_of_birth,current_class,preferred_date,preferred_time,reason,status,followup_notes,next_followup_date,contacted_at,created_at,handled_by,source")
    .order("created_at",{ascending:false}).limit(250);
  if(e)setError(e.message);
  else{
   const rows=(data||[]) as Enquiry[];
   setRecords(rows);
   setDrafts(Object.fromEntries(rows.map(r=>[r.id,{status:r.status,followup_notes:r.followup_notes,next_followup_date:r.next_followup_date||""}])));
  }
  setLoading(false);
 }
 useEffect(()=>{async function load(){
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){router.replace("/login");return;}
  const {data:role}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(!role||!["teacher","admin"].includes(role.role)){setError("Not authorised to view appointment requests.");setLoading(false);return;}
  setUserId(auth.user.id);
  await refresh();
 }void load();},[router]);

 async function save(item:Enquiry){
  if(!supabase||!userId)return;
  const d=drafts[item.id];if(!d)return;
  setBusy(item.id);setMessage("");setError("");
  const now=new Date().toISOString();
  const {data,error:e}=await supabase.from("appointment_enquiries")
   .update({status:d.status,followup_notes:d.followup_notes.trim(),next_followup_date:d.next_followup_date||null,
    contacted_at:d.status!=="new"?(item.contacted_at||now):item.contacted_at,
    handled_by:userId,updated_at:now})
   .eq("id",item.id).select("id");
  if(e)setError(e.message);else if(!data?.length)setError("Unable to save this follow-up.");
  else{setMessage("Follow-up saved.");await refresh();}
  setBusy("");
 }
 const visible=records.filter(r=>filter==="all"||filter==="open"?!["completed","not_interested"].includes(r.status):r.status===filter);
 const newCount=records.filter(r=>r.status==="new").length;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35"}}>
  <header style={{background:"white",borderBottom:"1px solid #dce8e1",padding:"15px 5%"}}>
   <div style={{maxWidth:1110,margin:"auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <div><strong style={{color:"#176b58"}}>SWASTHA LEARNING CLINIC</strong><div style={{fontSize:12,color:"#667a74",marginTop:3}}>APPOINTMENT FOLLOW-UP</div></div>
    <button style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/teacher/dashboard")}>Back to Teacher Dashboard</button>
   </div>
  </header>
  <div style={{maxWidth:1110,margin:"auto",padding:"22px 16px 60px"}}>
   <h1 style={{fontSize:25,margin:"0 0 6px"}}>Appointment Follow-up</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Website appointment requests are routed to the clinic's authorised teacher queue. Contact guardians and record the outcome here.</p>
   <div style={{...panel,display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
    <strong>{newCount} new · {records.length} total enquiries</strong>
    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>Show
     <select style={{...input,width:"auto"}} value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="open">Open follow-ups</option><option value="all">All enquiries</option>
      {statusList.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
     </select>
    </label>
    <button style={{...button,background:"#0f4c5c"}} onClick={()=>{setLoading(true);void refresh();}}>Refresh</button>
   </div>
   {error&&<p role="alert" style={{...panel,color:"#b42318"}}>{error}</p>}
   {message&&<p role="status" style={{...panel,color:"#176b58"}}>{message}</p>}
   {loading?<p>Loading appointment requests...</p>:!visible.length?<section style={panel}>No appointment requests in this category yet.</section>:visible.map(item=><section key={item.id} style={panel}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:12,flexWrap:"wrap"}}>
     <div><strong style={{fontSize:16}}>{item.child_name}</strong><p style={{margin:"4px 0",fontSize:13}}>Guardian: <strong>{item.guardian_name}</strong> · Class: {item.current_class}</p><small style={{color:"#64748b"}}>Submitted {date(item.created_at)}</small></div>
     <strong style={{background:item.status==="new"?"#fff7e8":"#eaf4ef",borderRadius:7,padding:"6px 10px",fontSize:12}}>{statusList.find(x=>x.key===item.status)?.label||item.status}</strong>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:"5px 16px",fontSize:13,margin:"12px 0"}}>
     <div><strong>WhatsApp:</strong> {item.whatsapp_number} <a href={phoneUrl(item.whatsapp_number)} target="_blank" rel="noopener noreferrer" style={{color:"#176b58",fontWeight:700,marginLeft:8}}>Open WhatsApp</a></div>
     <div><strong>Contact:</strong> {item.contact_differs?item.contact_number:"Same as WhatsApp"}</div>
     <div><strong>Date of birth:</strong> {date(item.date_of_birth)}</div>
     <div><strong>Preferred visit:</strong> {date(item.preferred_date)} · {item.preferred_time||"Flexible"}</div>
    </div>
    {item.reason&&<p style={{fontSize:13,whiteSpace:"pre-wrap"}}><strong>Reason:</strong> {item.reason}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:12}}>
     <label style={{fontSize:12,fontWeight:700}}>Follow-up status
      <select style={{...input,marginTop:5}} value={drafts[item.id]?.status||item.status} onChange={e=>setDrafts(d=>({...d,[item.id]:{...d[item.id],status:e.target.value as Status}}))}>
       {statusList.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
     </label>
     <label style={{fontSize:12,fontWeight:700}}>Next follow-up date
      <input style={{...input,marginTop:5}} type="date" value={drafts[item.id]?.next_followup_date||""} onChange={e=>setDrafts(d=>({...d,[item.id]:{...d[item.id],next_followup_date:e.target.value}}))}/>
     </label>
     <label style={{fontSize:12,fontWeight:700,gridColumn:"1/-1"}}>Teacher follow-up notes
      <textarea style={{...input,display:"block",marginTop:5,minHeight:65}} maxLength={4000} value={drafts[item.id]?.followup_notes||""} onChange={e=>setDrafts(d=>({...d,[item.id]:{...d[item.id],followup_notes:e.target.value}}))}/>
     </label>
    </div>
    <button style={{...button,marginTop:12,opacity:busy?0.6:1}} disabled={!!busy} onClick={()=>save(item)}>{busy===item.id?"Saving...":"Save Follow-up"}</button>
   </section>)}
  </div>
 </main>;
}
