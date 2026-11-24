"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {supabase} from "../../lib/supabase";

type Student={id:string;student_code:string|null;full_name:string};
type Assessment={id:string;student_id:string;assessment_level:string;assigned_at:string;status:string};
type Activity={id:string;student_id:string;status:string};
type CustomAssessment={id:string;student_id:string;status:string};
type Result={assignment_id:string;overall_score:number|null;reviewed_at:string|null};
type Goal={id:string;assignment_id:string;title:string;status:string;target_date:string|null;baseline_percent:number|null;current_percent:number|null;target_percent:number|null;progress_notes:string};
type Props={
 students:Student[];
 assessments:Assessment[];
 customAssessments:CustomAssessment[];
 activities:Activity[];
 results:Result[];
};
const card:React.CSSProperties={padding:16,border:"1px solid #dce8e1",background:"#fff",borderRadius:13};
const small:React.CSSProperties={color:"#64748b",fontSize:12};
const date=(v:string|null)=>v?new Date(v+"T00:00:00").toLocaleDateString("en-IN"):"Not scheduled";
const labels:Record<string,string>={planned:"Planned",in_progress:"In progress",achieved:"Achieved",needs_revision:"Needs revision"};
function PercentBar({value,label}:{value:number;label:string}){
 const safe=Math.max(0,Math.min(100,value));
 return <div role="progressbar" aria-label={label} aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100} style={{height:8,background:"#e2e8f0",borderRadius:12,overflow:"hidden"}}>
  <div style={{height:"100%",width:safe+"%",background:"#176b58"}}/>
 </div>;
}
export default function ParentProgressSummary({students,assessments,customAssessments,activities,results}:Props){
 const [goals,setGoals]=useState<Goal[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const approvedIds=useMemo(()=>assessments.filter(a=>a.status==="reviewed").map(a=>a.id),[assessments]);
 const load=useCallback(async()=>{
  if(!supabase){setError("Development plan information is not available.");return;}
  if(!approvedIds.length){setGoals([]);setLoading(false);return;}
  setLoading(true);setError("");
  const {data,error:readError}=await supabase.from("student_development_goals")
   .select("id,assignment_id,title,status,target_date,baseline_percent,current_percent,target_percent,progress_notes")
   .in("assignment_id",approvedIds).order("created_at",{ascending:true});
  if(readError)setError("Development plan details could not be loaded: "+readError.message);
  else setGoals((data||[]) as Goal[]);
  setLoading(false);
 },[approvedIds]);
 useEffect(()=>{void load();},[load]);

 return <section aria-label="Child Development Progress Summary" style={{display:"grid",gap:14}}>
  <div>
   <h2 style={{fontSize:21,color:"#0f4c5c",margin:"0 0 6px"}}>Child Development Progress Summary</h2>
   <p style={{...small,margin:0}}>A read-only overview of approved assessments, assigned learning activities and teacher-managed development goals for each child.</p>
  </div>
  {error&&<div role="alert" style={{...card,color:"#b42318"}}>{error}</div>}
  {students.length===0&&<div style={card}>No registered child information was found.</div>}
  {students.map(student=>{
   const standard=assessments.filter(a=>a.student_id===student.id);
   const reviewed=standard.filter(a=>a.status==="reviewed");
   const custom=customAssessments.filter(a=>a.student_id===student.id);
   const childActivities=activities.filter(a=>a.student_id===student.id);
   const doneActivities=childActivities.filter(a=>a.status==="completed").length;
   const goalIds=new Set(reviewed.map(a=>a.id));
   const childGoals=goals.filter(g=>goalIds.has(g.assignment_id));
   const achieved=childGoals.filter(g=>g.status==="achieved").length;
   const pendingGoals=childGoals.filter(g=>g.status==="needs_revision").length;
   const latestResults=reviewed
    .map(a=>({assignment:a,result:results.find(r=>r.assignment_id===a.id)}))
    .filter((x):x is {assignment:Assessment;result:Result}=>Boolean(x.result))
    .sort((a,b)=>Date.parse(b.result.reviewed_at||b.assignment.assigned_at)-Date.parse(a.result.reviewed_at||a.assignment.assigned_at));
   const latest=latestResults[0];
   return <article key={student.id} style={{...card,display:"grid",gap:14}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
     <h3 style={{fontSize:18,margin:0}}>{student.full_name} <span style={{fontSize:13,color:"#64748b",fontWeight:500}}>({student.student_code||"Student ID pending"})</span></h3>
     <span style={{fontSize:12,color:"#64748b"}}>Student-specific summary</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
     {[
      {title:"Approved standard assessments",value:reviewed.length+"/"+standard.length},
      {title:"Approved custom assessments",value:custom.filter(a=>a.status==="reviewed").length+"/"+custom.length},
      {title:"Learning activities completed",value:doneActivities+"/"+childActivities.length},
      {title:"IDP goals achieved",value:loading?"Loading":achieved+"/"+childGoals.length}
     ].map(item=><div key={item.title} style={{padding:12,background:"#f1f7f3",borderRadius:10}}>
      <div style={small}>{item.title}</div><strong style={{display:"block",fontSize:23,marginTop:6,color:"#176b58"}}>{item.value}</strong>
     </div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(235px,1fr))",gap:12}}>
     <section style={{padding:12,background:"#f8fafc",borderRadius:10}}>
      <h4 style={{fontSize:15,margin:"0 0 10px"}}>Learning Activity Completion</h4>
      {childActivities.length?<><p style={{fontSize:13,margin:"0 0 8px"}}>{Math.round(100*doneActivities/childActivities.length)}% completed</p>
       <PercentBar value={100*doneActivities/childActivities.length} label={"Activity completion for "+student.full_name}/></>:
       <p style={small}>No learning activities assigned yet.</p>}
     </section>
     <section style={{padding:12,background:"#f8fafc",borderRadius:10}}>
      <h4 style={{fontSize:15,margin:"0 0 10px"}}>Most Recent Approved Assessment</h4>
      {latest?<><p style={{fontSize:13,margin:"0 0 6px"}}><strong>{latest.assignment.assessment_level}</strong> · Reviewed {latest.result.reviewed_at?new Date(latest.result.reviewed_at).toLocaleDateString("en-IN"):"date not recorded"}</p>
       <p style={{fontSize:13,margin:0}}>Teacher-approved rating: {latest.result.overall_score===null?"Not scored":Number(latest.result.overall_score).toFixed(2)+" / 3"}</p></>:
       <p style={small}>No approved standard assessment result available yet.</p>}
     </section>
    </div>
    <section>
     <h4 style={{fontSize:16,margin:"0 0 9px"}}>Individual Development Plan (IDP)</h4>
     {loading?<p style={small}>Loading approved development goals...</p>:!childGoals.length?<p style={small}>No goals recorded for approved standard assessments yet.</p>:
      <div style={{display:"grid",gap:9}}>
       {pendingGoals>0&&<p style={{fontSize:12,color:"#b45309",margin:0}}>{pendingGoals} goal(s) flagged for revision by staff.</p>}
       {childGoals.map(goal=><div key={goal.id} style={{background:"#f8faf7",border:"1px solid #dce8e1",borderRadius:10,padding:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:9,flexWrap:"wrap"}}>
         <strong style={{fontSize:13}}>{goal.title}</strong>
         <span style={{fontSize:12,color:"#176b58"}}>{labels[goal.status]||goal.status}</span>
        </div>
        <p style={{fontSize:12,color:"#64748b",margin:"7px 0"}}>Review date: {date(goal.target_date)}</p>
        <p style={{fontSize:12,margin:"7px 0"}}>Baseline: {goal.baseline_percent===null?"Not measured":goal.baseline_percent+"%"} · Current: {goal.current_percent===null?"Not measured":goal.current_percent+"%"} · Target: {goal.target_percent===null?"Not set":goal.target_percent+"%"}</p>
        {goal.current_percent!==null&&<PercentBar value={goal.current_percent} label={"Current IDP achievement: "+goal.title}/>}
        {goal.progress_notes&&<p style={{fontSize:12,whiteSpace:"pre-wrap",margin:"9px 0 0"}}><strong>Teacher notes:</strong> {goal.progress_notes}</p>}
       </div>)}
      </div>}
    </section>
   </article>;
  })}
  <p style={{fontSize:12,color:"#64748b",margin:0}}>This summary uses existing portal records. Percentages show activity completion or a teacher-entered goal measurement, not a diagnosis or overall child-development score. Detailed assessment reports remain available under Assessments.</p>
 </section>;
}
