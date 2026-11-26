"use client";

import {useMemo,useState} from "react";

type Student={id:string;full_name:string;student_code?:string|null};
type Assessment={id:string;student_id:string;status:string};
type Activity={student_id:string;status:string};
type ReviewedResult={assignment_id:string;overall_score:number|null};
type Props={
 students:Student[];
 assessments:Assessment[];
 activities:Activity[];
 reviewedResults?:ReviewedResult[];
 audience:"family"|"teacher";
 hideStudentOverview?:boolean;
 selectedStudentId?:string;
 onStudentChange?:(id:string)=>void;
 hideStudentSelector?:boolean;
};
const green="#176b58",navy="#0f4c5c",blue="#0284c7",orange="#b45309",grey="#64748b";
const shell:React.CSSProperties={border:"1px solid #dce8e1",background:"#fff",borderRadius:13,padding:16,minWidth:0};
const statuses=[{key:"assigned",title:"Assigned",color:"#94a3b8"},{key:"in_progress",title:"In progress",color:blue},{key:"submitted",title:"Awaiting review",color:"#d97706"},{key:"reviewed",title:"Reviewed",color:green}];
const activityDone=(status:string)=>status==="completed"||status==="reviewed";
const percent=(x:number,y:number)=>y>0?Math.round(100*x/y):null;
function Bar({value,max=100,color,label}:{value:number;max?:number;color:string;label:string}){
 const bounded=Math.max(0,Math.min(100,max>0?value/max*100:0));
 return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
   style={{width:"100%",height:13,background:"#e2e8f0",borderRadius:12,overflow:"hidden"}}>
  <div style={{width:bounded+"%",height:"100%",background:color,borderRadius:12}}/>
 </div>;
}
/** Presentation only: callers supply records already limited by Supabase RLS and their selected children/assigned students. */
export default function LearningInsightsCharts({students,assessments,activities,reviewedResults=[],audience,hideStudentOverview=false,selectedStudentId,onStudentChange,hideStudentSelector=false}:Props){
 const [internalSelected,setInternalSelected]=useState("all");
 const selected=selectedStudentId??internalSelected;
 const changeSelection=(id:string)=>{if(onStudentChange)onStudentChange(id);else setInternalSelected(id);};
 const ids=new Set(students.map(s=>s.id));
 const scoped=students.some(s=>s.id===selected)?selected:"all";
 const visibleIds=new Set(scoped==="all"?students.map(s=>s.id):[scoped]);
 const aa=assessments.filter(a=>ids.has(a.student_id)&&visibleIds.has(a.student_id));
 const act=activities.filter(a=>ids.has(a.student_id)&&visibleIds.has(a.student_id));
 const scored=useMemo(()=>{
  const reviewed=new Set(assessments.filter(a=>a.status==="reviewed"&&ids.has(a.student_id)).map(a=>a.id));
  return reviewedResults.filter(r=>reviewed.has(r.assignment_id)&&typeof r.overall_score==="number"
   &&Number.isFinite(r.overall_score)&&r.overall_score>=0&&r.overall_score<=3);
 },[assessments,reviewedResults,students]);
 const resultsById=new Map(scored.map(r=>[r.assignment_id,r]));
 const byStudent=students.filter(s=>visibleIds.has(s.id)).map(s=>{
  const assignments=activities.filter(a=>a.student_id===s.id);
  const complete=assignments.filter(a=>activityDone(a.status)).length;
  const reviewed=assessments.filter(a=>a.student_id===s.id&&a.status==="reviewed");
  return {...s,assigned:assignments.length,completed:complete,assessments:assessments.filter(a=>a.student_id===s.id).length,
   reviewed:reviewed.length,approvedScores:reviewed.map(a=>resultsById.get(a.id)).filter((r):r is ReviewedResult=>Boolean(r))};
 });
 const sum=aa.length;
 const done=act.filter(a=>activityDone(a.status)).length;
 const totalStatus=statuses.reduce((n,s)=>n+aa.filter(a=>a.status===s.key).length,0);
 return <section aria-label={audience==="teacher"?"Assigned student learning insights":"My learning progress visualisations"}
   style={{display:"grid",gap:14,margin:"18px 0"}}>
  <div style={{...shell,background:"#f0f7f3"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <div>
     <h2 style={{fontSize:19,margin:"0 0 5px"}}>{audience==="teacher"?"Assigned Students — Learning Insights":"My Learning Journey — Visual Progress"}</h2>
     <p style={{fontSize:12,color:grey,margin:0}}>Based on saved activities and assessment workflow. Scores are shown only after Teacher approval.</p>
    </div>
    {!hideStudentSelector&&students.length>1&&<label style={{fontSize:12,fontWeight:700}}>Student
     <select aria-label="Choose student for learning insights" value={scoped} onChange={e=>changeSelection(e.target.value)}
      style={{display:"block",padding:9,marginTop:5,border:"1px solid #bcd3c6",borderRadius:7,background:"#fff",maxWidth:260}}>
      <option value="all">All permitted students</option>
      {students.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.student_code||"ID pending"})</option>)}
     </select>
    </label>}
   </div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:14}}>
   <section style={shell}>
    <h3 style={{fontSize:16,margin:"0 0 6px"}}>Assessment Journey</h3>
    <p style={{fontSize:12,color:grey,margin:"0 0 12px"}}>{sum} standard assessment{sum===1?"":"s"} · submission and review stages</p>
    {sum===0?<p style={{color:grey,fontSize:13}}>No assessments have been assigned yet.</p>:<>
     <div role="img" aria-label={"Assessment stage distribution: "+statuses.map(s=>s.title+" "+aa.filter(a=>a.status===s.key).length).join(", ")}
      style={{height:22,borderRadius:10,overflow:"hidden",display:"flex",background:"#e2e8f0",marginBottom:13}}>
      {statuses.map(s=><div key={s.key} style={{background:s.color,width:(aa.filter(a=>a.status===s.key).length/sum*100)+"%",height:"100%"}} title={s.title}/>)}
     </div>
     {statuses.map(s=><div key={s.key} style={{display:"flex",gap:9,alignItems:"center",fontSize:12,margin:"8px 0"}}>
      <span style={{width:11,height:11,background:s.color,borderRadius:3,flexShrink:0}}/>
      <span style={{flex:1}}>{s.title}</span><strong>{aa.filter(a=>a.status===s.key).length}</strong>
     </div>)}
     {totalStatus!==sum&&<p style={{fontSize:12,color:grey}}>Other assessment statuses: {sum-totalStatus}</p>}
    </>}
   </section>
   <section style={shell}>
    <h3 style={{fontSize:16,margin:"0 0 6px"}}>Learning Activity Completion</h3>
    <p style={{fontSize:12,color:grey,margin:"0 0 12px"}}>Assigned vs completed learning activities</p>
    {!act.length?<p style={{color:grey,fontSize:13}}>No learning activities have been assigned yet.</p>:<>
     <strong style={{display:"block",fontSize:29,color:green,marginBottom:7}}>{percent(done,act.length)}%</strong>
     <Bar value={done} max={act.length} color={green} label={"Completed "+done+" of "+act.length+" learning activities"}/>
     <p style={{fontSize:12,color:grey}}>Completed {done} of {act.length} · Remaining {act.length-done}</p>
    </>}
   </section>
  </div>
  {!(audience==="teacher"&&hideStudentOverview)&&<section style={shell}>
   <h3 style={{fontSize:16,margin:"0 0 8px"}}>{audience==="teacher"?"Per-Student Progress Overview":"Progress by Child"}</h3>
   <p style={{fontSize:12,color:grey,margin:"0 0 14px"}}>Each row represents one student. Empty activity records are shown as not assigned, not as 0% mastery.</p>
   {byStudent.length===0?<p style={{fontSize:13,color:grey}}>No permitted student records available.</p>:
    <div style={{display:"grid",gap:14}}>
     {byStudent.map(s=><div key={s.id} style={{borderBottom:"1px solid #eef2ef",paddingBottom:11}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:6}}>
       <strong style={{fontSize:13}}>{s.full_name} ({s.student_code||"ID pending"})</strong>
       <span style={{fontSize:12,color:navy}}>{s.assigned?percent(s.completed,s.assigned)+"% activities completed":"No activities assigned"}</span>
      </div>
      <Bar value={s.completed} max={s.assigned||1} color={blue} label={"Activity completion for "+s.full_name}/>
      <small style={{color:grey}}>{s.completed}/{s.assigned} activities · {s.reviewed}/{s.assessments} assessments reviewed</small>
     </div>)}
    </div>}
  </section>}
  {audience==="family"&&<section style={shell}>
   <h3 style={{fontSize:16,margin:"0 0 8px"}}>Approved Assessment Readiness</h3>
   <p style={{fontSize:12,color:grey,margin:"0 0 13px"}}>Only reviewed, published standard assessments are shown. Percentages are assessment indicators, not a diagnosis.</p>
   {byStudent.every(s=>s.approvedScores.length===0)?<p style={{fontSize:13,color:grey}}>No Teacher-approved assessment scores available yet.</p>:
   <div style={{display:"grid",gap:13}}>
    {byStudent.flatMap(s=>s.approvedScores.map((r,i)=>{
     const value=Math.round((r.overall_score??0)/3*100);
     return <div key={s.id+"-"+i} style={{display:"grid",gap:5}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,gap:10}}>
       <span>{s.full_name} · Approved assessment {i+1}</span><strong>{value}%</strong>
      </div>
      <Bar value={value} color={orange} label={s.full_name+" approved assessment "+(i+1)+" readiness "+value+"%"}/>
     </div>;
    }))}
   </div>}
  </section>}
  <p style={{fontSize:11,color:grey,margin:0}}>Educational progress indicators only. Absence of records is not evidence of low ability. Do not compare scores across different assessment versions as equivalent measures.</p>
 </section>;
}
