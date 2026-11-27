"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import BrandLogo from "../components/brand-logo";

type Response = "yes"|"sometimes"|"no";
type AnswerKey=Record<number,Response>;
type Question={id:number;area:string;en:string};
const QUESTIONS:Question[]=[
 {id:1,area:"Academic Skills",en:"Does your child have reading skills appropriate for their age or class?"},
 {id:2,area:"Academic Skills",en:"Can your child understand the lessons taught at school?"},
 {id:3,area:"Attention & Concentration",en:"Can your child concentrate while studying?"},
 {id:4,area:"Attention & Concentration",en:"Can your child finish an activity without being easily distracted?"},
 {id:5,area:"Memory & Cognitive Skills",en:"Can your child remember things they have learned?"},
 {id:6,area:"Memory & Cognitive Skills",en:"Can your child independently solve small everyday problems?"},
 {id:7,area:"Language & Communication",en:"Can your child understand what others say and the instructions given?"},
 {id:8,area:"Language & Communication",en:"Can your child clearly express their own needs and ideas?"},
 {id:9,area:"Emotional Regulation",en:"Can your child manage emotions such as anger, sadness or disappointment?"},
 {id:10,area:"Emotional Regulation",en:"Can your child adapt to unexpected changes?"},
 {id:11,area:"Social Skills",en:"Can your child interact comfortably with other children?"},
 {id:12,area:"Social Skills",en:"Can your child cooperate with others in group activities?"},
 {id:13,area:"Digital Habits",en:"Does your child follow agreed limits for mobile phone and television use?"},
 {id:14,area:"Digital Habits",en:"Does your child participate enthusiastically in activities other than digital device use?"},
 {id:15,area:"Responsibility & Independence",en:"Does your child independently do age-appropriate everyday tasks?"},
 {id:16,area:"Responsibility & Independence",en:"Can your child complete responsibilities without constant reminders?"},
 {id:17,area:"Learning Motivation",en:"Does your child try to learn independently without being pressured?"},
 {id:18,area:"Learning Motivation",en:"Does your child show interest in learning new things and understanding them?"},
 {id:19,area:"Self-Confidence",en:"Does your child show confidence in taking part in new activities?"},
 {id:20,area:"Self-Confidence",en:"Can your child speak openly about mistakes or challenges?"},
 {id:21,area:"Creativity",en:"Does your child come up with new ideas or do things creatively?"},
 {id:22,area:"Special Talents",en:"Does your child show special ability in art, music, dance, sport or another area?"},
 {id:23,area:"Curiosity & Exploration",en:"Does your child ask questions and explore new things to find answers?"},
 {id:24,area:"Leadership & Initiative",en:"Does your child take initiative and help guide others in activities?"},
 {id:25,area:"Empathy & Helping Skills",en:"Does your child understand others' feelings and willingly offer help?"}
];
const AREAS=Array.from(new Set(QUESTIONS.map(q=>q.area)));
const choices:[Response,string][]=[["yes","Yes"],["sometimes","Sometimes"],["no","No"]];
const field:React.CSSProperties={width:"100%",padding:"12px",border:"1px solid #cadfd6",borderRadius:9,background:"#fff",fontSize:15,color:"#183a35",boxSizing:"border-box"};
const panel:React.CSSProperties={background:"#fff",padding:22,borderRadius:16,border:"1px solid #dce8e1",boxShadow:"0 4px 24px #153b2810"};
const primary:React.CSSProperties={border:0,borderRadius:9,background:"#176b58",color:"#fff",padding:"13px 20px",fontSize:14,fontWeight:750,cursor:"pointer"};
type Details={guardian:string;phone:string;contact_differs:boolean;contact_number:string;child:string;gender:string;dob:string;grade:string;notes:string;preferred_date:string;preferred_time:string;consent:boolean};
const initial:Details={guardian:"",phone:"",contact_differs:false,contact_number:"",child:"",gender:"",dob:"",grade:"",notes:"",preferred_date:"",preferred_time:"",consent:false};
export default function FreeChildDevelopmentAssessment(){
 const [details,setDetails]=useState<Details>(initial);
 const [answers,setAnswers]=useState<AnswerKey>({});
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
   if(next.guardian.length<2||next.child.length<2||!/^[+\\d\\s()-]{8,20}$/.test(next.phone)||
     !/^\\d{4}-\\d{2}-\\d{2}$/.test(next.dob)||!next.grade||!next.consent)return;
   setDetails(next);
   setStep("questions");
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
    <span style={{fontSize:12,fontWeight:750,color:"#176b58",background:"#eaf4ef",padding:"8px 12px",borderRadius:100}}>FREE ONLINE SCREENING</span>
   </div>
  </header>
  <div style={{maxWidth:1040,margin:"auto",padding:"30px 16px 70px"}}>
   <section style={{...panel,background:"linear-gradient(115deg,#075b4d,#176b58)",color:"#fff"}}>
    <div style={{color:"#c8f1df",fontWeight:800,letterSpacing:2,fontSize:11}}>SWASTHA LEARNING CLINIC</div>
    <h1 style={{color:"#fff",fontSize:"clamp(26px,4vw,37px)",margin:"9px 0"}}>Every child has a special way to grow.</h1>
    <p style={{color:"#ebf6f0",lineHeight:1.65,margin:"0 0 12px"}}>Complete a free parent questionnaire and discover your child's reported strengths and areas that may benefit from a conversation with our team. No WhatsApp is required.</p>
    <span style={{fontSize:12,color:"#f4f6eb"}}>About 5–10 minutes · 25 questions · No payment</span>
   </section>
   <nav aria-label="Assessment steps" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"18px 0"}}>
    {(["questions","results"] as const).map((x,i)=><span key={x} style={{borderRadius:99,padding:"9px 15px",background:step===x?"#176b58":"#eaf4ef",color:step===x?"white":"#176b58",fontSize:13,fontWeight:700}}>{i+1}. {x==="questions"?"Questionnaire":"Summary & guidance"}</span>)}
   </nav>
   {!embedded&&step==="details"&&<section style={panel}>
    <h2 style={{fontSize:23,margin:"0 0 8px"}}>Save your completed screening</h2>
    <p style={{fontSize:13,color:"#667a74",marginBottom:18}}>Your 25 responses are ready. Please provide your child details so we can save the answers under a Swastha student ID.</p>
    <form onSubmit={e=>{e.preventDefault();void requestGuidance();}}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:16}}>
      {([["guardian","Parent / guardian name","text"],["phone","Contact number","tel"],["child","Child's name","text"],["dob","Date of birth","date"],["grade","Current class","text"]] as const).map(([name,label,type])=><label key={name} style={{display:"grid",gap:7,fontWeight:700,fontSize:13}}>{label} *<input required type={type} style={field} max={type==="date"?new Date().toISOString().slice(0,10):undefined} value={details[name]} onChange={e=>update(name,e.target.value)}/></label>)}
     </div>
     <label style={{display:"grid",gap:7,fontWeight:700,fontSize:13,marginTop:14,maxWidth:300}}>Gender *<select required style={field} value={details.gender} onChange={e=>update("gender",e.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></select></label>
     <label style={{display:"flex",alignItems:"flex-start",gap:9,marginTop:18,fontSize:12,lineHeight:1.6}}><input type="checkbox" required checked={details.consent} onChange={e=>update("consent",e.target.checked)}/> I consent to saving my child\'s answers under a Swastha student ID and allow the clinic to contact me about this free screening. *</label>
     <p style={{marginTop:18,fontSize:12,color:"#667a74"}}>This is an educational parent-report screening, not a medical diagnosis or a standardized clinical assessment.</p>
     {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
     <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" style={{...primary,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setError("");setStep("questions");}}>Review answers</button><button type="submit" disabled={saving} style={{...primary,opacity:saving?.6:1}}>{saving?"Saving screening…":"Save Assessment & View Summary →"}</button></div>
    </form>
   </section>}
   {step==="questions"&&<div style={{display:"grid",gap:14}}>
    <section style={panel}><h2 style={{fontSize:22,margin:"0 0 6px"}}>Child Development Questionnaire</h2><p style={{color:"#667a74",fontSize:13}}>Answer according to what you usually observe. There are no right or wrong answers.</p>
     <strong style={{fontSize:13}}>{count} of 25 answered</strong><div style={{marginTop:8,height:9,background:"#eaf4ef",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:(count/25*100)+"%",background:"#176b58"}}/></div></section>
    {AREAS.map((area,i)=><section key={area} style={panel}>
     <h3 style={{fontSize:18,color:"#176b58",margin:"0 0 16px"}}><span style={{color:"#d97706",marginRight:10}}>{String(i+1).padStart(2,"0")}</span>{area}</h3>
     {QUESTIONS.filter(q=>q.area===area).map(q=><fieldset key={q.id} style={{border:0,borderTop:"1px solid #e5eee9",padding:"14px 0 9px",margin:0}}>
      <legend style={{fontSize:14,fontWeight:700,paddingTop:12}}>{q.id}. {q.en}</legend>
      <div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:12}}>{choices.map(([value,label])=><label key={value} style={{display:"flex",gap:6,alignItems:"center",cursor:"pointer",fontSize:14}}><input type="radio" name={"answer-"+q.id} checked={answers[q.id]===value} onChange={()=>setAnswers(a=>({...a,[q.id]:value}))}/>{label}</label>)}</div>
     </fieldset>)}
    </section>)}
    <section style={panel}><label style={{fontWeight:700,fontSize:14,display:"grid",gap:9}}>Additional parent observations<textarea rows={3} maxLength={700} value={details.notes} onChange={e=>update("notes",e.target.value)} style={{...field,fontFamily:"inherit"}} placeholder="What do you consider your child's strongest ability?"/></label>
     {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
     <div style={{display:"flex",justifyContent:"flex-end",flexWrap:"wrap",gap:10,marginTop:18}}><button style={{...primary,opacity:count===25?1:.45}} disabled={count!==25||saving} onClick={()=>{if(details.guardian&&details.child&&details.phone&&details.dob&&details.grade&&details.consent){void requestGuidance();}else if(embedded){setError("Your child details were not transferred from the main website. Close this assessment, return to the main website, and click Go to Free Assessment again.");}else{setError("");setStep("details");window.scrollTo({top:0,behavior:"smooth"});}}}>{saving?"Saving assessment…":details.guardian&&details.child&&details.phone&&details.dob&&details.grade&&details.consent?"Submit Assessment & View Summary →":(embedded?"Complete form handoff to submit":"Continue to save screening →")}</button></div>
    </section>
   </div>}
   {step==="results"&&<div style={{display:"grid",gap:16}}>
    <section style={panel}>
     <div style={{fontSize:12,fontWeight:750,color:"#176b58"}}>QUESTIONNAIRE COMPLETED · 25/25</div>
     <h2 style={{fontSize:26,margin:"9px 0 6px"}}>{details.child}'s Screening Summary</h2>
     <p style={{color:"#667a74",fontSize:13}}>Here is what your responses indicate. The summary reflects parent observations only; a Swastha educator can help you interpret them in context.</p>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10,marginTop:16}}>
      <div style={{padding:16,background:"#eaf4ef",borderRadius:10}}><strong style={{color:"#176b58",fontSize:26}}>{strengths.filter(x=>x.yes>0).length}/5</strong><div style={{fontSize:13}}>Strength areas with a Yes response</div></div>
      <div style={{padding:16,background:"#fff2e5",borderRadius:10}}><strong style={{color:"#9c570f",fontSize:26}}>{discuss.length}/10</strong><div style={{fontSize:13}}>Development areas to discuss</div></div>
     </div>
    </section>
    <section style={panel}><h3 style={{margin:"0 0 14px"}}>Development areas</h3>
     {development.map(r=><div key={r.area} style={{marginBottom:17}}><div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:13,fontWeight:700}}><span>{r.area}</span><span>{r.yes} Yes · {r.sometimes} Sometimes · {r.no} No</span></div><div style={{height:11,display:"flex",borderRadius:20,overflow:"hidden",marginTop:8,background:"#e4eee7"}}><div style={{width:r.yes/r.total*100+"%",background:"#1b9865"}}/><div style={{width:r.sometimes/r.total*100+"%",background:"#eea23e"}}/><div style={{width:r.no/r.total*100+"%",background:"#9fb2c2"}}/></div></div>)}
     <p style={{fontSize:12,color:"#667a74"}}>Green = Yes, orange = Sometimes, grey-blue = No. These are response counts, not diagnostic percentages or rankings.</p>
    </section>
    <section style={panel}><h3 style={{margin:"0 0 13px"}}>Strengths & potential</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
     {strengths.map(r=><div key={r.area} style={{padding:14,background:"#f4faf6",borderRadius:11,border:"1px solid #dce8e1"}}><div style={{fontSize:13,fontWeight:700}}>{r.area}</div><div style={{marginTop:10,fontSize:13,color:"#176b58"}}>{r.yes?"Reported strength":r.sometimes?"Sometimes observed":"Explore together"}</div></div>)}
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
