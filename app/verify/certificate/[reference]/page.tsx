"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabase} from "../../../../lib/supabase";

type Verification={reference_code:string;course_title?:string;assessment_title?:string;student_initials:string;completion_date:string;issued_at:string;valid:boolean};
export default function VerifyCertificate(){
 const params=useParams<{reference:string}>();
 const code=typeof params.reference==="string"?params.reference:"";
 const [certificate,setCertificate]=useState<Verification|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  async function verify(){
   if(!supabase){setError("Verification service unavailable.");setLoading(false);return;}
   if(!/^SL[CA]-[A-F0-9]{32}$/.test(code)){setLoading(false);return;}
   const {data,error:verifyError}=code.startsWith("SLA-")
    ?await supabase.rpc("verify_assessment_completion_certificate",{p_reference_code:code})
    :await supabase.rpc("verify_course_completion_certificate",{p_reference_code:code});
   if(!active)return;
   if(verifyError)setError("Unable to verify this certificate. Please try again later.");
   else setCertificate((data?.[0]||null) as Verification|null);
   setLoading(false);
  }
  void verify();return()=>{active=false;};
 },[code]);
 return <main style={{minHeight:"80vh",display:"grid",placeItems:"center",padding:20,background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <article style={{background:"#fff",padding:28,maxWidth:600,width:"100%",border:"1px solid #dce8e1",borderRadius:16}}>
   <header style={{textAlign:"center"}}>
    <strong style={{fontSize:21,color:"#176b58"}}>SWASTHA LEARNING CLINIC</strong>
    <h1 style={{margin:"20px 0 5px"}}>Digital Certificate Verification</h1>
   </header>
   {loading?<p>Checking the certificate reference...</p>:error?<p role="alert" style={{color:"#b42318"}}>{error}</p>:
    certificate?.valid?
     <section role="status" style={{background:"#edf7ef",border:"1px solid #b8dbc4",padding:18,borderRadius:10}}>
      <h2 style={{color:"#176b58"}}>Verified Certificate</h2>
      <p>This completion certificate was issued by Swastha Learning Clinic after an authorised review.</p>
      <p><strong>Reference:</strong> {certificate.reference_code}</p>
      <p><strong>{code.startsWith("SLA-")?"Assessment":"Course"}:</strong> {certificate.assessment_title||certificate.course_title}</p>
      <p><strong>Student:</strong> {certificate.student_initials} (abbreviated for child privacy)</p>
      <p><strong>Completion date:</strong> {certificate.completion_date}</p>
      <p><strong>Issued:</strong> {new Date(certificate.issued_at).toLocaleDateString("en-IN")}</p>
     </section>:
     <section role="alert" style={{background:"#fff1f0",padding:18,borderRadius:10,color:"#9b1c1c"}}>
      <h2>Certificate not found or no longer valid</h2>
      <p>Check the reference with Swastha Learning Clinic. No certificate is confirmed for this code.</p>
     </section>}
   <p style={{fontSize:12,color:"#64748b",marginTop:20}}>Verification confirms an issued assessment or course completion record. It does not certify medical or psychological results. Student and guardian details remain private.</p>
   <a href="https://swasthalearning.com/#top" style={{color:"#176b58"}}>Swastha Learning Clinic home</a>
  </article>
 </main>;
}
