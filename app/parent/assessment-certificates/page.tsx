"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import BrandLogo from "../../components/brand-logo";
import {type AssessmentCertificate,downloadAssessmentCertificatePDF} from "../../../lib/course-certificate-pdf";
type ReviewedAssignment={id:string;student_id:string;assessment_level:string;status:string};
type Student={id:string;full_name:string;student_code:string|null};
type ReviewEvidence={assignment_id:string;reviewed_at:string|null};
const certificateFields="id,assignment_id,student_id,student_name,student_code,assessment_title,assessment_level,completion_date,reference_code,issued_at,programme_coordinator,approving_director";
const levels:Record<string,string>={LP:"Lower Primary",UP:"Upper Primary",HS:"High School",HSS:"Higher Secondary"};
const button:React.CSSProperties={background:"#176b58",color:"#fff",padding:"10px 14px",border:0,borderRadius:9,fontWeight:700,cursor:"pointer"};
export default function MyAssessmentCertificates(){
 const router=useRouter();
 const [items,setItems]=useState<AssessmentCertificate[]>([]);
 const [loading,setLoading]=useState(true);
 const [reviewed,setReviewed]=useState<ReviewedAssignment[]>([]);
 const [students,setStudents]=useState<Student[]>([]);
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
   const [cert,assignments,studentRows]=await Promise.all([
    supabase.from("assessment_completion_certificates").select(certificateFields).order("issued_at",{ascending:false}),
    supabase.from("assessment_assignments").select("id,student_id,assessment_level,status").eq("status","reviewed"),
    supabase.from("students").select("id,full_name,student_code")
   ]);
   const queryError=cert.error||assignments.error||studentRows.error;
   if(!active)return;
   if(queryError)setError("Unable to load assessment certificates: "+queryError.message);
   else{
    const reviewRows=(assignments.data||[]) as ReviewedAssignment[];
    const reviews=reviewRows.length
     ?await supabase.from("assessment_results").select("assignment_id,reviewed_at").in("assignment_id",reviewRows.map(a=>a.id)).not("reviewed_at","is",null)
     :{data:[] as ReviewEvidence[],error:null};
    if(reviews.error)setError("Unable to verify Teacher reviews: "+reviews.error.message);
    else{
     const eligible=new Set((reviews.data||[]).map(r=>r.assignment_id));
     setReviewed(reviewRows.filter(a=>eligible.has(a.id)));
     setStudents((studentRows.data||[]) as Student[]);
     setItems((cert.data||[]) as AssessmentCertificate[]);
    }
   }
   setLoading(false);
  }
  void load();return()=>{active=false;};
 },[router]);
 async function claimAndDownload(assignment:ReviewedAssignment){
  if(!supabase)return;
  setDownloading(assignment.id);setError("");
  try{
   const {data:id,error:claimError}=await supabase.rpc("claim_reviewed_assessment_certificate",{p_assignment_id:assignment.id});
   if(claimError)throw new Error(claimError.message);
   const {data:certificate,error:fetchError}=await supabase.from("assessment_completion_certificates")
    .select(certificateFields).eq("id",id).single();
   if(fetchError||!certificate)throw new Error(fetchError?.message||"Issued certificate unavailable.");
   const c=certificate as AssessmentCertificate;
   setItems(p=>[c,...p.filter(old=>old.id!==c.id)]);
   await downloadAssessmentCertificatePDF(c);
  }catch(e){
   setError(e instanceof Error?e.message:"Unable to issue or download certificate.");
  }finally{setDownloading("");}
 }
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
   <p style={{fontSize:13,color:"#64748b"}}>Once your child's assessment is reviewed and the clinic has configured its official certificate names, you can download a digitally verifiable PDF directly. Assessment completion does not certify scores or diagnoses.</p>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {loading?<p>Loading reviewed assessments and certificates...</p>:<>
    <section style={{padding:18,border:"1px solid #dce8e1",borderRadius:12,background:"#fff",marginBottom:16}}>
     <h2 style={{fontSize:19,marginTop:0}}>Reviewed Assessments — Download Certificate</h2>
     {!reviewed.length?<p>No Teacher-reviewed standard assessments are available for your linked students yet.</p>:
      <div style={{display:"grid",gap:12}}>
       {reviewed.map(a=>{
        const st=students.find(x=>x.id===a.student_id);
        const existing=items.find(c=>c.assignment_id===a.id);
        return <article key={a.id} style={{padding:14,border:"1px solid #dce8e1",borderRadius:9,background:"#f8faf7"}}>
         <strong>{st?.full_name||"Student"} ({st?.student_code||"Student ID pending"})</strong>
         <p style={{fontSize:13}}>{levels[a.assessment_level]||a.assessment_level} Learning Assessment · Teacher reviewed</p>
         <button style={{...button,opacity:downloading===a.id?0.6:1}} disabled={!!downloading} onClick={()=>void claimAndDownload(a)}>
          {downloading===a.id?"Preparing your certificate...":existing?"Download Certificate Again (PDF)":"Download Certificate (PDF)"}
         </button>
         {existing&&<a href={"/verify/certificate/"+encodeURIComponent(existing.reference_code)} style={{color:"#176b58",marginLeft:12}} target="_blank" rel="noopener noreferrer">Verify online</a>}
        </article>;
       })}
      </div>}
    </section>
    {!!items.length&&<section style={{padding:18,border:"1px solid #dce8e1",borderRadius:12,background:"#fff"}}>
     <h2 style={{fontSize:19}}>Previously Issued Certificates</h2>
     <div style={{display:"grid",gap:12}}>
      {items.map(c=><article key={c.id} style={{padding:14,border:"1px solid #dce8e1",borderRadius:9}}>
       <strong>{c.assessment_title}</strong> — {c.student_name} ({c.student_code})
       <p style={{fontSize:12}}>Reviewed: {c.completion_date} · Digital reference: {c.reference_code}</p>
       <button style={button} disabled={!!downloading} onClick={()=>void download(c)}>Download PDF</button>
       <a href={"/verify/certificate/"+encodeURIComponent(c.reference_code)} style={{marginLeft:12,color:"#176b58"}} target="_blank" rel="noopener noreferrer">Verify online</a>
      </article>)}
     </div>
    </section>}
   </>}
  </div>
 </main>;
}
