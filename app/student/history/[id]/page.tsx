"use client";
import BrandLogo from "../../../components/brand-logo";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Student={id:string;full_name:string;current_class:string|null;date_of_birth:string|null;student_code:string|null};
type Standard={id:string;student_id:string;assessment_level:string;status:string;assigned_at:string};
type StandardResult={assignment_id:string;overall_score:number|null;teacher_feedback:string|null;recommendations:string|null;reviewed_at:string|null;strengths:unknown;support_needs:unknown};
type Question={id:string;text?:string;response_type?:string;options?:{id:string;text:string}[]};
type Area={title:string;categories:{title:string;questions:Question[]}[]};
type CustomTemplate={id:string;title:string;structure:Area[]|{title:string;categories:{title:string;questions:Question[]}[]}[]};
type Custom={id:string;student_id:string;template_id:string;status:string;assigned_at:string;reviewed_at:string|null;teacher_feedback:string|null;answers:Record<string,{score?:string|null;choice?:string|null;written_answer?:string|null}>;custom_assessment_templates:CustomTemplate|CustomTemplate[]|null};
type Activity={id:string;student_id:string;assigned_at:string;status:string;learning_activities:{title:string}|{title:string}[]|null};
type Entry={id:string;kind:"standard"|"custom";title:string;date:string;status:string;group:string;average:number|null;ratings:number;na:number;choices:number;written:number;feedback:string|null;recommendations:string|null;reportUrl:string|null};
const card:React.CSSProperties={border:"1px solid #dbe7e1",borderRadius:13,padding:16,background:"#fff",marginBottom:14};
const button:React.CSSProperties={background:"#176b58",color:"white",padding:"11px 17px",border:0,borderRadius:9,fontWeight:700,cursor:"pointer"};
const date=(s:string)=>new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
function signature(structure:CustomTemplate["structure"]):string{
 const normalized=structure.flatMap(s=>s.categories.flatMap(c=>c.questions.map(q=>[q.id,q.text||"",q.response_type||"rating",q.options?.map(x=>[x.id,x.text])||[]])));
 return JSON.stringify(normalized);
}
function calculateCustom(a:Custom):{average:number|null;ratings:number;na:number;choices:number;written:number}{
 const t=Array.isArray(a.custom_assessment_templates)?a.custom_assessment_templates[0]:a.custom_assessment_templates;
 if(!t)return {average:null,ratings:0,na:0,choices:0,written:0};
 let sum=0,ratings=0,na=0,choices=0,written=0;
 for(const q of t.structure.flatMap(s=>s.categories.flatMap(c=>c.questions))){
  const x=a.answers?.[q.id];if(!x)continue;
  if(q.response_type==="multiple_choice"){if(x.choice)choices++;}
  else if(q.response_type==="written"){if(x.written_answer?.trim())written++;}
  else if(x.score==="NA")na++;
  else if(["0","1","2","3"].includes(x.score||"")){ratings++;sum+=Number(x.score);}
 }
 return {average:ratings?sum/ratings:null,ratings,na,choices,written};
}
export default function StudentHistoryPage(){
 const router=useRouter();const params=useParams<{id:string}>();
 const [role,setRole]=useState("");
 const [student,setStudent]=useState<Student|null>(null);
 const [standards,setStandards]=useState<Standard[]>([]);
 const [results,setResults]=useState<StandardResult[]>([]);
 const [customs,setCustoms]=useState<Custom[]>([]);
 const [activities,setActivities]=useState<Activity[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState<"all"|"standard"|"custom">("all");
 useEffect(()=>{async function load(){
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  try{
   const {data:auth,error:ae}=await supabase.auth.getUser();
   if(ae||!auth.user){router.replace("/login");return;}
   const {data:ur,error:ue}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(ue||!ur||!["parent","teacher","admin"].includes(ur.role))throw new Error("You are not authorised to view this history.");
   setRole(ur.role);
   // These reads are constrained to the authenticated user's linked or assigned children by existing RLS.
   const {data:child,error:se}=await supabase.from("students").select("id,full_name,current_class,date_of_birth,student_code").eq("id",params.id).single();
   if(se||!child)throw new Error("Student not found or access denied.");
   setStudent(child);
   const [base,custom,act]=await Promise.all([
    supabase.from("assessment_assignments").select("id,student_id,assessment_level,status,assigned_at").eq("student_id",params.id).eq("status","reviewed"),
    supabase.from("custom_assessment_assignments").select("id,student_id,template_id,status,assigned_at,reviewed_at,teacher_feedback,answers,custom_assessment_templates(id,title,structure)").eq("student_id",params.id).eq("status","reviewed"),
    supabase.from("student_activity_assignments").select("id,student_id,assigned_at,status,learning_activities(title)").eq("student_id",params.id).order("assigned_at",{ascending:false}).limit(50)
   ]);
   if(base.error)throw base.error;if(custom.error)throw custom.error;
   if(act.error)throw act.error;
   const bs=(base.data||[]) as Standard[];
   setStandards(bs);setCustoms((custom.data||[]) as Custom[]);setActivities((act.data||[]) as Activity[]);
   if(bs.length){
    const {data:reviews,error:re}=await supabase.from("assessment_results")
      .select("assignment_id,overall_score,teacher_feedback,recommendations,reviewed_at,strengths,support_needs")
      .in("assignment_id",bs.map(x=>x.id));
    if(re)throw re;
    setResults((reviews||[]) as StandardResult[]);
   }
  }catch(e){setError(e instanceof Error?e.message:"Unable to load development history.");}
  finally{setLoading(false);}
 }load();},[params.id,router]);
 const entries=useMemo<Entry[]>(()=>{
  const classic=standards.flatMap(a=>{
   const result=results.find(x=>x.assignment_id===a.id);
   if(!result)return [];
   return [{id:a.id,kind:"standard" as const,title:a.assessment_level+" Child Assessment",date:result.reviewed_at||a.assigned_at,status:"reviewed",group:"standard:"+a.assessment_level,average:result.overall_score===null?null:Number(result.overall_score),ratings:0,na:0,choices:0,written:0,feedback:result.teacher_feedback,recommendations:result.recommendations,reportUrl:null}];
  });
  const custom=customs.map(a=>{
   const template=Array.isArray(a.custom_assessment_templates)?a.custom_assessment_templates[0]:a.custom_assessment_templates;
   const summary=calculateCustom(a);
   return {id:a.id,kind:"custom" as const,title:template?.title||"Custom Assessment",date:a.reviewed_at||a.assigned_at,status:a.status,group:template?"custom:"+signature(template.structure):"unknown:"+a.template_id,average:summary.average,ratings:summary.ratings,na:summary.na,choices:summary.choices,written:summary.written,feedback:a.teacher_feedback,recommendations:null,reportUrl:"/custom-assessment-report/"+a.id};
  });
  return [...classic,...custom].sort((a,b)=>b.date.localeCompare(a.date));
 },[standards,results,customs]);
 const filtered=entries.filter(e=>filter==="all"||e.kind===filter);
 const trends=useMemo(()=>{
  const groups=new Map<string,Entry[]>();
  for(const e of entries)if(e.average!==null){
   const matches=groups.get(e.group)||[];matches.push(e);groups.set(e.group,matches);
  }
  return [...groups.entries()].filter(([,rows])=>rows.length>=2).map(([key,rows])=>{
   const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date));
   return {key,title:sorted[0].title,items:sorted,delta:(sorted[sorted.length-1].average||0)-(sorted[0].average||0)};
  });
 },[entries]);
 const goBack=()=>router.push(role==="parent"?"/parent/dashboard":role==="admin"?"/admin/dashboard":"/teacher/dashboard");
 if(loading)return <main style={{padding:28}}>Loading student development history...</main>;
 if(error||!student)return <main style={{padding:30,maxWidth:800,margin:"auto"}}><h2>History unavailable</h2><p>{error}</p><button style={button} onClick={goBack}>Back to Dashboard</button></main>;
 return <main style={{background:"#f8faf7",minHeight:"100vh",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{background:"#0f4c5c",color:"white",padding:"17px 5%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
   <div><BrandLogo /><div style={{fontSize:12,marginTop:3}}>STUDENT DEVELOPMENT HISTORY</div></div>
   <button style={{...button,background:"#fff",color:"#0f4c5c"}} onClick={goBack}>Back to Dashboard</button>
  </header>
  <div style={{maxWidth:1080,margin:"auto",padding:"25px 17px 60px"}}>
   <section style={card}><h1 style={{marginTop:0}}>Development History</h1>
    <h2 style={{fontSize:19}}>{student.full_name} · {student.student_code}</h2>
    <p style={{color:"#64748b"}}>Class: {student.current_class||"Not specified"} · Student code: {student.student_code||"Not assigned"}</p>
    <p style={{fontSize:13,color:"#64748b"}}>Only teacher-reviewed assessments appear here. Student information is accessible only to authorised parents, teachers and administrators.</p>
   </section>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:13,marginBottom:17}}>
    {[["Approved Assessments",entries.length],["Standard Assessments",entries.filter(x=>x.kind==="standard").length],["Custom Assessments",customs.length],["Learning Activities",activities.length]].map(([title,n])=>
     <div key={title} style={{...card,marginBottom:0}}><div style={{fontSize:13,color:"#64748b"}}>{title}</div><strong style={{fontSize:28}}>{n}</strong></div>
    )}
   </div>
   <section style={card}>
    <h2>Comparable Rating Trends</h2>
    {trends.length===0?<p style={{color:"#64748b"}}>No reliable comparison yet. A trend becomes available after two reviewed assessments using the same standard level or matching custom question structure.</p>:
     trends.map(g=><div key={g.key} style={{padding:"13px 0",borderBottom:"1px solid #e2e8f0"}}>
      <h3 style={{fontSize:17}}>{g.title}</h3>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><span>First: {g.items[0].average?.toFixed(2)} / 3</span><span>Latest: {g.items[g.items.length-1].average?.toFixed(2)} / 3</span><strong>Change: {g.delta>0?"+":""}{g.delta.toFixed(2)}</strong></div>
      <div style={{marginTop:12,display:"flex",gap:10,alignItems:"end",height:120,borderBottom:"1px solid #ccd8d0"}}>
       {g.items.map(x=><div key={x.id} title={date(x.date)+" · "+x.average?.toFixed(2)} style={{flex:"1 1 45px",maxWidth:90,textAlign:"center",fontSize:11,color:"#64748b"}}>
        <div style={{height:95,display:"flex",alignItems:"end",justifyContent:"center"}}><div style={{height:(Math.max(2,(x.average||0)/3*100))+"%",background:"#176b58",width:"70%",borderRadius:"5px 5px 0 0"}}/></div>
        <span>{date(x.date)}</span>
       </div>)}
      </div>
      <p style={{color:"#64748b",fontSize:12}}>This reflects rating changes only. Small differences may reflect different observers or circumstances and do not establish a clinical improvement.</p>
     </div>)
    }
   </section>
   <section style={card}>
    <h2>Assessment Timeline</h2>
    <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:17}}>
     {([["all","All"],["standard","Standard"],["custom","Custom"]] as const).map(([value,label])=>
      <button key={value} style={{...button,background:filter===value?"#176b58":"#e4f1e9",color:filter===value?"white":"#176b58"}} onClick={()=>setFilter(value)}>{label}</button>
     )}
    </div>
    {filtered.length===0?<p>No approved assessments in this view yet.</p>:filtered.map(e=>
     <article key={e.kind+e.id} style={{borderLeft:"4px solid #176b58",padding:"6px 0 17px 19px",marginBottom:15,borderBottom:"1px solid #dce8e1"}}>
      <small style={{color:"#64748b"}}>{date(e.date)} · {e.kind==="custom"?"Custom assessment":"Standard assessment"} · Approved</small>
      <h3 style={{margin:"7px 0 10px"}}>{e.title}</h3>
      <p style={{margin:"5px 0"}}>Rating average: <strong>{e.average===null?"Not rated":e.average.toFixed(2)+" / 3"}</strong>{e.kind==="custom"?" · Written answers: "+e.written+" · Choice answers: "+e.choices:""}</p>
      {e.feedback&&<p style={{whiteSpace:"pre-wrap"}}><strong>Teacher observation:</strong> {e.feedback}</p>}
      {e.recommendations&&<p style={{whiteSpace:"pre-wrap"}}><strong>Recommendations:</strong> {e.recommendations}</p>}
      {e.reportUrl&&<button style={{...button,marginTop:8}} onClick={()=>router.push(e.reportUrl!)}>Open Approved Report</button>}
     </article>
    )}
   </section>
   <section style={card}>
    <h2>Learning Activity History</h2>
    {activities.length===0?<p>No learning activities have been assigned yet.</p>:activities.map(a=>{
     const item=Array.isArray(a.learning_activities)?a.learning_activities[0]:a.learning_activities;
     return <div key={a.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}><strong>{item?.title||"Learning Activity"}</strong><p style={{margin:"5px 0",fontSize:13}}>Assigned {date(a.assigned_at)} · Status: {a.status}</p></div>;
    })}
    {activities.length>=50&&<p style={{color:"#64748b",fontSize:12}}>Showing the 50 most recently assigned activities.</p>}
   </section>
   <p style={{color:"#64748b",fontSize:12}}>Swastha Learning Clinic — Educational screening and development planning aid. Not a medical or psychological diagnosis.</p>
  </div>
 </main>;
}
