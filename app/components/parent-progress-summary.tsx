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
const ml:Record<string,string>={
 "Child Development Progress Summary":"കുട്ടിയുടെ വികസന പുരോഗതി സംഗ്രഹം",
 "A read-only overview of approved assessments, assigned learning activities and teacher-managed development goals for each child.":"ഓരോ കുട്ടിയുടെയും അംഗീകരിച്ച മൂല്യനിർണയങ്ങൾ, നൽകിയ പഠനപ്രവർത്തനങ്ങൾ, അധ്യാപകർ നിയന്ത്രിക്കുന്ന വികസന ലക്ഷ്യങ്ങൾ എന്നിവയുടെ സംഗ്രഹം.",
 "No registered child information was found.":"രജിസ്റ്റർ ചെയ്ത കുട്ടികളുടെ വിവരങ്ങൾ കണ്ടെത്തിയില്ല.",
 "Student-specific summary":"വിദ്യാർത്ഥിയുടെ പുരോഗതി സംഗ്രഹം",
 "Student ID pending":"വിദ്യാർത്ഥി ഐഡി ലഭ്യമല്ല",
 "Approved standard assessments":"അംഗീകരിച്ച സാധാരണ മൂല്യനിർണയങ്ങൾ",
 "Approved custom assessments":"അംഗീകരിച്ച പ്രത്യേക മൂല്യനിർണയങ്ങൾ",
 "Learning activities completed":"പൂർത്തിയാക്കിയ പഠനപ്രവർത്തനങ്ങൾ",
 "IDP goals achieved":"നേടിയ വികസന ലക്ഷ്യങ്ങൾ",
 "Learning Activity Completion":"പഠനപ്രവർത്തനങ്ങളുടെ പൂർത്തീകരണം",
 "completed":"പൂർത്തിയായി",
 "No learning activities assigned yet.":"പഠനപ്രവർത്തനങ്ങൾ ഇതുവരെ നൽകിയിട്ടില്ല.",
 "Most Recent Approved Assessment":"ഏറ്റവും പുതിയ അംഗീകരിച്ച മൂല്യനിർണയം",
 "Reviewed":"അംഗീകരിച്ച തീയതി",
 "date not recorded":"തീയതി രേഖപ്പെടുത്തിയിട്ടില്ല",
 "Teacher-approved rating":"അധ്യാപകൻ അംഗീകരിച്ച റേറ്റിംഗ്",
 "Not scored":"സ്കോർ നൽകിയിട്ടില്ല",
 "No approved standard assessment result available yet.":"അംഗീകരിച്ച മൂല്യനിർണയ ഫലം ഇതുവരെ ലഭ്യമല്ല.",
 "Individual Development Plan (IDP)":"വ്യക്തിഗത വികസന പദ്ധതി (IDP)",
 "Loading approved development goals...":"വികസന ലക്ഷ്യങ്ങൾ ലോഡ് ചെയ്യുന്നു...",
 "No goals recorded for approved standard assessments yet.":"വികസന ലക്ഷ്യങ്ങൾ ഇതുവരെ രേഖപ്പെടുത്തിയിട്ടില്ല.",
 "goal(s) flagged for revision by staff.":"ലക്ഷ്യങ്ങൾ പുനഃപരിശോധിക്കേണ്ടതായി അടയാളപ്പെടുത്തിയിട്ടുണ്ട്.",
 "Review date":"പുനഃപരിശോധന തീയതി",
 "Baseline":"തുടക്കനില","Current":"നിലവിലെ പുരോഗതി","Target":"ലക്ഷ്യം",
 "Not measured":"അളന്നിട്ടില്ല","Not set":"നിശ്ചയിച്ചിട്ടില്ല","Not scheduled":"നിശ്ചയിച്ചിട്ടില്ല",
 "Teacher notes":"അധ്യാപകന്റെ കുറിപ്പുകൾ",
 "Planned":"ആസൂത്രണം ചെയ്തു","In progress":"പുരോഗമിക്കുന്നു","Achieved":"ലക്ഷ്യം നേടി","Needs revision":"പുനഃപരിശോധന ആവശ്യമാണ്",
 "This summary uses existing portal records. Percentages show activity completion or a teacher-entered goal measurement, not a diagnosis or overall child-development score. Detailed assessment reports remain available under Assessments.":"ഈ സംഗ്രഹം നിലവിലുള്ള രേഖകളെ അടിസ്ഥാനമാക്കിയുള്ളതാണ്. ശതമാനങ്ങൾ പഠനപ്രവർത്തനങ്ങളുടെ പൂർത്തീകരണമോ അധ്യാപകൻ രേഖപ്പെടുത്തിയ പുരോഗതിയോ സൂചിപ്പിക്കുന്നു; രോഗനിർണയമോ കുട്ടിയുടെ മൊത്തത്തിലുള്ള വികസന സ്കോറോ അല്ല. വിശദമായ റിപ്പോർട്ടുകൾ മൂല്യനിർണയ വിഭാഗത്തിൽ ലഭ്യമാണ്."
};
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
 const [language,setLanguage]=useState<"en"|"ml">("en");
 const t=(text:string)=>language==="ml"?ml[text]||text:text;
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

 return <>
 <style>{`
 @media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #parent-progress-print, #parent-progress-print * { visibility: visible !important; }
  #parent-progress-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; color: #111 !important; }
  #parent-progress-print .progress-print-controls { display: none !important; }
  #parent-progress-print .progress-student-report { break-before: page; page-break-before: always; box-shadow: none !important; border: 1px solid #bbb !important; }
  #parent-progress-print .progress-student-report:first-of-type { break-before: auto; page-break-before: auto; }
  #parent-progress-print .progress-goal { break-inside: avoid; }
 }
 `}</style>
 <section id="parent-progress-print" aria-label="Child Development Progress Summary" lang={language} style={{display:"grid",gap:14}}>
 <div className="progress-print-controls" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",justifyContent:"space-between"}}>
  <label style={{fontSize:13,fontWeight:700}}>Report language / റിപ്പോർട്ട് ഭാഷ
   <select value={language} onChange={e=>setLanguage(e.target.value as "en"|"ml")} style={{marginLeft:8,border:"1px solid #cbd5e1",padding:9,borderRadius:8}}>
    <option value="en">English</option><option value="ml">മലയാളം</option>
   </select>
  </label>
  <button type="button" disabled={loading||!!error||!students.length} onClick={()=>window.print()} style={{padding:"10px 14px",borderRadius:9,border:0,background:"#176b58",color:"#fff",fontWeight:700,opacity:loading||!!error||!students.length?0.5:1}}>
   {language==="ml"?"പ്രിന്റ് ചെയ്യുക / PDF ആയി സേവ് ചെയ്യുക":"Print / Save PDF"}
  </button>
 </div>
 <div style={{borderBottom:"1px solid #dce8e1",paddingBottom:8}}>
  <strong>Swastha Learning Clinic</strong>
  <p style={{fontSize:12,color:"#64748b",margin:"4px 0 0"}}>{language==="ml"?"റിപ്പോർട്ട് തീയതി":"Report date"}: {new Date().toLocaleDateString("en-IN")}</p>
 </div>
  <div>
   <h2 style={{fontSize:21,color:"#0f4c5c",margin:"0 0 6px"}}>{t("Child Development Progress Summary")}</h2>
   <p style={{...small,margin:0}}>{t("A read-only overview of approved assessments, assigned learning activities and teacher-managed development goals for each child.")}</p>
  </div>
  {error&&<div role="alert" style={{...card,color:"#b42318"}}>{error}</div>}
  {students.length===0&&<div style={card}>{t("No registered child information was found.")}</div>}
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
   return <article className="progress-student-report" key={student.id} style={{...card,display:"grid",gap:14}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
     <h3 style={{fontSize:18,margin:0}}>{student.full_name} <span style={{fontSize:13,color:"#64748b",fontWeight:500}}>({student.student_code||t("Student ID pending")})</span></h3>
     <span style={{fontSize:12,color:"#64748b"}}>{t("Student-specific summary")}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
     {[
      {title:t("Approved standard assessments"),value:reviewed.length+"/"+standard.length},
      {title:t("Approved custom assessments"),value:custom.filter(a=>a.status==="reviewed").length+"/"+custom.length},
      {title:t("Learning activities completed"),value:doneActivities+"/"+childActivities.length},
      {title:t("IDP goals achieved"),value:loading?"Loading":achieved+"/"+childGoals.length}
     ].map(item=><div key={item.title} style={{padding:12,background:"#f1f7f3",borderRadius:10}}>
      <div style={small}>{item.title}</div><strong style={{display:"block",fontSize:23,marginTop:6,color:"#176b58"}}>{item.value}</strong>
     </div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(235px,1fr))",gap:12}}>
     <section style={{padding:12,background:"#f8fafc",borderRadius:10}}>
      <h4 style={{fontSize:15,margin:"0 0 10px"}}>{t("Learning Activity Completion")}</h4>
      {childActivities.length?<><p style={{fontSize:13,margin:"0 0 8px"}}>{Math.round(100*doneActivities/childActivities.length)}% {t("completed")}</p>
       <PercentBar value={100*doneActivities/childActivities.length} label={"Activity completion for "+student.full_name}/></>:
       <p style={small}>{t("No learning activities assigned yet.")}</p>}
     </section>
     <section style={{padding:12,background:"#f8fafc",borderRadius:10}}>
      <h4 style={{fontSize:15,margin:"0 0 10px"}}>{t("Most Recent Approved Assessment")}</h4>
      {latest?<><p style={{fontSize:13,margin:"0 0 6px"}}><strong>{latest.assignment.assessment_level}</strong> · {t("Reviewed")}: {latest.result.reviewed_at?new Date(latest.result.reviewed_at).toLocaleDateString("en-IN"):t("date not recorded")}</p>
       <p style={{fontSize:13,margin:0}}>{t("Teacher-approved rating")}: {latest.result.overall_score===null?t("Not scored"):Number(latest.result.overall_score).toFixed(2)+" / 3"}</p></>:
       <p style={small}>{t("No approved standard assessment result available yet.")}</p>}
     </section>
    </div>
    <section>
     <h4 style={{fontSize:16,margin:"0 0 9px"}}>{t("Individual Development Plan (IDP)")}</h4>
     {loading?<p style={small}>{t("Loading approved development goals...")}</p>:!childGoals.length?<p style={small}>{t("No goals recorded for approved standard assessments yet.")}</p>:
      <div style={{display:"grid",gap:9}}>
       {pendingGoals>0&&<p style={{fontSize:12,color:"#b45309",margin:0}}>{pendingGoals} {t("goal(s) flagged for revision by staff.")}</p>}
       {childGoals.map(goal=><div className="progress-goal" key={goal.id} style={{background:"#f8faf7",border:"1px solid #dce8e1",borderRadius:10,padding:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:9,flexWrap:"wrap"}}>
         <strong style={{fontSize:13}}>{goal.title}</strong>
         <span style={{fontSize:12,color:"#176b58"}}>{t(labels[goal.status]||goal.status)}</span>
        </div>
        <p style={{fontSize:12,color:"#64748b",margin:"7px 0"}}>{t("Review date")}: {goal.target_date?date(goal.target_date):t("Not scheduled")}</p>
        <p style={{fontSize:12,margin:"7px 0"}}>{t("Baseline")}: {goal.baseline_percent===null?t("Not measured"):goal.baseline_percent+"%"} · {t("Current")}: {goal.current_percent===null?t("Not measured"):goal.current_percent+"%"} · {t("Target")}: {goal.target_percent===null?t("Not set"):goal.target_percent+"%"}</p>
        {goal.current_percent!==null&&<PercentBar value={goal.current_percent} label={"Current IDP achievement: "+goal.title}/>}
        {goal.progress_notes&&<p style={{fontSize:12,whiteSpace:"pre-wrap",margin:"9px 0 0"}}><strong>{t("Teacher notes")}:</strong> {goal.progress_notes}</p>}
       </div>)}
      </div>}
    </section>
   </article>;
  })}
  <p style={{fontSize:12,color:"#64748b",margin:0}}>{t("This summary uses existing portal records. Percentages show activity completion or a teacher-entered goal measurement, not a diagnosis or overall child-development score. Detailed assessment reports remain available under Assessments.")}</p>
 </section>
 </>;
}
