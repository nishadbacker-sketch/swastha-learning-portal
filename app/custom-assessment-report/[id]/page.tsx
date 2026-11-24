"use client";
import BrandLogo from "../../components/brand-logo";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import ShareReportWhatsApp from "../../components/share-report-whatsapp";

type Choice={id:string;text:string;text_ml?:string};
type Question={id:string;text:string;text_ml?:string;response_type?:"rating"|"multiple_choice"|"written";options?:Choice[]};
type Category={id:string;title:string;questions:Question[]};
type Section={id:string;title:string;categories:Category[]};
type Template={id:string;title:string;description:string;level:string;structure:Section[]};
type Answer={score?:string|null;choice?:string|null;written_answer?:string|null;observation?:string|null};
type Assessment={id:string;student_id:string;template_id:string;status:string;answers:Record<string,Answer>;assigned_at:string;reviewed_at:string|null;teacher_feedback:string|null};
type Student={full_name:string;student_code:string;current_class:string|null};
type Entry={number:string;section:string;category:string;question:Question;answer:Answer};
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16,marginBottom:14,breakInside:"avoid"};
const button:React.CSSProperties={background:"#176b58",color:"white",padding:"10px 15px",border:0,borderRadius:8,cursor:"pointer",fontWeight:700};
const date=(s:string|null)=>s?new Date(s).toLocaleDateString("en-IN"):"—";
export default function CustomAssessmentReport(){
 const router=useRouter();const params=useParams<{id:string}>();
 const [role,setRole]=useState("");
 const [assessment,setAssessment]=useState<Assessment|null>(null);
 const [template,setTemplate]=useState<Template|null>(null);
 const [student,setStudent]=useState<Student|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [language,setLanguage]=useState<"en"|"ml">("en");
 const [showAnswers,setShowAnswers]=useState(true);
 useEffect(()=>{try{if(localStorage.getItem("swastha-assessment-language")==="ml")setLanguage("ml");}catch{/* optional */}},[]);
 useEffect(()=>{async function load(){
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:ur,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(roleError||!ur||!["teacher","admin","parent"].includes(ur.role))throw new Error("You are not authorised to view this report.");
   setRole(ur.role);
   const {data:a,error:ae}=await supabase.from("custom_assessment_assignments")
    .select("id,student_id,template_id,status,answers,assigned_at,reviewed_at,teacher_feedback").eq("id",params.id).single();
   if(ae||!a)throw new Error("Report unavailable or access denied.");
   if(ur.role==="parent"&&a.status!=="reviewed")throw new Error("Results will be available once a teacher approves the assessment.");
   if(!["submitted","reviewed"].includes(a.status))throw new Error("The assessment has not yet been submitted.");
   const [t,s]=await Promise.all([
    supabase.from("custom_assessment_templates").select("id,title,description,level,structure").eq("id",a.template_id).single(),
    supabase.from("students").select("full_name,student_code,current_class").eq("id",a.student_id).single()
   ]);
   if(t.error||!t.data||s.error||!s.data)throw new Error("Could not read report details.");
   setAssessment(a as Assessment);setTemplate(t.data as Template);setStudent(s.data as Student);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load report.");}
  finally{setLoading(false);}
 }load();},[params.id,router]);
 const ml=language==="ml";
 const tr=(en:string,translation:string)=>ml?translation:en;
 const rows=useMemo<Entry[]>(()=>template?.structure.flatMap(s=>s.categories.flatMap((c,ci)=>c.questions.map((q,qi)=>({
  number:String.fromCharCode(65+ci)+"."+(qi+1),section:s.title,category:c.title,question:q,answer:assessment?.answers?.[q.id]||{}
 }))))||[],[template,assessment]);
 const cats=useMemo(()=>{
  const groups=new Map<string,{section:string;category:string;rated:number;sum:number;na:number;choices:number;written:number}>();
  for(const r of rows){
   const key=r.section+" / "+r.category;
   let entry=groups.get(key);
   if(!entry){entry={section:r.section,category:r.category,rated:0,sum:0,na:0,choices:0,written:0};groups.set(key,entry);}
   if(r.question.response_type==="multiple_choice"){if(r.answer.choice)entry.choices++;}
   else if(r.question.response_type==="written"){if(r.answer.written_answer?.trim())entry.written++;}
   else if(r.answer.score==="NA")entry.na++;
   else if(["0","1","2","3"].includes(r.answer.score||"")){entry.rated++;entry.sum+=Number(r.answer.score);}
  }
  return Array.from(groups.values());
 },[rows]);
 const rated=cats.reduce((n,x)=>n+x.rated,0);
 const avg=rated?cats.reduce((n,x)=>n+x.sum,0)/rated:null;
 const na=cats.reduce((n,x)=>n+x.na,0);
 const choices=cats.reduce((n,x)=>n+x.choices,0);
 const written=cats.reduce((n,x)=>n+x.written,0);
 const answerText=(r:Entry)=>{
  if(r.question.response_type==="multiple_choice"){
   const chosen=r.question.options?.find(x=>x.id===r.answer.choice);
   return chosen?(ml&&chosen.text_ml?chosen.text_ml:chosen.text):tr("Not answered","ഉത്തരമില്ല");
  }
  if(r.question.response_type==="written")return r.answer.written_answer||tr("Not answered","ഉത്തരമില്ല");
  return r.answer.score==="NA"?"NA":r.answer.score==null?tr("Not answered","ഉത്തരമില്ല"):tr("Rating","റേറ്റിംഗ്")+" "+r.answer.score+" / 3";
 };
 const back=()=>router.push(role==="parent"?"/parent/dashboard":"/teacher/custom-assessments");
 if(loading)return <main style={{padding:30}}>Loading report...</main>;
 if(!assessment||!template||!student)return <main style={{padding:30}}><h2>Report unavailable</h2><p>{error}</p><button style={button} onClick={back}>Back</button></main>;
 return <main style={{background:"#f8faf7",minHeight:"100vh",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <style>{"@media print{@page{size:A4;margin:14mm}.report-actions{display:none!important}.report-wrap{max-width:none!important;padding:0!important}.report-panel{break-inside:avoid;page-break-inside:avoid}.report-question{break-inside:avoid;page-break-inside:avoid}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}"}</style>
  <header className="report-actions" style={{position:"sticky",top:0,zIndex:20,background:"#0f4c5c",color:"white",padding:"13px 4%",display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
   <span style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><BrandLogo /> <strong>Assessment Report</strong></span>
   <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:9}}>
    <label htmlFor="report-lang">Language</label>
    <select id="report-lang" value={language} onChange={e=>setLanguage(e.target.value as "en"|"ml")} style={{padding:9,borderRadius:7}}><option value="en">English</option><option value="ml">മലയാളം</option></select>
    <button style={{...button,background:"white",color:"#0f4c5c"}} onClick={()=>window.print()}>{tr("Print / Save PDF","പ്രിന്റ് / PDF ആയി സേവ്")}</button>
    {assessment.status==="reviewed"&&<ShareReportWhatsApp reportPath={"/custom-assessment-report/"+assessment.id} label={tr("Share via WhatsApp","വാട്സ്ആപ്പിൽ പങ്കിടുക")}/> }
    <button style={{...button,background:"#e3f2ee",color:"#183a35"}} onClick={back}>{tr("Back","തിരികെ")}</button>
   </div>
  </header>
  <div className="report-wrap" style={{maxWidth:1020,margin:"auto",padding:"25px 16px 70px"}}>
   <section className="report-panel" style={panel}>
    <BrandLogo />
    <h1>{tr("Child Assessment Report","കുട്ടിയുടെ വിലയിരുത്തൽ റിപ്പോർട്ട്")}</h1>
    <h2 style={{fontSize:19}}>{template.title}</h2>
    {template.description&&<p style={{whiteSpace:"pre-wrap"}}>{template.description}</p>}
    <p><strong>{tr("Student","വിദ്യാർത്ഥി")}:</strong> {student.full_name} · {student.student_code} · <strong>{tr("Class","ക്ലാസ്")}:</strong> {student.current_class||"—"} · <strong>{tr("Level","തലം")}:</strong> {template.level}</p>
    <p><strong>{tr("Assigned","നൽകിയത്")}:</strong> {date(assessment.assigned_at)} · <strong>{tr("Status","നില")}:</strong> {assessment.status==="reviewed"?tr("Approved","അംഗീകരിച്ചു"):tr("Awaiting review","പരിശോധന ബാക്കി")}</p>
    {assessment.reviewed_at&&<p><strong>{tr("Reviewed","പരിശോധിച്ചത്")}:</strong> {date(assessment.reviewed_at)}</p>}
   </section>
   <section className="report-panel" style={panel}>
    <h2>{tr("Assessment Overview","വിലയിരുത്തൽ സംഗ്രഹം")}</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
     {[[tr("Questions","ചോദ്യങ്ങൾ"),String(rows.length)],[tr("Ratings","റേറ്റിംഗ്"),String(rated)],[tr("Choices","ഓപ്ഷനുകൾ"),String(choices)],[tr("Written","എഴുത്ത്"),String(written)],["NA",String(na)],[tr("Rating Average","റേറ്റിംഗ് ശരാശരി"),avg===null?"N/A":avg.toFixed(2)+" / 3"]].map(([k,v])=><div key={k} style={{background:"#eff8f3",padding:14,borderRadius:9}}><small>{k}</small><div style={{fontSize:22,fontWeight:700}}>{v}</div></div>)}
    </div>
    <p style={{color:"#64748b",fontSize:13}}>{tr("Only numeric ratings are averaged. NA, multiple-choice and written responses are excluded. These results support educational planning, not diagnosis.","സംഖ്യാ റേറ്റിംഗുകൾ മാത്രമാണ് ശരാശരിയിൽ ഉൾപ്പെടുത്തുന്നത്. NA, ഓപ്ഷൻ ഉത്തരങ്ങൾ, എഴുത്തുത്തരങ്ങൾ എന്നിവ ഒഴിവാക്കുന്നു. ഇത് രോഗനിർണയമല്ല.")}</p>
   </section>
   <section className="report-panel" style={panel}>
    <h2>{tr("Category-wise Results","വിഭാഗം തിരിച്ചുള്ള ഫലങ്ങൾ")}</h2>
    {cats.map((c,i)=>{
     const pct=c.rated?Math.min(100,Math.max(0,c.sum/(c.rated*3)*100)):null;
     return <div key={i} className="report-panel" style={{padding:"14px 0",borderBottom:"1px solid #e2e8f0"}}>
      <small style={{color:"#64748b"}}>{c.section}</small><h3 style={{margin:"6px 0"}}>{c.category}</h3>
      <p style={{fontSize:13}}>{tr("Rated","റേറ്റിംഗ്")}: {c.rated} · NA: {c.na} · {tr("Choices","ഓപ്ഷൻ")}: {c.choices} · {tr("Written","എഴുത്ത്")}: {c.written}</p>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:7}}>
       <span>{tr("Numeric rating summary","സംഖ്യാ റേറ്റിംഗ് സംഗ്രഹം")}</span>
       <strong>{pct===null?tr("Not numerically rated","സംഖ്യാ റേറ്റിംഗ് ഇല്ല"):((c.sum/c.rated).toFixed(2)+"/3 · "+Math.round(pct)+"%")}</strong>
      </div>
      <div style={{height:11,background:"#e2e8f0",borderRadius:20,overflow:"hidden"}}><div style={{width:(pct??0)+"%",height:"100%",background:"#176b58"}}/></div>
     </div>;
    })}
    <p style={{fontSize:13,color:"#64748b"}}>{tr("Category scores are a snapshot, not improvement over time. A progress comparison requires repeated, equivalent assessments.","വിഭാഗ സ്കോറുകൾ നിലവിലെ നില മാത്രമാണ്, കാലക്രമത്തിലുള്ള പുരോഗതിയല്ല. പുരോഗതി താരതമ്യം ചെയ്യാൻ സമാനമായ ആവർത്തിച്ച വിലയിരുത്തൽ വേണം.")}</p>
   </section>
   {assessment.status==="reviewed"&&<section className="report-panel" style={panel}>
    <h2>{tr("Teacher Feedback & Recommendations","അധ്യാപകന്റെ അഭിപ്രായങ്ങളും നിർദേശങ്ങളും")}</h2>
    <p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{assessment.teacher_feedback||tr("No written feedback supplied.","രേഖാമൂലമുള്ള അഭിപ്രായം നൽകിയിട്ടില്ല.")}</p>
   </section>}
   <div className="report-actions" style={{marginBottom:12}}>
    <button style={{...button,background:"#e2f2e9",color:"#176b58"}} onClick={()=>setShowAnswers(v=>!v)}>
     {showAnswers?tr("Hide answers","ഉത്തരങ്ങൾ മറയ്ക്കുക"):tr("Show answers","ഉത്തരങ്ങൾ കാണിക്കുക")}
    </button>
   </div>
   {showAnswers&&<section className="report-panel" style={panel}>
    <h2>{tr("Question-wise Responses","ചോദ്യം തിരിച്ചുള്ള ഉത്തരങ്ങൾ")}</h2>
    {rows.map((r,i)=><div className="report-question" key={i} style={{padding:"12px 0",borderBottom:"1px solid #dce8e1"}}>
     <small style={{color:"#64748b"}}>{r.section} · {r.category}</small>
     <p style={{fontWeight:700,margin:"6px 0"}}>{r.number} — {ml&&r.question.text_ml?r.question.text_ml:r.question.text}</p>
     <p style={{whiteSpace:"pre-wrap",margin:"6px 0"}}><strong>{tr("Answer","ഉത്തരം")}:</strong> {answerText(r)}</p>
     {r.answer.observation?.trim()&&<p style={{whiteSpace:"pre-wrap",margin:"6px 0"}}><strong>{tr("Observation","നിരീക്ഷണം")}:</strong> {r.answer.observation}</p>}
    </div>)}
   </section>}
   <footer style={{borderTop:"1px solid #dce8e1",paddingTop:13,color:"#64748b",fontSize:12}}>Swastha Learning Clinic — Confidential educational assessment. Not a medical or psychological diagnosis.</footer>
  </div>
 </main>;
}
