"use client";

import BrandLogo from "../../../components/brand-logo";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Choice={id:"1"|"2"|"3";text:string;text_ml:string};
type Question={id:string;text:string;text_ml:string;response_type?:"rating"|"multiple_choice"|"written";options?:Choice[]};
type Category={id:string;title:string;title_ml?:string;questions:Question[]};
type Section={id:string;title:string;title_ml?:string;categories:Category[]};
type Template={id:string;title:string;description:string;level:string;structure:Section[];status:string};
type Answer={score?:string|null;choice?:string|null;written_answer?:string|null;observation:string};
type Assignment={id:string;student_id:string;status:string;due_date:string|null;answers:Record<string,Answer>;teacher_feedback:string|null;reviewed_at:string|null;template_id:string};
const palette:[string,string,string][]=[
 ["1","Needs support","#f97316"],
 ["2","Developing","#0284c7"],
 ["3","Independent","#10b981"],
 ["NA","Not assessed","#64748b"]
];
const panel:React.CSSProperties={background:"white",border:"1px solid #dce8e1",padding:16,borderRadius:13,marginBottom:14};
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
   const {data:s,error:sError}=await supabase.from("students").select("full_name,student_code,date_of_birth,current_class").eq("id",a.student_id).single();
   if(sError||!s)throw new Error("Child information unavailable.");
   setAssessment(a as Assignment);setTemplate(t as Template);setAnswers(a.answers||{});setChildName(s.full_name+" · "+s.student_code);
   
  }catch(e){setError(e instanceof Error?e.message:"Unable to open this test.");}
  finally{setLoading(false);}
 }load();},[params.id,router]);
 const ml=language==="ml";
 const tr=(en:string,translation:string)=>ml?translation:en;
 const sections=template?.structure||[];
 const items=sections.flatMap((section,si)=>section.categories.flatMap((category,ci)=>category.questions.map((q,qi)=>({id:q.id,section:section.title,category:category.title,si,ci,qi,text:q.text,text_ml:q.text_ml,response_type:q.response_type,options:q.options}))));
 const missing=items.filter(x=>x.response_type==="multiple_choice"
  ? answers[x.id]?.choice==null
  : x.response_type==="written"
    ? !answers[x.id]?.written_answer?.trim()
    : answers[x.id]?.score==null);
 const total=items.length,done=total-missing.length;
 const status=assessment?.status||"assigned";
 const readOnly=status==="submitted"||status==="reviewed";
 const progress=total?Math.round(done/total*100):0;
 const isBehaviouralSkills=template?.title==="Behavioural Therapy — Skills Assessment";
 const ratingChoices:[string,string,string][]=isBehaviouralSkills?[["0","Not demonstrated","#ef4444"],["1","Full assistance","#f97316"],["2","Partial assistance","#0284c7"],["3","Independent","#10b981"],["NA","Not observed / Not applicable","#64748b"]]:palette;
 function answer(id:string,patch:Partial<Answer>){
  setAnswers(previous=>({...previous,[id]:{score:previous[id]?.score??null,choice:previous[id]?.choice??null,written_answer:previous[id]?.written_answer??"",observation:previous[id]?.observation??"",...patch}}));
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
   <div><BrandLogo /><div style={{fontSize:12}}>{tr("Custom Child Assessment","കുട്ടികളുടെ പ്രത്യേക വിലയിരുത്തൽ")}</div></div>
   <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <label htmlFor="custom-assessment-language">{tr("Language","ഭാഷ")}</label>
    <select id="custom-assessment-language" value={language} onChange={e=>languageChange(e.target.value as "en"|"ml")} style={{padding:10,borderRadius:7,background:"white",color:"#0f4c5c"}}>
     <option value="en">English</option><option value="ml">മലയാളം</option>
    </select>
    <button style={{...btn,background:"#fff",color:"#0f4c5c"}} onClick={()=>router.push("/parent/dashboard")}>{tr("Dashboard","ഡാഷ്‌ബോർഡ്")}</button>
   </div>
  </header>
  <div style={{maxWidth:1000,margin:"auto",padding:"25px 16px 70px"}}>
   <section style={panel}><div style={{color:"#16697a",fontSize:13}}>CUSTOM ASSESSMENT · {template.level}</div><h1>{template.title}</h1><p>{template.description}</p><p><strong>{tr("Student","വിദ്യാർത്ഥി")}:</strong> {childName} · <strong>{tr("Status","നില")}:</strong> {status==="reviewed"?"Reviewed":status==="submitted"?"Awaiting Teacher Review":status}</p><p style={{fontSize:12,color:"#526b63"}}>{tr("Registration details are linked automatically to the assigned student. No need to enter them in this assessment.","രജിസ്ട്രേഷൻ വിവരങ്ങൾ അസൈൻ ചെയ്ത വിദ്യാർത്ഥിയുമായി സ്വയമേവ ബന്ധിപ്പിച്ചിരിക്കുന്നു. അവ വീണ്ടും നൽകേണ്ടതില്ല.")}</p>
 <p>{tr("Progress","പുരോഗതി")}: {done}/{total} ({progress}%)</p><div style={{height:12,borderRadius:12,background:"#e2e8f0",overflow:"hidden"}}><div style={{height:"100%",width:progress+"%",background:"#16a34a"}}/></div></section>
   {message&&<section role="status" style={{...panel,background:"#e8f5eb",color:"#176b58"}}>{message}</section>}
   {error&&<section role="alert" style={{...panel,background:"#fff1f2",color:"#b42318"}}>{error}</section>}
   {readOnly?
    <section style={panel}><h2>{status==="reviewed"?tr("Teacher Review Complete","അധ്യാപക പരിശോധന പൂർത്തിയായി"):tr("Submitted for Review","പരിശോധനയ്ക്കായി സമർപ്പിച്ചു")}</h2>
     <p>{tr("Your submitted answers are locked.","സമർപ്പിച്ച ഉത്തരങ്ങൾ ഇനി തിരുത്താൻ കഴിയില്ല.")}</p>
     {status==="reviewed"&&<><section style={{...panel,background:"#f0f7f5"}}><h3>{tr("Scoring Summary","സ്കോറിംഗ് സംഗ്രഹം")}</h3>{(()=>{
      const ratingItems=items.filter(item=>!item.response_type||item.response_type==="rating");
      const vals=ratingItems.map(item=>answers[item.id]?.score).filter(v=>v==="0"||v==="1"||v==="2"||v==="3") as string[];
      const na=ratingItems.filter(item=>answers[item.id]?.score==="NA").length;
      const choices=items.filter(item=>item.response_type==="multiple_choice"&&answers[item.id]?.choice!=null).length;
      const written=items.filter(item=>item.response_type==="written"&&Boolean(answers[item.id]?.written_answer?.trim())).length;
      return <p>{tr("Rated questions","സ്കോർ ചെയ്ത ചോദ്യങ്ങൾ")}: {vals.length}/{ratingItems.length} · NA: {na} · {tr("Choices answered","തിരഞ്ഞെടുത്ത ഉത്തരങ്ങൾ")}: {choices} · {tr("Written answers","എഴുതിയ ഉത്തരങ്ങൾ")}: {written} · {tr("Average","ശരാശരി")}: <strong>{vals.length?(vals.reduce((sum,v)=>sum+Number(v),0)/vals.length).toFixed(2)+" / 3":tr("Not rated","സ്കോർ ലഭ്യമല്ല")}</strong></p>;
     })()}<p style={{fontSize:12,color:"#64748b"}}>{tr("NA is excluded from the average. This is a descriptive score, not a diagnosis.","ശരാശരി കണക്കാക്കുമ്പോൾ NA ഉൾപ്പെടുത്തുന്നില്ല. ഇത് ഒരു വിവരണാത്മക സ്കോറാണ്, രോഗനിർണയമല്ല.")}</p></section><h3>{tr("Teacher Feedback","അധ്യാപകന്റെ അഭിപ്രായം")}</h3><p style={{whiteSpace:"pre-wrap"}}>{assessment.teacher_feedback||tr("No written feedback provided.","രേഖാമൂലമുള്ള അഭിപ്രായം നൽകിയിട്ടില്ല.")}</p></>}
     {status==="reviewed"&&<button style={{...btn,marginRight:10}} onClick={()=>router.push("/custom-assessment-report/"+assessment.id)}>{tr("View Report / Print PDF","റിപ്പോർട്ട് / PDF കാണുക")}</button>}
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
    <section style={panel}><h3>{tr("How to Answer","ഉത്തരം നൽകേണ്ട വിധം")}</h3>
     <p>{tr("For rating questions select the score shown (or NA). For multiple-choice questions select an option. For written questions type your own answer.","റേറ്റിംഗ് ചോദ്യങ്ങൾക്ക് കാണിച്ചിരിക്കുന്ന സ്കോർ അല്ലെങ്കിൽ NA തിരഞ്ഞെടുക്കുക. ഓപ്ഷൻ ചോദ്യങ്ങൾക്ക് ഒരു ഉത്തരം തിരഞ്ഞെടുക്കുക. എഴുത്തുചോദ്യങ്ങൾക്ക് സ്വന്തം വാക്കുകളിൽ ഉത്തരം എഴുതുക.")}</p>
    </section>
    <section style={panel}><h3>{tr("Assessment Sections","വിലയിരുത്തൽ വിഭാഗങ്ങൾ")}</h3><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{sections.map((s,si)=>{
     const ids=s.categories.flatMap(c=>c.questions.map(q=>q.id));
     const count=ids.filter(id=>{const item=items.find(q=>q.id===id);return item?.response_type==="written"?Boolean(answers[id]?.written_answer?.trim()):item?.response_type==="multiple_choice"?answers[id]?.choice!=null:answers[id]?.score!=null;}).length;
     return <button key={s.id} style={activeSection===si?btn:{...btn,background:"#e0f2f1",color:"#0f4c5c"}} onClick={()=>setActiveSection(si)}>{tr("Section","വിഭാഗം")} {si+1} · {count}/{ids.length}</button>;
    })}</div></section>
    {sections[activeSection]&&<section style={panel}><h2>{ml&&sections[activeSection].title_ml?sections[activeSection].title_ml:sections[activeSection].title}</h2>
     {sections[activeSection].categories.map((cat,ci)=><div key={cat.id}>
      <h3 style={{background:"#e0f2f1",padding:13,borderRadius:8}}>{ml&&cat.title_ml?cat.title_ml:cat.title}</h3>
      {cat.questions.map((q,qi)=>{
       const a=answers[q.id];
       return <div key={q.id} id={"custom-question-"+q.id} style={{padding:"17px 12px",borderBottom:"1px solid #e2e8f0",borderLeft:showUnanswered&&(q.response_type==="multiple_choice"?a?.choice==null:q.response_type==="written"?!a?.written_answer?.trim():a?.score==null)?"4px solid #f59e0b":"4px solid transparent",background:showUnanswered&&(q.response_type==="multiple_choice"?a?.choice==null:q.response_type==="written"?!a?.written_answer?.trim():a?.score==null)?"#fffbeb":"transparent",scrollMarginTop:100}}>
        <p style={{fontWeight:700,lineHeight:1.6}}>{String.fromCharCode(65+ci)}.{qi+1} — {ml&&q.text_ml?q.text_ml:q.text}</p>
        {q.response_type==="written"
        ? <label style={{display:"block",marginBottom:14}}>
           <span style={{display:"block",marginBottom:8,fontWeight:600}}>{tr("Write your answer in your own words","നിങ്ങളുടെ സ്വന്തം വാക്കുകളിൽ ഉത്തരം എഴുതുക")}</span>
           <textarea style={{...control,minHeight:165,resize:"vertical",lineHeight:1.6}}
            rows={7} maxLength={5000}
            value={a?.written_answer||""}
            placeholder={tr("Type your answer here...","നിങ്ങളുടെ ഉത്തരം ഇവിടെ എഴുതുക...")}
            onChange={event=>answer(q.id,{score:null,choice:null,written_answer:event.target.value})}/>
           <small style={{color:"#64748b"}}>{(a?.written_answer||"").length}/5000 {tr("characters","അക്ഷരങ്ങൾ")}</small>
          </label>
        : q.response_type==="multiple_choice"
        ? <div role="radiogroup" aria-label={tr("Choose one answer","ഒരു ഉത്തരം തിരഞ്ഞെടുക്കുക")} style={{display:"grid",gap:9,marginBottom:12}}>
           {(q.options||[]).map(opt=><button type="button" role="radio" aria-checked={a?.choice===opt.id} key={opt.id}
             onClick={()=>answer(q.id,{score:null,choice:opt.id})}
             style={{padding:"12px 15px",borderRadius:8,background:a?.choice===opt.id?"#d9f3e7":"white",border:a?.choice===opt.id?"2px solid #176b58":"1px solid #cbd5e1",textAlign:"left",color:"#183a35",cursor:"pointer",fontWeight:a?.choice===opt.id?700:400}}>
             <strong>{opt.id}.</strong> {ml&&opt.text_ml?opt.text_ml:opt.text}
           </button>)}
          </div>
        : <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
           {ratingChoices.map(([score,label,color])=><button key={score} title={ml?({ "Not demonstrated":"പ്രകടമാക്കിയില്ല","Full assistance":"പൂർണ്ണ സഹായം","Partial assistance":"ഭാഗിക സഹായം","Independent":"സ്വതന്ത്രമായി","Not observed / Not applicable":"നിരീക്ഷിച്ചില്ല / ബാധകമല്ല","Needs support":"പിന്തുണ വേണം","Developing":"വികസിക്കുന്നു","Not assessed":"വിലയിരുത്തിയില്ല"}[label]||label):label} aria-pressed={a?.score===score} style={{border:"1px solid "+color,background:a?.score===score?color:"white",color:a?.score===score?"white":color,padding:"10px 16px",borderRadius:8,fontWeight:700,cursor:"pointer"}} onClick={()=>answer(q.id,{choice:null,score})}>{score}</button>)}
          </div>}
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
