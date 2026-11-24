import BrandLogo from "../../components/brand-logo";
"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import {CHECKLIST_DATA,type AssessmentLevel} from "../../../lib/assessment-data";
import {checklistWithRevisions,type QuestionRevision} from "../../../lib/assessment-question-versions";

type Entry={key:string;group:string;original:string;current:string};
type Template={id:string;title:string;level:string;status:string;structure:Array<{title:string;categories:Array<{title:string;questions:Array<{id:string;text:string;text_ml?:string}>}>}>};
const levels:AssessmentLevel[]=["LP","UP","HS","HSS"];
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const field:React.CSSProperties={padding:"10px 12px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",width:"100%",boxSizing:"border-box"};
const btn:React.CSSProperties={padding:"10px 13px",border:0,borderRadius:8,background:"#176b58",color:"#fff",fontWeight:700,cursor:"pointer"};

function entries(level:AssessmentLevel, revisions:QuestionRevision[]):Entry[]{
 const base=CHECKLIST_DATA[level];
 const current=checklistWithRevisions(level,revisions);
 const result:Entry[]=[];
 base.areas.forEach((area,ai)=>area.subDomains.forEach((domain,di)=>domain.items.forEach((original,index)=>{
  result.push({key:domain.id+"_"+(index+1),group:area.title+" / "+domain.title,original,current:current.areas[ai].subDomains[di].items[index]});
 })));
 base.parentInterview.forEach((original,index)=>result.push({key:"PARENT_INTERVIEW_"+(index+1),group:"Parent / Caregiver Interview",original,current:current.parentInterview[index]}));
 base.talents.forEach((original,index)=>result.push({key:"PARENT_TALENT_"+(index+1),group:"Strengths, Interests & Talents",original,current:current.talents[index]}));
 return result;
}

export default function AdminQuestionsPage(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [level,setLevel]=useState<AssessmentLevel>("LP");
 const [mode,setMode]=useState<"standard"|"custom">("standard");
 const [query,setQuery]=useState("");
 const [revisions,setRevisions]=useState<QuestionRevision[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 async function load(){
  if(!supabase)return;
  const [r,t]=await Promise.all([
   supabase.from("standard_question_revisions")
    .select("assessment_level,question_key,question_text,effective_at")
    .order("effective_at",{ascending:true}).order("id",{ascending:true}),
   supabase.from("custom_assessment_templates")
    .select("id,title,level,status,structure").order("created_at",{ascending:false})
  ]);
  if(r.error)throw r.error;
  if(t.error)throw t.error;
  setRevisions((r.data||[]) as QuestionRevision[]);
  setTemplates((t.data||[]) as Template[]);
 }
 useEffect(()=>{
  let live=true;
  async function start(){
   if(!supabase){if(live){setError("Database is unavailable.");setLoading(false);}return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/login");return;}
   const {data:record}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).maybeSingle();
   if(!record||!["owner","admin","clinic_admin"].includes(record.role)){router.replace("/login");return;}
   if(live)setRole(record.role);
   try{await load();}catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load questions");}
   finally{if(live)setLoading(false);}
  }
  void start();
  return()=>{live=false;};
 },[router]);
 const current=useMemo(()=>entries(level,revisions.filter(r=>r.assessment_level===level)),[level,revisions]);
 const results=current.filter(q=>(q.group+" "+q.key+" "+q.current).toLowerCase().includes(query.trim().toLowerCase()));
 const custom=templates.filter(t=>(t.title+" "+t.level+" "+t.status+" "+JSON.stringify(t.structure)).toLowerCase().includes(query.trim().toLowerCase()));
 const numRevised=new Set(revisions.filter(r=>r.assessment_level===level).map(r=>r.question_key)).size;

 async function save(entry:Entry){
  if(!supabase)return;
  const next=(drafts[entry.key]??entry.current).trim();
  if(next.length<3||next.length>1500){setError("Question text must contain 3 to 1,500 characters.");return;}
  if(next===entry.current){setMessage("No changes to save.");return;}
  setBusy(entry.key);setError("");setMessage("");
  const {error:e}=await supabase.rpc("admin_revise_standard_question",{
   p_level:level,p_question_key:entry.key,p_text:next
  });
  if(e)setError(e.message);
  else try{
   await load();
   setDrafts(x=>{const n={...x};delete n[entry.key];return n;});
   setMessage("Revision saved. Only assessments assigned after this change use the new wording. Existing assessments retain their original questions.");
  }catch(x){setError(x instanceof Error?x.message:"Changes saved, but could not refresh.");}
  setBusy("");
 }
 if(loading)return <main style={{padding:30}}>Loading assessment question bank...</main>;
 if(!role)return <main style={{padding:30}}>{error||"Access denied"}</main>;
 return <main style={{fontFamily:"Arial,sans-serif",background:"#f8faf7",minHeight:"100vh",color:"#183a35"}}>
  <header style={{background:"#0f4c5c",color:"#fff",padding:"17px 5%",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
   <div><strong><BrandLogo /></strong><div style={{fontSize:12,marginTop:4}}>ADMIN · QUESTION BANK</div></div>
   <button style={{...btn,background:"#fff",color:"#0f4c5c"}} onClick={()=>router.push(role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":"/clinic-admin/dashboard")}>Back to Admin Dashboard</button>
  </header>
  <div style={{maxWidth:1170,margin:"auto",padding:"22px 15px 60px",display:"grid",gap:14}}>
   <div><h1 style={{fontSize:25,margin:"0 0 8px"}}>Assessment Question Management</h1>
    <p style={{fontSize:13,color:"#64748b",margin:0}}>Review every standard checklist item, parent interview question and talent prompt. Revise wording with a permanent, dated history. No question IDs or previously issued assessments are changed.</p>
   </div>
   <div style={{...card,display:"flex",gap:8,flexWrap:"wrap"}}>
    <button style={{...btn,background:mode==="standard"?"#176b58":"#eaf4ef",color:mode==="standard"?"#fff":"#176b58"}} onClick={()=>setMode("standard")}>Standard Questions</button>
    <button style={{...btn,background:mode==="custom"?"#176b58":"#eaf4ef",color:mode==="custom"?"#fff":"#176b58"}} onClick={()=>setMode("custom")}>Custom Questionnaires</button>
   </div>
   {error&&<div role="alert" style={{...card,color:"#b42318"}}>{error}</div>}
   {message&&<div role="status" style={{...card,color:"#176b58"}}>{message}</div>}
   {mode==="standard"?<>
    <div style={card}>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{levels.map(l=><button key={l} onClick={()=>{setLevel(l);setDrafts({});}} style={{...btn,background:level===l?"#176b58":"#eaf4ef",color:level===l?"#fff":"#176b58"}}>{l}</button>)}</div>
     <p style={{fontSize:13,color:"#64748b"}}>{current.length} questions and prompts · {numRevised} with revisions · {level} level</p>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by question, ID, area or domain" aria-label="Search questions" style={field}/>
    </div>
    {results.map(e=><section key={e.key} style={card}>
      <p style={{fontSize:12,color:"#64748b",margin:"0 0 5px"}}>{e.group} · <strong>{e.key}</strong></p>
      <label style={{fontSize:13,fontWeight:700,display:"block",marginBottom:7}} htmlFor={"q-"+e.key}>Question wording</label>
      <textarea id={"q-"+e.key} rows={2} maxLength={1500} value={drafts[e.key]??e.current} onChange={event=>setDrafts(x=>({...x,[e.key]:event.target.value}))} style={{...field,resize:"vertical",fontFamily:"inherit"}}/>
      {e.current!==e.original&&<p style={{fontSize:12,color:"#64748b"}}><strong>Original:</strong> {e.original}</p>}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:9}}>
       <button disabled={!!busy||(drafts[e.key]??e.current).trim()===e.current} style={{...btn,opacity:busy||((drafts[e.key]??e.current).trim()===e.current)?0.5:1}} onClick={()=>void save(e)}>{busy===e.key?"Saving...":"Save revised question"}</button>
       {e.current!==e.original&&<button disabled={!!busy} style={{...btn,background:"#edf5f1",color:"#176b58"}} onClick={()=>setDrafts(x=>({...x,[e.key]:e.original}))}>Restore original wording</button>}
      </div>
     </section>)}
    {!results.length&&<div style={card}>No questions found.</div>}
   </>:<>
    <section style={card}>
     <p style={{fontSize:13,color:"#64748b"}}>Custom assessments may contain written, rating and multiple-choice questions. Published templates are locked so previous student answers keep their original meaning. Amend a published template using <strong>Clone</strong> in the existing builder; drafts can be edited there.</p>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search questionnaires and questions" aria-label="Search custom questions" style={field}/>
     <button style={{...btn,marginTop:12}} onClick={()=>router.push("/teacher/custom-assessments")}>Open Custom Assessment Builder / Clone</button>
    </section>
    {custom.map(t=><section key={t.id} style={card}>
     <h3 style={{fontSize:17,margin:"0 0 5px"}}>{t.title}</h3>
     <p style={{color:"#64748b",fontSize:12}}>{t.level.toUpperCase()} · {t.status} · {t.structure?.reduce((n,s)=>n+s.categories.reduce((k,c)=>k+c.questions.length,0),0)||0} questions</p>
     {(t.structure||[]).flatMap(s=>s.categories.flatMap(c=>c.questions.map(q=>({section:s.title,category:c.title,...q})))).map(q=><div key={q.id} style={{borderTop:"1px solid #e2e8f0",padding:"10px 0"}}>
      <p style={{fontSize:12,color:"#64748b",margin:"0 0 5px"}}>{q.section} / {q.category}</p>
      <strong style={{fontSize:13}}>{q.text}</strong>
      {q.text_ml&&<p style={{fontSize:13,margin:"6px 0"}}>{q.text_ml}</p>}
     </div>)}
    </section>)}
    {!custom.length&&<div style={card}>No custom questionnaires found.</div>}
   </>}
  </div>
 </main>;
}
