"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import BrandLogo from "../../components/brand-logo";
import { CHECKLIST_DATA, type AssessmentLevel } from "../../../lib/assessment-data";
import { LP_MALAYALAM_QUESTIONS } from "../../../lib/assessment-ml";

type Level = AssessmentLevel;
type Student = { student_id:string; student_code:string; student_name:string; current_class:string|null; date_of_birth:string|null; preferred_language:string };
type TemplateQuestion = { id:string; text:string; text_ml?:string; response_type?:"rating"|"multiple_choice"|"written"; options?:{id:string;text:string;text_ml?:string}[] };
type Template = { id:string; title:string; level:string; description:string; structure:{id:string;title:string;categories:{id:string;title:string;questions:TemplateQuestion[]}[]}[] };
type SessionSummary = {id:string;student_id:string;student_name:string;student_code:string;assessment_kind:"standard"|"custom";assessment_level:Level;template_id:string|null;status:string;created_at:string;submitted_at:string|null};
type Answer = {score?:string|null;choice?:string|null;written_answer?:string|null;observation:string};
type Session = SessionSummary & {current_class:string|null;question_ids:string[];answers:Record<string,Answer>;evaluation:string;strengths:string;support_needs:string;recommendations:string};
type Question = {id:string;text:string;text_ml?:string;area:string;group:string;type:"rating"|"multiple_choice"|"written";options?:TemplateQuestion["options"]};
const levels:Level[]=["LP","UP","HS","HSS"];
const card:React.CSSProperties={background:"white",border:"1px solid #dce8e1",borderRadius:12,padding:16,marginBottom:16};
const field:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:"1px solid #cbd5e1",background:"#fff",font:"inherit",fontSize:13};
const button:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:8,padding:"10px 15px",fontWeight:700,fontSize:13,cursor:"pointer"};
function levelForClass(value:string|null):Level|null{
 const n=Number(value?.match(/\d+/)?.[0]||0);
 return n>=1&&n<=4?"LP":n>=5&&n<=7?"UP":n>=8&&n<=10?"HS":n>=11&&n<=12?"HSS":null;
}
function standardQuestions(level:Level):Question[]{
 return CHECKLIST_DATA[level].areas.flatMap(area=>area.subDomains.flatMap(domain=>
  domain.items.map((text,index)=>({id:domain.id+"_"+(index+1),text,area:area.title,group:domain.title,type:"rating" as const}))
 ));
}
function customQuestions(template:Template|undefined):Question[]{
 return (template?.structure||[]).flatMap(section=>section.categories.flatMap(category=>
  category.questions.map(q=>({id:q.id,text:q.text,text_ml:q.text_ml,area:section.title,group:category.title,type:q.response_type||"rating",options:q.options}))
 ));
}
export default function StaffInPersonAssessmentPage(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [students,setStudents]=useState<Student[]>([]);
 const [sessions,setSessions]=useState<SessionSummary[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [studentId,setStudentId]=useState("");
 const [kind,setKind]=useState<"standard"|"custom">("standard");
 const [templateId,setTemplateId]=useState("");
 const [chosenLevel,setChosenLevel]=useState<Level>("LP");
 const [active,setActive]=useState<Session|null>(null);
 const [answers,setAnswers]=useState<Record<string,Answer>>({});
 const [evaluation,setEvaluation]=useState("");
 const [strengths,setStrengths]=useState("");
 const [supportNeeds,setSupportNeeds]=useState("");
 const [recommendations,setRecommendations]=useState("");
 const [language,setLanguage]=useState<"en"|"ml">("en");
 const [translations,setTranslations]=useState<Record<string,string>>({});
 const [section,setSection]=useState("all");
 const [newStudent,setNewStudent]=useState({name:"",dob:"",grade:"",language:"en",guardian:"",phone:"",consent:false});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const tr=(en:string,ml:string)=>language==="ml"?ml:en;

 const refresh=useCallback(async()=>{
  if(!supabase)return;
  const [s,a,t]=await Promise.all([
   supabase.rpc("staff_assessment_students"),
   supabase.rpc("staff_assessment_sessions_list"),
   supabase.from("custom_assessment_templates").select("id,title,level,description,structure").eq("status","published").order("title")
  ]);
  if(s.error||a.error||t.error)throw new Error(s.error?.message||a.error?.message||t.error?.message);
  setStudents((s.data||[]) as Student[]);
  setSessions((a.data||[]) as SessionSummary[]);
  setTemplates((t.data||[]) as Template[]);
 },[]);
 useEffect(()=>{
  let live=true;
  async function initialize(){
   if(!supabase){setError("Database connection unavailable.");setLoading(false);return;}
   try{
    const {data:auth,error:ae}=await supabase.auth.getUser();
    if(ae||!auth.user){router.replace("/login");return;}
    const {data:r,error:re}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
    if(re||!r||!["owner","admin","clinic_admin","teacher"].includes(r.role)){router.replace("/login");return;}
    if(live)setRole(r.role);
    await refresh();
   }catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load staff assessments.");}
   finally{if(live)setLoading(false);}
  }
  void initialize();return()=>{live=false;};
 },[refresh,router]);
 useEffect(()=>{
  if(!active||active.assessment_kind!=="standard"||!supabase)return;
  let live=true;
  void supabase.from("standard_assessment_translations")
   .select("question_id,text_ml").eq("level",active.assessment_level)
   .then(({data})=>{if(live)setTranslations(Object.fromEntries((data||[]).filter(x=>x.text_ml).map(x=>[x.question_id,x.text_ml])));});
  return()=>{live=false;};
 },[active?.id,active?.assessment_kind,active?.assessment_level]);

 const selectedStudent=students.find(s=>s.student_id===studentId);
 const selectedLevel=levelForClass(selectedStudent?.current_class||null);
 const availableTemplates=templates.filter(t=>t.level.toLowerCase()==="all"||t.level.toUpperCase()===selectedLevel);
 const canStart=Boolean(selectedStudent&&selectedLevel&&chosenLevel===selectedLevel&&(kind==="standard"||availableTemplates.some(t=>t.id===templateId)));
 const template=templates.find(t=>t.id===active?.template_id);
 const questions=useMemo(()=>active?(active.assessment_kind==="standard"?standardQuestions(active.assessment_level):customQuestions(template)):[],[active?.id,active?.assessment_kind,active?.assessment_level,template]);
 const groups=[...new Set(questions.map(q=>q.area))];
 const shown=questions.filter(q=>section==="all"||q.area===section);
 const missing=questions.filter(q=>q.type==="written"?!answers[q.id]?.written_answer?.trim():q.type==="multiple_choice"?!answers[q.id]?.choice:!["0","1","2","3","NA"].includes(answers[q.id]?.score||""));
 const completed=questions.length-missing.length;
 const readOnly=active?.status==="submitted";
 const home=role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";

 async function createStudent(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase||busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   if(!newStudent.consent)throw new Error("Record guardian consent before creating the student.");
   const {data,error:e}=await supabase.rpc("staff_assessment_create_student",{
    p_full_name:newStudent.name,p_date_of_birth:newStudent.dob,p_current_class:"Class "+newStudent.grade,
    p_language:newStudent.language,p_guardian_name:newStudent.guardian,p_guardian_phone:newStudent.phone,p_consent:newStudent.consent
   });
   if(e)throw e;
   await refresh();setStudentId(data as string);
   setNewStudent({name:"",dob:"",grade:"",language:"en",guardian:"",phone:"",consent:false});
   setMessage("Student profile created with a permanent Swastha ID. Select the assessment below.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to create student.");}
  finally{setBusy(false);}
 }
 async function openSession(id:string){
  if(!supabase||busy)return;setBusy(true);setError("");setMessage("");
  try{
   const {data,error:e}=await supabase.rpc("staff_assessment_session_get",{p_id:id});
   if(e)throw e;
   const result=(data as Session[]|null)?.[0];
   if(!result)throw new Error("Assessment not found or access denied.");
   setActive(result);setAnswers(result.answers||{});setEvaluation(result.evaluation||"");
   setStrengths(result.strengths||"");setSupportNeeds(result.support_needs||"");
   setRecommendations(result.recommendations||"");setSection("all");
   setStudentId(result.student_id);
  }catch(e){setError(e instanceof Error?e.message:"Could not open assessment.");}
  finally{setBusy(false);}
 }
 async function startSession(){
  if(!supabase||busy||!selectedStudent||!selectedLevel)return;
  if(chosenLevel!==selectedLevel){setError("Assessment level must match the student\u2019s class. Choose "+selectedLevel+".");return;}
  const t=kind==="custom"?availableTemplates.find(x=>x.id===templateId):undefined;
  if(kind==="custom"&&!t){setError("Choose a published assessment.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   const ids=kind==="standard"?standardQuestions(selectedLevel).map(q=>q.id):[];
   const {data,error:e}=await supabase.rpc("staff_assessment_start",{
    p_student_id:selectedStudent.student_id,p_kind:kind,p_level:selectedLevel,
    p_template_id:t?.id||null,p_question_ids:ids
   });
   if(e)throw e;
   await refresh();
   await openSessionDirect(data as string);
  }catch(e){setError(e instanceof Error?e.message:"Could not start assessment.");}
  finally{setBusy(false);}
 }
 async function openSessionDirect(id:string){
  if(!supabase)return;
  const {data,error:e}=await supabase.rpc("staff_assessment_session_get",{p_id:id});
  if(e)throw e;
  const result=(data as Session[])?.[0];
  if(!result)throw new Error("Session was created but could not be loaded.");
  setActive(result);setAnswers(result.answers||{});setEvaluation(result.evaluation||"");
  setStrengths(result.strengths||"");setSupportNeeds(result.support_needs||"");setRecommendations(result.recommendations||"");setSection("all");
 }
 function answer(id:string,patch:Partial<Answer>){
  setAnswers(old=>({...old,[id]:{score:old[id]?.score??null,choice:old[id]?.choice??null,written_answer:old[id]?.written_answer??"",observation:old[id]?.observation||"",...patch}}));
 }
 async function save(submit:boolean){
  if(!supabase||!active||busy||readOnly)return;
  if(submit&&missing.length){setError("Complete every question or select NA. "+missing.length+" unanswered.");setSection("all");return;}
  if(submit&&evaluation.trim().length<10){setError("Enter your professional evaluation (at least 10 characters).");return;}
  if(submit&&!window.confirm("Submit and lock all answers and the staff evaluation for "+active.student_name+"?"))return;
  setBusy(true);setError("");setMessage("");
  try{
   const {error:e}=await supabase.rpc("staff_assessment_save",{
    p_id:active.id,p_answers:answers,p_evaluation:evaluation,p_strengths:strengths,
    p_support_needs:supportNeeds,p_recommendations:recommendations,p_submit:submit
   });
   if(e)throw e;
   setActive({...active,status:submit?"submitted":"draft",answers,evaluation,strengths,support_needs:supportNeeds,recommendations});
   await refresh();
   setMessage(submit?"Assessment and staff evaluation submitted. Answers are locked.":"Draft saved successfully.");
  }catch(e){setError(e instanceof Error?e.message:"Could not save assessment.");}
  finally{setBusy(false);}
 }

 if(loading)return <main style={{padding:30}}>Loading in-person assessment workspace...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{background:"white",borderBottom:"1px solid #dce8e1",padding:"12px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <div><BrandLogo/><div style={{fontSize:12,color:"#667a74"}}>STAFF · IN-PERSON ASSESSMENTS</div></div>
   <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
    <label htmlFor="staff-assessment-language">Language</label>
    <select id="staff-assessment-language" style={{...field,width:"auto"}} value={language} onChange={e=>setLanguage(e.target.value as "en"|"ml")}><option value="en">English</option><option value="ml">മലയാളം</option></select>
    <button type="button" style={button} onClick={()=>active?setActive(null):router.push(home)}>{active?"All sessions":"Back to Staff Tools"}</button>
   </div>
  </header>
  <div style={{maxWidth:1150,margin:"auto",padding:"24px 16px 70px"}}>
   <h1 style={{fontSize:25,margin:"0 0 9px"}}>{tr("In-Person Student Assessments","നേരിട്ടുള്ള വിദ്യാർത്ഥി വിലയിരുത്തൽ")}</h1>
   <p style={{color:"#64748b",fontSize:13}}>Staff creates a child profile and records the child's answers, observations and evaluation in the portal. No Parent login or assignment is required. All sessions retain the assessor and submission history.</p>
   {error&&<div role="alert" style={{...card,background:"#fff1f2",color:"#b42318"}}>{error}</div>}
   {message&&<div role="status" style={{...card,background:"#ecfdf5",color:"#176b58"}}>{message}</div>}
   {!active?<>
    <section style={card}>
     <h2 style={{fontSize:19,margin:"0 0 12px"}}>1. Create Student Profile</h2>
     <form onSubmit={e=>void createStudent(e)} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,225px),1fr))",gap:12}}>
      <label>Student full name *<input required style={field} maxLength={150} value={newStudent.name} onChange={e=>setNewStudent(p=>({...p,name:e.target.value}))}/></label>
      <label>Date of birth *<input type="date" required style={field} max={new Date().toISOString().slice(0,10)} value={newStudent.dob} onChange={e=>setNewStudent(p=>({...p,dob:e.target.value}))}/></label>
      <label>Current class *<select required style={field} value={newStudent.grade} onChange={e=>setNewStudent(p=>({...p,grade:e.target.value}))}><option value="">Choose class</option>{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>Class {n}</option>)}</select></label>
      <label>Preferred language<select style={field} value={newStudent.language} onChange={e=>setNewStudent(p=>({...p,language:e.target.value}))}><option value="en">English</option><option value="ml">Malayalam</option></select></label>
      <label>Guardian name<input style={field} maxLength={150} value={newStudent.guardian} onChange={e=>setNewStudent(p=>({...p,guardian:e.target.value}))}/></label>
      <label>Guardian contact number<input style={field} type="tel" maxLength={30} value={newStudent.phone} onChange={e=>setNewStudent(p=>({...p,phone:e.target.value}))}/></label>
      <label style={{gridColumn:"1 / -1",fontSize:13}}><input type="checkbox" checked={newStudent.consent} onChange={e=>setNewStudent(p=>({...p,consent:e.target.checked}))}/> Parent/guardian has consented to this in-person assessment and recording of answers *</label>
      <div><button type="submit" disabled={busy} style={button}>{busy?"Saving...":"Create Student Profile & ID"}</button></div>
     </form>
    </section>
    <section style={card}>
     <h2 style={{fontSize:19,margin:"0 0 12px"}}>2. Start In-Person Assessment</h2>
     <label style={{display:"block",maxWidth:650,marginBottom:18,fontSize:13,fontWeight:700}}>Student
      <select style={{...field,marginTop:6}} value={studentId} onChange={e=>{const id=e.target.value;setStudentId(id);setTemplateId("");const student=students.find(s=>s.student_id===id);setChosenLevel(levelForClass(student?.current_class||null)||"LP");}}>
       <option value="">Choose student</option>{students.map(s=><option key={s.student_id} value={s.student_id}>{s.student_name} ({s.student_code}) · {s.current_class}</option>)}
      </select>
     </label>
     <div style={{fontSize:12,fontWeight:800,color:"#526b63",letterSpacing:1,marginBottom:9}}>ASSESSMENT LEVEL · CHOOSE A GRADE</div>
     <div role="group" aria-label="Select assessment level" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:10,marginBottom:12}}>
      {levels.map(level=>{
       const labels:Record<Level,[string,string]>={LP:["Lower Primary","Classes 1–4"],UP:["Upper Primary","Classes 5–7"],HS:["High School","Classes 8–10"],HSS:["Higher Secondary","Classes 11–12"]};
       const eligible=selectedLevel===level;
       return <button type="button" key={level} onClick={()=>{setChosenLevel(level);setTemplateId("");setKind("standard");setError("");}}
        aria-pressed={chosenLevel===level}
        style={{textAlign:"center",padding:"14px 7px",borderRadius:12,cursor:"pointer",background:chosenLevel===level?"#e0f2f1":"white",border:chosenLevel===level?"2px solid #16697a":"1px solid #dce8e1",color:"#183a35",minHeight:94}}>
        <strong style={{display:"block",fontSize:19}}>{level}</strong>
        <span style={{display:"block",fontSize:12,marginTop:5}}>{labels[level][0]}</span>
        <span style={{display:"block",fontSize:11,color:"#64748b",marginTop:3}}>{labels[level][1]}</span>
        {selectedStudent&&eligible&&<span style={{display:"block",fontSize:10,color:"#176b58",marginTop:4}}>Matches student</span>}
       </button>;
      })}
     </div>
     {selectedStudent&&chosenLevel!==selectedLevel&&<p role="alert" style={{color:"#ad4b21",fontSize:13,margin:"4px 0 14px"}}>Selected student is {selectedStudent.current_class}, so only <strong>{selectedLevel||"a supported class"}</strong> assessments can be started. Choose the matching tab.</p>}
     <p style={{fontSize:13,color:"#667a74",marginBottom:14}}>All four standard grade assessments are visible. Published custom assessments appear below. Start is enabled only when the student's class matches the selected level.</p>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <button type="button" aria-pressed={kind==="standard"} onClick={()=>{setKind("standard");setTemplateId("");}} style={{...button,background:kind==="standard"?"#0f4c5c":"#eaf4ef",color:kind==="standard"?"white":"#176b58"}}>Standard grade assessment (4)</button>
      <button type="button" aria-pressed={kind==="custom"} onClick={()=>{setKind("custom");setTemplateId("");}} style={{...button,background:kind==="custom"?"#0f4c5c":"#eaf4ef",color:kind==="custom"?"white":"#176b58"}}>Published custom assessments ({templates.length})</button>
     </div>
     {kind==="standard"?<div style={{padding:14,background:"#f1f8f5",border:"1px solid #dce8e1",borderRadius:10,marginBottom:16}}>
      <strong>{chosenLevel} — {chosenLevel==="LP"?"Lower Primary":chosenLevel==="UP"?"Upper Primary":chosenLevel==="HS"?"High School":"Higher Secondary"} Child Assessment Checklist</strong>
      <p style={{fontSize:13,color:"#667a74",margin:"6px 0 0"}}>Standard assessment with grade-specific questions, staff ratings and observations.</p>
     </div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,235px),1fr))",gap:10,marginBottom:16}}>
      {templates.map(t=>{const eligible=t.level.toLowerCase()==="all"||t.level.toUpperCase()===chosenLevel;return <button key={t.id} type="button" disabled={!eligible} onClick={()=>setTemplateId(t.id)}
       aria-pressed={templateId===t.id}
       style={{textAlign:"left",padding:14,borderRadius:10,border:templateId===t.id?"2px solid #176b58":"1px solid #dce8e1",background:templateId===t.id?"#eaf4ef":"white",opacity:eligible?1:0.55,cursor:eligible?"pointer":"not-allowed"}}>
       <strong style={{display:"block",fontSize:14}}>{t.title}</strong>
       <span style={{display:"block",fontSize:12,color:"#64748b",marginTop:5}}>{t.level.toUpperCase()==="ALL"?"All grade levels":t.level.toUpperCase()+" only"}</span>
       {!eligible&&<span style={{fontSize:11,color:"#ad4b21"}}>Not for selected grade</span>}
      </button>;})}
      {!templates.length&&<p style={{fontSize:13,color:"#64748b"}}>No published custom assessments are available. Drafts are not selectable.</p>}
     </div>}
     <button type="button" disabled={busy||!canStart} style={{...button,opacity:busy||!canStart?0.55:1}} onClick={()=>void startSession()}>Start Assessment</button>
     <p style={{fontSize:12,color:"#667a74",marginTop:9}}>Available catalogue: 4 standard + {templates.length} published custom assessments. All completed sessions remain in Saved and Submitted Sessions.</p>
    </section>
    <section style={card}>
     <h2 style={{fontSize:19,margin:"0 0 12px"}}>3. Saved and Submitted Sessions</h2>
     <div style={{display:"grid",gap:9}}>
      {sessions.length===0&&<p style={{color:"#64748b"}}>No in-person sessions yet.</p>}
      {sessions.map(s=><div key={s.id} style={{border:"1px solid #dce8e1",borderRadius:9,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
       <div><strong>{s.student_name} · {s.student_code}</strong><div style={{color:"#64748b",fontSize:12,marginTop:4}}>{s.assessment_kind==="custom"?"Custom":"Standard"} · {s.assessment_level} · {s.status.toUpperCase()} · {new Date(s.created_at).toLocaleDateString("en-IN")}</div></div>
       <button type="button" style={button} disabled={busy} onClick={()=>void openSession(s.id)}>{s.status==="submitted"?"View Submitted":"Continue Assessment"}</button>
      </div>)}
     </div>
    </section>
   </>:<>
    <section style={card}>
     <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <div><h2 style={{fontSize:21,margin:"0 0 7px"}}>{active.student_name} · {active.student_code}</h2>
      <p style={{color:"#64748b",fontSize:13,marginBottom:7}}>{active.current_class} · {active.assessment_level} · {active.assessment_kind==="custom"?template?.title||"Custom assessment":"Standard learning assessment"} · <strong>{active.status.toUpperCase()}</strong></p></div>
      <div style={{fontSize:14,fontWeight:700}}>Answered: {completed}/{questions.length} ({questions.length?Math.round(completed/questions.length*100):0}%)</div>
     </div>
     <div style={{background:"#e2e8f0",height:8,borderRadius:8,overflow:"hidden"}}><div style={{width:(questions.length?completed/questions.length*100:0)+"%",height:"100%",background:"#176b58"}}/></div>
     <p style={{fontSize:12,color:"#667a74",marginTop:10,marginBottom:0}}>Select NA for questions that could not be assessed. Record direct observations and the child's spoken or written responses.</p>
    </section>
    <section style={card}>
     <label>Assessment section<select style={field} value={section} onChange={e=>setSection(e.target.value)}><option value="all">All sections</option>{groups.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
    </section>
    {shown.map((q,index)=>{
     const value=answers[q.id]||{observation:""};const isMissing=missing.some(x=>x.id===q.id);
     return <section key={q.id} style={{...card,borderLeft:isMissing&&!readOnly?"4px solid #d9a441":"4px solid #176b58"}}>
      <div style={{color:"#64748b",fontSize:12,marginBottom:5}}>{q.area} · {q.group} · {q.id}</div>
      <label style={{display:"block",fontWeight:700,fontSize:14,marginBottom:12}}>{index+1}. {language==="ml"?(q.text_ml||translations[q.id]||LP_MALAYALAM_QUESTIONS[q.id]||q.text):q.text}</label>
      {q.type==="rating"?<label>Staff rating<select disabled={readOnly} style={field} value={value.score??""} onChange={e=>answer(q.id,{score:e.target.value||null})}>
       <option value="">Select score</option><option value="0">0 — Not demonstrated</option><option value="1">1 — Needs substantial support</option><option value="2">2 — Developing</option><option value="3">3 — Independent</option><option value="NA">NA — Not assessed</option>
      </select></label>:q.type==="multiple_choice"?<label>Child response<select disabled={readOnly} style={field} value={value.choice??""} onChange={e=>answer(q.id,{choice:e.target.value||null})}><option value="">Select answer</option>{(q.options||[]).map(o=><option key={o.id} value={o.id}>{language==="ml"&&o.text_ml?o.text_ml:o.text}</option>)}</select></label>:<label>Child's written / spoken answer<textarea disabled={readOnly} style={{...field,minHeight:80}} maxLength={5000} value={value.written_answer||""} onChange={e=>answer(q.id,{written_answer:e.target.value})}/></label>}
      <label style={{display:"block",marginTop:10}}>Assessor observation / exact child answer (optional)<textarea disabled={readOnly} style={{...field,minHeight:60}} maxLength={2000} value={value.observation||""} onChange={e=>answer(q.id,{observation:e.target.value})} placeholder="Note what the child said or demonstrated during the session"/></label>
     </section>;
    })}
    <section style={card}>
     <h2 style={{fontSize:19,margin:"0 0 12px"}}>Staff Evaluation & Recommendations</h2>
     <p style={{fontSize:12,color:"#64748b"}}>This evaluation belongs to the in-person staff assessment and is not automatically published as a parent-facing report.</p>
     <label style={{display:"block",marginBottom:12}}>Overall evaluation *<textarea disabled={readOnly} style={{...field,minHeight:110}} maxLength={5000} value={evaluation} onChange={e=>setEvaluation(e.target.value)} placeholder="Describe observed learning abilities, challenges, classroom behaviour and response to tasks"/></label>
     <label style={{display:"block",marginBottom:12}}>Strengths<textarea disabled={readOnly} style={{...field,minHeight:70}} maxLength={4000} value={strengths} onChange={e=>setStrengths(e.target.value)}/></label>
     <label style={{display:"block",marginBottom:12}}>Areas needing support<textarea disabled={readOnly} style={{...field,minHeight:70}} maxLength={4000} value={supportNeeds} onChange={e=>setSupportNeeds(e.target.value)}/></label>
     <label style={{display:"block",marginBottom:12}}>Recommendations / next steps<textarea disabled={readOnly} style={{...field,minHeight:80}} maxLength={5000} value={recommendations} onChange={e=>setRecommendations(e.target.value)}/></label>
     {readOnly?<p style={{color:"#176b58",fontWeight:700}}>Submitted and locked. Answers and evaluation are preserved.</p>:<div style={{display:"flex",flexWrap:"wrap",gap:10}}>
      <button type="button" disabled={busy} style={{...button,background:"#0f4c5c"}} onClick={()=>void save(false)}>{busy?"Saving...":"Save Draft"}</button>
      <button type="button" disabled={busy||Boolean(missing.length)||evaluation.trim().length<10} style={button} onClick={()=>void save(true)}>Submit Assessment & Evaluation</button>
     </div>}
     {missing.length>0&&!readOnly&&<p style={{fontSize:13,color:"#9a6700",marginTop:12}}>{missing.length} questions still require a response before final submission.</p>}
    </section>
   </>}
  </div>
 </main>;
}
