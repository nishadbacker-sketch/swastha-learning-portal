"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Question={id:string;text:string;text_ml:string};
type Category={id:string;title:string;questions:Question[]};
type Section={id:string;title:string;categories:Category[]};
type Template={id:string;title:string;description:string;level:string;structure:Section[];status:string};
type Answer={score:string|null;observation:string};
type Assignment={id:string;student_id:string;status:string;due_date:string|null;answers:Record<string,Answer>;teacher_feedback:string|null;reviewed_at:string|null;template_id:string};
const palette:[string,string,string][]=[
 ["0","Not demonstrated","#ef4444"],
 ["1","Substantial support","#f97316"],
 ["2","Developing","#0284c7"],
 ["3","Independent","#10b981"],
 ["NA","Not assessed","#64748b"]
];
const panel:React.CSSProperties={background:"white",border:"1px solid #dce8e1",padding:21,borderRadius:15,marginBottom:18};
const btn:React.CSSProperties={background:"#176b58",color:"white",border:0,borderRadius:8,padding:"11px 17px",fontWeight:700,cursor:"pointer"};
const control:React.CSSProperties={padding:10,width:"100%",boxSizing:"border-box",font:"inherit",borderRadius:8,border:"1px solid #cbd5e1"};
export default function CustomAssessmentPage(){
 const params=useParams<{id:string}>(),router=useRouter();
 const [assessment,setAssessment]=useState<Assignment|null>(null);
 const [template,setTemplate]=useState<Template|null>(null);
 const [childName,setChildName]=useState("");
 const [answers,setAnswers]=useState<Record<string,Answer>>({});
 const [language,setLanguage]=useState<"en"|"ml">("en");
 const [activeSection,setActiveSection]=useState(0);
 const [showUnanswered,setShowUnanswered]=useState(false);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [confirm,setConfirm]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{try{if(localStorage.getItem("swastha-assessment-language")==="ml")setLanguage("ml");}catch{/* browser preference is optional */}},[]);
 useEffect(()=>{async function load(){
  if(!supabase){setError("Supabase not configured.");setLoading(false);return;}
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const role=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(role.error||role.data?.role!=="parent"){router.replace("/login");return;}
   const {data:a,error:aError}=await supabase.from("custom_assessment_assignments").select("id,student_id,status,due_date,answers,teacher_feedback,reviewed_at,template_id").eq("id",params.id).single();
   if(aError||!a)throw new Error("Assessment not found or access denied.");
   const {data:t,error:tError}=await supabase.from("custom_assessment_templates").select("id,title,description,level,status,structure").eq("id",a.template_id).single();
   if(tError||!t)throw new Error("Assessment template unavailable.");
   const {data:s,error:sError}=await supabase.from("students").select("full_name").eq("id",a.student_id).single();
   if(sError||!s)throw new Error("Child information unavailable.");
   setAssessment(a as Assignment);setTemplate(t as Template);setAnswers(a.answers||{});setChildName(s.full_name);
  }catch(e){setError(e instanceof Error?e.message:"Unable to open this test.");}
  finally{setLoading(false);}
 }load();},[params.id,router]);
 const ml=language==="ml";
 const tr=(en:string,translation:string)=>ml?translation:en;
 const sections=template?.structure||[];
 const items=sections.flatMap((section,si)=>section.categories.flatMap((category,ci)=>category.questions.map((q,qi)=>({id:q.id,section:section.title,category:category.title,si,ci,qi,text:q.text,text_ml:q.text_ml}))));
 const missing=items.filter(x=>answers[x.id]?.score==null);
 const total=items.length,done=total-missing.length;
 const status=assessment?.status||"assigned";
 const readOnly=status==="submitted"||status==="reviewed";
 const progress=total?Math.round(done/total*100):0;
 function answer(id:string,patch:Partial<Answer>){
  setAnswers(previous=>({...previous,[id]:{score:previous[id]?.score??null,observation:previous[id]?.observation??"",...patch}}));
  setMessage("");
 }
 function languageChange(next:"en"|"ml"){setLanguage(next);try{localStorage.setItem("swastha-assessment-language",next);}catch{/* optional */}}
 function jump(si:number,id:string){setActiveSection(si);setTimeout(()=>document.getElementById("custom-question-"+id)?.scrollIntoView({behavior:"smooth",block:"center"}),70);}
 async function save(submit:boolean){
  if(!supabase||!assessment||saving||readOnly)return;
  if(submit&&missing.length){setShowUnanswered(true);setMessage(tr("Answer the highlighted questions before submitting.","സമർപ്പിക്കുന്നതിന് മുമ്പ് അടയാളപ്പെടുത്തിയ ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുക."));jump(missing[0].si,missing[0].id);setConfirm(false);return;}
  setSaving(true);setMessage("");setError("");
  try{
   const {data,error:e}=await supabase.rpc("save_custom_assessment",{p_assignment_id:assessment.id,p_answers:answers,p_submit:submit});
   if(e)throw e;
   setAssessment(previous=>previous?{...previous,status:data,answers}:previous);
   setConfirm(false);setMessage(submit?tr("Assessment submitted for teacher review.","വിലയിരുത്തൽ അധ്യാപകന്റെ പരിശോധനയ്ക്കായി സമർപ്പിച്ചു."):tr("Progress saved successfully.","പുരോഗതി വിജയകരമായി സേവ് ചെയ്തു."));
  }catch(e){setError(e instanceof Error?e.message:"Unable to save assessment.");setConfirm(false);}
  finally{setSaving(false);}
 }
 if(loading)return <main style={{padding:35}}>Loading assessment...</main>;
 if(!assessment||!template)return <main style={{padding:35}}><h2>Assessment unavailable</h2><p>{error}</p><button style={btn} onClick={()=>router.push("/parent/dashboard")}>Back to Dashboard</button></main>;
 return <main style={{fontFamily:"Arial,sans-serif",background:"#f8faf7",color:"#183a35",minHeight:"100vh"}}>
  <header style={{position:"sticky",top:0,zIndex:35,background:"#0f4c5c",color:"white",padding:"12px 4%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",boxShadow:"0 3px 12px #1232"}}>
   <div><strong>Swastha Learning Clinic</strong><div style={{fontSize:12}}>{tr("Custom Child Assessment","കുട്ടികളുടെ പ്രത്യേക വിലയിരുത്തൽ")}</div></div>
   <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <label htmlFor="custom-assessment-language">{tr("Language","ഭാഷ")}</label>
    <select id="custom-assessment-language" value={language} onChange={e=>languageChange(e.target.value as "en"|"ml")} style={{padding:10,borderRadius:7,background:"white",color:"#0f4c5c"}}>
     <option value="en">English</option><option value="ml">മലയാളം</option>
    </select>
    <button style={{...btn,background:"#fff",color:"#0f4c5c"}} onClick={()=>router.push("/parent/dashboard")}>{tr("Dashboard","ഡാഷ്‌ബോർഡ്")}</button>
   </div>
  </header>
  <div style={{maxWidth:1000,margin:"auto",padding:"25px 16px 70px"}}>
   <section style={panel}><div style={{color:"#16697a",fontSize:13}}>CUSTOM ASSESSMENT · {template.level}</div><h1>{template.title}</h1><p>{template.description}</p><p><strong>{tr("Student","വിദ്യാർത്ഥി")}:</strong> {childName} · <strong>{tr("Status","നില")}:</strong> {status==="reviewed"?"Reviewed":status==="submitted"?"Awaiting Teacher Review":status}</p><p>{tr("Progress","പുരോഗതി")}: {done}/{total} ({progress}%)</p><div style={{height:12,borderRadius:12,background:"#e2e8f0",overflow:"hidden"}}><div style={{height:"100%",width:progress+"%",background:"#16a34a"}}/></div></section>
   {message&&<section role="status" style={{...panel,background:"#e8f5eb",color:"#176b58"}}>{message}</section>}
   {error&&<section role="alert" style={{...panel,background:"#fff1f2",color:"#b42318"}}>{error}</section>}
   {readOnly?
    <section style={panel}><h2>{status==="reviewed"?tr("Teacher Review Complete","അധ്യാപക പരിശോധന പൂർത്തിയായി"):tr("Submitted for Review","പരിശോധനയ്ക്കായി സമർപ്പിച്ചു")}</h2>
     <p>{tr("Your submitted answers are locked.","സമർപ്പിച്ച ഉത്തരങ്ങൾ ഇനി തിരുത്താൻ കഴിയില്ല.")}</p>
     {status==="reviewed"&&<><h3>{tr("Teacher Feedback","അധ്യാപകന്റെ അഭിപ്രായം")}</h3><p style={{whiteSpace:"pre-wrap"}}>{assessment.teacher_feedback||tr("No written feedback provided.","രേഖാമൂലമുള്ള അഭിപ്രായം നൽകിയിട്ടില്ല.")}</p></>}
     <button style={btn} onClick={()=>router.push("/parent/dashboard")}>{tr("Return to Dashboard","ഡാഷ്‌ബോർഡിലേക്ക് മടങ്ങുക")}</button>
    </section>
   :<>
    {showUnanswered&&missing.length>0&&<section style={{...panel,background:"#fffbeb",border:"2px solid #f59e0b"}}>
     <h3>{tr("Unanswered Questions","ഉത്തരം നൽകാത്ത ചോദ്യങ്ങൾ")}: {missing.length}</h3>
     <p>{tr("Click a question to jump to it. Select NA when it cannot be assessed.","ചോദ്യത്തിലേക്ക് പോകാൻ അതിൽ ക്ലിക്ക് ചെയ്യുക. വിലയിരുത്താൻ കഴിയാത്തപ്പോൾ NA തിരഞ്ഞെടുക്കുക.")}</p>
     {missing.map(x=><button key={x.id} type="button" onClick={()=>jump(x.si,x.id)} style={{display:"block",textAlign:"left",width:"100%",margin:"8px 0",padding:11,background:"white",border:"1px solid #f59e0b",borderRadius:8,cursor:"pointer"}}>
      <strong>{String.fromCharCode(65+x.ci)}.{x.qi+1}</strong> — {ml&&x.text_ml?x.text_ml:x.text}
     </button>)}
    </section>}
    <section style={panel}><h3>{tr("Scoring Guide","മൂല്യനിർണയ മാർഗനിർദേശം")}</h3><p>{tr("Select NA if you cannot assess a question.","ഒരു ചോദ്യം വിലയിരുത്താൻ കഴിയുന്നില്ലെങ്കിൽ NA തിരഞ്ഞെടുക്കുക.")}</p>
     <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{palette.map(([score,label,color])=><span key={score} style={{border:"1px solid "+color,borderRadius:8,padding:9}}><strong style={{color}}>{score}</strong> — {ml?({"0":"പ്രകടിപ്പിച്ചിട്ടില്ല","1":"കൂടുതൽ പിന്തുണ ആവശ്യമാണ്","2":"വികസിച്ചുവരുന്നു","3":"സ്വതന്ത്രമായി ചെയ്യുന്നു","NA":"വിലയിരുത്തിയിട്ടില്ല"} as Record<string,string>)[score]:label}</span>)}</div>
    </section>
    <section style={panel}><h3>{tr("Assessment Sections","വിലയിരുത്തൽ വിഭാഗങ്ങൾ")}</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{sections.map((s,si)=>{
     const ids=s.categories.flatMap(c=>c.questions.map(q=>q.id));
     const count=ids.filter(id=>answers[id]?.score!=null).length;
     return <button key={s.id} style={activeSection===si?btn:{...btn,background:"#e0f2f1",color:"#0f4c5c"}} onClick={()=>setActiveSection(si)}>{tr("Section","വിഭാഗം")} {si+1} · {count}/{ids.length}</button>;
    })}</div></section>
    {sections[activeSection]&&<section style={panel}><h2>{sections[activeSection].title}</h2>
     {sections[activeSection].categories.map((cat,ci)=><div key={cat.id}>
      <h3 style={{background:"#e0f2f1",padding:13,borderRadius:8}}>{cat.title}</h3>
      {cat.questions.map((q,qi)=>{
       const a=answers[q.id];
       return <div key={q.id} id={"custom-question-"+q.id} style={{padding:"17px 12px",borderBottom:"1px solid #e2e8f0",borderLeft:showUnanswered&&a?.score==null?"4px solid #f59e0b":"4px solid transparent",background:showUnanswered&&a?.score==null?"#fffbeb":"transparent",scrollMarginTop:100}}>
        <p style={{fontWeight:700,lineHeight:1.6}}>{String.fromCharCode(65+ci)}.{qi+1} — {ml&&q.text_ml?q.text_ml:q.text}</p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
         {palette.map(([score,label,color])=><button key={score} title={label} aria-pressed={a?.score===score} style={{border:"1px solid "+color,background:a?.score===score?color:"white",color:a?.score===score?"white":color,padding:"10px 16px",borderRadius:8,fontWeight:700,cursor:"pointer"}} onClick={()=>answer(q.id,{score})}>{score}</button>)}
        </div>
        <textarea style={{...control,minHeight:62}} value={a?.observation||""} maxLength={2000} placeholder={tr("Observation or example (optional)","നിരീക്ഷണം അല്ലെങ്കിൽ ഉദാഹരണം (നിർബന്ധമല്ല)")} onChange={e=>answer(q.id,{observation:e.target.value})}/>
       </div>;
      })}
     </div>)}
    </section>}
    <section style={{...panel,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
     <button style={{...btn,background:"#64748b"}} disabled={saving||activeSection===0} onClick={()=>{setActiveSection(i=>Math.max(0,i-1));window.scrollTo({top:0,behavior:"smooth"});}}>{tr("Previous","മുമ്പത്തെ വിഭാഗം")}</button>
     <button style={btn} disabled={saving} onClick={()=>save(false)}>{saving?tr("Saving...","സേവ് ചെയ്യുന്നു..."):tr("Save Progress","പുരോഗതി സേവ് ചെയ്യുക")}</button>
     {activeSection<sections.length-1?<button style={btn} disabled={saving} onClick={()=>{setActiveSection(i=>Math.min(sections.length-1,i+1));window.scrollTo({top:0,behavior:"smooth"});}}>{tr("Next Section","അടുത്ത വിഭാഗം")}</button>:<button style={{...btn,background:"#15803d"}} disabled={saving} onClick={()=>{if(missing.length){setShowUnanswered(true);setMessage(tr("Please complete the highlighted questions.","അടയാളപ്പെടുത്തിയ ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുക."));jump(missing[0].si,missing[0].id);}else setConfirm(true);}}>{tr("Submit Assessment","വിലയിരുത്തൽ സമർപ്പിക്കുക")}</button>}
    </section>
   </>}
   <p style={{fontSize:12,color:"#64748b",textAlign:"center"}}>Swastha Learning Clinic — Educational screening and development planning aid. Not a medical or psychological diagnosis.</p>
  </div>
  {confirm&&<div role="presentation" style={{position:"fixed",inset:0,zIndex:100,background:"#0009",display:"grid",placeItems:"center",padding:16}}>
   <section role="dialog" aria-modal="true" style={{...panel,maxWidth:430,width:"100%"}}><h2>{tr("Confirm Submission","സമർപ്പണം സ്ഥിരീകരിക്കുക")}</h2><p>{tr("Your answers cannot be edited after submission. Continue?","സമർപ്പിച്ചശേഷം ഉത്തരങ്ങൾ തിരുത്താൻ കഴിയില്ല. തുടരണമോ?")}</p>
    <div style={{display:"flex",gap:10}}><button style={{...btn,background:"#64748b"}} disabled={saving} onClick={()=>setConfirm(false)}>{tr("Cancel","റദ്ദാക്കുക")}</button><button style={btn} disabled={saving} onClick={()=>save(true)}>{saving?tr("Submitting...","സമർപ്പിക്കുന്നു..."):tr("Confirm Submit","സമർപ്പിക്കുക")}</button></div>
   </section>
  </div>}
 </main>;
}
