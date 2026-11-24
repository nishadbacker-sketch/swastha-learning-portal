"use client";

import BrandLogo from "../../components/brand-logo";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

type AuditEvent={
 event_key:string;
 event_time:string;
 event_category:string;
 event_action:string;
 subject_id:string;
 performed_by:string|null;
 summary:string;
};

const card:React.CSSProperties={padding:16,background:"#fff",border:"1px solid #dce8e1",borderRadius:12};
const button:React.CSSProperties={border:0,borderRadius:8,padding:"10px 13px",fontWeight:700,background:"#176b58",color:"#fff",cursor:"pointer"};
const field:React.CSSProperties={padding:"10px 12px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",maxWidth:"100%"};
const categories:Record<string,string>={
 role:"Access Roles",teacher_assignment:"Teacher Assignments",student_profile:"Student Details",
 idp_progress:"Development Plans",question_bank:"Question Bank",appointment:"Appointment Follow-ups",assessment:"Assessment Approvals"
};

export default function AdminAuditPage(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [rows,setRows]=useState<AuditEvent[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [category,setCategory]=useState("all");
 const [query,setQuery]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database connection is unavailable.");setLoading(false);return;}
  setLoading(true);setError("");
  const {data,error:loadError}=await supabase.rpc("admin_audit_timeline",{p_limit:300});
  if(loadError)setError(loadError.message);
  else setRows((data||[]) as AuditEvent[]);
  setLoading(false);
 },[]);
 useEffect(()=>{
  let active=true;
  async function init(){
   if(!supabase){setError("Database connection is unavailable.");setLoading(false);return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/login");return;}
   const {data:access,error:accessError}=await supabase.from("user_roles")
    .select("role").eq("user_id",auth.user.id).maybeSingle();
   if(accessError||!access||!["owner","admin","clinic_admin"].includes(access.role)){
    router.replace("/login");return;
   }
   if(active){setRole(access.role);await load();}
  }
  void init();
  return()=>{active=false;};
 },[router,load]);
 const visible=useMemo(()=>rows.filter(x=>
  (category==="all"||x.event_category===category)&&
  (x.summary+" "+x.subject_id+" "+(x.performed_by||"")+" "+x.event_action+" "+(categories[x.event_category]||x.event_category))
   .toLowerCase().includes(query.trim().toLowerCase())
 ),[rows,category,query]);
 const back=role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":"/clinic-admin/dashboard";
 if(!role&&!error)return <main style={{padding:32}}>Checking administrator permissions...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",fontFamily:"Arial,sans-serif",color:"#183a35"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"16px 5%"}}>
   <div style={{maxWidth:1150,margin:"auto",display:"flex",alignItems:"center",gap:15,justifyContent:"space-between",flexWrap:"wrap"}}>
    <div><BrandLogo/><div style={{fontSize:12,color:"#64748b",marginTop:5}}>ADMIN · AUDIT LOGS</div></div>
    <button type="button" style={button} onClick={()=>router.push(back)}>Back to Dashboard</button>
   </div>
  </header>
  <div style={{maxWidth:1150,margin:"auto",padding:"24px 16px 70px",display:"grid",gap:14}}>
   <div><h1 style={{fontSize:27,margin:"0 0 8px"}}>Administrator Audit Timeline</h1>
    <p style={{fontSize:13,color:"#64748b",margin:0}}>Read-only record of key changes, approvals and follow-ups across the clinic. Role and teacher assignment tracking begins from the date auditing was enabled; no earlier events are fabricated.</p></div>
   <section style={{...card,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
    <label style={{display:"grid",gap:5,fontSize:12,fontWeight:700}}>Event type
     <select style={field} value={category} onChange={e=>setCategory(e.target.value)}>
      <option value="all">All events</option>
      {Object.entries(categories).map(([key,name])=><option key={key} value={key}>{name}</option>)}
     </select>
    </label>
    <label style={{display:"grid",gap:5,fontSize:12,fontWeight:700,flex:"1 1 240px"}}>Search reference, account, action or description
     <input style={{...field,width:"100%"}} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search audit events"/>
    </label>
    <button type="button" disabled={loading} style={{...button,alignSelf:"end",opacity:loading?.6:1}} onClick={()=>void load()}>{loading?"Loading...":"Refresh"}</button>
   </section>
   {error&&<section role="alert" style={{...card,color:"#b42318"}}>{error}</section>}
   <section style={card}>
    <strong>{visible.length} events displayed</strong>
    <p style={{fontSize:12,color:"#64748b",marginBottom:0}}>Showing up to the 300 most recent recorded events. For a complete historical export or audit investigation, use an authorized database administrator.</p>
   </section>
   {loading?<section style={card}>Loading audit records...</section>:visible.length===0?<section style={card}>No events match this view.</section>:visible.map(event=><article key={event.event_key} style={card}>
    <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
     <strong style={{color:"#0f4c5c",fontSize:14}}>{categories[event.event_category]||event.event_category.replace(/_/g," ")}</strong>
     <span style={{fontSize:12,color:"#64748b"}}>{new Date(event.event_time).toLocaleString("en-IN")}</span>
    </div>
    <p style={{margin:"9px 0",fontSize:13}}><strong>{event.event_action.replace(/_/g," ")}</strong> · {event.summary}</p>
    <div style={{fontSize:12,color:"#64748b",wordBreak:"break-word"}}>
     Record reference: {event.subject_id} · Actor account: {event.performed_by||"System / not available"}
    </div>
   </article>)}
  </div>
 </main>;
}
