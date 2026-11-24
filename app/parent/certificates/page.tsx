"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";
import {type CourseCertificate,downloadCourseCertificatePDF} from "../../../lib/course-certificate-pdf";

const btn:React.CSSProperties={background:"#176b58",color:"#fff",padding:"10px 14px",fontWeight:700,border:0,borderRadius:9,cursor:"pointer"};
export default function MyCourseCertificates(){
 const router=useRouter();
 const [items,setItems]=useState<CourseCertificate[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [downloading,setDownloading]=useState("");
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!supabase){if(active){setError("Supabase unavailable.");setLoading(false);}return;}
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace("/login");return;}
   const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(roleError||!role||!["parent","student"].includes(role.role)){router.replace("/login");return;}
   const {data,error:queryError}=await supabase.from("course_completion_certificates")
    .select("id,registration_id,student_id,student_name,student_code,course_title,completion_date,reference_code,issued_at,programme_coordinator,approving_director")
    .order("issued_at",{ascending:false});
   if(!active)return;
   if(queryError)setError("Unable to access course certificates: "+queryError.message);
   else setItems((data||[]) as CourseCertificate[]);
   setLoading(false);
  }
  void load();return()=>{active=false;};
 },[router]);
 async function download(cert:CourseCertificate){
  setError("");setDownloading(cert.id);
  try{await downloadCourseCertificatePDF(cert);}
  catch{setError("The PDF download could not be generated. Please retry.");}
  finally{setDownloading("");}
 }
 return <main style={{minHeight:"100vh",background:"#f8faf7",fontFamily:"Arial,sans-serif",color:"#183a35",padding:"24px 16px"}}>
  <div style={{maxWidth:1000,margin:"auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:24}}>
    <BrandLogo/><button style={btn} onClick={()=>router.push("/parent/dashboard")}>Back to My Dashboard</button>
   </header>
   <h1>My Course Completion Certificates</h1>
   <p style={{color:"#64748b",fontSize:13}}>Certificates appear after the clinic verifies course completion and issues a digital reference. Assessment scores or individual activities do not automatically count as course completion.</p>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {loading?<p>Loading your certificates...</p>:!items.length?
    <section style={{background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:20}}>
     No course completion certificates have been issued for your linked students yet.
    </section>:
    <div style={{display:"grid",gap:12}}>
     {items.map(c=><article key={c.id} style={{background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:18}}>
      <h2 style={{fontSize:18}}>{c.course_title}</h2>
      <p><strong>{c.student_name}</strong> ({c.student_code})</p>
      <p>Completed: {c.completion_date} · Reference: {c.reference_code}</p>
      <button disabled={downloading===c.id} onClick={()=>void download(c)} style={{...btn,opacity:downloading===c.id?0.6:1}}>
       {downloading===c.id?"Generating PDF...":"Download Verified Certificate (PDF)"}
      </button>
      <a style={{marginLeft:12,color:"#176b58"}} href={"/verify/certificate/"+encodeURIComponent(c.reference_code)} target="_blank" rel="noopener noreferrer">Verify certificate</a>
     </article>)}
    </div>}
  </div>
 </main>;
}
