"use client";

import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import BrandLogo from "../../components/brand-logo";

type EventRow={id:string;recipient_user_id:string;student_id:string|null;event_type:string;source_type:string|null;source_id:string|null;created_at:string};
type Acknowledgement={event_id:string;user_id:string;acknowledged_at:string};
type Announcement={id:string;title:string;target_parent_user_id:string|null;created_at:string;active:boolean};
const PAGE_SIZE=25;
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",padding:16,borderRadius:12};
const button:React.CSSProperties={border:0,borderRadius:8,background:"#176b58",color:"#fff",fontWeight:700,padding:"10px 14px",cursor:"pointer"};
const field:React.CSSProperties={border:"1px solid #cbd5e1",borderRadius:8,padding:10,background:"#fff"};
const roles=["admin","owner"];
export default function AdminNotificationHistory(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [ready,setReady]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [page,setPage]=useState(0);
 const [eventType,setEventType]=useState("");
 const [events,setEvents]=useState<EventRow[]>([]);
 const [acknowledged,setAcknowledged]=useState<Record<string,Acknowledgement>>({});
 const [students,setStudents]=useState<Record<string,string>>({});
 const [recipients,setRecipients]=useState<Record<string,string>>({});
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [more,setMore]=useState(false);
 const load=useCallback(async()=>{
  if(!supabase)return;
  setLoading(true);setError("");
  // Access control is enforced by PostgreSQL RLS, not the role check in this page.
  let query=supabase.from("portal_notification_events")
   .select("id,recipient_user_id,student_id,event_type,source_type,source_id,created_at")
   .order("created_at",{ascending:false}).order("id",{ascending:false})
   .range(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  if(eventType)query=query.eq("event_type",eventType);
  const [history,announcementResult]=await Promise.all([
   query,
   supabase.from("parent_announcements")
    .select("id,title,target_parent_user_id,created_at,active")
    .order("created_at",{ascending:false}).limit(25)
  ]);
  if(history.error||announcementResult.error){
   setError(history.error?.message||announcementResult.error?.message||"Unable to load notification history.");
   setLoading(false);return;
  }
  const rows=(history.data||[]) as EventRow[];
  setEvents(rows.slice(0,PAGE_SIZE));setMore(rows.length>PAGE_SIZE);
  setAnnouncements((announcementResult.data||[]) as Announcement[]);
  const eventIds=rows.map(e=>e.id);
  const ids=[...new Set(rows.map(e=>e.student_id).filter((id):id is string=>Boolean(id)))];
  const people=[...new Set(rows.map(e=>e.recipient_user_id))];
  const [ack,studentResult,profileResult]=await Promise.all([
   eventIds.length?supabase.from("staff_notification_acknowledgements").select("event_id,user_id,acknowledged_at").in("event_id",eventIds):Promise.resolve({data:[] as Acknowledgement[],error:null}),
   ids.length?supabase.from("students").select("id,student_code,full_name").in("id",ids):Promise.resolve({data:[] as {id:string;student_code:string|null;full_name:string}[],error:null}),
   people.length?supabase.from("profiles").select("id,full_name,staff_code").in("id",people):Promise.resolve({data:[] as {id:string;full_name:string|null;staff_code:string|null}[],error:null})
  ]);
  if(ack.error||studentResult.error||profileResult.error){
   setError("Some related notification details could not be loaded. Check Super Admin read-only permissions.");
  }
  setAcknowledged(Object.fromEntries(((ack.data||[]) as Acknowledgement[]).map(a=>[a.event_id,a])));
  setStudents(Object.fromEntries((studentResult.data||[]).map(s=>[s.id,s.full_name+" ("+(s.student_code||"ID pending")+")"])));
  setRecipients(Object.fromEntries((profileResult.data||[]).map(p=>[p.id,(p.full_name||"Unnamed user")+(p.staff_code?" ("+p.staff_code+")":"")])));
  setLoading(false);
 },[page,eventType]);
 useEffect(()=>{
  let alive=true;
  async function init(){
   if(!supabase){setError("Database is not configured.");setLoading(false);return;}
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:access,error:accessError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).maybeSingle();
   if(accessError||!access||!roles.includes(access.role)){router.replace("/login");return;}
   if(alive){setRole(access.role);setReady(true);}
  }
  void init();return()=>{alive=false;};
 },[router]);
 useEffect(()=>{if(ready)void load();},[ready,load]);
 if(!ready&&!error)return <main style={{padding:30}}>Checking Super Admin permissions...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"17px 5%"}}>
   <div style={{maxWidth:1100,margin:"auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
    <div><BrandLogo/><div style={{color:"#64748b",fontSize:12}}>SUPER ADMIN · NOTIFICATION HISTORY</div></div>
    <button type="button" style={button} onClick={()=>router.push(role==="owner"?"/owner/dashboard":"/admin/dashboard")}>Back to Dashboard</button>
   </div>
  </header>
  <div style={{maxWidth:1100,margin:"auto",padding:"24px 16px 60px",display:"grid",gap:14}}>
   <div><h1 style={{fontSize:27,margin:"0 0 8px"}}>Notification Management</h1>
    <p style={{color:"#64748b",fontSize:13,margin:0}}>Read-only in-portal history. This page does not send or modify notifications. External WhatsApp or email delivery is not tracked here.</p></div>
   <section style={{...card,display:"flex",alignItems:"end",gap:12,flexWrap:"wrap"}}>
    <label style={{fontSize:13,display:"grid",gap:6}}>Event type
     <select style={field} value={eventType} onChange={e=>{setPage(0);setEventType(e.target.value);}}>
      <option value="">All event types</option>
      <option value="assessment_submitted">Assessment submitted</option>
      <option value="custom_assessment_submitted">Custom assessment submitted</option>
     </select>
    </label>
    <button type="button" style={button} disabled={loading} onClick={()=>void load()}>{loading?"Loading...":"Refresh"}</button>
   </section>
   {error&&<section role="alert" style={{...card,color:"#b42318"}}>{error}</section>}
   <section style={card}>
    <h2 style={{margin:"0 0 8px",fontSize:19}}>Portal Notification Events</h2>
    <p style={{fontSize:12,color:"#64748b"}}>Showing up to {PAGE_SIZE} events per page. Read status below is recorded only for staff acknowledgements.</p>
    {loading?<p>Loading events...</p>:events.length===0?<p>No events recorded for this view.</p>:
    <div style={{display:"grid",gap:10}}>{events.map(e=><article key={e.id} style={{padding:12,border:"1px solid #e2e8f0",borderRadius:9}}>
     <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <strong>{e.event_type.replace(/_/g," ")}</strong><span style={{fontSize:12,color:"#64748b"}}>{new Date(e.created_at).toLocaleString("en-IN")}</span>
     </div>
     <p style={{fontSize:13,margin:"8px 0"}}>Recipient: {recipients[e.recipient_user_id]||"Account "+e.recipient_user_id.slice(0,8)} · Student: {e.student_id?(students[e.student_id]||"ID "+e.student_id.slice(0,8)):"Not linked"}</p>
     <div style={{fontSize:12,color:"#64748b"}}>Source: {e.source_type||"Not specified"} · Status: {acknowledged[e.id]?"Staff acknowledged "+new Date(acknowledged[e.id].acknowledged_at).toLocaleString("en-IN"):"No staff acknowledgement recorded"}</div>
    </article>)}</div>}
    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:16}}>
     <button type="button" style={{...button,opacity:page===0?0.5:1}} disabled={loading||page===0} onClick={()=>setPage(x=>Math.max(0,x-1))}>Previous</button>
     <span style={{fontSize:13}}>Page {page+1}</span>
     <button type="button" style={{...button,opacity:more?1:0.5}} disabled={loading||!more} onClick={()=>setPage(x=>x+1)}>Next</button>
    </div>
   </section>
   <section style={card}><h2 style={{fontSize:19,marginTop:0}}>Recent Parent Announcements</h2>
    <p style={{fontSize:12,color:"#64748b"}}>Latest 25 announcements. Parent acknowledgements are tracked separately through the existing announcement-management page.</p>
    {announcements.length===0?<p>No parent announcements recorded.</p>:<div style={{display:"grid",gap:8}}>{announcements.map(a=><div key={a.id} style={{borderTop:"1px solid #e2e8f0",paddingTop:9,fontSize:13}}>
     <strong>{a.title}</strong> · {a.active?"Active":"Archived"} · {a.target_parent_user_id?"Targeted parent":"All parents"} · {new Date(a.created_at).toLocaleString("en-IN")}
    </div>)}</div>}
    <button type="button" style={{...button,marginTop:12}} onClick={()=>router.push("/admin/announcements")}>Open Announcement Management</button>
   </section>
  </div>
 </main>;
}
