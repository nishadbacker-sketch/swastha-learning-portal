"use client";

import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";
import BrandLogo from "../../components/brand-logo";

type StaffNotice={
 id:string;student_id:string;event_type:string;source_id:string;created_at:string;
};
type StudentIdentity={full_name:string;student_code:string|null};
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const button:React.CSSProperties={border:0,borderRadius:8,background:"#176b58",color:"#fff",padding:"10px 14px",fontWeight:700,cursor:"pointer"};
const roleDestination:Record<string,string>={teacher:"/teacher/dashboard",admin:"/admin/dashboard",owner:"/owner/dashboard",clinic_admin:"/clinic-admin/dashboard"};
const details:Record<string,{title:string,href:(id:string)=>string}>={
 assessment_submitted:{title:"Standard assessment submitted — review required",href:id=>"/teacher/assessment-review/"+id},
 custom_assessment_submitted:{title:"Custom assessment submitted — review required",href:()=>"/teacher/custom-assessments"},
 teacher_assigned:{title:"New student assigned to your caseload",href:()=>"/teacher/dashboard"},
};
export default function StaffNotifications(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [list,setList]=useState<StaffNotice[]>([]);
 const [students,setStudents]=useState<Record<string,StudentIdentity>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  if(!supabase)return;
  setLoading(true);setError("");
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user){router.replace("/login");return;}
  const {data:access,error:accessError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(accessError||!access||!roleDestination[access.role]){
   router.replace("/login");return;
  }
  setRole(access.role);
  // Recipient restriction is enforced in the database by auth.uid(), not by
  // this client-side filter. Never use user_metadata to grant access.
  const events=await supabase.from("portal_notification_events")
   .select("id,student_id,event_type,source_id,created_at")
   .eq("recipient_user_id",auth.user.id)
   .in("event_type",["assessment_submitted","custom_assessment_submitted","teacher_assigned"])
   .order("created_at",{ascending:false}).limit(100);
  if(events.error){setError("Staff notifications are not available yet.");setLoading(false);return;}
  const items=(events.data||[]) as StaffNotice[];
  setList(items);
  const ids=[...new Set(items.map(item=>item.student_id))];
  const map:Record<string,StudentIdentity>={};
  for(let i=0;i<ids.length;i+=100){
   const found=await supabase.from("students").select("id,full_name,student_code").in("id",ids.slice(i,i+100));
   if(found.error){setError("Some student names could not be loaded.");break;}
   for(const item of found.data||[])map[item.id]={full_name:item.full_name,student_code:item.student_code};
  }
  setStudents(map);
  setLoading(false);
 },[router]);
 useEffect(()=>{void refresh();},[refresh]);
 return <main style={{background:"#f8faf7",minHeight:"100vh",color:"#183a35",padding:"24px 16px",fontFamily:"Arial,sans-serif"}}>
  <div style={{maxWidth:920,margin:"0 auto"}}>
   <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:20}}>
    <BrandLogo/>
    {role&&<button type="button" style={button} onClick={()=>router.push(roleDestination[role])}>Back to dashboard</button>}
   </header>
   <h1 style={{fontSize:27}}>Staff Assessment Notifications</h1>
   <p style={{color:"#64748b",fontSize:14}}>Recent assessment submissions and student assignments that require attention. Only notifications addressed to your account are shown. No email or WhatsApp messages are sent from this page.</p>
   <div style={{margin:"16px 0"}}><button type="button" disabled={loading} style={button} onClick={()=>void refresh()}>{loading?"Loading...":"Refresh notifications"}</button></div>
   {error&&<p role="alert" style={{...panel,color:"#b42318"}}>{error}</p>}
   {!loading&&!error&&list.length===0&&<div style={panel}>No assessment submission notifications yet.</div>}
   <div style={{display:"grid",gap:10}}>
    {list.map(item=>{
     const record=details[item.event_type];
     if(!record)return null;
     const student=students[item.student_id];
     return <section key={item.id} style={panel}>
      <strong>{record.title}</strong>
      <p style={{color:"#64748b",fontSize:13}}>{student?student.full_name+" ("+(student.student_code||"No student code")+")":"Student details restricted"} · {new Date(item.created_at).toLocaleString("en-IN")}</p>
      <button type="button" style={button} onClick={()=>router.push(record.href(item.source_id))}>{item.event_type==="teacher_assigned"?"Open my students":"Review assessment"}</button>
     </section>;
    })}
   </div>
  </div>
 </main>;
}
