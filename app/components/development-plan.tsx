"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Status="planned"|"in_progress"|"achieved"|"needs_revision";
type Goal={id:string;assignment_id:string;title:string;support_activity:string;target_date:string|null;status:Status;progress_notes:string;created_at:string;created_by:string;baseline_percent:number|null;current_percent:number|null;target_percent:number|null;responsible_staff_user_id:string|null};
type GoalHistory={id:number;goal_id:string;recorded_at:string;changed_by:string|null;old_status:string|null;new_status:string|null;old_current_percent:number|null;new_current_percent:number|null;old_progress_notes:string|null;new_progress_notes:string|null;old_target_date:string|null;new_target_date:string|null};
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
 const [baseline,setBaseline]=useState("");
 const [goalTarget,setGoalTarget]=useState("");
 const [history,setHistory]=useState<GoalHistory[]>([]);
 const [expandedHistory,setExpandedHistory]=useState<string|null>(null);
 const [drafts,setDrafts]=useState<Record<string,{status:Status;progress_notes:string;current_percent:string;target_date:string}>>({});
 const refresh=useCallback(async()=>{
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("student_development_goals")
   .select("id,assignment_id,title,support_activity,target_date,status,progress_notes,created_at,created_by,baseline_percent,current_percent,target_percent,responsible_staff_user_id")
   .eq("assignment_id",assignmentId).order("created_at",{ascending:true});
  if(e)setError(e.message);
  else{
   const loaded=(data||[]) as Goal[];
   setGoals(loaded);
   setDrafts(Object.fromEntries(loaded.map(g=>[g.id,{status:g.status,progress_notes:g.progress_notes,current_percent:g.current_percent===null?"":String(g.current_percent),target_date:g.target_date||""}])));
   if(loaded.length){
    const result=await supabase.from("student_goal_progress_history")
     .select("id,goal_id,recorded_at,changed_by,old_status,new_status,old_current_percent,new_current_percent,old_progress_notes,new_progress_notes,old_target_date,new_target_date")
     .in("goal_id",loaded.map(g=>g.id)).order("recorded_at",{ascending:false}).limit(500);
    if(result.error)setError(result.error.message);
    else setHistory((result.data||[]) as GoalHistory[]);
   }else setHistory([]);
  }
  setLoading(false);
 },[assignmentId]);
 useEffect(()=>{void refresh();},[refresh]);

 async function addGoal(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!supabase||!canEdit)return;
  if(title.trim().length<3||activity.trim().length<3){setError("Enter a goal and supporting activity (at least 3 characters each).");return;}
  if([baseline,goalTarget].some(x=>x!==""&&(!/^\d+$/.test(x)||Number(x)>100))){setError("Goal measurement must be 0 to 100%.");return;}
  if(baseline!==""&&goalTarget!==""&&Number(goalTarget)<Number(baseline)){setError("Target cannot be below baseline.");return;}
  setBusy("new");setError("");setNotice("");
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError("Please sign in again.");setBusy("");return;}
  const {error:e}=await supabase.from("student_development_goals").insert({
   assignment_id:assignmentId,title:title.trim(),support_activity:activity.trim(),target_date:target||null,
   baseline_percent:baseline===""?null:Number(baseline),
   current_percent:baseline===""?null:Number(baseline),
   target_percent:goalTarget===""?null:Number(goalTarget),
   responsible_staff_user_id:auth.user.id
  });
  if(e)setError(e.message);
  else{setTitle("");setActivity("");setTarget("");setBaseline("");setGoalTarget("");setNotice("Development goal added.");await refresh();}
  setBusy("");
 }
 async function save(g:Goal){
  if(!supabase||!canEdit)return;
  const draft=drafts[g.id];
  if(!draft)return;
  if(draft.current_percent!==""&&(!/^\d+$/.test(draft.current_percent)||Number(draft.current_percent)>100)){setError("Progress must be 0 to 100%.");return;}
  setBusy(g.id);setError("");setNotice("");
  const {data,error:e}=await supabase.from("student_development_goals").update({
   status:draft.status,progress_notes:draft.progress_notes.trim(),
   current_percent:draft.current_percent===""?null:Number(draft.current_percent),
   target_date:draft.target_date||null,updated_at:new Date().toISOString()
  }).eq("id",g.id).eq("assignment_id",assignmentId).select("id");
  if(e)setError(e.message);
  else if(!data?.length)setError("Your changes were not saved. Check your permissions.");
  else {setNotice("Goal progress saved.");await refresh();}
  setBusy("");
 }
 const achieved=goals.filter(g=>g.status==="achieved").length;
 return <section style={{...box,marginTop:18}} id="development-plan">
  <h2 style={{fontSize:19,margin:"0 0 6px",color:"#0f4c5c"}}>Individual Development Plan (IDP)</h2>
  <p style={{fontSize:13,color:"#64748b",margin:"0 0 14px"}}>Assessment-linked goals, measurable progress, staff responsibility, review targets and dated progress history. {canEdit?"Teachers can update progress after approval.":"The teacher manages this plan; parents can follow progress."}</p>
  {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
  {notice&&<p role="status" style={{color:"#176b58",fontSize:13}}>{notice}</p>}
  {loading?<p>Loading development plan...</p>:<>
   {canEdit&&<form onSubmit={addGoal} style={{...box,background:"#f3f9f6",marginBottom:0}}>
    <h3 style={{fontSize:15,margin:"0 0 12px"}}>Add a Development Goal</h3>
    <div style={{display:"grid",gap:11}}>
     <label style={{fontSize:12,fontWeight:700}}>Priority goal *
      <input required minLength={3} maxLength={300} style={{...field,marginTop:5}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Improve independent reading comprehension"/>
     </label>
     <label style={{fontSize:12,fontWeight:700}}>Activities / support strategies *
      <textarea required minLength={3} maxLength={4000} rows={3} style={{...field,display:"block",marginTop:5}} value={activity} onChange={e=>setActivity(e.target.value)} placeholder="Describe specific practice activities, supports, and frequency"/>
     </label>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
      <label style={{fontSize:12,fontWeight:700}}>Baseline achievement (%) — optional
       <input type="number" min={0} max={100} step={1} style={{...field,marginTop:5}} value={baseline} onChange={e=>setBaseline(e.target.value)}/>
      </label>
      <label style={{fontSize:12,fontWeight:700}}>Target achievement (%) — optional
       <input type="number" min={0} max={100} step={1} style={{...field,marginTop:5}} value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}/>
      </label>
     </div>
     <p style={{fontSize:12,color:"#64748b",margin:0}}>Use a repeatable measure, e.g. independently completed tasks out of ten. Baseline 20% and target 80%.</p>
     <label style={{fontSize:12,fontWeight:700}}>Target review date
      <input type="date" style={{...field,marginTop:5,maxWidth:240}} value={target} onChange={e=>setTarget(e.target.value)}/>
     </label>
    </div>
    <button type="submit" disabled={!!busy} style={{...button,marginTop:12,opacity:busy ? 0.65 : 1}}>{busy==="new"?"Adding...":"Add Goal"}</button>
   </form>}
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
    <p style={{fontSize:12,color:"#64748b",margin:"0 0 10px"}}><strong>Responsible staff account:</strong> {g.responsible_staff_user_id||g.created_by} · <strong>Target review:</strong> {g.target_date?new Date(g.target_date+"T00:00:00").toLocaleDateString("en-IN"):"Not scheduled"}</p>
    {(g.baseline_percent!==null||g.target_percent!==null||g.current_percent!==null)&&<div style={{fontSize:13,margin:"0 0 12px"}}>
      <p style={{margin:"0 0 6px"}}><strong>Baseline:</strong> {g.baseline_percent===null?"Not measured":g.baseline_percent+"%"} · <strong>Current:</strong> {g.current_percent===null?"Not measured":g.current_percent+"%"} · <strong>Target:</strong> {g.target_percent===null?"Not set":g.target_percent+"%"}</p>
      {g.current_percent!==null&&<div role="progressbar" aria-valuenow={g.current_percent} aria-valuemin={0} aria-valuemax={100} aria-label={"Current achievement for "+g.title} style={{height:8,background:"#e2e8f0",borderRadius:8,overflow:"hidden"}}><div style={{width:g.current_percent+"%",height:"100%",background:"#176b58"}}/></div>}
    </div>
    {canEdit?<div style={{display:"grid",gap:9}}>
     <label style={{fontSize:12,fontWeight:700}}>Progress status
      <select style={{...field,marginTop:5}} value={drafts[g.id]?.status||g.status} onChange={e=>setDrafts(d=>({...d,[g.id]:{...d[g.id],status:e.target.value as Status}}))}>
       {states.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
     </label>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:9}}>
      <label style={{fontSize:12,fontWeight:700}}>Current achievement (%)
       <input type="number" min={0} max={100} step={1} style={{...field,marginTop:5}} value={drafts[g.id]?.current_percent??""} onChange={e=>setDrafts(d=>({...d,[g.id]:{...d[g.id],current_percent:e.target.value}}))}/>
      </label>
      <label style={{fontSize:12,fontWeight:700}}>Next review date
       <input type="date" style={{...field,marginTop:5}} value={drafts[g.id]?.target_date??""} onChange={e=>setDrafts(d=>({...d,[g.id]:{...d[g.id],target_date:e.target.value}}))}/>
      </label>
     </div>
     <label style={{fontSize:12,fontWeight:700}}>Teacher progress notes
      <textarea rows={2} maxLength={4000} style={{...field,display:"block",marginTop:5}} value={drafts[g.id]?.progress_notes??g.progress_notes} onChange={e=>setDrafts(d=>({...d,[g.id]:{...d[g.id],progress_notes:e.target.value}}))}/>
     </label>
     <div><button type="button" disabled={!!busy} style={{...button,opacity:busy ? 0.65 : 1}} onClick={()=>save(g)}>{busy===g.id?"Saving...":"Save Progress"}</button></div>
    </div>:g.progress_notes&&<p style={{fontSize:13,whiteSpace:"pre-wrap",margin:"8px 0 0"}}><strong>Progress notes:</strong> {g.progress_notes}</p>}
    <button type="button" style={{...button,background:"#eaf4ef",color:"#176b58",marginTop:12}} onClick={()=>setExpandedHistory(x=>x===g.id?null:g.id)}>{expandedHistory===g.id?"Hide Progress History":"View Progress History ("+history.filter(h=>h.goal_id===g.id).length+")"}</button>
    {expandedHistory===g.id&&<div style={{borderTop:"1px solid #dce8e1",marginTop:12,paddingTop:10}}>
     {history.filter(h=>h.goal_id===g.id).length===0?<p style={{fontSize:12}}>No progress changes recorded since history tracking began.</p>:
      history.filter(h=>h.goal_id===g.id).map(h=><div key={h.id} style={{padding:"9px 0",borderBottom:"1px solid #dce8e1",fontSize:12}}>
       <strong>{new Date(h.recorded_at).toLocaleString("en-IN")}</strong> · Staff account: {h.changed_by||"System"}
       {h.old_status!==h.new_status&&<p>Status: {h.old_status||"—"} → {h.new_status||"—"}</p>}
       {h.old_current_percent!==h.new_current_percent&&<p>Achievement: {h.old_current_percent===null?"Not set":h.old_current_percent+"%"} → {h.new_current_percent===null?"Not set":h.new_current_percent+"%"}</p>}
       {h.old_target_date!==h.new_target_date&&<p>Review date: {h.old_target_date||"—"} → {h.new_target_date||"—"}</p>}
       {h.old_progress_notes!==h.new_progress_notes&&<p style={{whiteSpace:"pre-wrap"}}>Notes updated: {h.new_progress_notes||"—"}</p>}
      </div>)}
    </div>}
   </article>)}

  </>}
 </section>;
}
