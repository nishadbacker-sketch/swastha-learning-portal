import BrandLogo from "../../components/brand-logo";
"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

type Status="new"|"contacted"|"appointment_scheduled"|"completed"|"not_interested";
type History={id:string;enquiry_id:string;actor_id:string|null;old_status:string;new_status:string;old_notes:string;new_notes:string;old_next_followup_date:string|null;new_next_followup_date:string|null;recorded_at:string};
type RegistrationLink={enquiry_id:string;parent_user_id:string;student_id:string;linked_at:string;link_method:string};
type Candidate={parent_user_id:string;student_id:string;student_code:string;student_name:string;guardian_name:string;phone_matched:boolean;child_name_matched:boolean;dob_matched:boolean};
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
const phoneUrl=(raw:string)=>{const n=raw.replace(/\D/g,"");return "https://wa.me/"+(n.length===10?"91"+n:n);};

export default function TeacherAppointments(){
 const router=useRouter();
 const [records,setRecords]=useState<Enquiry[]>([]);
 const [drafts,setDrafts]=useState<Record<string,{status:Status;followup_notes:string;next_followup_date:string}>>({});
 const [busy,setBusy]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [filter,setFilter]=useState("all");
 const [userId,setUserId]=useState("");
 const [accountRole,setAccountRole]=useState("teacher");
 const [history,setHistory]=useState<History[]>([]);
 const [registrationLinks,setRegistrationLinks]=useState<RegistrationLink[]>([]);
 const [linkedStudentNames,setLinkedStudentNames]=useState<Record<string,string>>({});
 const [linkedStudentCodes,setLinkedStudentCodes]=useState<Record<string,string>>({});
 const [matches,setMatches]=useState<Record<string,Candidate[]>>({});
 const [searched,setSearched]=useState<Record<string,boolean>>({});
 const [confirmed,setConfirmed]=useState<Record<string,boolean>>({});
 const [expandedHistory,setExpandedHistory]=useState<Record<string,boolean>>({});

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
  if(!e){
   const [events,links]=await Promise.all([
    supabase.from("appointment_followup_history").select("id,enquiry_id,actor_id,old_status,new_status,old_notes,new_notes,old_next_followup_date,new_next_followup_date,recorded_at").order("recorded_at",{ascending:false}).limit(1500),
    supabase.from("appointment_registration_links").select("enquiry_id,parent_user_id,student_id,linked_at,link_method")
   ]);
   if(events.error)setError(events.error.message);else setHistory((events.data||[]) as History[]);
   if(links.error)setError(links.error.message);else{
    const records=(links.data||[]) as RegistrationLink[];
    setRegistrationLinks(records);
    if(records.length){
     const ids=Array.from(new Set(records.map(r=>r.student_id)));
     const students=await supabase.from("students").select("id,student_code,full_name").in("id",ids);
     if(!students.error){setLinkedStudentNames(Object.fromEntries((students.data||[]).map(s=>[s.id,s.full_name+" · "+s.student_code])));setLinkedStudentCodes(Object.fromEntries((students.data||[]).map(s=>[s.id,s.student_code])));}
    }
   }
  }
  setLoading(false);
 }
 useEffect(()=>{async function load(){
  if(!supabase){setError("Database unavailable.");setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){router.replace("/login");return;}
  const {data:role}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(!role||!["teacher","clinic_admin","admin","owner"].includes(role.role)){setError("Not authorised to view appointment requests.");setLoading(false);return;}
  setUserId(auth.user.id);
  setAccountRole(role.role);
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
 async function findMatches(item:Enquiry){
  if(!supabase)return;
  setBusy(item.id);setError("");setMessage("");
  const {data,error:e}=await supabase.rpc("swastha_appointment_match_candidates",{p_enquiry:item.id});
  if(e)setError(e.message);
  else{setMatches(x=>({...x,[item.id]:(data||[]) as Candidate[]}));setSearched(x=>({...x,[item.id]:true}));}
  setBusy("");
 }
 async function attach(item:Enquiry,candidate:Candidate){
  if(!supabase||!confirmed[item.id])return;
  setBusy(item.id);setError("");setMessage("");
  const {data,error:e}=await supabase.rpc("swastha_link_appointment_to_student",{
   p_enquiry:item.id,p_student:candidate.student_id,p_confirmed:true
  });
  if(e)setError(e.message);else{
   setMessage(typeof data==="string"?data:"History linked to registered user.");
   setMatches(x=>({...x,[item.id]:[]}));
   setConfirmed(x=>({...x,[item.id]:false}));
   await refresh();
  }
  setBusy("");
 }
 const visible=records.filter(r=>filter==="all"?true:filter==="open"?!["completed","not_interested"].includes(r.status):filter==="closed"?["completed","not_interested"].includes(r.status):filter==="registered"?registrationLinks.some(l=>l.enquiry_id===r.id):r.status===filter);
 const newCount=records.filter(r=>r.status==="new").length;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35"}}>
  <header style={{background:"white",borderBottom:"1px solid #dce8e1",padding:"15px 5%"}}>
   <div style={{maxWidth:1110,margin:"auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <div><strong style={{color:"#176b58"}}><BrandLogo /></strong><div style={{fontSize:12,color:"#667a74",marginTop:3}}>APPOINTMENT FOLLOW-UP</div></div>
    <button style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push(accountRole==="owner"?"/owner/dashboard":accountRole==="admin"?"/admin/dashboard":accountRole==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard")}>Back to {accountRole==="admin"||accountRole==="clinic_admin"?"Admin":"Teacher"} Dashboard</button>
   </div>
  </header>
  <div style={{maxWidth:1110,margin:"auto",padding:"22px 16px 60px"}}>
   <h1 style={{fontSize:25,margin:"0 0 6px"}}>Appointment Follow-up</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Website appointment requests are routed to the clinic's authorised teacher queue. Contact guardians and record the outcome here.</p>
   <div style={{...panel,display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
    <strong>{newCount} new · {records.filter(r=>["completed","not_interested"].includes(r.status)).length} closed · {records.length} total enquiries</strong>
    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>Show
     <select style={{...input,width:"auto"}} value={filter} onChange={e=>setFilter(e.target.value)}>
      <option value="all">All enquiries (including closed)</option><option value="open">Open follow-ups</option><option value="closed">Closed follow-ups</option><option value="registered">Linked registered users</option>
      {statusList.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
     </select>
    </label>
    <button style={{...button,background:"#0f4c5c"}} onClick={()=>{setLoading(true);void refresh();}}>Refresh</button>
   </div>
   {error&&<p role="alert" style={{...panel,color:"#b42318"}}>{error}</p>}
   {message&&<p role="status" style={{...panel,color:"#176b58"}}>{message}</p>}
   {loading?<p>Loading appointment requests...</p>:!visible.length?<section style={panel}>No appointment requests in this category yet.</section>:visible.map(item=><section key={item.id} style={panel}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:12,flexWrap:"wrap"}}>
     <div><strong style={{fontSize:16}}>{item.child_name}{(()=>{const link=registrationLinks.find(l=>l.enquiry_id===item.id);return link&&linkedStudentCodes[link.student_id]?" · "+linkedStudentCodes[link.student_id]:"";})()}</strong><p style={{margin:"4px 0",fontSize:13}}>Guardian: <strong>{item.guardian_name}</strong> · Class: {item.current_class}</p><small style={{color:"#64748b"}}>Submitted {date(item.created_at)}</small></div>
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
    <div style={{borderTop:"1px solid #dce8e1",marginTop:17,paddingTop:14}}>
      <strong style={{fontSize:14}}>Registered User & Appointment History</strong>
      {registrationLinks.some(l=>l.enquiry_id===item.id)?registrationLinks.filter(l=>l.enquiry_id===item.id).map(link=>
       <p key={link.enquiry_id} style={{fontSize:13,color:"#176b58",fontWeight:700}}>
        Linked registered student: {linkedStudentNames[link.student_id]||"Student record"} · {link.link_method==="automatic_verified"?"Auto-matched using details":"Confirmed by staff"} · Linked {date(link.linked_at)}
       </p>
      ):<>
       <p style={{fontSize:12,color:"#64748b"}}>Not yet linked to a registered parent/child. Search existing accounts with the enquiry's phone number. Verify the child and guardian before linking.</p>
       <button type="button" style={{...button,background:"#0f4c5c"}} disabled={!!busy} onClick={()=>void findMatches(item)}>{busy===item.id?"Searching...":"Find Registered User"}</button>
       {searched[item.id]&&!(matches[item.id]||[]).length&&<p style={{fontSize:12,color:"#b45309"}}>No matching registered parent phone found. Retain this enquiry and try again after the parent registers or updates contact details.</p>}
       {(matches[item.id]||[]).length>0&&<div style={{marginTop:11,padding:12,background:"#f8faf7",border:"1px solid #dce8e1",borderRadius:9}}>
        <label style={{display:"flex",gap:9,fontSize:12,fontWeight:700,marginBottom:12}}>
         <input type="checkbox" checked={!!confirmed[item.id]} onChange={e=>setConfirmed(x=>({...x,[item.id]:e.target.checked}))}/>
         I have verified that this enquiry belongs to the selected registered guardian and child.
        </label>
        {(matches[item.id]||[]).map(candidate=><div key={candidate.student_id} style={{display:"flex",gap:10,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",borderTop:"1px solid #e2e8f0",padding:"10px 0",fontSize:12}}>
          <div><strong>{candidate.student_name}</strong> · {candidate.student_code}
           <div style={{color:"#64748b",marginTop:4}}>Guardian: {candidate.guardian_name} · Matching phone
           · Child name {candidate.child_name_matched?"matches":"differs"}
           · DOB {candidate.dob_matched?"matches":"differs or missing"}</div>
          </div>
          <button type="button" style={{...button,opacity:confirmed[item.id]&&!busy?1:0.5}} disabled={!confirmed[item.id]||!!busy} onClick={()=>void attach(item,candidate)}>Link History</button>
         </div>)}
       </div>}
      </>}
      <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58",marginTop:12}} onClick={()=>setExpandedHistory(x=>({...x,[item.id]:!x[item.id]}))}>
       {expandedHistory[item.id]?"Hide":"Show"} Follow-up Timeline ({history.filter(h=>h.enquiry_id===item.id).length})
      </button>
      {expandedHistory[item.id]&&<div style={{display:"grid",gap:9,marginTop:11}}>
       <div style={{background:"#f8faf7",borderRadius:9,padding:11,fontSize:12}}>
        <strong>Enquiry received · {date(item.created_at)}</strong><p>Original reason: {item.reason||"Not recorded"}</p>
       </div>
       {history.filter(h=>h.enquiry_id===item.id).map(h=><div key={h.id} style={{background:"#f8faf7",borderRadius:9,padding:11,fontSize:12}}>
        <strong>{new Date(h.recorded_at).toLocaleString("en-IN")}</strong> · {h.old_status.replace(/_/g," ")} → {h.new_status.replace(/_/g," ")}
        {h.new_notes!==h.old_notes&&<p style={{whiteSpace:"pre-wrap"}}><strong>Recorded notes:</strong> {h.new_notes||"(cleared)"}</p>}
        {h.new_next_followup_date!==h.old_next_followup_date&&<p>Next follow-up: {h.new_next_followup_date||"None"}</p>}
       </div>)}
       {!history.some(h=>h.enquiry_id===item.id)&&<p style={{fontSize:12,color:"#64748b"}}>No recorded status changes yet. The current follow-up notes are preserved above. Earlier changes made before history tracking was enabled cannot be reconstructed.</p>}
      </div>}
    </div>
   </section>)}
  </div>
 </main>;
}
