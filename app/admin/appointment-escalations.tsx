"use client";

import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

type Escalation={id:string;enquiry_id:string;escalated_at:string;acknowledged_at:string|null;acknowledged_by:string|null};
type Enquiry={id:string;child_name:string;guardian_name:string;whatsapp_number:string;created_at:string;status:string;contacted_at:string|null};
type Alert={escalation:Escalation;enquiry:Enquiry};
const card:React.CSSProperties={background:"#fff",border:"1px solid #e2e8e0",padding:15,borderRadius:12,marginBottom:12};
const button:React.CSSProperties={padding:"9px 12px",border:0,borderRadius:8,background:"#176b58",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"};
const dt=(d:string)=>new Date(d).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});

export default function AppointmentEscalations(){
 const router=useRouter();
 const [alerts,setAlerts]=useState<Alert[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [saving,setSaving]=useState("");
 const [userId,setUserId]=useState("");

 const refresh=useCallback(async()=>{
  if(!supabase){setError("Supabase is not available.");setLoading(false);return;}
  setError("");
  const {data:escalations,error:e}=await supabase.from("appointment_escalations")
   .select("id,enquiry_id,escalated_at,acknowledged_at,acknowledged_by").order("escalated_at",{ascending:false}).limit(250);
  if(e){setError(e.message);setLoading(false);return;}
  const ids=(escalations||[]).map(a=>a.enquiry_id);
  if(!ids.length){setAlerts([]);setLoading(false);return;}
  const {data:enquiries,error:err}=await supabase.from("appointment_enquiries")
   .select("id,child_name,guardian_name,whatsapp_number,created_at,status,contacted_at").in("id",ids);
  if(err){setError(err.message);setLoading(false);return;}
  const byId=new Map((enquiries||[]).map(q=>[q.id,q as Enquiry]));
  setAlerts((escalations||[]).flatMap(a=>{const enquiry=byId.get(a.enquiry_id);return enquiry?[{escalation:a as Escalation,enquiry}]:[];}));
  setLoading(false);
 },[]);

 useEffect(()=>{
  let active=true;
  async function initialize(){
   if(!supabase){setError("Supabase unavailable.");setLoading(false);return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!active)return;
   if(!auth.user){setLoading(false);return;}
   setUserId(auth.user.id);
   await refresh();
  }
  void initialize();
  return()=>{active=false;};
 },[refresh]);

 async function acknowledge(id:string){
  if(!supabase||!userId)return;
  setSaving(id);setError("");setNotice("");
  const {data,error:e}=await supabase.from("appointment_escalations")
    .update({acknowledged_by:userId,acknowledged_at:new Date().toISOString()})
    .eq("id",id).is("acknowledged_at",null).select("id");
  if(e)setError(e.message);
  else if(!data?.length)setError("This alert was already acknowledged or cannot be updated.");
  else {setNotice("Escalation acknowledged. The customer enquiry is still pending until contacted.");await refresh();}
  setSaving("");
 }

 const pending=alerts.filter(x=>x.enquiry.status==="new"&&x.enquiry.contacted_at===null);
 const resolved=alerts.length-pending.length;
 return <section style={{...card,borderColor:pending.length?"#edc88c":"#dce8e1",background:pending.length?"#fffaf2":"#fff"}}>
  <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap",alignItems:"center"}}>
   <div><h2 style={{fontSize:19,margin:"0 0 5px",color:"#183a35"}}>Pending Customer Query Alerts</h2>
    <p style={{fontSize:13,color:"#64748b",margin:0}}>Automatic escalation after 24 unanswered weekday hours. Saturday and Sunday do not count (India time).</p></div>
   <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
    <strong style={{background:pending.length?"#fce9d0":"#eaf4ef",color:pending.length?"#9a3412":"#176b58",padding:"7px 10px",borderRadius:9,fontSize:13}}>{pending.length} pending</strong>
    <button style={{...button,background:"#0f4c5c"}} onClick={()=>{setLoading(true);void refresh();}}>Refresh</button>
   </div>
  </div>
  {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
  {notice&&<p role="status" style={{color:"#176b58",fontSize:13}}>{notice}</p>}
  {loading?<p style={{fontSize:13}}>Loading customer query alerts...</p>:pending.length===0?<p style={{fontSize:13,color:"#176b58",marginBottom:0}}>No overdue customer enquiries awaiting first contact.</p>:<>
   <div style={{marginTop:13}}>
    {pending.map(({escalation:a,enquiry:q})=><article key={a.id} style={{...card,background:"#fff",borderColor:"#f0d3ab",marginBottom:9}}>
     <div style={{display:"flex",gap:9,justifyContent:"space-between",flexWrap:"wrap"}}>
      <strong style={{fontSize:14}}>Pending Customer Query: {q.child_name}</strong>
      <span style={{fontSize:12,fontWeight:700,color:"#b45309"}}>{a.acknowledged_at?"Acknowledged · still awaiting response":"Needs attention"}</span>
     </div>
     <p style={{fontSize:13,margin:"7px 0"}}><strong>Guardian:</strong> {q.guardian_name} · <strong>WhatsApp:</strong> {q.whatsapp_number}</p>
     <p style={{fontSize:12,color:"#64748b",margin:"7px 0"}}>Received: {dt(q.created_at)} · Escalated: {dt(a.escalated_at)}</p>
     <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button style={{...button,background:"#0f4c5c"}} onClick={()=>router.push("/teacher/appointments")}>Open Follow-up Queue</button>
      {!a.acknowledged_at&&<button style={{...button,background:"#eaf4ef",color:"#176b58",border:"1px solid #cde2d6"}} disabled={saving===a.id} onClick={()=>acknowledge(a.id)}>{saving===a.id?"Saving...":"Acknowledge Alert"}</button>}
     </div>
    </article>)}
   </div>
  </>}
  {resolved>0&&<p style={{fontSize:12,color:"#64748b",marginTop:10,marginBottom:0}}>{resolved} previously escalated enquiry/enquiries have since been updated by the follow-up team.</p>}
 </section>;
}
