"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import BrandLogo from "../../components/brand-logo";
import {type AssessmentCertificate,downloadAssessmentCertificatePDF} from "../../../lib/course-certificate-pdf";
const button:React.CSSProperties={background:"#176b58",color:"#fff",padding:"10px 14px",border:0,borderRadius:9,fontWeight:700,cursor:"pointer"};
export default function MyAssessmentCertificates(){
 const router=useRouter();
 const [items,setItems]=useState<AssessmentCertificate[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [downloading,setDownloading]=useState("");
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!supabase){setError("Supabase unavailable");setLoading(false);return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace("/login");return;}
   const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(roleError||!role||!["parent","student"].includes(role.role)){router.replace("/login");return;}
   const {data,error:queryError}=await supabase.from("assessment_completion_certificates")
    .select("id,assignment_id,student_id,student_name,student_code,assessment_title,assessment_level,completion_date,reference_code,issued_at,programme_coordinator,approving_director")
    .order("issued_at",{ascending:false});
   if(!active)return;
   if(queryError)setError("Unable to load assessment certificates: "+queryError.message);
   else setItems((data||[]) as AssessmentCertificate[]);
   setLoading(false);
  }
  void load();return()=>{active=false;};
 },[router]);
 async function download(c:AssessmentCertificate){
  setDownloading(c.id);setError("");
  try{await downloadAssessmentCertificatePDF(c);}
  catch{setError("Unable to generate certificate PDF. Please try again.");}
  finally{setDownloading("");}
 }
 return <main style={{minHeight:"100vh",padding:"24px 16px",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <div style={{maxWidth:1000,margin:"auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <BrandLogo/><button style={button} onClick={()=>router.push("/parent/dashboard")}>Back to Dashboard</button>
   </header>
   <h1>My Assessment Completion Certificates</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Digital certificates are available once a Teacher reviews an assessment and authorised clinic staff issues its certificate. Completion does not imply any particular diagnosis or performance outcome.</p>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {loading?<p>Loading issued assessment certificates...</p>:!items.length?
    <section style={{padding:20,border:"1px solid #dce8e1",borderRadius:12,background:"#fff"}}>No reviewed assessment completion certificates have been issued for your linked students yet.</section>:
    <div style={{display:"grid",gap:12}}>
     {items.map(c=><article key={c.id} style={{background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:18}}>
      <h2 style={{fontSize:18}}>{c.assessment_title}</h2>
      <p><strong>{c.student_name}</strong> ({c.student_code})</p>
      <p>Reviewed: {c.completion_date} · Digital reference: {c.reference_code}</p>
      <button style={{...button,opacity:downloading===c.id?0.6:1}} disabled={downloading===c.id} onClick={()=>void download(c)}>
       {downloading===c.id?"Generating...":"Download Assessment Certificate (PDF)"}
      </button>
      <a href={"/verify/certificate/"+encodeURIComponent(c.reference_code)} style={{marginLeft:12,color:"#176b58"}} target="_blank" rel="noopener noreferrer">Verify online</a>
     </article>)}
    </div>}
  </div>
 </main>;
}
