"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

type BasicStudent={id:string;student_code:string|null;full_name:string};
type Assigned={id:string;student_id:string;assigned_at:string;due_date:string|null;status:string};
type Activity=Assigned&{learning_activities:{title:string;description:string|null}[]|{title:string;description:string|null}|null};
type Notice={key:string;title:string;description:string;student_id:string|null;destination:string;timestamp:number};
type Announcement={id:string;title:string;message:string;created_at:string;target_parent_user_id:string|null};
type EventHistory={id:string;student_id:string;event_type:string;source_id:string;created_at:string};
const eventDetails:Record<string,{title:string;description:string;route:(id:string)=>string}>={
 assessment_assigned:{title:"Assessment assigned",description:"A learning assessment has been assigned.",route:id=>"/parent/assessment/"+id},
 assessment_approved:{title:"Assessment approved",description:"Your child’s assessment report is ready.",route:id=>"/assessment-report/"+id},
 custom_assessment_assigned:{title:"Custom assessment assigned",description:"A custom assessment has been assigned.",route:id=>"/parent/custom-assessment/"+id},
 custom_assessment_approved:{title:"Custom assessment approved",description:"The custom assessment report is ready.",route:id=>"/custom-assessment-report/"+id},
 activity_assigned:{title:"Learning activity assigned",description:"A learning activity has been assigned.",route:()=>"/parent/dashboard?tab=Learning%20Activities"},
};

const panel:React.CSSProperties={background:"#fff",borderRadius:16,padding:22,width:"min(540px,calc(100vw - 28px))",maxHeight:"min(80vh,720px)",overflowY:"auto",boxShadow:"0 24px 70px rgba(15,23,42,.25)"};
const button:React.CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#176b58",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13};
function recent(value:string,days=45){const time=Date.parse(value);return Number.isFinite(time)&&time>=Date.now()-days*86400000;}
function dueSoon(value:string|null){if(!value)return false;const d=new Date(value+"T23:59:59");return d.getTime()>=Date.now()-86400000&&d.getTime()<=Date.now()+3*86400000;}

export default function ParentNotifications({students,assessments,customAssessments,activities,onShowActivities}:{
 students:BasicStudent[];assessments:Assigned[];customAssessments:Assigned[];activities:Activity[];onShowActivities:()=>void;
}){
 const router=useRouter();
 const [userId,setUserId]=useState("");
 const [acknowledged,setAcknowledged]=useState<string[]>([]);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [history,setHistory]=useState<EventHistory[]>([]);
 const [historyAvailable,setHistoryAvailable]=useState(false);
 const [view,setView]=useState<"updates"|"history">("updates");
 const [ready,setReady]=useState(false);
 const [open,setOpen]=useState(false);
 const [firstLoad,setFirstLoad]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const notices=useMemo(()=>{
  const all:Notice[]=[];
  const build=(item:Assigned,kind:string,title:string,description:string,destination:string,timestamp:string)=>all.push({
   key:kind+":"+item.id+":"+item.status,
   title,description,student_id:item.student_id,destination,timestamp:Date.parse(timestamp)||0
  });
  for(const a of assessments){
   if(a.status==="reviewed"&&recent(a.assigned_at,365))build(a,"standard","Assessment report ready","Your child's assessment has been reviewed and approved.","/assessment-report/"+a.id,a.assigned_at);
   else if(["assigned","in_progress"].includes(a.status)&&recent(a.assigned_at))build(a,"standard","Assessment requires attention","A learning assessment has been assigned. You can complete or continue it.","/parent/assessment/"+a.id,a.assigned_at);
   if(["assigned","in_progress"].includes(a.status)&&dueSoon(a.due_date))build(a,"standard-due","Assessment due soon","Please review the approaching assessment due date.","/parent/assessment/"+a.id,a.assigned_at);
  }
  for(const a of customAssessments){
   if(a.status==="reviewed"&&recent(a.assigned_at,365))build(a,"custom","Custom assessment report ready","A teacher has reviewed your child's custom assessment.","/custom-assessment-report/"+a.id,a.assigned_at);
   else if(["assigned","in_progress"].includes(a.status)&&recent(a.assigned_at))build(a,"custom","New custom assessment","A custom questionnaire is ready for your attention.","/parent/custom-assessment/"+a.id,a.assigned_at);
   if(["assigned","in_progress"].includes(a.status)&&dueSoon(a.due_date))build(a,"custom-due","Custom assessment due soon","Please check the assessment's due date.","/parent/custom-assessment/"+a.id,a.assigned_at);
  }
  for(const a of activities){
   if(a.status!=="completed"&&recent(a.assigned_at)){
    const info=Array.isArray(a.learning_activities)?a.learning_activities[0]:a.learning_activities;
    build(a,"activity","New learning activity",info?.title||"A teacher assigned a learning activity.","/parent/dashboard?tab=Learning%20Activities",a.assigned_at);
   }
  }
  for(const a of announcements){
   all.push({key:"announcement:"+a.id,title:a.title,description:a.message,student_id:null,
    destination:"",timestamp:Date.parse(a.created_at)||0});
  }
  return all.sort((a,b)=>b.timestamp-a.timestamp).slice(0,50);
 },[assessments,customAssessments,activities,announcements]);
 const unread=notices.filter(n=>!acknowledged.includes(n.key));
 useEffect(()=>{
  let live=true;
  async function load(){
   if(!supabase)return;
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user||!live)return;
   const [acks,news]=await Promise.all([
    supabase.from("parent_notification_acknowledgements")
     .select("notification_key").eq("parent_user_id",auth.user.id).limit(500),
    supabase.from("parent_announcements")
     .select("id,title,message,created_at,target_parent_user_id")
     .eq("active",true).order("created_at",{ascending:false}).limit(50)
   ]);
   if(!live)return;
   if(acks.error||news.error){setError("Notifications could not be loaded.");return;}
   setUserId(auth.user.id);
   setAcknowledged((acks.data||[]).map(x=>x.notification_key));
   setAnnouncements((news.data||[]) as Announcement[]);
   // Optional until the notification-history migration is deployed.
   // Read access is still enforced by per-recipient database RLS.
   const events=await supabase.from("portal_notification_events")
    .select("id,student_id,event_type,source_id,created_at")
    .eq("recipient_user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
   if(!live)return;
   if(!events.error){
    setHistory((events.data||[]) as EventHistory[]);
    setHistoryAvailable(true);
   }
   setReady(true);
  }
  void load();return()=>{live=false;};
 },[]);
 useEffect(()=>{
  if(ready&&!firstLoad){
   setFirstLoad(true);
   if(unread.length)setOpen(true);
  }
 },[ready,firstLoad,unread.length]);
 async function acknowledgeAndClose(destination?:string){
  if(!supabase||!userId||busy)return;
  setBusy(true);setError("");
  const keys=unread.slice(0,50).map(n=>n.key);
  if(keys.length){
   const {error:e}=await supabase.from("parent_notification_acknowledgements")
    .upsert(keys.map(key=>({parent_user_id:userId,notification_key:key})),{onConflict:"parent_user_id,notification_key",ignoreDuplicates:true});
   if(e){setError("Could not save notification acknowledgement. Please retry.");setBusy(false);return;}
   setAcknowledged(old=>[...new Set([...old,...keys])]);
  }
  setOpen(false);setBusy(false);
  if(destination){
   if(destination.includes("?tab="))onShowActivities();
   else router.push(destination);
  }
 }
 return <>
  <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58",border:"1px solid #cce3d5"}} onClick={()=>{setError("");setOpen(true);}} aria-label={"Notifications"+(unread.length?" ("+unread.length+" unread)":"")}>
   Notifications {unread.length>0?"("+unread.length+")":""}
  </button>
  {open&&<div role="presentation" style={{position:"fixed",inset:0,background:"rgba(15,23,42,.63)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
   <section role="dialog" aria-modal="true" aria-labelledby="parent-notification-title" style={panel}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
     <div><h2 id="parent-notification-title" style={{margin:"0 0 5px",fontSize:21,color:"#0f4c5c"}}>Parent Notifications</h2>
      <p style={{margin:"0 0 14px",fontSize:13,color:"#64748b"}}>Updates from your child's learning portal. No WhatsApp or email messages are sent.</p></div>
     <button type="button" aria-label="Close notifications" disabled={busy} onClick={()=>void acknowledgeAndClose()} style={{...button,background:"#f1f5f9",color:"#334155"}}>Close</button>
    </div>
    <div style={{display:"flex",gap:8,margin:"0 0 14px"}}>
     <button type="button" style={{...button,background:view==="updates"?"#176b58":"#eaf4ef",color:view==="updates"?"#fff":"#176b58"}} onClick={()=>setView("updates")}>Current updates</button>
     {historyAvailable&&<button type="button" style={{...button,background:view==="history"?"#176b58":"#eaf4ef",color:view==="history"?"#fff":"#176b58"}} onClick={()=>setView("history")}>Notification history</button>}
    </div>
    {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
    {view==="history"?(
     !history.length?<p style={{fontSize:14}}>No recorded notification history yet. New assessment and activity events will appear here.</p>:
     <div style={{display:"grid",gap:9}}>
      {history.map(event=>{
       const details=eventDetails[event.event_type];
       if(!details)return null;
       const student=students.find(s=>s.id===event.student_id);
       return <div key={event.id} style={{border:"1px solid #dce8e1",borderRadius:10,padding:12}}>
        <strong style={{color:"#183a35",fontSize:14}}>{details.title}</strong>
        <p style={{fontSize:12,color:"#64748b",margin:"6px 0"}}>{student?student.full_name+" ("+student.student_code+")":"Linked student"} · {new Date(event.created_at).toLocaleString("en-IN")}</p>
        <p style={{fontSize:13}}>{details.description}</p>
        <button type="button" disabled={busy} style={{...button,padding:"7px 10px"}} onClick={()=>void acknowledgeAndClose(details.route(event.source_id))}>View details</button>
       </div>;
      })}
     </div>
    ):<>
    {!notices.length?<p style={{fontSize:14}}>No notifications at the moment.</p>:
     <div style={{display:"grid",gap:9}}>
      {notices.slice(0,15).map(n=>{
       const student=students.find(s=>s.id===n.student_id);
       return <div key={n.key} style={{border:"1px solid #dce8e1",borderRadius:10,padding:12,background:acknowledged.includes(n.key)?"#fff":"#f0f8f4"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
         <strong style={{fontSize:14,color:"#183a35"}}>{n.title}</strong>
         {!acknowledged.includes(n.key)&&<span style={{fontSize:11,fontWeight:700,color:"#176b58"}}>New</span>}
        </div>
        <p style={{fontSize:12,margin:"6px 0",color:"#475569"}}>{n.student_id?(student?student.full_name+" ("+student.student_code+")":"Linked student"):"Clinic Announcement"}</p>
        <p style={{fontSize:13,margin:"6px 0 9px"}}>{n.description}</p>
        {n.destination&&<button disabled={busy} onClick={()=>void acknowledgeAndClose(n.destination)} type="button" style={{...button,padding:"7px 10px"}}>View details</button>}
       </div>;
      })}
     </div>}
    </>}
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
     <button type="button" disabled={busy} style={button} onClick={()=>void acknowledgeAndClose()}>{busy?"Saving...":"Got it"}</button>
    </div>
   </section>
  </div>}
 </>;
}
