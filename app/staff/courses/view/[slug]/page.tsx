"use client";

import {useEffect,useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {supabase} from "../../../../../lib/supabase";
import {CHECKLIST_DATA,type AssessmentLevel} from "../../../../../lib/assessment-data";
import {LP_MALAYALAM_QUESTIONS,LP_MALAYALAM_INTERVIEW,LP_MALAYALAM_TALENTS,LP_MALAYALAM_AREAS,LP_MALAYALAM_DOMAINS} from "../../../../../lib/assessment-ml";

type Choice={id:string;text:string;text_ml?:string};
type Question={id?:string;text?:string;text_ml?:string;response_type?:"rating"|"multiple_choice"|"written";options?:Choice[]};
type Category={id?:string;title:string;title_ml?:string;questions:Question[]};
type Section={id?:string;title:string;title_ml?:string;categories:Category[]};
type Template={id:string;title:string;description:string;level:string;status:string;structure:Section[]};
type Language="en"|"ml";
type Publisher={template_id:string;creator_name:string;creator_staff_id:string|null;creator_user_id:string};

const levels=["LP","UP","HS","HSS"] as const;
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:14};
const action:React.CSSProperties={padding:"11px 17px",border:0,borderRadius:9,background:"#176b58",color:"white",fontWeight:700,cursor:"pointer"};
const mutedControl:React.CSSProperties={border:"1px solid #cbd5e1",borderRadius:9,padding:"10px 14px",background:"#f8fafc",color:"#64748b",opacity:.8,cursor:"not-allowed",fontWeight:600};
const standardOptions:[string,string,string][]=[
 ["0","Not demonstrated","#ef4444"],
 ["1","Substantial support","#f97316"],
 ["2","Developing","#0284c7"],
 ["3","Independent","#10b981"],
 ["NA","Not assessed","#64748b"]
];
const behaviourOptions:[string,string,string][]=[["0","Not demonstrated","#ef4444"],["1","Full assistance","#f97316"],["2","Partial assistance","#0284c7"],["3","Independent","#10b981"],["NA","Not observed / Not applicable","#64748b"]];
const customOptions:[string,string,string][]=[
 ["1","Needs support","#f97316"],
 ["2","Developing","#0284c7"],
 ["3","Independent","#10b981"],
 ["NA","Not assessed","#64748b"]
];
function safeSections(input:unknown):Section[]{
 if(!Array.isArray(input))return [];
 return input.filter((s):s is Section=>s!==null&&typeof s==="object"&&typeof s.title==="string"&&Array.isArray(s.categories));
}
function PreviewRating({options}:{options:[string,string,string][]}){
 return <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}} aria-label="Read-only rating options">
  {options.map(([score,label,color])=><button key={score} disabled type="button" title={label} style={{...mutedControl,borderColor:color}}>{score} <span style={{fontSize:12,fontWeight:400}}>{label}</span></button>)}
 </div>;
}
function PreviewObservation({label}:{label:string}){
 return <label style={{display:"block",fontSize:13,color:"#64748b",marginTop:10}}>{label}
  <textarea disabled aria-label={label} rows={2} value="" readOnly placeholder="Read-only preview — no answers are recorded" style={{width:"100%",boxSizing:"border-box",border:"1px solid #dce8e1",background:"#f8fafc",borderRadius:9,padding:11,marginTop:5,font:"inherit",resize:"vertical"}}/>
 </label>;
}
export default function StaffCoursePreview(){
 const router=useRouter();
 const params=useParams<{slug:string}>();
 const slug=String(params.slug||"");
 const isStandard=levels.includes(slug as AssessmentLevel);
 const bank=isStandard?CHECKLIST_DATA[slug as AssessmentLevel]:null;
 const [role,setRole]=useState("");
 const [template,setTemplate]=useState<Template|null>(null);
 const [publisher,setPublisher]=useState<Publisher|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [language,setLanguage]=useState<Language>("en");
 const [active,setActive]=useState(0);
 const tr=(en:string,ml:string)=>language==="ml"?ml:en;

 useEffect(()=>{let mounted=true;(async()=>{try{
  if(!supabase)throw Error("Database unavailable");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){router.replace("/login");return;}
  const {data:userRole,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(roleError||!userRole||!["owner","admin","clinic_admin","teacher"].includes(userRole.role)){router.replace("/login");return;}
  if(mounted)setRole(userRole.role);
  if(!isStandard){
   if(!/^custom-[0-9a-f-]{36}$/i.test(slug))throw Error("Unknown assessment link.");
   const {data,error:fetchError}=await supabase.from("custom_assessment_templates")
    .select("id,title,description,level,status,structure").eq("id",slug.slice(7)).single();
   if(fetchError||!data)throw Error("Assessment unavailable or you do not have permission to view it.");
   if(mounted)setTemplate({...data,structure:safeSections(data.structure)} as Template);
   const publisherLookup=await supabase.rpc("get_custom_assessment_publishers");
   if(!publisherLookup.error&&mounted){
    setPublisher(((publisherLookup.data||[]) as Publisher[]).find(row=>row.template_id===data.id)||null);
   }
  }
 }catch(e){if(mounted)setError(e instanceof Error?e.message:"Unable to load assessment");
 }finally{if(mounted)setLoading(false)}})();return()=>{mounted=false};},[slug,isStandard,router]);
 useEffect(()=>{try{if(localStorage.getItem("swastha-assessment-language")==="ml")setLanguage("ml")}catch{/* optional */}},[]);
 function setLang(value:Language){setLanguage(value);try{localStorage.setItem("swastha-assessment-language",value)}catch{/* optional */}}
 const totalCustom=useMemo(()=>template?.structure.reduce((sum,s)=>sum+s.categories.reduce((n,c)=>n+c.questions.length,0),0)||0,[template]);
 const standardAreas=bank?.areas||[];
 const customSections=template?.structure||[];
 const sectionsCount=bank?standardAreas.length:customSections.length;
 const current=Math.min(active,Math.max(0,sectionsCount-1));
 const isLP=slug==="LP";
 const lpTranslated=language==="ml"&&isLP;
 const lpBase=isLP?CHECKLIST_DATA.LP:null;
 function lpQuestion(domainId:string,index:number,original:string){
  if(!lpTranslated)return original;
  const key=domainId+"_"+(index+1);
  return LP_MALAYALAM_QUESTIONS[key]||original;
 }
 if(loading)return <main style={{padding:32}}>Loading assessment preview…</main>;
 if(!role)return <main style={{padding:32}} role="alert">{error||"Access denied"}</main>;
 return <main style={{fontFamily:"Arial,sans-serif",background:"#f8faf7",minHeight:"100vh",color:"#183a35"}}>
 <header style={{position:"sticky",top:0,zIndex:20,background:"#0f4c5c",color:"#fff",padding:"14px max(18px, calc((100vw - 1120px) / 2))",display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",justifyContent:"space-between"}}>
  <div><strong>Swastha Learning Clinic</strong><div style={{fontSize:12,marginTop:5}}>{tr("ASSESSMENT PREVIEW — READ ONLY","വിലയിരുത്തൽ പ്രിവ്യൂ — വായിക്കാൻ മാത്രം")}</div></div>
  <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
  <label htmlFor="staff-course-language">{tr("Language","ഭാഷ")}</label>
  <select id="staff-course-language" value={language} onChange={e=>setLang(e.target.value as Language)} style={{padding:9,borderRadius:8}}><option value="en">English</option><option value="ml">മലയാളം</option></select>
  <button type="button" onClick={()=>router.push("/staff/courses")} style={{...action,background:"#fff",color:"#175d4e"}}>{tr("Back to Courses","കോഴ്സുകളിലേക്ക് മടങ്ങുക")}</button></div>
 </header>
 <div style={{maxWidth:1120,margin:"auto",padding:"24px 16px 80px"}}>
 {error?<p role="alert" style={panel}>{error}</p>:<>
 <h1 style={{fontSize:"clamp(24px,4vw,36px)"}}>{bank?bank.shortTitle:template?.title}</h1>
 {bank?<p>{bank.badge} · {bank.ageRange}</p>:<p>{template?.description}</p>}
 <section style={{...panel,background:"#edf7f2",borderColor:"#b6dac8"}} role="status">
  <strong>{tr("View-only staff access","സ്റ്റാഫിന് കാണാൻ മാത്രം അനുമതി")}</strong>
  <p style={{marginBottom:0}}>{tr("This is the same question and response layout used for parents, shown with empty, disabled answer controls. No student is selected, no submitted answers or scores are displayed, and there are no Save or Submit actions.","രക്ഷിതാക്കൾക്ക് കാണുന്ന അതേ ചോദ്യങ്ങളും ഉത്തര ഓപ്ഷനുകളും ഇവിടെ കാണാം. ഉത്തരങ്ങൾ നൽകാനോ സേവ് ചെയ്യാനോ സമർപ്പിക്കാനോ സാധിക്കില്ല. വിദ്യാർത്ഥിയുടെ ഉത്തരങ്ങളോ സ്കോറുകളോ ഇവിടെ കാണിക്കുന്നില്ല.")}</p>
 </section>
 {bank&&<section style={panel}><h2>{tr("Assessment instructions","വിലയിരുത്തൽ നിർദേശങ്ങൾ")}</h2><p>{bank.purpose}</p><p>{tr("Student identity, class, birth date and guardian information are automatically shown when an assessment is assigned. This unassigned staff preview contains no student data.","വിദ്യാർത്ഥിക്ക് അസൈൻ ചെയ്യുമ്പോൾ പേരും ക്ലാസും ജനനത്തീയതിയും രക്ഷിതാവിന്റെ വിവരങ്ങളും സ്വയമേവ കാണിക്കും. ഈ സ്റ്റാഫ് പ്രിവ്യൂവിൽ വിദ്യാർത്ഥിയുടെ വിവരങ്ങൾ ഇല്ല.")}</p></section>}
 {sectionsCount>0&&<nav aria-label="Assessment sections" style={{display:"flex",gap:8,flexWrap:"wrap",margin:"20px 0"}}>
 {Array.from({length:sectionsCount},(_,i)=>{const label=bank?
  (lpTranslated?LP_MALAYALAM_AREAS[i]||standardAreas[i].title:standardAreas[i].title):
  (language==="ml"&&customSections[i].title_ml?customSections[i].title_ml:customSections[i].title);
 return <button type="button" key={i} onClick={()=>setActive(i)} aria-current={current===i?"step":undefined} style={{...action,background:current===i?"#176b58":"#eaf4ef",color:current===i?"white":"#175d4e"}}>{i+1}. {label}</button>})}
 </nav>}
 {bank&&standardAreas[current]&&<section style={panel}>
 <h2>{lpTranslated?LP_MALAYALAM_AREAS[current]||standardAreas[current].title:standardAreas[current].title}</h2>
 {standardAreas[current].subDomains.map((domain,di)=><section key={domain.id} style={{borderTop:"1px solid #dce8e1",paddingTop:16,marginTop:16}}>
 <h3>{lpTranslated?LP_MALAYALAM_DOMAINS[current]?.[di]||domain.title:domain.title}</h3>
 {domain.items.map((q,qi)=><article key={domain.id+"_"+(qi+1)} style={{padding:"15px 11px",borderBottom:"1px solid #e2e8f0",borderLeft:"4px solid #e0ece6",scrollMarginTop:100}}>
  <strong>{domain.title.match(/^([A-Z])\./)?.[1]||domain.id.slice(-1)}.{qi+1} — {lpQuestion(domain.id,qi,q)}</strong>
  <PreviewRating options={standardOptions}/><PreviewObservation label={tr("Observation or example (disabled)","നിരീക്ഷണം / ഉദാഹരണം (പ്രവർത്തനരഹിതം)")}/>
 </article>)}</section>)}</section>}
 {bank&&<><section style={panel}><h2>{tr("Parent / Guardian Interview","രക്ഷിതാവുമായുള്ള അഭിമുഖം")}</h2>{bank.parentInterview.map((q,i)=><article key={i} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}><strong>{i+1}. {lpTranslated&&lpBase&&q===lpBase.parentInterview[i]?LP_MALAYALAM_INTERVIEW[i]||q:q}</strong><PreviewObservation label={tr("Answer (disabled)","ഉത്തരം (പ്രവർത്തനരഹിതം)")}/></article>)}</section>
 <section style={panel}><h2>{tr("Practical activities","പ്രായോഗിക പ്രവർത്തനങ്ങൾ")}</h2>{bank.practicalActivities.map((p,i)=><article key={i} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}><strong>{p.name}</strong><p>{p.task}</p><small>{tr("Observe","നിരീക്ഷിക്കുക")}: {p.observe}</small><PreviewObservation label={tr("Observation (disabled)","നിരീക്ഷണം (പ്രവർത്തനരഹിതം)")}/></article>)}</section>
 <section style={panel}><h2>{tr("Strengths and talents","കഴിവുകളും താൽപര്യങ്ങളും")}</h2>{bank.talents.map((t,i)=><div key={i} style={{padding:10,borderBottom:"1px solid #e2e8f0"}}><input type="checkbox" disabled aria-label={t}/> {lpTranslated&&lpBase&&t===lpBase.talents[i]?LP_MALAYALAM_TALENTS[i]||t:t}</div>)}</section></>}
 {template&&<section style={panel}><strong>{tr("Assessment level","വിലയിരുത്തൽ ലെവൽ")}:</strong> {template.level} · <strong>{tr("Status","നില")}:</strong> {template.status} · <strong>{tr("Questions","ചോദ്യങ്ങൾ")}:</strong> {totalCustom}{template.status==="published"&&<p style={{marginBottom:0,marginTop:10,overflowWrap:"anywhere"}}><strong>{tr("Published by","പ്രസിദ്ധീകരിച്ചത്")}:</strong> {publisher?.creator_name||tr("Creator unavailable","സ്രഷ്ടാവിന്റെ വിവരങ്ങൾ ലഭ്യമല്ല")} ({publisher?.creator_staff_id||publisher?.creator_user_id||tr("ID unavailable","ഐഡി ലഭ്യമല്ല")})</p>}</section>}
 {template&&customSections[current]&&<section style={panel}><h2>{language==="ml"&&customSections[current].title_ml?customSections[current].title_ml:customSections[current].title}</h2>
 {customSections[current].categories.map((cat,ci)=><section key={cat.id||ci} style={{borderTop:"1px solid #dce8e1",paddingTop:16,marginTop:16}}>
 <h3>{language==="ml"&&cat.title_ml?cat.title_ml:cat.title}</h3>
 {cat.questions.map((q,qi)=><article key={q.id||qi} style={{padding:"16px 11px",borderBottom:"1px solid #e2e8f0",borderLeft:"4px solid #e0ece6"}}>
  <strong>{String.fromCharCode(65+ci)}.{qi+1} — {language==="ml"&&q.text_ml?q.text_ml:q.text||"Untitled question"}</strong>
  {q.response_type==="written"?<PreviewObservation label={tr("Written answer (disabled)","എഴുത്ത് ഉത്തരം (പ്രവർത്തനരഹിതം)")}/>:
   q.response_type==="multiple_choice"?
   <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>{(q.options||[]).map(option=><button key={option.id} type="button" disabled role="radio" aria-checked={false} style={mutedControl}>{language==="ml"&&option.text_ml?option.text_ml:option.text}</button>)}</div>:
   <PreviewRating options={template.title==="Behavioural Therapy — Skills Assessment"?behaviourOptions:customOptions}/>}
  <PreviewObservation label={tr("Observation or example (disabled)","നിരീക്ഷണം / ഉദാഹരണം (പ്രവർത്തനരഹിതം)")}/>
 </article>)}</section>)}</section>}
 {sectionsCount>1&&<div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:18}}>
 <button type="button" disabled={current===0} onClick={()=>{setActive(current-1);window.scrollTo({top:0,behavior:"smooth"})}} style={{...action,opacity:current===0 ? 0.45 : 1}}>{tr("Previous section","മുൻ വിഭാഗം")}</button>
 <button type="button" disabled={current===sectionsCount-1} onClick={()=>{setActive(current+1);window.scrollTo({top:0,behavior:"smooth"})}} style={{...action,opacity:current===sectionsCount-1 ? 0.45 : 1}}>{tr("Next section","അടുത്ത വിഭാഗം")}</button>
 </div>}
 <p style={{fontSize:12,color:"#64748b",marginTop:22}}>{tr("Read-only catalogue preview. No client information, responses, or submissions are created or updated.","വായനയ്ക്ക് മാത്രമുള്ള പ്രിവ്യൂ. ക്ലയന്റിന്റെ വിവരങ്ങളോ ഉത്തരങ്ങളോ സമർപ്പണങ്ങളോ സൃഷ്ടിക്കുകയോ മാറ്റുകയോ ചെയ്യുന്നില്ല.")}</p>
 </>}
 </div></main>;
}
