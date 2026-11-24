"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type AnswerOption={id:"1"|"2"|"3";text:string;text_ml:string};
type Question={id:string;text:string;text_ml:string;response_type?:"rating"|"multiple_choice"|"written";options?:AnswerOption[]};
function makeQuestion():Question{return {id:uid("q_"),text:"",text_ml:"",response_type:"rating"};}
function makeOptions():AnswerOption[]{return [
 {id:"1",text:"",text_ml:""},{id:"2",text:"",text_ml:""},{id:"3",text:"",text_ml:""}
];}
type Category={id:string;title:string;questions:Question[]};
type Section={id:string;title:string;categories:Category[]};
type Template={id:string;title:string;description:string;level:string;status:"draft"|"published";structure:Section[];created_by:string;created_at:string};
type Student={id:string;full_name:string;student_code:string;current_class:string|null};
type Assignment={id:string;template_id:string;student_id:string;status:string;due_date:string|null;assigned_at:string;answers:Record<string,{score?:string|null;choice?:string|null;written_answer?:string|null;observation:string}>;teacher_feedback:string|null};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dae8e0",borderRadius:13,padding:16,marginBottom:14};
const green="#176b58";
const btn:React.CSSProperties={background:green,color:"white",border:"none",borderRadius:8,padding:"10px 15px",cursor:"pointer",fontWeight:700};
const outline:React.CSSProperties={...btn,background:"#edf5f1",color:"#175d4e",border:"1px solid #c9ded2"};
const input:React.CSSProperties={width:"100%",padding:"11px",border:"1px solid #cbd5e1",borderRadius:8,font:"inherit",boxSizing:"border-box"};
function uid(prefix:string){return prefix+crypto.randomUUID().replace(/-/g,"");}
function blank():Section[]{return [{id:uid("s_"),title:"Learning & Development",categories:[{id:uid("c_"),title:"A. Learning Skills",questions:[makeQuestion()]}]}];}
function questionsOf(t:Template){return (t.structure||[]).flatMap(s=>s.categories.flatMap(c=>c.questions.map(q=>({section:s.title,category:c.title,...q}))));}

export default function CustomAssessmentBuilder(){
 const router=useRouter();
 const [userId,setUserId]=useState("");
 const [roleName,setRoleName]=useState("");
 const [mode,setMode]=useState<"builder"|"assign"|"review">("builder");
 const [templates,setTemplates]=useState<Template[]>([]);
 const [students,setStudents]=useState<Student[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [level,setLevel]=useState("all");
 const [structure,setStructure]=useState<Section[]>(blank);

 const [templateId,setTemplateId]=useState("");
 const [studentId,setStudentId]=useState("");
 const [dueDate,setDueDate]=useState("");
 const [reviewId,setReviewId]=useState("");
 const [feedback,setFeedback]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const refresh=useCallback(async()=>{
  if(!supabase)return;
  const [t,a,st]=await Promise.all([
   supabase.from("custom_assessment_templates").select("id,title,description,level,status,structure,created_by,created_at").order("created_at",{ascending:false}),
   supabase.from("custom_assessment_assignments").select("id,template_id,student_id,status,due_date,assigned_at,answers,teacher_feedback").order("assigned_at",{ascending:false}),
   supabase.from("students").select("id,student_code,full_name,current_class").order("full_name")
  ]);
  if(t.error)throw t.error;if(a.error)throw a.error;if(st.error)throw st.error;
  setTemplates((t.data||[]) as Template[]);
  setAssignments((a.data||[]) as Assignment[]);
  setStudents(st.data||[]);
 },[]);
 useEffect(()=>{async function init(){
  try{
   if(!supabase)throw new Error("Supabase not configured");
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(roleError||!role||!["teacher","admin","clinic_admin"].includes(role.role)){router.replace("/login");return;}
   setRoleName(role.role);
   setUserId(auth.user.id);await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to load custom assessments");}
  finally{setLoading(false);}
 }init();},[router,refresh]);
 function changeStructure(transform:(s:Section[])=>Section[]){setStructure(previous=>transform(structuredClone(previous)));}
 function editSection(si:number,key:"title",value:string){changeStructure(s=>{s[si][key]=value;return s;});}
 function editCategory(si:number,ci:number,value:string){changeStructure(s=>{s[si].categories[ci].title=value;return s;});}
 function editQuestion(si:number,ci:number,qi:number,key:"text"|"text_ml",value:string){changeStructure(s=>{s[si].categories[ci].questions[qi][key]=value;return s;});}
 function setQuestionType(si:number,ci:number,qi:number,value:"rating"|"multiple_choice"|"written"){changeStructure(s=>{
  const q=s[si].categories[ci].questions[qi];q.response_type=value;
  if(value==="multiple_choice" && (!q.options||q.options.length===0))q.options=makeOptions();
  return s;
 });}
 function changeOptionCount(si:number,ci:number,qi:number,count:number){changeStructure(s=>{
  const q=s[si].categories[ci].questions[qi];
  const current=q.options||makeOptions();
  q.options=Array.from({length:count},(_,i)=>current[i]||{id:String(i+1) as "1"|"2"|"3",text:"",text_ml:""});
  return s;
 });}
 function editOption(si:number,ci:number,qi:number,optionIndex:number,key:"text"|"text_ml",value:string){changeStructure(s=>{
  const q=s[si].categories[ci].questions[qi];if(!q.options)q.options=makeOptions();
  q.options[optionIndex][key]=value;return s;
 });}
 function addSection(){changeStructure(s=>[...s,{id:uid("s_"),title:"New section",categories:[{id:uid("c_"),title:"New category",questions:[makeQuestion()]}]}]);}
 function addCategory(si:number){changeStructure(s=>{s[si].categories.push({id:uid("c_"),title:"New category",questions:[makeQuestion()]});return s;});}
 function addQuestion(si:number,ci:number){changeStructure(s=>{s[si].categories[ci].questions.push(makeQuestion());return s;});}
 function removeSection(si:number){if(structure.length===1)return;changeStructure(s=>s.filter((_,i)=>i!==si));}
 function removeCategory(si:number,ci:number){if(structure[si].categories.length===1)return;changeStructure(s=>{s[si].categories.splice(ci,1);return s;});}
 function removeQuestion(si:number,ci:number,qi:number){if(structure[si].categories[ci].questions.length===1)return;changeStructure(s=>{s[si].categories[ci].questions.splice(qi,1);return s;});}
 function clearEditor(){setEditing(null);setTitle("");setDescription("");setLevel("all");setStructure(blank());setError("");}
 function openEditor(t:Template){setEditing(t.id);setTitle(t.title);setDescription(t.description);setLevel(t.level);setStructure(structuredClone(t.structure));setError("");setNotice("");setMode("builder");window.scrollTo({top:0,behavior:"smooth"});}
 function clone(t:Template){setEditing(null);setTitle(t.title+" (Copy)");setDescription(t.description);setLevel(t.level);setStructure(structuredClone(t.structure));setError("");setMode("builder");window.scrollTo({top:0,behavior:"smooth"});}
 function validate(){
  if(title.trim().length<3)throw new Error("Enter a test title (at least 3 characters).");
  if(!structure.length||structure.length>12)throw new Error("Use 1–12 sections.");
  let total=0;
  for(const s of structure){
   if(!s.title.trim()||!s.categories.length||s.categories.length>12)throw new Error("Every section needs a title and 1–12 categories.");
   for(const c of s.categories){
    if(!c.title.trim()||!c.questions.length||c.questions.length>30)throw new Error("Every category needs a title and 1–30 questions.");
    for(const q of c.questions){
      if(q.text.trim().length<3)throw new Error("Enter English text for every question.");
      if(q.response_type==="multiple_choice" &&
        (!q.options?.length || q.options.length>3 || q.options.some(opt=>opt.text.trim().length<1)))
        throw new Error("Each multiple-choice question needs 1–3 written answer choices.");
      total++;
    }
   }
  }
  if(total>250)throw new Error("A test can contain at most 250 questions.");
 }
 async function persist(publish:boolean){
  if(!supabase||busy)return;setError("");setNotice("");setBusy(true);
  try{
   if(publish)validate();
   else if(title.trim().length<3)throw new Error("Enter a title before saving a draft.");
   const fields={title:title.trim(),description:description.trim(),level,structure,status:publish?"published":"draft"};
   let id=editing;
   if(id){
    const {data,error:e}=await supabase.from("custom_assessment_templates").update(fields).eq("id",id).select("id").single();
    if(e)throw e;if(!data)throw new Error("Template could not be updated.");
   }else{
    const {data,error:e}=await supabase.from("custom_assessment_templates").insert({...fields,status:"draft",created_by:userId}).select("id").single();
    if(e)throw e;id=data.id;
    if(publish){const result=await supabase.from("custom_assessment_templates").update({status:"published"}).eq("id",id).select("id").single();if(result.error)throw result.error;}
   }
   await refresh();setEditing(id);setNotice(publish?"Test published! It can now be assigned to children.":"Draft saved. You can edit it later.");
   if(publish)clearEditor();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save template.");}
  finally{setBusy(false);}
 }
 async function assignTest(){
  if(!supabase||busy)return;setError("");setNotice("");
  if(!templateId||!studentId){setError("Choose a published test and student.");return;}
  setBusy(true);
  try{
   const {error:e}=await supabase.from("custom_assessment_assignments").insert({template_id:templateId,student_id:studentId,due_date:dueDate||null,assigned_by:userId});
   if(e)throw e;
   await refresh();setNotice("Custom test assigned. It will appear in the parent's Assessments tab.");setMode("review");
  }catch(e){setError(e instanceof Error?e.message:"Unable to assign custom test.");}
  finally{setBusy(false);}
 }
 async function approve(){
  if(!supabase||!reviewId||busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error:e}=await supabase.rpc("review_custom_assessment",{p_assignment_id:reviewId,p_feedback:feedback.trim()});
   if(e)throw e;await refresh();setNotice("Review approved. Feedback is now available to the parent.");setReviewId("");setFeedback("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to approve review.");}
  finally{setBusy(false);}
 }
 const published=templates.filter(x=>x.status==="published");
 const studentName=(id:string)=>{const s=students.find(x=>x.id===id);return s?s.full_name+" · "+s.student_code+(s.current_class?" · Class "+s.current_class:""):"Student";};
 const selectedReview=assignments.find(x=>x.id===reviewId);
 const reviewTemplate=templates.find(x=>x.id===selectedReview?.template_id);
 const readableAnswers=reviewTemplate?questionsOf(reviewTemplate):[];
 if(loading)return <main style={{padding:35}}>Loading Custom Assessment Builder...</main>;
 return <main style={{fontFamily:"Arial,sans-serif",background:"#f8faf7",minHeight:"100vh",color:"#183a35"}}>
  <header style={{position:"sticky",top:0,zIndex:30,background:"#0f4c5c",color:"white",padding:"14px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <div><strong>Swastha Learning Clinic</strong><div style={{fontSize:12,marginTop:4}}>CUSTOM ASSESSMENT BUILDER</div></div>
   <button style={{...outline,background:"#fff"}} onClick={()=>router.push(roleName==="clinic_admin"?"/clinic-admin/dashboard":roleName==="admin"?"/admin/dashboard":"/teacher/dashboard")}>Back to Dashboard</button>
  </header>
  <div style={{maxWidth:1100,margin:"auto",padding:"24px 16px 70px"}}>
   <h1>Create & Manage Custom Assessments</h1>
   <p style={{color:"#64748b"}}>Create reusable questionnaires with sections, categories and numbered questions. Save drafts, publish, assign to students and review parent responses. Published tests are locked; use Clone to make a revised version.</p>
   <nav style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:18}}>
    {([["builder","Build Tests"],["assign","Assign Tests"],["review","Responses & Review"]] as const).map(([key,label])=><button key={key} style={mode===key?btn:outline} onClick={()=>{setMode(key);setNotice("");setError("");}}>{label}</button>)}
   </nav>
   {error&&<p role="alert" style={{...card,color:"#a11c24",background:"#fff0f1"}}>{error}</p>}
   {notice&&<p role="status" style={{...card,color:green,background:"#e7f7ec"}}>{notice}</p>}
   {mode==="builder"&&<>
    <section style={card}>
     <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,alignItems:"center"}}><h2>{editing?"Edit Draft":"Create a New Test"}</h2><button style={outline} onClick={clearEditor}>New Blank Test</button></div>
     <label style={{display:"block",marginBottom:12}}>Test title *<input style={input} maxLength={150} value={title} placeholder="e.g. Attention & Memory Assessment" onChange={e=>setTitle(e.target.value)}/></label>
     <label style={{display:"block",marginBottom:12}}>Description<textarea style={{...input,minHeight:65}} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Purpose and instructions"/></label>
     <label style={{display:"block",marginBottom:12}}>Suitable level <select style={input} value={level} onChange={e=>setLevel(e.target.value)}><option value="all">All levels</option><option value="LP">LP — Classes 1–4</option><option value="UP">UP — Classes 5–7</option><option value="HS">HS — Classes 8–10</option><option value="HSS">HSS — Classes 11–12</option></select></label>
     {structure.map((section,si)=><section key={section.id} style={{...card,background:"#f6faf8",border:"1px solid #b5d9c8"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}><h3>Section {si+1}</h3><button disabled={structure.length===1} style={outline} onClick={()=>removeSection(si)}>Remove Section</button></div>
      <input style={input} value={section.title} maxLength={150} aria-label={"Section "+(si+1)+" title"} onChange={e=>editSection(si,"title",e.target.value)}/>
      {section.categories.map((category,ci)=><div key={category.id} style={{...card,marginTop:16}}>
       <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><h4>Category {String.fromCharCode(65+ci)}</h4><button style={outline} disabled={section.categories.length===1} onClick={()=>removeCategory(si,ci)}>Remove Category</button></div>
       <input style={input} value={category.title} maxLength={150} aria-label={"Category "+(ci+1)+" title"} onChange={e=>editCategory(si,ci,e.target.value)}/>
       {category.questions.map((q,qi)=><div key={q.id} style={{borderTop:"1px solid #e5e7eb",paddingTop:14,marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong>{String.fromCharCode(65+ci)}.{qi+1}</strong><button style={outline} disabled={category.questions.length===1} onClick={()=>removeQuestion(si,ci,qi)}>Remove</button></div>
        <label style={{display:"block",marginTop:10}}>Question in English *<textarea style={{...input,minHeight:60}} maxLength={1000} value={q.text} onChange={e=>editQuestion(si,ci,qi,"text",e.target.value)}/></label>
        <label style={{display:"block",marginTop:10}}>Malayalam translation (optional)<textarea style={{...input,minHeight:60}} maxLength={1500} value={q.text_ml} onChange={e=>editQuestion(si,ci,qi,"text_ml",e.target.value)} placeholder="മലയാളത്തിലുള്ള ചോദ്യം"/></label>
        <label style={{display:"block",marginTop:12}}>How will the student/parent answer this question?
         <select style={input} value={q.response_type||"rating"}
          onChange={e=>setQuestionType(si,ci,qi,e.target.value as "rating"|"multiple_choice"|"written")}>
          <option value="rating">Select a rating: 1, 2 or 3 (or NA)</option>
          <option value="multiple_choice">Choose from 1–3 teacher-provided answers</option>
          <option value="written">Written Answer — student types their own response</option>
         </select>
        </label>
        {q.response_type==="written"&&<p style={{marginTop:10,padding:12,background:"#eaf4ef",borderRadius:8,fontSize:13}}>The student or parent will see a large answer box to explain their response in their own words (up to 5,000 characters). The teacher reviews it after submission; it is not automatically scored.</p>}
        {(q.response_type||"rating")==="multiple_choice"&&<div style={{...card,background:"#f8faf7",marginTop:12}}>
         <strong>Answer choices for this question</strong>
         <label style={{display:"block",marginTop:10}}>Number of answer choices (1–3)
           <select style={input} value={(q.options||makeOptions()).length}
            onChange={e=>changeOptionCount(si,ci,qi,Number(e.target.value))}>
             <option value={1}>1 answer</option><option value={2}>2 answers</option><option value={3}>3 answers</option>
           </select>
         </label>
         <p style={{fontSize:13,color:"#64748b"}}>Students and parents will see the choices and select one. Leave optional Malayalam empty to show the English choice.</p>
         {(q.options||makeOptions()).map((opt,optionIndex)=><div key={opt.id} style={{marginTop:12}}>
          <strong>Choice {opt.id}</strong>
          <label style={{display:"block",marginTop:6}}>English answer *
           <input style={input} maxLength={300} value={opt.text}
            onChange={e=>editOption(si,ci,qi,optionIndex,"text",e.target.value)}/>
          </label>
          <label style={{display:"block",marginTop:6}}>Malayalam answer (optional)
           <input style={input} maxLength={500} value={opt.text_ml}
            onChange={e=>editOption(si,ci,qi,optionIndex,"text_ml",e.target.value)}/>
          </label>
         </div>)}
        </div>}
       </div>)}
       <button style={outline} disabled={category.questions.length>=30} onClick={()=>addQuestion(si,ci)}>+ Add Question</button>
      </div>)}
      <button style={outline} disabled={section.categories.length>=12} onClick={()=>addCategory(si)}>+ Add Category</button>
     </section>)}
     <button style={outline} disabled={structure.length>=12} onClick={addSection}>+ Add Section</button>
     <div style={{marginTop:20,display:"flex",gap:10,flexWrap:"wrap"}}>
      <button style={outline} disabled={busy} onClick={()=>persist(false)}>{busy?"Saving...":"Save Draft"}</button>
      <button style={btn} disabled={busy} onClick={()=>persist(true)}>{busy?"Publishing...":"Publish Test"}</button>
     </div>
     <p style={{fontSize:13,color:"#64748b"}}>For each question choose a 1–3 rating (NA allowed), enter 1–3 multiple-choice answers, or let the student write their own response. Older published rating tests stay compatible. Publishing locks questions so saved answers remain consistent.</p>
    </section>
    <section style={card}><h2>Saved Tests ({templates.length})</h2>
     {!templates.length&&<p>No custom tests created yet.</p>}
     {templates.map(t=><div key={t.id} style={{borderTop:"1px solid #e2e8f0",padding:"14px 0"}}>
      <strong>{t.title}</strong> <small style={{color:green}}>{t.status.toUpperCase()} · {t.level} · {questionsOf(t).length} questions</small>
      <p style={{fontSize:13,color:"#64748b"}}>{t.description}</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{t.status==="draft"&&<button style={outline} onClick={()=>openEditor(t)}>Edit Draft</button>}<button style={outline} onClick={()=>clone(t)}>Clone</button>{t.status==="published"&&<button style={btn} onClick={()=>{setTemplateId(t.id);setMode("assign");}}>Assign to Student</button>}</div>
     </div>)}
    </section>
   </>}
   {mode==="assign"&&<section style={card}>
    <h2>Assign a Published Test</h2>
    <p>New assignments appear automatically in the selected child's parent dashboard.</p>
    <label style={{display:"block",marginBottom:14}}>Choose test<select style={input} value={templateId} onChange={e=>setTemplateId(e.target.value)}><option value="">Select published test</option>{published.map(t=><option key={t.id} value={t.id}>{t.title} ({t.level})</option>)}</select></label>
    <label style={{display:"block",marginBottom:14}}>Choose student<select style={input} value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Select student</option>{students.map(s=><option key={s.id} value={s.id}>{studentName(s.id)}</option>)}</select></label>
    <label style={{display:"block",marginBottom:14}}>Due date (optional)<input type="date" style={input} value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
    <button style={btn} disabled={busy} onClick={assignTest}>Assign Custom Test</button>
    <p style={{fontSize:13,color:"#64748b"}}>A custom test can be assigned once per student. Clone the template for another assessment round.</p>
   </section>}
   {mode==="review"&&<section style={card}>
    <h2>Custom Test Responses & Teacher Review</h2>
    {!assignments.length&&<p>No custom tests have been assigned yet.</p>}
    {assignments.map(a=>{
     const t=templates.find(x=>x.id===a.template_id);
     return <section key={a.id} style={{borderBottom:"1px solid #e2e8f0",padding:"16px 0"}}>
      <strong>{t?.title||"Custom Test"} — {studentName(a.student_id)}</strong>
      <p>Status: <strong>{a.status}</strong> · Assigned: {new Date(a.assigned_at).toLocaleDateString("en-IN")}</p>
      {["submitted","reviewed"].includes(a.status)&&<button style={outline} onClick={()=>{setReviewId(reviewId===a.id?"":a.id);setFeedback(a.teacher_feedback||"");}}>{reviewId===a.id?"Close Responses":"View Answers"}</button>}
     </section>;
    })}
    {selectedReview&&reviewTemplate&&<section style={{...card,background:"#f7faf8",marginTop:18}}>
     <h3>{reviewTemplate.title} — {studentName(selectedReview.student_id)}</h3>
     <button type="button" style={{...btn,marginBottom:16}} onClick={()=>router.push("/custom-assessment-report/"+selectedReview.id)}>View Category Report / Print PDF</button>
     {readableAnswers.length>0&&(()=>{
      const ratingQuestions=readableAnswers.filter(q=>(q.response_type||"rating")==="rating");
      const rated=ratingQuestions.map(q=>selectedReview.answers?.[q.id]?.score).filter(v=>v==="0"||v==="1"||v==="2"||v==="3") as string[];
      const excluded=ratingQuestions.filter(q=>selectedReview.answers?.[q.id]?.score==="NA").length;
      const choices=readableAnswers.filter(q=>q.response_type==="multiple_choice"&&selectedReview.answers?.[q.id]?.choice!=null).length;
      const written=readableAnswers.filter(q=>q.response_type==="written"&&Boolean(selectedReview.answers?.[q.id]?.written_answer?.trim())).length;
      const mean=rated.length?rated.reduce((sum,v)=>sum+Number(v),0)/rated.length:null;
      return <section style={{...card,background:"#f0f7f5"}}><h4>Scoring Summary</h4><p>Rating answers: {rated.length}/{ratingQuestions.length} · NA: {excluded} · Multiple-choice answered: {choices} · Written answered: {written}</p><p><strong>Average: {mean===null?"Not rated":mean.toFixed(2)+" / 3"}</strong></p><p style={{fontSize:12,color:"#64748b"}}>Descriptive assessment only; NA responses are excluded from the average.</p></section>;
     })()}
     {readableAnswers.map((q,i)=>{
      const a=selectedReview.answers?.[q.id];
      return <div key={q.id} style={{borderBottom:"1px solid #dce8e1",padding:"12px 0"}}>
       <strong>{i+1}. {q.text}</strong>
       {q.response_type==="multiple_choice"
        ? <p>Selected answer: {a?.choice
           ? (q.options||[]).find(opt=>opt.id===a.choice)?.text || "Unknown option"
           : "Not answered"}</p>
        : q.response_type==="written"
          ? <p style={{whiteSpace:"pre-wrap"}}>Written response: {a?.written_answer||"Not answered"}</p>
          : <p>Rating: {a?.score??"Not answered"}</p>}{a?.observation&&<p>Observation: {a.observation}</p>}
      </div>;
     })}
     {selectedReview.status==="submitted"?<>
      <label style={{display:"block",marginTop:18}}>Teacher feedback<textarea style={{...input,minHeight:110}} value={feedback} maxLength={5000} onChange={e=>setFeedback(e.target.value)} placeholder="Strengths, observations and recommendations"/></label>
      <button style={{...btn,marginTop:12}} disabled={busy} onClick={approve}>Approve & Publish Feedback</button>
     </>:<p><strong>Reviewed.</strong> Feedback is visible to the parent.</p>}
    </section>}
   </section>}
  </div>
 </main>;
}
