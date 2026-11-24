"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import BrandLogo from "../../components/brand-logo";
import {type CourseCertificate,downloadCourseCertificatePDF} from "../../../lib/course-certificate-pdf";

type Registration={id:string;student_id:string;package_id:string;status:string};
type Student={id:string;full_name:string;student_code:string|null};
type Package={id:string;name:string};
const card:React.CSSProperties={padding:16,border:"1px solid #dce8e1",borderRadius:12,background:"#fff",marginBottom:12};
const btn:React.CSSProperties={padding:"11px 14px",border:0,borderRadius:9,background:"#176b58",color:"#fff",fontWeight:700,cursor:"pointer"};

export default function StaffCertificates(){
 const router=useRouter();
 const [ready,setReady]=useState(false);
 const [role,setRole]=useState("");
 const [registrations,setRegistrations]=useState<Registration[]>([]);
 const [students,setStudents]=useState<Student[]>([]);
 const [packages,setPackages]=useState<Package[]>([]);
 const [certificates,setCertificates]=useState<CourseCertificate[]>([]);
 const [registration,setRegistration]=useState("");
 const [date,setDate]=useState("");
 const [coordinator,setCoordinator]=useState("");
 const [director,setDirector]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 async function load(){
  if(!supabase)return;
  const db=supabase;
  const [reg,student,pkg,cert]=await Promise.all([
   db.from("registrations").select("id,student_id,package_id,status").eq("status","confirmed").limit(500),
   db.from("students").select("id,full_name,student_code").limit(500),
   db.from("packages").select("id,name").limit(500),
   db.from("course_completion_certificates").select("id,registration_id,student_id,student_name,student_code,course_title,completion_date,reference_code,issued_at,programme_coordinator,approving_director").order("issued_at",{ascending:false}).limit(500)
  ]);
  const problem=reg.error||student.error||pkg.error||cert.error;
  if(problem){setError("Unable to load authorised course completion records: "+problem.message);return;}
  setRegistrations(reg.data||[]);
  setStudents(student.data||[]);
  setPackages(pkg.data||[]);
  setCertificates((cert.data||[]) as CourseCertificate[]);
 }
 useEffect(()=>{
  let active=true;
  async function init(){
   if(!supabase){setError("Supabase is unavailable");return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace("/login");return;}
   const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(roleError||!role||!["owner","admin","clinic_admin","teacher"].includes(role.role)){router.replace("/login");return;}
   if(active){setRole(role.role);setReady(true);void load();}
  }
  void init();return()=>{active=false;};
 },[router]);
 const issued=new Set(certificates.map(c=>c.registration_id));
 const available=registrations.filter(r=>!issued.has(r.id)&&students.some(s=>s.id===r.student_id)&&packages.some(p=>p.id===r.package_id));
 const selected=available.find(r=>r.id===registration);
 const student=students.find(s=>s.id===selected?.student_id);
 const pkg=packages.find(p=>p.id===selected?.package_id);
 async function issue(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||saving)return;
  setSaving(true);setError("");setMessage("");
  const {data,error:issueError}=await supabase.rpc("issue_course_completion_certificate",{
   p_registration_id:registration,p_completion_date:date,
   p_coordinator_name:coordinator.trim(),p_director_name:director.trim()
  });
  if(issueError)setError(issueError.message);
  else{
   setMessage("Certificate issued and registered for verification: "+String(data));
   setRegistration("");setDate("");await load();
  }
  setSaving(false);
 }
 if(!ready)return <main style={{padding:32}}>Checking certificate permissions...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",padding:"20px 16px",fontFamily:"Arial,sans-serif",color:"#183a35"}}>
  <div style={{maxWidth:1100,margin:"auto"}}>
   <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:18}}>
    <BrandLogo/><button style={btn} onClick={()=>router.back()}>Back to Dashboard</button>
   </header>
   <h1>Digital Course Completion Certificates</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Issue only after verifying actual attendance and completion against a confirmed, consented course registration. Certificates are saved as permanent reference records; a QR code links to independent public verification.</p>
   {error&&<section role="alert" style={{...card,color:"#b42318"}}>{error}</section>}
   {message&&<section role="status" style={{...card,color:"#176b58"}}>{message}</section>}
   {role!=="teacher"&&<section style={card}>
    <h2>Issue Verified Certificate</h2>
    {!available.length&&<p>No eligible confirmed course registrations without certificates are available. Do not issue a certificate based on assessments or learning activities alone.</p>}
    <form onSubmit={issue} style={{display:"grid",gap:12,maxWidth:620}}>
     <label>Confirmed course registration
      <select value={registration} required onChange={e=>setRegistration(e.target.value)} style={{display:"block",width:"100%",padding:10,marginTop:5}}>
       <option value="">Select a confirmed, completed course</option>
       {available.map(r=><option key={r.id} value={r.id}>{students.find(s=>s.id===r.student_id)?.full_name||"Student"} — {packages.find(p=>p.id===r.package_id)?.name||"Course"}</option>)}
      </select>
     </label>
     {selected&&<p style={{fontSize:13,background:"#f0f7f3",padding:10}}>Student: {student?.full_name} ({student?.student_code||"Unique ID missing"}) · Course: {pkg?.name}</p>}
     <label>Actual completion date
      <input type="date" value={date} required max={new Date().toLocaleDateString("en-CA")} onChange={e=>setDate(e.target.value)} style={{display:"block",padding:10,marginTop:5}}/>
     </label>
     <label>Programme Coordinator — official full name
      <input value={coordinator} required minLength={2} maxLength={120} onChange={e=>setCoordinator(e.target.value)} placeholder="Enter authorised coordinator's name" style={{display:"block",padding:10,marginTop:5,width:"100%"}}/>
     </label>
     <label>Clinical Director — official full name
      <input value={director} required minLength={2} maxLength={120} onChange={e=>setDirector(e.target.value)} placeholder="Enter authorised director's name" style={{display:"block",padding:10,marginTop:5,width:"100%"}}/>
     </label>
     <button type="submit" disabled={!registration||saving} style={{...btn,opacity:(!registration||saving)?0.6:1}}>{saving?"Issuing...":"Confirm Completion & Issue Certificate"}</button>
    </form>
   </section>}
   <section style={card}>
    <h2>Issued Certificates</h2>
    {!certificates.length?<p>No certificates have been issued.</p>:
     <div style={{display:"grid",gap:12}}>
      {certificates.map(c=><article key={c.id} style={{...card,background:"#f8faf7"}}>
       <strong>{c.student_name} ({c.student_code})</strong>
       <p>{c.course_title} · Completed {c.completion_date}</p>
       <p style={{fontSize:12,color:"#64748b"}}>Digital reference: {c.reference_code}</p>
       <button style={btn} onClick={()=>{void downloadCourseCertificatePDF(c).catch(()=>setError("PDF generation failed. Please try again."));}}>Download PDF</button>
       <a style={{marginLeft:12,color:"#176b58"}} href={"/verify/certificate/"+encodeURIComponent(c.reference_code)} target="_blank" rel="noopener noreferrer">Verify</a>
      </article>)}
     </div>}
   </section>
  </div>
 </main>;
}
