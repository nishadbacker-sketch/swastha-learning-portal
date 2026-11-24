"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Status="planned"|"in_progress"|"achieved"|"needs_revision";
type Goal={id:string;assignment_id:string;title:string;support_activity:string;target_date:string|null;status:Status;progress_notes:string;created_at:string};
const states:{key:Status;label:string}[]=[
 {key:"planned",label:"Planned"},{key:"in_progress",label:"In Progress"},
 {key:"achieved",label:"Achieved"},{key:"needs_revision",label:"Needs Revision"}
];
const box:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:12};
const field:React.CSSProperties={width:"100%",padding:"10px 11px",border:"1px solid #cbd5e1",borderRadius:8,boxSizing:"border-box",fontSize:13};
const button:React.CSSProperties={background:"#176b58",border:"none",borderRadius:8,padding:"9px 13px",color:"white",fontWeight:700,cursor:"pointer",fontSize:13};
const tint:Record<Status,string>={planned:"#64748b",in_progress:"#0284c7",achieved:"#176b58",needs_revision:"#c66b25"};

export default function DevelopmentPlan({assignmentId,canEdit=false}:{assignmentId:string;canEdit?:boolean}){
 const [goals,setGoals]=useState<Goal[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [title,setTitle]=useState("");
 const [activity,setActivity]=useState("");
 const [target,setTarget]=useState("");
 const [drafts,setDrafts]=useState<Record<string,{status:Status;progress_notes:string}>>({});
 const refresh=useCallback(async()=>{
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("student_development_goals")
   .select("id,assignment_id,title,support_activity,target_date,status,progress_notes,created_at")
   .eq("assignment_id",assignmentId).order("created_at",{ascending:true});
  if(e)setError(e.message);
  else{
   const loaded=(data||[]) as Goal[];
   setGoals(loaded);
   setDrafts(Object.fromEntries(loaded.map(g=>[g.id,{status:g.status,progress_notes:g.progress_notes}])));
  }
  setLoading(false);
 },[assignmentId]);
 useEffect(()=>{void refresh();},[refresh]);

 async function addGoal(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!supabase||!canEdit)return;
  if(title.trim().length<3||activity.trim().length<3){setError("Enter a goal and supporting activity (at least 3 characters each).");return;}
  setBusy("new");setError("");setNotice("");
  const {error:e}=await supabase.from("student_development_goals").insert({
   assignment_id:assignmentId,title:title.trim(),support_activity:activity.trim(),target_date:target||null
  });
  if(e)setError(e.message);
  else{setTitle("");setActivity("");setTarget("");setNotice("Development goal added.");await refresh();}
  setBusy("");
 }
 async function save(g:Goal){
  if(!supabase||!canEdit)return;
  const draft=drafts[g.id];
  if(!draft)return;
  setBusy(g.id);setError("");setNotice("");
  const {data,error:e}=await supabase.from("student_development_goals").update({
   status:draft.status,progress_notes:draft.progress_notes.trim(),updated_at:new Date().toISOString()
  }).eq("id",g.id).eq("assignment_id",assignmentId).select("id");
  if(e)setError(e.message);
  else if(!data?.length)setError("Your changes were not saved. Check your permissions.");
  else {setNotice("Goal progress saved.");await refresh();}
  setBusy("");
 }
 const achieved=goals.filter(g=>g.status==="achieved").length;
 return <section style={{...box,marginTop:18}} id="development-plan">
  <h2 style={{fontSize:19,margin:"0 0 6px",color:"#0f4c5c"}}>Individual Development Plan (IDP)</h2>
  <p style={{fontSize:13,color:"#64748b",margin:"0 0 14px"}}>Assessment-linked goals, recommended activities, review targets and progress notes. {canEdit?"Teachers can update progress after approval.":"The teacher manages this plan; parents can follow progress."}</p>
  {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
  {notice&&<p role="status" style={{color:"#176b58",fontSize:13}}>{notice}</p>}
  {loading?<p>Loading development plan...</p>:<>
   <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
    <strong style={{color:"#176b58"}}>{achieved} / {goals.length} goals achieved</strong>
    <div style={{height:8,flex:"1 1 145px",maxWidth:250,borderRadius:9,background:"#e2e8f0",overflow:"hidden"}}>
     <div style={{height:"100%",background:"#10b981",width:goals.length?(achieved/goals.length*100)+"%":"0%"}}/>
    </div>
   </div>
   {!goals.length&&<p style={{fontSize:13,color:"#64748b"}}>No development goals have been added yet.</p>}
   {goals.map((g,i)=><article key={g.id} style={{...box,background:"#fcfdfd"}}>
    <div style={{display:"flex",gap:9,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
     <h3 style={{fontSize:15,margin:0}}>{i+1}. {g.title}</h3>
     <span style={{background:tint[g.status]+"16",color:tint[g.status],borderRadius:8,padding:"4px 9px",fontSize:12,fontWeight:700}}>{states.find(s=>s.key===g.status)?.label}</span>
    </div>
    <p style={{fontSize:13,whiteSpace:"pre-wrap",margin:"10px 0"}}><strong>Support activities:</strong> {g.support_activity}</p>
    <p style={{fontSize:12,color:"#64748b",margin:"0 0 10px"}}><strong>Target review:</strong> {g.target_date?new Date(g.target_date+"T00:00:00").toLocaleDateString("en-IN"):"Not scheduled"}</p>
    {canEdit?<div style={{display:"grid",gap:9}}>
     <label style={{fontSize:12,fontWeight:700}}>Progress status
      <select style={{...field,marginTop:5}} value={drafts[g.id]?.status||g.status} onChange={e=>setDrafts(d=>({...d,[g.id]:{status:e.target.value as Status,progress_notes:d[g.id]?.progress_notes??g.progress_notes}}))}>
       {states.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
     </label>
     <label style={{fontSize:12,fontWeight:700}}>Teacher progress notes
      <textarea rows={2} maxLength={4000} style={{...field,display:"block",marginTop:5}} value={drafts[g.id]?.progress_notes??g.progress_notes} onChange={e=>setDrafts(d=>({...d,[g.id]:{status:d[g.id]?.status??g.status,progress_notes:e.target.value}}))}/>
     </label>
     <div><button type="button" disabled={!!busy} style={{...button,opacity:busy ? 0.65 : 1}} onClick={()=>save(g)}>{busy===g.id?"Saving...":"Save Progress"}</button></div>
    </div>:g.progress_notes&&<p style={{fontSize:13,whiteSpace:"pre-wrap",margin:"8px 0 0"}}><strong>Progress notes:</strong> {g.progress_notes}</p>}
   </article>)}
   {canEdit&&<form onSubmit={addGoal} style={{...box,background:"#f3f9f6",marginBottom:0}}>
    <h3 style={{fontSize:15,margin:"0 0 12px"}}>Add a Development Goal</h3>
    <div style={{display:"grid",gap:11}}>
     <label style={{fontSize:12,fontWeight:700}}>Priority goal *
      <input required minLength={3} maxLength={300} style={{...field,marginTop:5}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Improve independent reading comprehension"/>
     </label>
     <label style={{fontSize:12,fontWeight:700}}>Activities / support strategies *
      <textarea required minLength={3} maxLength={4000} rows={3} style={{...field,display:"block",marginTop:5}} value={activity} onChange={e=>setActivity(e.target.value)} placeholder="Describe specific practice activities, supports, and frequency"/>
     </label>
     <label style={{fontSize:12,fontWeight:700}}>Target review date
      <input type="date" style={{...field,marginTop:5,maxWidth:240}} value={target} onChange={e=>setTarget(e.target.value)}/>
     </label>
    </div>
    <button type="submit" disabled={!!busy} style={{...button,marginTop:12,opacity:busy ? 0.65 : 1}}>{busy==="new"?"Adding...":"Add Goal"}</button>
   </form>}
  </>}
 </section>;
}
