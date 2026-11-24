"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

type Event={id:string;student_id:string;event_type:string;source_id:string;created_at:string};
type Student={full_name:string;student_code:string|null};
type FollowupAlert={id:string;child_name:string;next_followup_date:string;status:string};
type FollowupHistory={id:string;enquiry_id:string;followup_date:string;kind:"due_tomorrow"|"due_today"|"overdue";created_at:string};
const indiaDate=()=>{
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const field=(type:string)=>parts.find(p=>p.type===type)?.value||"";
 return field("year")+"-"+field("month")+"-"+field("day");
};
const nextDay=(date:string)=>new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10);
const dueFollowups=(rows:FollowupAlert[],today:string)=>rows.filter(r=>
 !["completed","not_interested"].includes(r.status)&&
 r.next_followup_date<=nextDay(today)
);
const button:React.CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#176b58",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13};
const panel:React.CSSProperties={background:"#fff",borderRadius:16,padding:22,width:"min(540px,calc(100vw - 28px))",maxHeight:"min(80vh,720px)",overflowY:"auto",boxShadow:"0 24px 70px rgba(15,23,42,.25)"};
const eventMeta:Record<string,{title:string;description:string;destination:(id:string)=>string}>={
 assessment_submitted:{title:"Assessment submitted",description:"An assessment is awaiting review.",destination:id=>"/teacher/assessment-review/"+id},
 custom_assessment_submitted:{title:"Custom assessment submitted",description:"A custom assessment is awaiting review.",destination:()=>"/teacher/custom-assessments"},
 teacher_assigned:{title:"Student assigned to you",description:"A student has been assigned to your teaching caseload.",destination:()=>"/teacher/dashboard"}
};
export default function StaffNotificationsPopup(){
 const router=useRouter();
 const [userId,setUserId]=useState("");
 const [events,setEvents]=useState<Event[]>([]);
 const [followups,setFollowups]=useState<FollowupAlert[]>([]);
 const [followupHistory,setFollowupHistory]=useState<FollowupHistory[]>([]);
 const [students,setStudents]=useState<Record<string,Student>>({});
 const [acknowledged,setAcknowledged]=useState<string[]>([]);
 const [open,setOpen]=useState(false);
 const [view,setView]=useState<"updates"|"history">("updates");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  if(!supabase)return;
  setLoading(true);setError("");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){setLoading(false);return;}
  const user=auth.user.id;
  const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user).single();
  if(roleError||!role||!["teacher","admin","clinic_admin","owner"].includes(role.role)){setLoading(false);return;}
  setUserId(user);
  const [result,acks,followupResult,historyResult]=await Promise.all([
   supabase.from("portal_notification_events").select("id,student_id,event_type,source_id,created_at")
    .eq("recipient_user_id",user).in("event_type",["assessment_submitted","custom_assessment_submitted","teacher_assigned"])
    .order("created_at",{ascending:false}).limit(100),
   supabase.from("staff_notification_acknowledgements").select("event_id").eq("user_id",user).limit(500),
   supabase.from("appointment_enquiries")
    .select("id,child_name,next_followup_date,status")
    .not("next_followup_date","is",null)
    .order("next_followup_date",{ascending:true}).limit(250),
   supabase.from("appointment_followup_notification_history")
    .select("id,enquiry_id,followup_date,kind,created_at")
    .eq("recipient_user_id",user)
    .order("created_at",{ascending:false}).limit(100)
  ]);
  if(result.error||acks.error||followupResult.error||historyResult.error){setError("Could not load notifications. Please try again.");setLoading(false);return;}
  setFollowupHistory((historyResult.data||[]) as FollowupHistory[]);
  setFollowups(dueFollowups((followupResult.data||[]).filter(r=>r.next_followup_date) as FollowupAlert[],indiaDate()));
  const rows=(result.data||[]) as Event[];
  setEvents(rows);
  setAcknowledged((acks.data||[]).map(x=>x.event_id));
  const ids=[...new Set(rows.map(e=>e.student_id))];
  const map:Record<string,Student>={};
  for(let i=0;i<ids.length;i+=100){
   const {data,error:studentsError}=await supabase.from("students").select("id,full_name,student_code").in("id",ids.slice(i,i+100));
   if(studentsError){setError("Some student names could not be loaded.");break;}
   for(const item of data||[])map[item.id]={full_name:item.full_name,student_code:item.student_code};
  }
  setStudents(map);setLoading(false);
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const unread=useMemo(()=>events.filter(e=>!acknowledged.includes(e.id)),[events,acknowledged]);
 async function acknowledge(destination?:string){
  if(saving||!supabase||!userId)return;
  setSaving(true);setError("");
  if(unread.length){
   const ids=unread.map(e=>e.id);
   const {error:saveError}=await supabase.from("staff_notification_acknowledgements")
    .upsert(ids.map(id=>({user_id:userId,event_id:id})),{onConflict:"user_id,event_id",ignoreDuplicates:true});
   if(saveError){setError("Unable to save read status. Please retry.");setSaving(false);return;}
   setAcknowledged(old=>[...new Set([...old,...ids])]);
  }
  setOpen(false);setSaving(false);
  if(destination)router.push(destination);
 }
 return <>
  <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58",border:"1px solid #cce3d5"}} aria-label={"Notifications"+(unread.length+followups.length?" ("+(unread.length+followups.length)+" attention items)":"")} onClick={()=>{setOpen(true);void refresh();}}>
   Notifications {unread.length+followups.length>0?"("+(unread.length+followups.length)+")":""}
  </button>
  {open&&<div role="presentation" style={{position:"fixed",inset:0,background:"rgba(15,23,42,.63)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
   <section role="dialog" aria-modal="true" aria-labelledby="staff-notification-title" style={panel}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
     <div><h2 id="staff-notification-title" style={{margin:"0 0 5px",fontSize:21,color:"#0f4c5c"}}>Staff Notifications</h2>
      <p style={{margin:"0 0 14px",fontSize:13,color:"#64748b"}}>Assessment updates and appointment follow-ups. No WhatsApp or email messages are sent.</p></div>
     <button type="button" aria-label="Close notifications" disabled={saving} onClick={()=>setOpen(false)} style={{...button,background:"#f1f5f9",color:"#334155"}}>Close</button>
    </div>
    <div style={{display:"flex",gap:8,margin:"0 0 14px"}}>
     <button type="button" style={{...button,background:view==="updates"?"#176b58":"#eaf4ef",color:view==="updates"?"#fff":"#176b58"}} onClick={()=>setView("updates")}>Current updates</button>
     <button type="button" style={{...button,background:view==="history"?"#176b58":"#eaf4ef",color:view==="history"?"#fff":"#176b58"}} onClick={()=>setView("history")}>Notification history</button>
    </div>
    {error&&<p role="alert" style={{fontSize:13,color:"#b42318"}}>{error}</p>}
    {!loading&&view==="updates"&&followups.length>0&&<section aria-label="Appointment follow-up alerts" style={{marginBottom:14}}>
     <h3 style={{fontSize:15,color:"#183a35",margin:"8px 0"}}>Appointment follow-ups needing attention ({followups.length})</h3>
     {followups.slice(0,30).map(item=>{
      const today=indiaDate();
      const state=item.next_followup_date<today?"Overdue":item.next_followup_date===today?"Due today":"Due tomorrow";
      return <div key={item.id} style={{border:"1px solid #e5d5ab",background:"#fffaf0",borderRadius:10,padding:12,marginBottom:8}}>
       <strong style={{fontSize:13,color:"#79521d"}}>{state} · {item.child_name||"Appointment enquiry"}</strong>
       <p style={{fontSize:12,color:"#79521d",margin:"6px 0"}}>Follow-up date: {item.next_followup_date}. This reminder stays open until staff updates the follow-up date or closes the enquiry.</p>
       <button type="button" style={{...button,padding:"7px 10px"}} onClick={()=>{setOpen(false);router.push("/teacher/appointments");}}>Open Appointment Follow-up</button>
      </div>;
     })}
    </section>}
    {!loading&&view==="history"&&followupHistory.length>0&&<section aria-label="Appointment reminder history" style={{marginBottom:14}}>
     <h3 style={{fontSize:15,color:"#183a35",margin:"8px 0"}}>Appointment reminder history</h3>
     {followupHistory.slice(0,50).map(item=><div key={item.id} style={{border:"1px solid #dce8e1",borderRadius:10,padding:12,marginBottom:8}}>
      <strong style={{fontSize:13,color:"#183a35"}}>{item.kind==="overdue"?"Overdue":item.kind==="due_today"?"Due today":"Due tomorrow"} · Follow-up {item.followup_date}</strong>
      <p style={{fontSize:12,color:"#64748b",margin:"6px 0"}}>Recorded {new Date(item.created_at).toLocaleString("en-IN")} · Appointment reference {item.enquiry_id.slice(0,8)}</p>
      <button type="button" style={{...button,padding:"7px 10px"}} onClick={()=>{setOpen(false);router.push("/teacher/appointments");}}>Open Appointment Follow-up</button>
     </div>)}
    </section>}
    {loading?<p>Loading notifications...</p>:(
     (view==="updates"?unread:events).length===0?((view==="updates"&&followups.length>0||view==="history"&&followupHistory.length>0)?null:<p style={{fontSize:14}}>{view==="updates"?"No new notifications.":"No notification history yet."}</p>):
     <div style={{display:"grid",gap:9}}>
      {(view==="updates"?unread:events).slice(0,50).map(e=>{
       const info=eventMeta[e.event_type];if(!info)return null;
       const student=students[e.student_id];
       return <div key={e.id} style={{border:"1px solid #dce8e1",borderRadius:10,padding:12,background:acknowledged.includes(e.id)?"#fff":"#f0f8f4"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
         <strong style={{fontSize:14,color:"#183a35"}}>{info.title}</strong>
         {!acknowledged.includes(e.id)&&<span style={{fontSize:11,color:"#176b58",fontWeight:700}}>New</span>}
        </div>
        <p style={{fontSize:12,color:"#64748b",margin:"6px 0"}}>{student?student.full_name+" ("+(student.student_code||"ID pending")+")":"Linked student"} · {new Date(e.created_at).toLocaleString("en-IN")}</p>
        <p style={{fontSize:13}}>{info.description}</p>
        <button type="button" disabled={saving} style={{...button,padding:"7px 10px"}} onClick={()=>void acknowledge(info.destination(e.source_id))}>View details</button>
       </div>;
      })}
     </div>
    )}
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
     <button type="button" disabled={saving||loading} style={button} onClick={()=>void acknowledge()}>{saving?"Saving...":"Got it"}</button>
    </div>
   </section>
  </div>}
 </>;
}
