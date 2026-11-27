"use client";

import {useEffect,useMemo,useRef,useState} from "react";
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
  if(!sender) return;
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
 async function requestGuidance(){
  setError("");
  if(!details.guardian.trim()||!details.child.trim()||!details.phone.trim()||!details.dob||!details.grade||!details.consent){
    if(embedded){
      setError("We could not receive the parent and child details from the main website. Close this assessment and select Go to Free Assessment again. Your answers have not been submitted.");
    }else{
      setStep("details");
      setError("Please complete your child details and consent before submitting.");
    }
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
   setSent(true);
   setStudentCode(typeof body?.student_code==="string"?body.student_code:"");
   setStep("results");
  }catch(e){setError(e instanceof Error?e.message:"Unable to submit the request. Please try again.");}
  finally{setSaving(false);}
 }
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,Helvetica,sans-serif"}}>
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
  <div style={{maxWidth:1040,margin:"auto",padding:"30px 16px 70px"}}>
   <section style={{...panel,background:"linear-gradient(115deg,#075b4d,#176b58)",color:"#fff"}}>
    <div style={{color:"#c8f1df",fontWeight:800,letterSpacing:2,fontSize:11}}>SWASTHA LEARNING CLINIC</div>
    <h1 style={{color:"#fff",fontSize:"clamp(26px,4vw,37px)",margin:"9px 0"}}>{malayalam?"ഓരോ കുട്ടിക്കും വളരാൻ തനതായ വഴിയുണ്ട്.":"Every child has a special way to grow."}</h1>
    <p style={{color:"#ebf6f0",lineHeight:1.65,margin:"0 0 12px"}}>{malayalam?"ഈ സൗജന്യ രക്ഷിതൃ ചോദ്യാവലി പൂർത്തിയാക്കി നിങ്ങളുടെ കുട്ടിയുടെ മികവുകളും കൂടുതൽ പിന്തുണ ആവശ്യമായ മേഖലകളും മനസ്സിലാക്കൂ. വാട്സാപ്പ് ആവശ്യമില്ല.":"Complete a free parent questionnaire and discover your child\u0027s reported strengths and areas that may benefit from a conversation with our team. No WhatsApp is required."}</p>
    <span style={{fontSize:12,color:"#f4f6eb"}}>{malayalam?"ഏകദേശം 5–10 മിനിറ്റ് · 25 ചോദ്യങ്ങൾ · സൗജന്യം":"About 5–10 minutes · 25 questions · No payment"}</span>
   </section>
   <nav aria-label="Assessment steps" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"18px 0"}}>
    {(["questions","results"] as const).map((x,i)=><span key={x} style={{borderRadius:99,padding:"9px 15px",background:step===x?"#176b58":"#eaf4ef",color:step===x?"white":"#176b58",fontSize:13,fontWeight:700}}>{i+1}. {x==="questions"?(malayalam?"ചോദ്യാവലി":"Questionnaire"):(malayalam?"ഫലവും മാർഗനിർദേശവും":"Summary & guidance")}</span>)}
   </nav>
   {!embedded&&step==="details"&&<section style={panel}>
    <h2 style={{fontSize:23,margin:"0 0 8px"}}>{malayalam?"പൂർത്തിയാക്കിയ വിലയിരുത്തൽ സംരക്ഷിക്കുക":"Save your completed screening"}</h2>
    <p style={{fontSize:13,color:"#667a74",marginBottom:18}}>{malayalam?"25 ചോദ്യങ്ങൾക്കുള്ള ഉത്തരങ്ങൾ തയ്യാറായി. അവ സ്വാസ്ഥ വിദ്യാർത്ഥി ഐഡിയുമായി ബന്ധപ്പെടുത്തി സൂക്ഷിക്കാൻ കുട്ടിയുടെ വിവരങ്ങൾ നൽകുക.":"Your 25 responses are ready. Please provide your child details so we can save the answers under a Swastha student ID."}</p>
    <form onSubmit={e=>{e.preventDefault();void requestGuidance();}}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:16}}>
      {([["guardian","Parent / guardian name","text"],["phone","Contact number","tel"],["child","Child's name","text"],["dob","Date of birth","date"],["grade","Current class","text"]] as const).map(([name,label,type])=><label key={name} style={{display:"grid",gap:7,fontWeight:700,fontSize:13}}>{label} *<input required type={type} style={field} max={type==="date"?new Date().toISOString().slice(0,10):undefined} value={details[name]} onChange={e=>update(name,e.target.value)}/></label>)}
     </div>
     <label style={{display:"grid",gap:7,fontWeight:700,fontSize:13,marginTop:14,maxWidth:300}}>{malayalam?"ലിംഗം":"Gender"} *<select required style={field} value={details.gender} onChange={e=>update("gender",e.target.value)}><option value="">{malayalam?"ലിംഗം തിരഞ്ഞെടുക്കുക":"Select gender"}</option><option value="male">{malayalam?"ആൺകുട്ടി":"Male"}</option><option value="female">{malayalam?"പെൺകുട്ടി":"Female"}</option></select></label>
     <label style={{display:"flex",alignItems:"flex-start",gap:9,marginTop:18,fontSize:12,lineHeight:1.6}}><input type="checkbox" required checked={details.consent} onChange={e=>update("consent",e.target.checked)}/> {malayalam?"എന്റെ കുട്ടിയുടെ ഉത്തരങ്ങൾ സ്വാസ്ഥ വിദ്യാർത്ഥി ഐഡിയോട് ബന്ധപ്പെടുത്തി സൂക്ഷിക്കുന്നതിനും ഈ സൗജന്യ വിലയിരുത്തലുമായി ബന്ധപ്പെട്ട് ക്ലിനിക്ക് എന്നെ ബന്ധപ്പെടുന്നതിനും ഞാൻ സമ്മതിക്കുന്നു. *":"I consent to saving my child\u0027s answers under a Swastha student ID and allow the clinic to contact me about this free screening. *"}</label>
     <p style={{marginTop:18,fontSize:12,color:"#667a74"}}>{malayalam?"ഇത് രക്ഷിതാവിന്റെ നിരീക്ഷണങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ള വിദ്യാഭ്യാസപരമായ സ്ക്രീനിംഗാണ്; മെഡിക്കൽ രോഗനിർണ്ണയമോ മാനദണ്ഡപ്പെടുത്തിയ ക്ലിനിക്കൽ പരിശോധനയോ അല്ല.":"This is an educational parent-report screening, not a medical diagnosis or a standardized clinical assessment."}</p>
     {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
     <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" style={{...primary,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setError("");setStep("questions");}}>{malayalam?"ഉത്തരങ്ങൾ പരിശോധിക്കുക":"Review answers"}</button><button type="submit" disabled={saving} style={{...primary,opacity:saving?.6:1}}>{saving?(malayalam?"സംരക്ഷിക്കുന്നു…":"Saving screening…"):(malayalam?"വിലയിരുത്തൽ സംരക്ഷിച്ച് ഫലം കാണുക →":"Save Assessment & View Summary →")}</button></div>
    </form>
   </section>}
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
     <div style={{display:"flex",justifyContent:"flex-end",flexWrap:"wrap",gap:10,marginTop:18}}><button style={{...primary,opacity:count===25?1:.45}} disabled={count!==25||saving} onClick={()=>{if(details.guardian&&details.child&&details.phone&&details.dob&&details.grade&&details.consent){void requestGuidance();}else if(embedded){setError("Your child details were not transferred from the main website. Close this assessment, return to the main website, and click Go to Free Assessment again.");}else{setError("");setStep("details");window.scrollTo({top:0,behavior:"smooth"});}}}>{saving?(malayalam?"സംരക്ഷിക്കുന്നു…":"Saving assessment…"):details.guardian&&details.child&&details.phone&&details.dob&&details.grade&&details.consent?(malayalam?"വിലയിരുത്തൽ സമർപ്പിച്ച് ഫലം കാണുക →":"Submit Assessment & View Summary →"):(embedded?"Complete form handoff to submit":"Continue to save screening →")}</button></div>
    </section>
   </div>}
   {step==="results"&&<div style={{display:"grid",gap:16}}>
    <section style={panel}>
     <div style={{fontSize:12,fontWeight:750,color:"#176b58"}}>{malayalam?"ചോദ്യാവലി പൂർത്തിയായി · 25/25":"QUESTIONNAIRE COMPLETED · 25/25"}</div>
     <h2 style={{fontSize:26,margin:"9px 0 6px"}}>{malayalam?`${details.child} – സ്ക്രീനിംഗ് സംഗ്രഹം`:`${details.child}\u0027s Screening Summary`}</h2>
     <p style={{color:"#667a74",fontSize:13}}>{malayalam?"നിങ്ങൾ നൽകിയ ഉത്തരങ്ങളുടെ അടിസ്ഥാനത്തിലുള്ള സംഗ്രഹമാണിത്. ഇത് രക്ഷിതാവിന്റെ നിരീക്ഷണങ്ങൾ മാത്രമാണ്; വിശദമായി മനസ്സിലാക്കാൻ സ്വാസ്ഥ അധ്യാപകന്റെ സഹായം ലഭിക്കും.":"Here is what your responses indicate. The summary reflects parent observations only; a Swastha educator can help you interpret them in context."}</p>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginTop:16}}>
      <div style={{padding:16,background:"#eaf4ef",borderRadius:10}}><strong style={{color:"#176b58",fontSize:26}}>{strengths.filter(x=>x.yes>0).length}/5</strong><div style={{fontSize:13}}>{malayalam?"അതെ എന്നു രേഖപ്പെടുത്തിയ മികവിന്റെ മേഖലകൾ":"Strength areas with a Yes response"}</div></div>
      <div style={{padding:16,background:"#fff2e5",borderRadius:10}}><strong style={{color:"#9c570f",fontSize:26}}>{discuss.length}/10</strong><div style={{fontSize:13}}>{malayalam?"കൂടുതൽ ചർച്ച ചെയ്യാവുന്ന വികസന മേഖലകൾ":"Development areas to discuss"}</div></div>
     </div>
    </section>
    <section style={panel}><h3 style={{margin:"0 0 14px"}}>{malayalam?"വികസന മേഖലകൾ":"Development areas"}</h3>
     {development.map(r=><div key={r.area} style={{marginBottom:17}}><div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:13,fontWeight:700}}><span>{malayalam?ML_AREAS[r.area]:r.area}</span><span>{r.yes} {malayalam?"അതെ":"Yes"} · {r.sometimes} {malayalam?"ചിലപ്പോൾ":"Sometimes"} · {r.no} {malayalam?"ഇല്ല":"No"}</span></div><div style={{height:11,display:"flex",borderRadius:20,overflow:"hidden",marginTop:8,background:"#e4eee7"}}><div style={{width:r.yes/r.total*100+"%",background:"#1b9865"}}/><div style={{width:r.sometimes/r.total*100+"%",background:"#eea23e"}}/><div style={{width:r.no/r.total*100+"%",background:"#9fb2c2"}}/></div></div>)}
     <p style={{fontSize:12,color:"#667a74"}}>{malayalam?"പച്ച = അതെ, ഓറഞ്ച് = ചിലപ്പോൾ, ചാരനീല = ഇല്ല. ഇവ ഉത്തരങ്ങളുടെ എണ്ണമാണ്; രോഗനിർണ്ണയ ശതമാനമോ റാങ്കിംഗോ അല്ല.":"Green = Yes, orange = Sometimes, grey-blue = No. These are response counts, not diagnostic percentages or rankings."}</p>
    </section>
    <section style={panel}><h3 style={{margin:"0 0 13px"}}>{malayalam?"മികവുകളും സാധ്യതകളും":"Strengths & potential"}</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
     {strengths.map(r=><div key={r.area} style={{padding:14,background:"#f4faf6",borderRadius:11,border:"1px solid #dce8e1"}}><div style={{fontSize:13,fontWeight:700}}>{malayalam?ML_AREAS[r.area]:r.area}</div><div style={{marginTop:10,fontSize:13,color:"#176b58"}}>{r.yes?(malayalam?"കണ്ടെത്തിയ മികവ്":"Reported strength"):r.sometimes?(malayalam?"ചിലപ്പോൾ കാണപ്പെടുന്നു":"Sometimes observed"):(malayalam?"കൂടുതൽ അന്വേഷിക്കുക":"Explore together")}</div></div>)}
    </div></section>
    <section style={panel}><h3 style={{fontSize:20,marginTop:0}}>Your next step: free guidance discussion</h3>
     <p style={{lineHeight:1.65,fontSize:14}}>You may request a conversation with a Swastha educator. The clinic can review the screening with you, suggest home activities and discuss whether a suitable support course or an in-person assessment would be useful. No purchase is required.</p>
     <div role="status" style={{padding:16,background:"#eaf4ef",borderRadius:10,color:"#176b58",fontWeight:700}}>
      Your free assessment and all 25 answers have been submitted for clinic follow-up.
      {studentCode&&<div style={{marginTop:6}}>Student ID: <strong>{studentCode}</strong></div>}
      <div style={{fontSize:12,fontWeight:400,marginTop:6}}>The clinic will contact you using your registered number. This is not a confirmed appointment.</div>
     </div>
     {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
     <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:15}}><button type="button" style={{...primary,background:"#eaf4ef",color:"#176b58"}} onClick={()=>window.print()}>Print / Save Screening Summary</button></div>
    </section>
   </div>}
  </div>
 </main>;
}
