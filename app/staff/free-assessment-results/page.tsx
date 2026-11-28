"use client";
import {useCallback,useEffect,useMemo,useState,type CSSProperties} from "react";
import {useRouter} from "next/navigation";
import ScreeningResultsDashboard from "../../components/screening-results-dashboard";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";

type Answer="yes"|"sometimes"|"no";
type Question={id:number;area:string;en:string;ml:string};
type Student={id:string;student_code:string|null;full_name:string;current_class:string|null;date_of_birth:string|null;status:string};
type Guardian={id:string;guardian_name:string;whatsapp_number:string;contact_number:string|null;reason:string|null};
type Submission={id:string;completed_at:string;reviewed_at:string|null;responses:Record<string,Answer>;student:Student|null;guardian:Guardian|null};
type Payload={results:Submission[];role:string;total:number;error?:string};
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
const AREAS=[...new Set(QUESTIONS.map(q=>q.area))];
const panel:CSSProperties={background:"#fff",border:"1px solid #dbe8e1",borderRadius:13,padding:18,boxShadow:"0 3px 10px #0a38240a"};
const button:CSSProperties={background:"#075b43",color:"white",border:0,borderRadius:9,padding:"11px 15px",fontWeight:700,cursor:"pointer"};
function displayDate(value:string|null|undefined){
 if(!value)return "Not recorded";
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"Not recorded":date.toLocaleString("en-IN",{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}
function SummaryBar({area,responses}:{area:string;responses:Record<string,Answer>}){
 const questions=QUESTIONS.filter(q=>q.area===area);
 const tally=(value:Answer)=>questions.filter(q=>responses[String(q.id)]===value).length;
 const yes=tally("yes"),sometimes=tally("sometimes"),no=tally("no");
 const width=(count:number)=>((count/questions.length)*100)+"%";
 return <div style={{margin:"0 0 13px"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:12,fontWeight:700,marginBottom:5}}><span>{area}</span><span>{yes} Yes · {sometimes} Sometimes · {no} No</span></div>
  <div aria-label={area+" responses: "+yes+" yes, "+sometimes+" sometimes, "+no+" no"} style={{height:13,borderRadius:99,overflow:"hidden",display:"flex",background:"#eef2f1"}}>
   <div style={{width:width(yes),background:"#119966"}}/><div style={{width:width(sometimes),background:"#e7a33c"}}/><div style={{width:width(no),background:"#8ba5bf"}}/>
  </div>
 </div>;
}
export default function FreeAssessmentResultsStaff(){
 const router=useRouter();
 const [results,setResults]=useState<Submission[]>([]);
 const [role,setRole]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [language,setLanguage]=useState<"en"|"ml">("en");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   if(!supabase)throw Error("The portal database connection is unavailable.");
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace("/login");return;}
   const {data:{session},error:sessionError}=await supabase.auth.getSession();
   if(sessionError||!session?.access_token){router.replace("/login");return;}
   const response=await fetch("/api/staff/free-assessment-results",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});
   const payload=(await response.json()) as Payload;
   if(!response.ok)throw Error(payload.error||"Unable to load free assessment results.");
   const items=Array.isArray(payload.results)?payload.results:[];
   setResults(items);setRole(payload.role||"");
   // Show the most recent saved screening immediately; staff should not have to guess that a row must be selected.
   setSelectedId(previous=>previous&&items.some(row=>row.id===previous)?previous:(items[0]?.id||null));
  }catch(e){setResults([]);setSelectedId(null);setError(e instanceof Error?e.message:"Unable to load free assessment results.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 const visible=useMemo(()=>results.filter(row=>{
  const searchText=[row.student?.full_name,row.student?.student_code,row.student?.current_class,row.guardian?.guardian_name,row.guardian?.whatsapp_number].join(" ").toLowerCase();
  return searchText.includes(search.trim().toLowerCase());
 }),[results,search]);
 const selected=results.find(row=>row.id===selectedId)||null;
 const answered=selected?QUESTIONS.filter(q=>["yes","sometimes","no"].includes(selected.responses?.[String(q.id)])).length:0;
 return <main className="swastha-workspace-page" style={{color:"#183a35"}}>
  <style>{`@media print {
   @page {size:A4;margin:12mm}
   body * {visibility:hidden !important}
   #free-result-print,#free-result-print * {visibility:visible !important}
   #free-result-print {position:absolute !important;top:0 !important;left:0 !important;width:100% !important;background:#fff !important}
   #free-result-print section {break-inside:avoid-page;page-break-inside:avoid}
   #free-result-print {-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }`}</style>
  <header className="swastha-workspace-header"><BrandLogo/><div><strong>Free Assessment Results</strong><small>Staff-only · Parent-report screening records</small></div><button type="button" style={button} onClick={()=>router.push("/staff/courses")}>Back to Assessments</button></header>
  <div className="swastha-workspace-content" style={{display:"grid",gap:16}}>
   <section style={panel}>
    <h1 style={{margin:"0 0 7px",fontSize:27}}>Free Assessment Results</h1>
    <p style={{margin:0,fontSize:13,color:"#5c7069"}}>Browse submitted 25-question screenings and their permanent SWA Student IDs. These are parent observations, not standardized clinical scores or diagnoses.</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",marginTop:17}}>
     <label style={{display:"grid",gap:6,flex:"1 1 280px",fontSize:12,fontWeight:700}}>Search Student ID, child or guardian
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="SWA-2026-000001, student, guardian or phone" style={{padding:11,border:"1px solid #b7cfc2",borderRadius:9,width:"100%"}}/>
     </label>
     <button type="button" style={button} onClick={()=>void load()} disabled={loading}>Refresh results</button>
    </div>
   </section>
   {error&&<section role="alert" style={{...panel,color:"#a42623"}}><strong>Results could not be loaded.</strong><p style={{margin:"6px 0 12px",fontSize:13}}>{error}</p><button type="button" style={button} onClick={()=>void load()} disabled={loading}>Try loading results again</button></section>}
   <section style={panel}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
     <h2 style={{margin:0,fontSize:19}}>Submitted screenings</h2>
     <span role="status" style={{fontSize:12,color:"#5a6f68"}}>{loading?"Loading…":error?"Load failed":visible.length+" shown · "+results.length+" recent records"}</span>
    </div>
    {role==="teacher"&&<p style={{fontSize:12,color:"#566c65"}}>Only assessments for students assigned to your active teacher profile are shown.</p>}
    {loading?<p>Loading authorized assessment results…</p>:error?<p style={{color:"#a42623"}}>Unable to retrieve saved screenings. See the error and retry above.</p>:!visible.length?<p style={{color:"#586c66"}}>{results.length?("No results match your search. Clear the search field to see all "+results.length+" saved screenings."):("No saved Free Assessments are visible to this account. Use Refresh results; teachers can only see assigned students.")}</p>:
     <div style={{display:"grid",gap:9,marginTop:14}}>
      {visible.map(row=><button key={row.id} type="button" aria-pressed={selectedId===row.id} onClick={()=>setSelectedId(row.id)}
       style={{textAlign:"left",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center",padding:14,borderRadius:10,border:selectedId===row.id?"2px solid #08734b":"1px solid #dbe8e1",background:selectedId===row.id?"#edf9f2":"white",cursor:"pointer"}}>
       <span><strong style={{display:"block",fontSize:15}}>{row.student?.full_name||"Student record unavailable"}</strong>
        <span style={{fontSize:12,color:"#576d66"}}>{row.student?.student_code||"Student ID unavailable"} · {row.student?.current_class||"Class not recorded"} · {displayDate(row.completed_at)}</span></span>
       <span style={{fontSize:12,fontWeight:750,color:row.reviewed_at?"#0c7e54":"#a76512"}}>{row.reviewed_at?"Reviewed":"Awaiting review"}</span>
      </button>)}
     </div>}
   </section>
   {selected&&<div id="free-result-print" style={{display:"grid",gap:14}}>
    <section style={{...panel,background:"linear-gradient(125deg,#07553f,#086b51)",color:"white"}}>
     <div style={{fontSize:12,letterSpacing:1.3,color:"#d9f2e5"}}>SWASTHA LEARNING CLINIC · FREE ASSESSMENT RESULTS</div>
     <h2 style={{fontSize:27,margin:"9px 0"}}>Dashboard</h2>
     <strong style={{fontSize:21}}>{selected.student?.full_name||"Student"}</strong>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginTop:16}}>
      <div><small>PERMANENT STUDENT ID</small><strong style={{display:"block",fontSize:20,overflowWrap:"anywhere"}}>{selected.student?.student_code||"Not available"}</strong></div>
      <div><small>CLASS</small><strong style={{display:"block",fontSize:19}}>{selected.student?.current_class||"Not recorded"}</strong></div>
      <div><small>SUBMITTED</small><strong style={{display:"block",fontSize:15}}>{displayDate(selected.completed_at)}</strong></div>
     </div>
    </section>
    <section style={panel}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{answered}/25 responses · {selected.reviewed_at?"Reviewed":"Awaiting staff review"}</strong><label>Language <select value={language} onChange={e=>setLanguage(e.target.value as "en"|"ml")}><option value="en">English</option><option value="ml">മലയാളം</option></select></label></div></section>
    <ScreeningResultsDashboard malayalam={language==="ml"} rows={AREAS.map(area=>{const qq=QUESTIONS.filter(q=>q.area===area);const r=qq.map(q=>selected.responses?.[String(q.id)]);return {area,total:qq.length,yes:r.filter(x=>x==="yes").length,sometimes:r.filter(x=>x==="sometimes").length,no:r.filter(x=>x==="no").length};})}/>
    <section style={panel}>
     <h3 style={{margin:"0 0 10px",fontSize:19}}>Parent / guardian information</h3>
     <p style={{fontSize:13,lineHeight:1.7,margin:0}}><strong>Guardian:</strong> {selected.guardian?.guardian_name||"Not recorded"}<br/>
      <strong>WhatsApp:</strong> {selected.guardian?.whatsapp_number||"Not recorded"}<br/>
      {selected.guardian?.contact_number&&<><strong>Additional contact:</strong> {selected.guardian.contact_number}<br/></>}
      <strong>Child date of birth:</strong> {selected.student?.date_of_birth||"Not recorded"}<br/>
      <strong>Parent observations:</strong> {selected.guardian?.reason||"None recorded"}
     </p>
    </section>
    <section style={panel}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <h3 style={{margin:0,fontSize:19}}>All 25 responses</h3>
      <div className="no-print" style={{display:"flex",gap:8,alignItems:"center"}}><label style={{fontSize:12}}>Language <select aria-label="Question language" value={language} onChange={e=>setLanguage(e.target.value as "en"|"ml")}><option value="en">English</option><option value="ml">മലയാളം</option></select></label></div>
     </div>
     <div style={{display:"grid",gap:7,marginTop:12}}>
      {QUESTIONS.map(q=><div key={q.id} style={{borderBottom:"1px solid #e9f0ec",padding:"9px 0",display:"flex",justifyContent:"space-between",alignItems:"start",gap:12}}>
       <div style={{fontSize:13,lineHeight:1.5}}><strong>{q.id}. </strong>{language==="ml"?q.ml:q.en}<div style={{fontSize:11,color:"#6b7d75"}}>{q.area}</div></div>
       <strong style={{fontSize:12,color:selected.responses?.[String(q.id)]==="yes"?"#088250":"#a36612",whiteSpace:"nowrap"}}>{selected.responses?.[String(q.id)]==="yes"?(language==="ml"?"അതെ":"Yes"):selected.responses?.[String(q.id)]==="sometimes"?(language==="ml"?"ചിലപ്പോൾ":"Sometimes"):selected.responses?.[String(q.id)]==="no"?(language==="ml"?"ഇല്ല":"No"):"Missing"}</strong>
      </div>)}
     </div>
    </section>
    <p style={{fontSize:11,color:"#65796d",margin:0}}>Educational parent-report screening only; results reflect recorded responses and are not a medical diagnosis or standardized clinical assessment.</p>
   </div>}
   {selected&&<div className="no-print" style={{display:"flex",gap:10,flexWrap:"wrap"}}>
    <button style={button} type="button" onClick={()=>window.print()}>Download / Print Dashboard (PDF)</button>
    <button style={{...button,background:"#eaf5ef",color:"#0b654c"}} type="button" onClick={()=>router.push("/staff/students/"+encodeURIComponent(selected.student?.id||""))} disabled={!selected.student?.id}>Open Student Workspace</button>
   </div>}
  </div>
 </main>;
}
