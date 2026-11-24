"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

type Notice={id:string;student_id:string;event_type:string;source_id:string;created_at:string};
type Student={full_name:string;student_code:string|null};
const btn:React.CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#176b58",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13};
const titles:Record<string,{title:string;description:string;href:(id:string)=>string}>={
 assessment_submitted:{title:"Assessment submitted",description:"An assessment is awaiting review.",href:id=>"/teacher/assessment-review/"+id},
 custom_assessment_submitted:{title:"Custom assessment submitted",description:"A custom assessment is awaiting review.",href:()=>"/teacher/custom-assessments"},
};
export default function StaffNotificationsPopup(){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [view,setView]=useState<"updates"|"history">("updates");
 const [events,setEvents]=useState<Notice[]>([]);
 const [read,setRead]=useState<string[]>([]);
 const [students,setStudents]=useState<Record<string,Student>>({});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [userId,setUserId]=useState("");
 const refresh=useCallback(async()=>{
  if(!supabase)return;
  setLoading(true);setError("");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){setLoading(false);return;}
  const id=auth.user.id;
  const access=await supabase.from("user_roles").select("role").eq("user_id",id).maybeSingle();
  if(access.error||!access.data||!["teacher","admin","clinic_admin","owner"].includes(access.data.role)){
   setError("Staff notification access is unavailable.");setLoading(false);return;
  }
  setUserId(id);
  const [result,ack]=await Promise.all([
   supabase.from("portal_notification_events").select("id,student_id,event_type,source_id,created_at")
    .eq("recipient_user_id",id).in("event_type",["assessment_submitted","custom_assessment_submitted"])
    .order("created_at",{ascending:false}).limit(100),
   supabase.from("staff_notification_acknowledgements").select("event_id")
    .eq("user_id",id).limit(500)
  ]);
  if(result.error||ack.error){setError("Notifications could not be loaded.");setLoading(false);return;}
  const items=(result.data||[]) as Notice[];
  setEvents(items);setRead((ack.data||[]).map(x=>x.event_id));
  const ids=[...new Set(items.map(x=>x.student_id))];
  const map:Record<string,Student>={};
  for(let i=0;i<ids.length;i+=100){
   const r=await supabase.from("students").select("id,full_name,student_code").in("id",ids.slice(i,i+100));
   if(r.error){setError("Some student details could not be loaded.");break;}
   for(const row of r.data||[])map[row.id]={full_name:row.full_name,student_code:row.student_code};
  }
  setStudents(map);setLoading(false);
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const unread=useMemo(()=>events.filter(x=>!read.includes(x.id)),[events,read]);
 async function markRead(destination?:string){
  if(!supabase||saving||!userId)return;
  if(!unread.length){setOpen(false);if(destination)router.push(destination);return;}
  setSaving(true);setError("");
  const {error:saveError}=await supabase.from("staff_notification_acknowledgements")
   .upsert(unread.map(x=>({user_id:userId,event_id:x.id})),
    {onConflict:"user_id,event_id",ignoreDuplicates:true});
  if(saveError){setError("Could not save notification status.");setSaving(false);return;}
  setRead(old=>[...new Set([...old,...unread.map(x=>x.id)])]);
  setSaving(false);setOpen(false);if(destination)router.push(destination);
 }
 return <>
  <button type="button" style={{...btn,background:"#eaf4ef",color:"#176b58",border:"1px solid #cce3d5"}}
   onClick={()=>{setView("updates");setOpen(true);void refresh();}}
   aria-label={"Notifications"+(unread.length?" ("+unread.length+" unread)":"")}>
   Notifications {unread.length?"("+unread.length+")":""}
  </button>
  {open&&<div role="presentation" style={{position:"fixed",inset:0,background:"rgba(15,23,42,.63)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
   <section role="dialog" aria-modal="true" aria-labelledby="staff-notification-title"
    style={{background:"#fff",borderRadius:16,padding:22,width:"min(540px,calc(100vw - 28px))",maxHeight:"min(80vh,720px)",overflowY:"auto",boxShadow:"0 24px 70px rgba(15,23,42,.25)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
     <div><h2 id="staff-notification-title" style={{margin:"0 0 5px",fontSize:21,color:"#0f4c5c"}}>Staff Notifications</h2>
      <p style={{margin:"0 0 14px",fontSize:13,color:"#64748b"}}>Updates from your assigned assessment workflow. No WhatsApp or email messages are sent.</p></div>
     <button type="button" disabled={saving} style={{...btn,background:"#f1f5f9",color:"#334155"}} onClick={()=>setOpen(false)}>Close</button>
    </div>
    <div style={{display:"flex",gap:8,margin:"0 0 14px"}}>
     <button type="button" style={{...btn,background:view==="updates"?"#176b58":"#eaf4ef",color:view==="updates"?"#fff":"#176b58"}} onClick={()=>setView("updates")}>Current updates</button>
     <button type="button" style={{...btn,background:view==="history"?"#176b58":"#eaf4ef",color:view==="history"?"#fff":"#176b58"}} onClick={()=>setView("history")}>Notification history</button>
    </div>
    {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
    {loading?<p>Loading notifications...</p>:(!events.length?<p>No notifications at the moment.</p>:
     <div style={{display:"grid",gap:9}}>
      {(view==="updates"?unread:events).slice(0,50).map(item=>{
       const info=titles[item.event_type];if(!info)return null;
       const child=students[item.student_id];
       return <div key={item.id} style={{border:"1px solid #dce8e1",borderRadius:10,padding:12,background:read.includes(item.id)?"#fff":"#f0f8f4"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
         <strong style={{fontSize:14,color:"#183a35"}}>{info.title}</strong>
         {!read.includes(item.id)&&<span style={{fontSize:11,fontWeight:700,color:"#176b58"}}>New</span>}
        </div>
        <p style={{fontSize:12,color:"#475569"}}>{child?child.full_name+" ("+(child.student_code||"Student ID pending")+")":"Linked student"}</p>
        <p style={{fontSize:13}}>{info.description}</p>
        <p style={{fontSize:12,color:"#64748b"}}>{new Date(item.created_at).toLocaleString("en-IN")}</p>
        <button type="button" disabled={saving} style={{...btn,padding:"7px 10px"}} onClick={()=>void markRead(info.href(item.source_id))}>View details</button>
       </div>;
      })}
      {view==="updates"&&!unread.length&&<p>No unread notifications.</p>}
     </div>)}
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
     <button type="button" disabled={saving||loading} style={btn} onClick={()=>void markRead()}>{saving?"Saving...":"Got it"}</button>
    </div>
   </section>
  </div>}
 </>;
}
