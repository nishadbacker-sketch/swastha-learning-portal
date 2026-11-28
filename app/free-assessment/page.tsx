"use client";
import {downloadAssessmentCertificatePDF,type AssessmentCertificate} from "../../lib/course-certificate-pdf";

import {useEffect,useMemo,useRef,useState} from "react";
import ScreeningResultsDashboard from "../components/screening-results-dashboard";
import BrandLogo from "../components/brand-logo";

type Response = "yes"|"sometimes"|"no";
type AnswerKey=Record<number,Response>;
type Question={id:number;area:string;en:string;ml:string};
const QUESTIONS:Question[]=[
 {id:1,area:"Academic Skills",en:"Does your child have reading skills appropriate for their age or class?",ml:"നിങ്ങളുടെ കുട്ടിക്ക് പ്രായത്തിനോ പഠിക്കുന്ന ക്ലാസിനോ അനുയോജ്യമായ വായനാകഴിവുണ്ടോ?"},
 {id:2,area:"Academic Skills",en:"Can your child understand the lessons taught at school?",ml:"സ്കൂളിൽ പഠിപ്പിക്കുന്ന പാഠങ്ങൾ നിങ്ങളുടെ കുട്ടിക്ക് മനസ്സിലാക്കാൻ കഴിയുന്നുണ്ടോ?"},
 {id:3,area:"Attention & Concentration",en:"Can your child concentrate while studying?",ml:"പഠിക്കുമ്പോൾ നിങ്ങളുടെ കുട്ടിക്ക് ശ്രദ്ധ കേന്ദ്രീകരിക്കാൻ കഴിയുന്നുണ്ടോ?"},
 {id:4,area:"Attention & Concentration",en:"Can your child finish an activity without being easily distracted?",ml:"എളുപ്പത്തിൽ ശ്രദ്ധ തിരിയാതെ ഒരു പ്രവർത്തനം പൂർത്തിയാക്കാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:5,area:"Memory & Cognitive Skills",en:"Can your child remember things they have learned?",ml:"പഠിച്ച കാര്യങ്ങൾ നിങ്ങളുടെ കുട്ടിക്ക് ഓർത്തെടുക്കാൻ കഴിയുന്നുണ്ടോ?"},
 {id:6,area:"Memory & Cognitive Skills",en:"Can your child independently solve small everyday problems?",ml:"ദൈനംദിന ജീവിതത്തിലെ ചെറിയ പ്രശ്നങ്ങൾ നിങ്ങളുടെ കുട്ടിക്ക് സ്വയം പരിഹരിക്കാൻ കഴിയുമോ?"},
 {id:7,area:"Language & Communication",en:"Can your child understand what others say and the instructions given?",ml:"മറ്റുള്ളവർ പറയുന്നതും നൽകുന്ന നിർദേശങ്ങളും നിങ്ങളുടെ കുട്ടിക്ക് മനസ്സിലാക്കാൻ കഴിയുമോ?"},
 {id:8,area:"Language & Communication",en:"Can your child clearly express their own needs and ideas?",ml:"സ്വന്തം ആവശ്യങ്ങളും ആശയങ്ങളും വ്യക്തമായി പ്രകടിപ്പിക്കാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:9,area:"Emotional Regulation",en:"Can your child manage emotions such as anger, sadness or disappointment?",ml:"ദേഷ്യം, സങ്കടം, നിരാശ തുടങ്ങിയ വികാരങ്ങൾ നിയന്ത്രിക്കാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:10,area:"Emotional Regulation",en:"Can your child adapt to unexpected changes?",ml:"പ്രതീക്ഷിക്കാത്ത മാറ്റങ്ങളുമായി പൊരുത്തപ്പെടാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:11,area:"Social Skills",en:"Can your child interact comfortably with other children?",ml:"മറ്റ് കുട്ടികളുമായി സൗകര്യപ്രദമായി ഇടപഴകാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:12,area:"Social Skills",en:"Can your child cooperate with others in group activities?",ml:"കൂട്ടായ പ്രവർത്തനങ്ങളിൽ മറ്റുള്ളവരുമായി സഹകരിക്കാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:13,area:"Digital Habits",en:"Does your child follow agreed limits for mobile phone and television use?",ml:"മൊബൈൽ ഫോണിന്റെയും ടെലിവിഷന്റെയും ഉപയോഗത്തിന് നിശ്ചയിച്ച പരിധികൾ നിങ്ങളുടെ കുട്ടി പാലിക്കാറുണ്ടോ?"},
 {id:14,area:"Digital Habits",en:"Does your child participate enthusiastically in activities other than digital device use?",ml:"ഡിജിറ്റൽ ഉപകരണങ്ങളുടെ ഉപയോഗം ഒഴികെയുള്ള പ്രവർത്തനങ്ങളിൽ നിങ്ങളുടെ കുട്ടി താൽപര്യത്തോടെ പങ്കെടുക്കാറുണ്ടോ?"},
 {id:15,area:"Responsibility & Independence",en:"Does your child independently do age-appropriate everyday tasks?",ml:"പ്രായത്തിന് അനുയോജ്യമായ ദൈനംദിന കാര്യങ്ങൾ നിങ്ങളുടെ കുട്ടി സ്വയം ചെയ്യാറുണ്ടോ?"},
 {id:16,area:"Responsibility & Independence",en:"Can your child complete responsibilities without constant reminders?",ml:"നിരന്തരം ഓർമ്മിപ്പിക്കാതെ ഉത്തരവാദിത്വങ്ങൾ പൂർത്തിയാക്കാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:17,area:"Learning Motivation",en:"Does your child try to learn independently without being pressured?",ml:"നിർബന്ധിക്കാതെ തന്നെ സ്വയം പഠിക്കാൻ നിങ്ങളുടെ കുട്ടി ശ്രമിക്കാറുണ്ടോ?"},
 {id:18,area:"Learning Motivation",en:"Does your child show interest in learning new things and understanding them?",ml:"പുതിയ കാര്യങ്ങൾ പഠിക്കാനും മനസ്സിലാക്കാനും നിങ്ങളുടെ കുട്ടി താൽപര്യം കാണിക്കാറുണ്ടോ?"},
 {id:19,area:"Self-Confidence",en:"Does your child show confidence in taking part in new activities?",ml:"പുതിയ പ്രവർത്തനങ്ങളിൽ പങ്കെടുക്കുമ്പോൾ നിങ്ങളുടെ കുട്ടി ആത്മവിശ്വാസം പ്രകടിപ്പിക്കാറുണ്ടോ?"},
 {id:20,area:"Self-Confidence",en:"Can your child speak openly about mistakes or challenges?",ml:"തെറ്റുകളെക്കുറിച്ചോ ബുദ്ധിമുട്ടുകളെക്കുറിച്ചോ തുറന്നു സംസാരിക്കാൻ നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:21,area:"Creativity",en:"Does your child come up with new ideas or do things creatively?",ml:"പുതിയ ആശയങ്ങൾ കണ്ടെത്തുകയോ കാര്യങ്ങൾ സർഗാത്മകമായി ചെയ്യുകയോ നിങ്ങളുടെ കുട്ടി ചെയ്യാറുണ്ടോ?"},
 {id:22,area:"Special Talents",en:"Does your child show special ability in art, music, dance, sport or another area?",ml:"കല, സംഗീതം, നൃത്തം, കായികം അല്ലെങ്കിൽ മറ്റേതെങ്കിലും മേഖലയിൽ നിങ്ങളുടെ കുട്ടി പ്രത്യേക കഴിവ് പ്രകടിപ്പിക്കാറുണ്ടോ?"},
 {id:23,area:"Curiosity & Exploration",en:"Does your child ask questions and explore new things to find answers?",ml:"ഉത്തരങ്ങൾ കണ്ടെത്താൻ നിങ്ങളുടെ കുട്ടി ചോദ്യങ്ങൾ ചോദിക്കുകയും പുതിയ കാര്യങ്ങൾ അന്വേഷിക്കുകയും ചെയ്യാറുണ്ടോ?"},
 {id:24,area:"Leadership & Initiative",en:"Does your child take initiative and help guide others in activities?",ml:"പ്രവർത്തനങ്ങളിൽ മുൻകൈ എടുക്കാനും മറ്റുള്ളവരെ നയിക്കാൻ സഹായിക്കാനും നിങ്ങളുടെ കുട്ടിക്ക് കഴിയുമോ?"},
 {id:25,area:"Empathy & Helping Skills",en:"Does your child understand others' feelings and willingly offer help?",ml:"മറ്റുള്ളവരുടെ വികാരങ്ങൾ മനസ്സിലാക്കി മനസ്സോടെ സഹായിക്കാൻ നിങ്ങളുടെ കുട്ടി തയ്യാറാകാറുണ്ടോ?"}
];
const AREAS=Array.from(new Set(QUESTIONS.map(q=>q.area)));
const choices:Response[]=["yes","sometimes","no"];
const ML_AREAS:Record<string,string>={"Academic Skills":"അക്കാദമിക് കഴിവുകൾ","Attention & Concentration":"ശ്രദ്ധയും ഏകാഗ്രതയും","Memory & Cognitive Skills":"ഓർമ്മശക്തിയും ബൗദ്ധിക കഴിവുകളും","Language & Communication":"ഭാഷയും ആശയവിനിമയവും","Emotional Regulation":"വികാരനിയന്ത്രണം","Social Skills":"സാമൂഹിക കഴിവുകൾ","Digital Habits":"ഡിജിറ്റൽ ശീലങ്ങൾ","Responsibility & Independence":"ഉത്തരവാദിത്വവും സ്വയംപര്യാപ്തതയും","Learning Motivation":"പഠനതാൽപര്യം","Self-Confidence":"ആത്മവിശ്വാസം","Creativity":"സർഗാത്മകത","Special Talents":"പ്രത്യേക കഴിവുകൾ","Curiosity & Exploration":"ജിജ്ഞാസയും അന്വേഷണവും","Leadership & Initiative":"നേതൃത്വവും മുൻകൈയും","Empathy & Helping Skills":"സഹാനുഭൂതിയും സഹായമനോഭാവവും"};
const ML_OPTIONS:Record<Response,string>={yes:"അതെ",sometimes:"ചിലപ്പോൾ",no:"ഇല്ല"};
const field:React.CSSProperties={width:"100%",padding:"12px",border:"1px solid #cadfd6",borderRadius:9,background:"#fff",fontSize:15,color:"#183a35",boxSizing:"border-box"};
const panel:React.CSSProperties={background:"#fff",padding:22,borderRadius:16,border:"1px solid #dce8e1",boxShadow:"0 4px 24px #153b2810"};
const primary:React.CSSProperties={border:0,borderRadius:9,background:"#176b58",color:"#fff",padding:"13px 20px",fontSize:14,fontWeight:750,cursor:"pointer"};
type Details={guardian:string;phone:string;contact_differs:boolean;contact_number:string;child:string;gender:string;dob:string;grade:string;notes:string;preferred_date:string;preferred_time:string;consent:boolean};
const initial:Details={guardian:"",phone:"",contact_differs:false,contact_number:"",child:"",gender:"",dob:"",grade:"",notes:"",preferred_date:"",preferred_time:"",consent:false};
export default function FreeChildDevelopmentAssessment(){
 const [details,setDetails]=useState<Details>(initial);
 const [answers,setAnswers]=useState<AnswerKey>({});
 const [language,setLanguage]=useState<"en"|"ml">("en");
 const malayalam=language==="ml";
 const [step,setStep]=useState<"details"|"questions"|"results">("questions");
 const [saving,setSaving]=useState(false);
 const [sent,setSent]=useState(false);
 const [certificate,setCertificate]=useState<AssessmentCertificate|null>(null);
 const [certificateError,setCertificateError]=useState("");
 const [downloading,setDownloading]=useState(false);
 const [studentCode,setStudentCode]=useState("");
 const [error,setError]=useState("");
 const [website,setWebsite]=useState("");
 const key=useRef<string|null>(null);
 const [embedded,setEmbedded]=useState(false);

 useEffect(()=>{
  const allowed=new Set(["https://swasthalearning.com","https://www.swasthalearning.com"]);
  // A main-site button opens this page in a new tab with a trusted opener.
  // Embedded mode remains supported when the main site uses an iframe.
  const sender = window.opener && window.opener !== window
    ? window.opener : window.parent !== window ? window.parent : null;
  if(!sender){
    // All parent/guardian information is collected once on the main site.
    // Opening the portal URL directly should never display a second copy.
    window.location.replace("https://swasthalearning.com/#appointment");
    return;
  }
  setEmbedded(true);
  const onMessage=(event:MessageEvent)=>{
   if(!allowed.has(event.origin)||event.source!==sender) return;
   const payload=event.data;
   if(!payload||payload.type!=="swastha:free-assessment:details")return;
   const d=payload.details;
   if(!d||typeof d!=="object")return;
   const get=(name:string)=>typeof d[name]==="string"?d[name].trim():"";
   const next:Details={
    guardian:get("guardian"),phone:get("phone"),contact_differs:d.contact_differs===true,contact_number:get("contact_number"),child:get("child"),gender:get("gender"),
    dob:get("dob"),grade:get("grade"),notes:get("notes"),
    preferred_date:get("preferred_date"),preferred_time:get("preferred_time"),
    consent:d.consent===true
   };
   if(d.language==="ml"||d.language==="en")setLanguage(d.language);
   if(next.guardian.length<2||next.child.length<2||!/^[+\d\s()-]{8,20}$/.test(next.phone)||
     !/^\d{4}-\d{2}-\d{2}$/.test(next.dob)||!next.grade||!next.consent)return;
   setDetails(next);
   setStep("questions");
   (event.source as WindowProxy).postMessage({type:"swastha:free-assessment:accepted"} ,event.origin);
  };
  window.addEventListener("message",onMessage);
  sender.postMessage({type:"swastha:free-assessment:ready"},"https://swasthalearning.com");
  sender.postMessage({type:"swastha:free-assessment:ready"},"https://www.swasthalearning.com");
  return()=>window.removeEventListener("message",onMessage);
 },[]);
 const count=Object.keys(answers).length;
 const rows=useMemo(()=>AREAS.map(area=>{
  const qq=QUESTIONS.filter(x=>x.area===area);
  const r=qq.map(x=>answers[x.id]).filter(Boolean);
  return {area,yes:r.filter(x=>x==="yes").length,sometimes:r.filter(x=>x==="sometimes").length,no:r.filter(x=>x==="no").length,total:qq.length};
 }),[answers]);
 const development=rows.slice(0,10);
 const strengths=rows.slice(10);
 const discuss=development.filter(x=>x.sometimes+x.no>0);
 function update<K extends keyof Details>(name:K,value:Details[K]){setDetails(p=>({...p,[name]:value}));key.current=null;}
 async function requestGuidance():Promise<AssessmentCertificate|null|undefined>{
  setError("");
  if(Object.keys(answers).length!==25){setError("Please answer all 25 questions before submitting.");return;}
  if(!details.guardian.trim()||!details.child.trim()||!details.phone.trim()||!details.dob||!details.grade||!details.consent){
    setError(malayalam
      ? "പ്രധാന വെബ്സൈറ്റിൽ നൽകിയ കുട്ടിയുടെ വിവരങ്ങൾ ലഭിച്ചിട്ടില്ല. വിലയിരുത്തൽ അടച്ച് പ്രധാന വെബ്സൈറ്റിൽ നിന്ന് വീണ്ടും തുറക്കുക."
      : "Your child details were not transferred from the Swastha main website. Close the assessment and open it again using Go to Free Assessment.");
    return;
  }
  if(website){setError("Invalid submission.");return;}
  setSaving(true);
  if(!key.current)key.current=crypto.randomUUID();
  const brief=discuss.length?discuss.map(x=>x.area).join(", "):"No specific areas flagged";
  const reason=("Online Child Development Screening (25 parent responses). Child gender: "+(details.gender==="male"?"Male":details.gender==="female"?"Female":"Not specified")+". Areas for discussion: "+brief+". Parent notes: "+details.notes).slice(0,1450);
  try{
   const response=await fetch("/api/appointment-intake",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    submission_key:key.current,guardian_name:details.guardian,whatsapp_number:details.phone,contact_differs:details.contact_differs,contact_number:details.contact_differs?details.contact_number:null,
    child_name:details.child,date_of_birth:details.dob,current_class:details.grade,
    preferred_date:details.preferred_date||null,preferred_time:details.preferred_time||null,
    reason,consent:true,website:website,screening_answers:answers
   })});
   const body=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(body?.error||"The clinic could not receive your request.");
   const returnedCode=typeof body?.student_code==="string"?body.student_code.trim():"";
   if(!/^SWA-[0-9]{4}-[0-9]{6,}$/.test(returnedCode)){
     throw new Error("Your answers may have been saved, but the student ID could not be confirmed. Please retry without changing the answers.");
   }
   setCertificate(body?.certificate||null);
   setStudentCode(returnedCode);
   setSent(true);
   setStep("results");
   return body?.certificate||null;
  }catch(e){setError(e instanceof Error?e.message:"Unable to submit the request. Please try again.");}
  finally{setSaving(false);}
 }
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,Helvetica,sans-serif"}}>
  <style>{`@media print {
    @page { size: A4; margin: 12mm; }
    body { background: white !important; }
    body * { visibility: hidden !important; }
    #screening-dashboard, #screening-dashboard * { visibility: visible !important; }
    #screening-dashboard { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; display: block !important; padding: 0 !important; margin: 0 !important; }
    #screening-dashboard > section, #screening-dashboard > div { margin-bottom: 12px !important; }
    #screening-report-actions, #screening-report-actions * { display: none !important; visibility: hidden !important; }
    #screening-dashboard section { break-inside: avoid-page; page-break-inside: avoid; }
    #screening-dashboard { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }`}</style>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"14px 5%"}}>
   <div style={{maxWidth:1040,margin:"auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
    <a href="https://swasthalearning.com/" aria-label="Swastha Learning Clinic home"><BrandLogo/></a>
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
     <label htmlFor="screening-language" style={{fontSize:12,fontWeight:700,color:"#176b58"}}>Language / ഭാഷ</label>
     <select id="screening-language" aria-label="Select questionnaire language" value={language} onChange={e=>setLanguage(e.target.value==="ml"?"ml":"en")} style={{...field,width:"auto",minWidth:142,padding:"8px 10px"}}>
      <option value="en">English</option><option value="ml">മലയാളം</option>
     </select>
     <span style={{fontSize:12,fontWeight:750,color:"#176b58",background:"#eaf4ef",padding:"8px 12px",borderRadius:100}}>FREE ONLINE SCREENING</span>
    </div>
   </div>
  </header>
  <div style={{maxWidth:step==="results"?1440:1040,margin:"auto",padding:"30px 16px 70px"}}>
   {step==="questions"&&<>
   <section style={{...panel,background:"linear-gradient(115deg,#075b4d,#176b58)",color:"#fff"}}>
    <div style={{color:"#c8f1df",fontWeight:800,letterSpacing:2,fontSize:11}}>SWASTHA LEARNING CLINIC</div>
    <h1 style={{color:"#fff",fontSize:"clamp(26px,4vw,37px)",margin:"9px 0"}}>{malayalam?"ഓരോ കുട്ടിക്കും വളരാൻ തനതായ വഴിയുണ്ട്.":"Every child has a special way to grow."}</h1>
    <p style={{color:"#ebf6f0",lineHeight:1.65,margin:"0 0 12px"}}>{malayalam?"ഈ സൗജന്യ രക്ഷിതൃ ചോദ്യാവലി പൂർത്തിയാക്കി നിങ്ങളുടെ കുട്ടിയുടെ മികവുകളും കൂടുതൽ പിന്തുണ ആവശ്യമായ മേഖലകളും മനസ്സിലാക്കൂ. വാട്സാപ്പ് ആവശ്യമില്ല.":"Complete a free parent questionnaire and discover your child\u0027s reported strengths and areas that may benefit from a conversation with our team. No WhatsApp is required."}</p>
    <span style={{fontSize:12,color:"#f4f6eb"}}>{malayalam?"ഏകദേശം 5–10 മിനിറ്റ് · 25 ചോദ്യങ്ങൾ · സൗജന്യം":"About 5–10 minutes · 25 questions · No payment"}</span>
   </section>
   <nav aria-label="Assessment steps" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"18px 0"}}>
    {(["questions","results"] as const).map((x,i)=><span key={x} style={{borderRadius:99,padding:"9px 15px",background:step===x?"#176b58":"#eaf4ef",color:step===x?"white":"#176b58",fontSize:13,fontWeight:700}}>{i+1}. {x==="questions"?(malayalam?"ചോദ്യാവലി":"Questionnaire"):(malayalam?"ഫലവും മാർഗനിർദേശവും":"Summary & guidance")}</span>)}
   </nav>
   </>}
   {step==="questions"&&<div style={{display:"grid",gap:14}}>
    <section style={panel}><h2 style={{fontSize:22,margin:"0 0 6px"}}>{malayalam?"കുട്ടികളുടെ വികസന ചോദ്യാവലി":"Child Development Questionnaire"}</h2><p style={{color:"#667a74",fontSize:13}}>{malayalam?"കുട്ടിയിൽ സാധാരണയായി നിങ്ങൾ കാണുന്ന കാര്യങ്ങളെ അടിസ്ഥാനമാക്കി ഉത്തരം നൽകുക. ശരിയോ തെറ്റോ ആയ ഉത്തരങ്ങളില്ല.":"Answer according to what you usually observe. There are no right or wrong answers."}</p>
     <strong style={{fontSize:13}}>{malayalam?`25 ചോദ്യങ്ങളിൽ ${count} എണ്ണത്തിന് ഉത്തരം നൽകി`:`${count} of 25 answered`}</strong><div style={{marginTop:8,height:9,background:"#eaf4ef",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:(count/25*100)+"%",background:"#176b58"}}/></div></section>
    {AREAS.map((area,i)=><section key={area} style={panel}>
     <h3 style={{fontSize:18,color:"#176b58",margin:"0 0 16px"}}><span style={{color:"#d97706",marginRight:10}}>{String(i+1).padStart(2,"0")}</span>{malayalam?ML_AREAS[area]:area}</h3>
     {QUESTIONS.filter(q=>q.area===area).map(q=><fieldset key={q.id} style={{border:0,borderTop:"1px solid #e5eee9",padding:"14px 0 9px",margin:0}}>
      <legend style={{fontSize:14,fontWeight:700,paddingTop:12}}>{q.id}. {malayalam?q.ml:q.en}</legend>
      <div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:12}}>{choices.map(value=><label key={value} style={{display:"flex",gap:6,alignItems:"center",cursor:"pointer",fontSize:14}}><input type="radio" name={"answer-"+q.id} checked={answers[q.id]===value} onChange={()=>setAnswers(a=>({...a,[q.id]:value}))}/>{malayalam?ML_OPTIONS[value]:value==="yes"?"Yes":value==="sometimes"?"Sometimes":"No"}</label>)}</div>
     </fieldset>)}
    </section>)}
    <section style={panel}><label style={{fontWeight:700,fontSize:14,display:"grid",gap:9}}>{malayalam?"രക്ഷിതാവിന്റെ അധിക നിരീക്ഷണങ്ങൾ":"Additional parent observations"}<textarea rows={3} maxLength={700} value={details.notes} onChange={e=>update("notes",e.target.value)} style={{...field,fontFamily:"inherit"}} placeholder={malayalam?"നിങ്ങളുടെ കുട്ടിയുടെ ഏറ്റവും വലിയ കഴിവ് എന്താണെന്ന് നിങ്ങൾ കരുതുന്നു?":"What do you consider your child\u0027s strongest ability?"}/></label>
     {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
     <div style={{display:"flex",justifyContent:"flex-end",flexWrap:"wrap",gap:10,marginTop:18}}><button style={{...primary,opacity:count===25?1:.45}} disabled={count!==25||saving} onClick={()=>void requestGuidance()}>{saving?(malayalam?"സംരക്ഷിക്കുന്നു…":"Saving assessment…"):(malayalam?"വിലയിരുത്തൽ സമർപ്പിച്ച് ഫലം കാണുക →":"Submit Assessment & View Summary →")}</button></div>
    </section>
   </div>}
   {step==="results"&&sent&&studentCode&&<div style={{display:"grid",gap:16}} id="screening-dashboard">
    <section style={{...panel,background:"linear-gradient(125deg,#07553f,#086b51)",color:"#fff"}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:1.6,color:"#baf2d6"}}>{malayalam?"കുട്ടികളുടെ പഠന-വികസന റിപ്പോർട്ട്":"CHILD LEARNING & DEVELOPMENT REPORT"}</div>
      <h2 style={{margin:"9px 0 5px",fontSize:"clamp(22px,4vw,30px)",color:"white"}}>{malayalam?details.child+" – ഡാഷ്‌ബോർഡ്":details.child+" — Dashboard"}</h2>
      <p style={{margin:"5px 0 14px",fontSize:13,color:"#d9f4e9"}}>{malayalam?"നിങ്ങൾ നൽകിയ 25 ഉത്തരങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ള റിപ്പോർട്ട്":"Your personalized parent-reported screening summary, based on all 25 answers"}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
        <div style={{border:"1px solid #ffffff55",background:"#ffffff18",padding:16,borderRadius:12}}>
          <div style={{fontSize:12,color:"#d4f4e3",marginBottom:7}}>{malayalam?"സ്ഥിരം വിദ്യാർത്ഥി ഐഡി":"PERMANENT STUDENT ID"}</div>
          <strong style={{fontSize:22,letterSpacing:.6,color:"#fff",overflowWrap:"anywhere"}} data-student-id={studentCode}>{studentCode}</strong>
        </div>
        <div style={{border:"1px solid #ffffff55",background:"#ffffff18",padding:16,borderRadius:12}}>
          <div style={{fontSize:12,color:"#d4f4e3",marginBottom:7}}>{malayalam?"ക്ലാസ്":"CURRENT CLASS"}</div>
          <strong style={{fontSize:21,color:"#fff"}}>{details.grade}</strong>
        </div>
      </div>
    </section>
    <ScreeningResultsDashboard rows={rows} malayalam={malayalam}/>
    <section style={panel}>
      <h3 style={{margin:"0 0 12px",fontSize:19,color:"#0b3056"}}>{malayalam?"റിപ്പോർട്ടും തുടർനടപടികളും":"Your report & follow-up"}</h3>
      <div role="status" style={{padding:14,borderRadius:10,background:"#eaf4ef",color:"#075c44",fontSize:13,lineHeight:1.7}}>
        {malayalam?"25 ഉത്തരങ്ങളും വിജയകരമായി സംരക്ഷിച്ചു.":"All 25 responses were saved successfully."}
        <strong style={{display:"block",fontSize:16,marginTop:5}}>{malayalam?"വിദ്യാർത്ഥി ഐഡി: ":"Student ID: "}{studentCode}</strong>
        <span>{malayalam?"ഞങ്ങളുടെ ടീം രജിസ്റ്റർ ചെയ്ത നമ്പറിൽ ബന്ധപ്പെടും. ഇത് സ്ഥിരീകരിച്ച അപ്പോയിന്റ്മെന്റല്ല.":"Our team can follow up using the registered contact number. This does not confirm an appointment."}</span>
      </div>
      <div id="screening-report-actions" style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:14}}>
        <button type="button" style={primary} onClick={()=>window.print()}>{malayalam?"റിപ്പോർട്ട് പ്രിന്റ് / PDF ആയി സംരക്ഷിക്കുക":"Download / Print Report (PDF)"}</button>
        <button type="button" style={primary} disabled={downloading} onClick={async()=>{setCertificateError("");setDownloading(true);try{const ready=certificate||await requestGuidance();if(!ready)throw new Error("Certificate unavailable");await downloadAssessmentCertificatePDF(ready);}catch{setCertificateError("Certificate download failed. Please try again.");}finally{setDownloading(false);}}}>{downloading?"Preparing certificate…":(malayalam?"സർട്ടിഫിക്കറ്റ് ഡൗൺലോഡ് ചെയ്യുക":"Download Certificate (PDF)")}</button>
        <a href="https://swasthalearning.com/" target="_top" style={{...primary,background:"#e9f4ee",color:"#075d47",textDecoration:"none"}}>{malayalam?"വെബ്സൈറ്റിലേക്ക് മടങ്ങുക":"← Back to Swastha Website"}</a>
        {certificateError&&<p role="alert">{certificateError}</p>}
      </div>
    </section>
    <p style={{margin:"0",fontSize:11,color:"#61716c",lineHeight:1.6}}>{malayalam?"ഇത് രക്ഷിതാവിന്റെ നിരീക്ഷണങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ള വിദ്യാഭ്യാസപരമായ സ്ക്രീനിംഗാണ്; മെഡിക്കൽ രോഗനിർണ്ണയമോ മാനദണ്ഡപ്പെടുത്തിയ ക്ലിനിക്കൽ പരിശോധനയോ അല്ല.":"This is an educational parent-report screening, not a medical diagnosis or standardized clinical assessment. Visuals represent response counts rather than validated diagnostic percentages."}</p>
   </div>}
  </div>
 </main>;
}
