"use client";
import BrandLogo from "../../components/brand-logo";
import StaffNotificationsPopup from "../../components/staff-notifications-popup";


import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import AppointmentEscalations from "../../admin/appointment-escalations";
import TeacherStudentAssignments from "../../components/teacher-student-assignments";
import TeacherManagement from "../../components/teacher-management";

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
    const {data:profile}=await supabase.from("profiles").select("full_name,staff_code").eq("id",auth.user.id).maybeSingle();
    const {data:enquiries,error:queryError}=await supabase.from("appointment_enquiries").select("status").limit(1000);
    if(queryError)throw queryError;
    if(live){
     setName((profile?.full_name||"Admin")+(profile?.staff_code?" · "+profile.staff_code:""));
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
    <div><strong style={{color:"#176b58"}}><BrandLogo /></strong><div style={{fontSize:12,color:"#667a74",marginTop:4}}>ADMIN · OPERATIONS</div></div>
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><StaffNotificationsPopup/><button type="button" style={{...action,background:"#176b58",color:"white",margin:0}} onClick={()=>router.push("/teacher/appointments")}>Appointment ({counts.open})</button><button style={{...action,background:"#edf4f0",color:"#176b58"}} onClick={()=>router.push("/my-profile")}>My Profile</button><button style={{...action,background:"#edf4f0",color:"#176b58"}} onClick={async()=>{if(supabase)await supabase.auth.signOut();router.replace("/login");}}>Sign out</button></div>
   </div>
  </header>
  <div style={{maxWidth:1100,margin:"auto",padding:"22px 16px 65px"}}>
   {error&&<section style={{...card,color:"#b42318"}} role="alert">{error}</section>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,170px),1fr))",gap:12,marginBottom:14}}>
    <section style={{...card,marginBottom:0}}><small>New queries</small><h2 style={{fontSize:27,margin:"6px 0 0"}}>{counts.new}</h2></section>
    <section style={{...card,marginBottom:0}}><small>Open follow-ups</small><h2 style={{fontSize:27,margin:"6px 0 0"}}>{counts.open}</h2></section>
    <section style={{...card,marginBottom:0}}><small>Total enquiries</small><h2 style={{fontSize:27,margin:"6px 0 0"}}>{counts.total}</h2></section>
   </div>

 <section aria-label="Staff tools" style={{background:"linear-gradient(120deg,#132838,#0f4c5c)",color:"#fff",padding:16,borderRadius:12,marginBottom:18,minWidth:0}}>
 <h1 style={{fontSize:20,margin:"0 0 12px",overflowWrap:"anywhere"}}>Welcome to Staff Tools, {name}!</h1>
 
 <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))"}}>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/operations")}>Clinic Operations & Calendar</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/courses")}>Courses</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/assessment-certificates")}>Assessment Certificates</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/clinic-admin/sessions")}>Sessions & Attendance</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/students")}>Open Student Management</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/teacher/coordination")}>Open Coordination Overview</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/staff/notifications")}>Open Staff Notifications</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/questions")}>Manage Assessment Questions</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/audit")}>Open Audit Timeline</button>
 <button type="button" style={{...action,background:"#176b58",color:"white",margin:0,minWidth:0,whiteSpace:"normal"}} onClick={()=>router.push("/admin/announcements")}>Manage Announcements</button>
 </div></section>
  <TeacherStudentAssignments/>
  <TeacherManagement/>
   <AppointmentEscalations/>
  </div>
 </main>;
}
