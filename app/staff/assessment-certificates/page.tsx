"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";
import {type AssessmentCertificate,downloadAssessmentCertificatePDF} from "../../../lib/course-certificate-pdf";

type Assignment={id:string;student_id:string;assessment_level:string;status:string};
type Student={id:string;full_name:string;student_code:string|null};
const button:React.CSSProperties={background:"#176b58",color:"#fff",border:0,borderRadius:9,padding:"11px 14px",fontWeight:700,cursor:"pointer"};
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:18,marginBottom:14};

export default function AssessmentCertificateStaffPage(){
 const router=useRouter();
 const [ready,setReady]=useState(false);
 const [role,setRole]=useState("");
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [students,setStudents]=useState<Student[]>([]);
 const [certificates,setCertificates]=useState<AssessmentCertificate[]>([]);
 const [assignment,setAssignment]=useState("");
 const [coordinator,setCoordinator]=useState("");
 const [director,setDirector]=useState("");
 const [officialCoordinator,setOfficialCoordinator]=useState("");
 const [officialDirector,setOfficialDirector]=useState("");
 const [configuring,setConfiguring]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 async function load(){
  if(!supabase)return;
  const [a,s,c]=await Promise.all([
   supabase.from("assessment_assignments").select("id,student_id,assessment_level,status").eq("status","reviewed").limit(500),
   supabase.from("students").select("id,full_name,student_code").limit(500),
   supabase.from("assessment_completion_certificates").select("id,assignment_id,student_id,student_name,student_code,assessment_title,assessment_level,completion_date,reference_code,issued_at,programme_coordinator,approving_director").order("issued_at",{ascending:false}).limit(500)
  ]);
  if(a.error||s.error||c.error){setError("Unable to load approved assessment certificates: "+(a.error||s.error||c.error)?.message);return;}
  setAssignments((a.data||[]) as Assignment[]);
  setStudents((s.data||[]) as Student[]);
  setCertificates((c.data||[]) as AssessmentCertificate[]);
 }
 useEffect(()=>{
  let active=true;
  async function init(){
   if(!supabase){setError("Supabase unavailable");return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace("/login");return;}
   const {data:r,error:e}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(e||!r||!["owner","admin","clinic_admin","teacher"].includes(r.role)){router.replace("/login");return;}
   if(active){setRole(r.role);setReady(true);void load();}
  }
  void init();return()=>{active=false;};
 },[router]);
 const existing=new Set(certificates.map(c=>c.assignment_id));
 const available=assignments.filter(a=>!existing.has(a.id)&&students.some(s=>s.id===a.student_id&&s.student_code));
 async function configureNames(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!supabase||configuring)return;
  setConfiguring(true);setError("");setMessage("");
  const {error:err}=await supabase.rpc("configure_assessment_certificate_signatories",{
   p_programme_coordinator:officialCoordinator.trim(),p_director:officialDirector.trim()
  });
  if(err)setError(err.message);
  else setMessage("Official Coordinator and Director saved. Parents can now download certificates directly after Teacher review.");
  setConfiguring(false);
 }
 async function issue(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy)return;
  setBusy(true);setError("");setMessage("");
  const {data,error:err}=await supabase.rpc("issue_assessment_completion_certificate",{
   p_assignment_id:assignment,p_coordinator_name:coordinator.trim(),p_director_name:director.trim()
  });
  if(err)setError(err.message);
  else{setMessage("Assessment completion certificate issued: "+data);setAssignment("");await load();}
  setBusy(false);
 }
 if(!ready)return <main style={{padding:28}}>Verifying staff permissions...</main>;
 return <main style={{background:"#f8faf7",minHeight:"100vh",padding:"24px 16px",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <div style={{maxWidth:1050,margin:"auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <BrandLogo/><button style={button} onClick={()=>router.back()}>Back</button>
   </header>
   <h1>Assessment Completion Certificates</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Certificates document completion of a reviewed standard learning assessment. They do not certify a particular score, diagnosis or qualification.</p>
   {error&&<section role="alert" style={{...panel,color:"#b42318"}}>{error}</section>}
   {message&&<section role="status" style={{...panel,color:"#176b58"}}>{message}</section>}
   {role!=="teacher"&&<section style={panel}>
    <h2>Official Names for Parent Certificate Downloads</h2>
    <p style={{fontSize:13,color:"#64748b"}}>Set the real authorised Programme Coordinator and Director once. For reviewed assessments, linked Parents can then create and download a verified certificate directly. These names are recorded on the certificate when it is first issued.</p>
    <form onSubmit={configureNames} style={{display:"grid",gap:11,maxWidth:620}}>
     <label>Programme Coordinator full name
      <input required minLength={2} maxLength={120} value={officialCoordinator} onChange={e=>setOfficialCoordinator(e.target.value)} style={{display:"block",padding:10,marginTop:5,width:"100%"}}/>
     </label>
     <label>Director full name
      <input required minLength={2} maxLength={120} value={officialDirector} onChange={e=>setOfficialDirector(e.target.value)} style={{display:"block",padding:10,marginTop:5,width:"100%"}}/>
     </label>
     <button type="submit" disabled={configuring} style={button}>{configuring?"Saving...":"Save Official Certificate Names"}</button>
    </form>
   </section>}
   {role!=="teacher"&&<section style={panel}>
    <h2>Issue Reviewed Assessment Certificate</h2>
    {!available.length&&<p>No eligible reviewed assessments without a certificate are available.</p>}
    <form style={{display:"grid",gap:12,maxWidth:620}} onSubmit={issue}>
     <label>Reviewed assessment
      <select required value={assignment} onChange={e=>setAssignment(e.target.value)} style={{display:"block",padding:10,width:"100%",marginTop:5}}>
       <option value="">Select an approved assessment</option>
       {available.map(a=><option key={a.id} value={a.id}>
        {students.find(s=>s.id===a.student_id)?.full_name||"Student"} ({students.find(s=>s.id===a.student_id)?.student_code||"ID pending"}) — {a.assessment_level}
       </option>)}
      </select>
     </label>
     <label>Programme Coordinator name
      <input required minLength={2} maxLength={120} value={coordinator} onChange={e=>setCoordinator(e.target.value)} style={{display:"block",padding:10,marginTop:5,width:"100%"}}/>
     </label>
     <label>Director name
      <input required minLength={2} maxLength={120} value={director} onChange={e=>setDirector(e.target.value)} style={{display:"block",padding:10,marginTop:5,width:"100%"}}/>
     </label>
     <button disabled={busy||!assignment} type="submit" style={{...button,opacity:(busy||!assignment)?0.6:1}}>
      {busy?"Issuing...":"Confirm Reviewed Assessment & Issue Certificate"}
     </button>
    </form>
   </section>}
   <section style={panel}>
    <h2>Issued Assessment Certificates</h2>
    {!certificates.length?<p>No assessment certificates issued yet.</p>:
     certificates.map(c=><article key={c.id} style={{...panel,background:"#f8faf7"}}>
      <strong>{c.student_name} ({c.student_code})</strong>
      <p>{c.assessment_title} · Reviewed on {c.completion_date}</p>
      <p style={{fontSize:12,color:"#64748b"}}>Reference: {c.reference_code}</p>
      <button style={button} onClick={()=>void downloadAssessmentCertificatePDF(c).catch(()=>setError("Could not generate assessment PDF."))}>Download PDF</button>
      <a href={"/verify/certificate/"+encodeURIComponent(c.reference_code)} style={{color:"#176b58",marginLeft:12}} target="_blank" rel="noopener noreferrer">Verify</a>
     </article>)}
   </section>
  </div>
 </main>;
}
