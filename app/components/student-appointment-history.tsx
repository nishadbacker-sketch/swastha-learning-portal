"use client";

import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";

type Link={enquiry_id:string;student_id:string;linked_at:string;link_method:string};
type Enquiry={id:string;guardian_name:string;child_name:string;reason:string;status:string;followup_notes:string;created_at:string;next_followup_date:string|null};
type Event={id:string;enquiry_id:string;new_status:string;old_status:string;old_notes:string;new_notes:string;new_next_followup_date:string|null;recorded_at:string};
const container:React.CSSProperties={border:"1px solid #dce8e1",borderRadius:12,background:"#fff",padding:15,marginTop:14};
export default function StudentAppointmentHistory({studentId}:{studentId:string}){
 const [enquiries,setEnquiries]=useState<Enquiry[]>([]);
 const [links,setLinks]=useState<Link[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let live=true;
  async function load(){
   setLoading(true);setError("");setEnquiries([]);setEvents([]);setLinks([]);
   if(!supabase){if(live){setError("Database unavailable");setLoading(false);}return;}
   const l=await supabase.from("appointment_registration_links").select("enquiry_id,student_id,linked_at,link_method").eq("student_id",studentId);
   if(!live)return;
   if(l.error){setError(l.error.message);setLoading(false);return;}
   const found=(l.data||[]) as Link[];
   setLinks(found);
   if(found.length){
    const ids=found.map(x=>x.enquiry_id);
    const [a,b]=await Promise.all([
     supabase.from("appointment_enquiries").select("id,guardian_name,child_name,reason,status,followup_notes,created_at,next_followup_date").in("id",ids).order("created_at",{ascending:false}),
     supabase.from("appointment_followup_history").select("id,enquiry_id,old_status,new_status,old_notes,new_notes,new_next_followup_date,recorded_at").in("enquiry_id",ids).order("recorded_at",{ascending:false})
    ]);
    if(!live)return;
    if(a.error||b.error)setError(a.error?.message||b.error?.message||"Unable to load history");
    else {setEnquiries((a.data||[]) as Enquiry[]);setEvents((b.data||[]) as Event[]);}
   }
   setLoading(false);
  }
  void load();
  return()=>{live=false;};
 },[studentId]);
 return <section style={container}>
  <h3 style={{fontSize:16,margin:"0 0 8px"}}>Previous Appointment & Follow-up History</h3>
  <p style={{fontSize:12,color:"#64748b"}}>Internal staff record linked to this student's registered account. Not shown to parents.</p>
  {loading?<p style={{fontSize:12}}>Loading appointment history...</p>:error?<p role="alert" style={{fontSize:12,color:"#b42318"}}>{error}</p>:
   !enquiries.length?<p style={{fontSize:12,color:"#64748b"}}>No verified appointment enquiry linked to this student yet. Staff can check older phone-number enquiries in Appointment Follow-up.</p>:
   enquiries.map(e=><div key={e.id} style={{padding:12,background:"#f8faf7",border:"1px solid #dce8e1",borderRadius:9,marginTop:9,fontSize:13}}>
    <strong>Enquiry · {new Date(e.created_at).toLocaleDateString("en-IN")}</strong>
    <p style={{margin:"6px 0"}}>Guardian: {e.guardian_name} · Status: {e.status.replace(/_/g," ")}</p>
    <p style={{margin:"6px 0",whiteSpace:"pre-wrap"}}>Reason: {e.reason}</p>
    {e.followup_notes&&<p style={{whiteSpace:"pre-wrap",margin:"6px 0"}}><strong>Latest follow-up:</strong> {e.followup_notes}</p>}
    {links.find(l=>l.enquiry_id===e.id)&&<p style={{color:"#176b58",fontSize:12}}>Linked: {new Date(links.find(l=>l.enquiry_id===e.id)!.linked_at).toLocaleDateString("en-IN")}</p>}
    {events.filter(h=>h.enquiry_id===e.id).map(h=><div key={h.id} style={{borderTop:"1px solid #dce8e1",paddingTop:8,marginTop:8,fontSize:12}}>
     <strong>{new Date(h.recorded_at).toLocaleString("en-IN")}</strong> · {h.old_status.replace(/_/g," ")} → {h.new_status.replace(/_/g," ")}
     {h.old_notes!==h.new_notes&&<p style={{whiteSpace:"pre-wrap",margin:"5px 0"}}>Note: {h.new_notes||"(cleared)"}</p>}
     {h.new_next_followup_date&&<p style={{margin:"5px 0"}}>Follow-up scheduled: {h.new_next_followup_date}</p>}
    </div>)}
   </div>)}
 </section>;
}
