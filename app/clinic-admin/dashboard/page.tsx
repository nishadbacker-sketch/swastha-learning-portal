"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import AppointmentEscalations from "../../admin/appointment-escalations";
import TeacherStudentAssignments from "../../components/teacher-student-assignments";

const action:React.CSSProperties={border:0,borderRadius:8,padding:"10px 14px",background:"#176b58",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",padding:16,borderRadius:13,marginBottom:14};
export default function ClinicAdminDashboard(){
 const router=useRouter();
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [name,setName]=useState("Admin");
 const [counts,setCounts]=useState({new:0,open:0,total:0});
 useEffect(()=>{
  let live=true;
  async function initialize(){
   if(!supabase){if(live){setError("Database unavailable.");setLoading(false);}return;}
   try{
    const {data:auth,error:authError}=await supabase.auth.getUser();
    if(authError||!auth.user){router.replace("/login");return;}
    const {data:role,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
    if(roleError||role?.role!=="clinic_admin"){router.replace("/login");return;}
    const {data:profile}=await supabase.from("profiles").select("full_name").eq("id",auth.user.id).maybeSingle();
    const {data:enquiries,error:queryError}=await supabase.from("appointment_enquiries").select("status").limit(1000);
    if(queryError)throw queryError;
    if(live){
     setName(profile?.full_name||"Admin");
     const rows=enquiries||[];
     setCounts({new:rows.filter(x=>x.status==="new").length,open:rows.filter(x=>!["completed","not_interested"].includes(x.status)).length,total:rows.length});
    }
   }catch(e){if(live)setError(e instanceof Error?e.message:"Could not load admin workspace.");}
   finally{if(live)setLoading(false);}
  }
  void initialize();
  return()=>{live=false;};
 },[router]);
 if(loading)return <main style={{padding:30}}>Loading Admin Dashboard...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"16px 5%"}}>
   <div style={{maxWidth:1100,margin:"auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <div><strong style={{color:"#176b58"}}>SWASTHA LEARNING CLINIC</strong><div style={{fontSize:12,color:"#667a74",marginTop:4}}>ADMIN · OPERATIONS</div></div>
    <button style={{...action,background:"#edf4f0",color:"#176b58"}} onClick={async()=>{if(supabase)await supabase.auth.signOut();router.replace("/login");}}>Sign out</button>
   </div>
  </header>
  <div style={{maxWidth:1100,margin:"auto",padding:"22px 16px 65px"}}>
   <h1 style={{fontSize:26,margin:"0 0 8px"}}>Welcome, {name}</h1>
   <p style={{fontSize:13,color:"#64748b"}}>Manage appointment enquiries and oversee timely teacher follow-ups. You can assign active teachers to students and supervise customer follow-ups. Super Admin retains exclusive control over user roles.</p>
   {error&&<section style={{...card,color:"#b42318"}} role="alert">{error}</section>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,170px),1fr))",gap:12,marginBottom:14}}>
    <section style={{...card,marginBottom:0}}><small>New queries</small><h2 style={{fontSize:27,margin:"6px 0 0"}}>{counts.new}</h2></section>
    <section style={{...card,marginBottom:0}}><small>Open follow-ups</small><h2 style={{fontSize:27,margin:"6px 0 0"}}>{counts.open}</h2></section>
    <section style={{...card,marginBottom:0}}><small>Total enquiries</small><h2 style={{fontSize:27,margin:"6px 0 0"}}>{counts.total}</h2></section>
   </div>
   <section style={card}><h2 style={{fontSize:19,margin:"0 0 9px"}}>Appointment Operations</h2>
    <p style={{fontSize:13}}>Review enquiries, contact customers through WhatsApp, and record follow-up outcomes.</p>
    <button style={action} onClick={()=>router.push("/teacher/appointments")}>Open Appointment Follow-up Queue</button>
   </section>
   <TeacherStudentAssignments/>
   <AppointmentEscalations/>
  </div>
 </main>;
}
