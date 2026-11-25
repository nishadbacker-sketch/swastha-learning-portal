"use client";

import {useEffect,useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {supabase} from "../../../../../lib/supabase";
import {CHECKLIST_DATA,type AssessmentLevel} from "../../../../../lib/assessment-data";

type Question={id?:string;text?:string;text_ml?:string;response_type?:string;options?:{id:string;text:string;text_ml?:string}[]};
type Category={id?:string;title:string;questions:Question[]};
type Section={id?:string;title:string;categories:Category[]};
type Template={id:string;title:string;description:string;level:string;status:string;structure:Section[]};
const levels=["LP","UP","HS","HSS"] as const;
const panel:React.CSSProperties={background:"#fff",border:"1px solid #d9e7df",borderRadius:14,padding:20,marginBottom:16};
const button:React.CSSProperties={padding:"10px 16px",border:0,borderRadius:9,background:"#176b58",color:"white",fontWeight:600,cursor:"pointer"};
function validSections(input:unknown):Section[]{
 if(!Array.isArray(input))return [];
 return input.filter((s):s is Section=>s!==null&&typeof s==="object"&&typeof s.title==="string"&&Array.isArray(s.categories));
}
export default function CourseView(){
 const params=useParams<{slug:string}>();const router=useRouter();
 const slug=String(params.slug||"");
 const [status,setStatus]=useState("Checking access…");
 const [role,setRole]=useState("");
 const [template,setTemplate]=useState<Template|null>(null);
 const [error,setError]=useState("");
 const standard=levels.includes(slug as AssessmentLevel);
 const level=standard?slug as AssessmentLevel:null;
 const bank=level?CHECKLIST_DATA[level]:null;
 useEffect(()=>{
  let live=true;
  (async()=>{
   try{
    if(!supabase)throw Error("Database unavailable");
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user){router.replace("/login");return;}
    const {data:r,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
    if(roleError||!r||!["owner","admin","clinic_admin","teacher"].includes(r.role)){router.replace("/login");return;}
    if(!live)return;
    setRole(r.role);
    if(!standard){
     if(!/^custom-[0-9a-f-]{36}$/i.test(slug))throw Error("Unrecognized course link");
     const id=slug.slice(7);
     const {data,error:e}=await supabase.from("custom_assessment_templates").select("id,title,description,level,status,structure").eq("id",id).single();
     if(e)throw e;
     if(!data)throw Error("This course is unavailable or you do not have permission to view it.");
     if(live)setTemplate({...data,structure:validSections(data.structure)} as Template);
    }
    if(live)setStatus("");
   }catch(e){if(live){setError(e instanceof Error?e.message:"Unable to open course");setStatus("");}}
  })();
  return()=>{live=false};
 },[slug,standard,router]);
 const questionCount=useMemo(()=>template?.structure.reduce((n,s)=>n+(s.categories||[]).reduce((m,c)=>m+(c.questions?.length||0),0),0)||0,[template]);
 if(status)return <main style={{padding:30}}>{status}</main>;
 if(!role)return <main style={{padding:30}} role="alert">{error||"Access unavailable"}</main>;
 return <main style={{maxWidth:1080,margin:"auto",padding:"24px 18px 80px",color:"#183a35"}}>
 <button type="button" style={button} onClick={()=>router.push("/staff/courses")}>← Back to Courses & Assessments</button>
 {error?<section style={{...panel,marginTop:20,color:"#a11c24"}} role="alert">{error}</section>:bank?<>
 <h1>{bank.shortTitle}</h1><p>{bank.badge} · {bank.ageRange}</p>
 <section style={panel}><h2>About this assessment</h2><p>{bank.purpose}</p><p><strong>Read-only question preview.</strong> To assign a standard assessment to a student, use the Teacher Dashboard → Assessments. Student responses remain in the existing assessment workflow.</p>
 {role==="teacher"&&<button type="button" style={button} onClick={()=>router.push("/teacher/dashboard")}>Go to Teacher Dashboard</button>}
 </section>
 {bank.areas.map((area,i)=><section key={area.id} style={panel}><h2>{i+1}. {area.title}</h2>{area.subDomains.map(domain=><div key={domain.id} style={{borderTop:"1px solid #e5ede8",paddingTop:10,marginTop:12}}><h3>{domain.title}</h3><ol>{domain.items.map((q,j)=><li key={domain.id+"-"+j} style={{marginBottom:9}}>{q}</li>)}</ol></div>)}</section>)}
 <section style={panel}><h2>Parent / guardian interview</h2><ol>{bank.parentInterview.map((q,i)=><li key={i} style={{marginBottom:8}}>{q}</li>)}</ol></section>
 <section style={panel}><h2>Practical activities</h2>{bank.practicalActivities.map((a,i)=><article key={i} style={{marginBottom:14}}><strong>{a.name}</strong><p>{a.task}</p><small>Observe: {a.observe}</small></article>)}</section>
 <section style={panel}><h2>Strengths and talents</h2><ol>{bank.talents.map((s,i)=><li key={i}>{s}</li>)}</ol></section>
 </>:template?<>
 <h1>{template.title}</h1><p>{template.description}</p><section style={panel}><strong>Level:</strong> {template.level} · <strong>Status:</strong> {template.status} · <strong>Questions:</strong> {questionCount}
 <p><strong>Read-only preview.</strong> Only authorized users can view this template. Editing, assigning and reviewing remain in the existing Custom Assessment Builder.</p>
 {role==="teacher"&&<button style={button} type="button" onClick={()=>router.push("/teacher/custom-assessments")}>Open Assessment Builder</button>}
 </section>
 {template.structure.map((section,si)=><section style={panel} key={section.id||si}><h2>{si+1}. {section.title}</h2>{section.categories?.map((category,ci)=><div key={category.id||ci} style={{borderTop:"1px solid #e5ede8",paddingTop:12}}><h3>{category.title}</h3><ol>{category.questions?.map((q,qi)=><li key={q.id||qi} style={{marginBottom:12}}><strong>{q.text||"Untitled question"}</strong>{q.text_ml&&<p style={{margin:"4px 0"}} lang="ml">{q.text_ml}</p>}<div style={{fontSize:13,color:"#566a63"}}>{q.response_type||"rating"}{q.options?.length?" · "+q.options.map(o=>o.text).join(" / "):""}</div></li>)}</ol></div>)}</section>)}
 </>:<section style={panel} role="alert">Course not found.</section>}
 </main>;
}
