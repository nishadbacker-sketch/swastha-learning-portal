"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = { full_name:string; phone:string|null; additional_contact_number:string|null; preferred_language:string; staff_code:string|null; created_at:string };
const card:React.CSSProperties = {background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:20,marginBottom:14};
export default function MyProfilePage() {
  const router=useRouter();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [role,setRole]=useState("");
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;async function run(){
    if(!supabase){setError("Database is not configured.");setLoading(false);return;}
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(!active)return;
    if(authError||!user){router.replace("/login");return;}
    setEmail(user.email||"");
    const [p,r]=await Promise.all([
      supabase.from("profiles").select("full_name,phone,additional_contact_number,preferred_language,staff_code,created_at").eq("id",user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle()
    ]);
    if(!active)return;
    if(p.error)setError(p.error.message);
    else if(!p.data)setError("Your profile is not available. Contact the administrator.");
    else setProfile(p.data as Profile);
    if(r.data)setRole(r.data.role);
    setLoading(false);
  }void run();return()=>{active=false;};},[router]);
  const home=role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":role==="teacher"?"/teacher/dashboard":"/parent";
  if(loading)return <main style={{padding:30}}>Loading your profile...</main>;
  const row=(label:string,value:string|null|undefined)=><div style={{padding:"12px 0",borderBottom:"1px solid #eef1ef",display:"grid",gridTemplateColumns:"minmax(130px,1fr) 2fr",gap:10}}><strong>{label}</strong><span>{value||"Not provided"}</span></div>;
  return <main style={{minHeight:"100vh",background:"#f8faf7",padding:"26px 16px",fontFamily:"Arial,sans-serif",color:"#183a35"}}>
    <div style={{maxWidth:720,margin:"auto"}}>
      <button type="button" onClick={()=>router.push(home)} style={{padding:"10px 15px",border:0,borderRadius:8,background:"#176b58",color:"#fff",cursor:"pointer",marginBottom:15}}>Back to Dashboard</button>
      <section style={card}><h1 style={{marginTop:0}}>My Profile</h1><p style={{color:"#64748b"}}>Your Swastha Learning Clinic account information. Your staff ID is assigned by the administrator and cannot be changed here.</p>
      {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
      {profile&&<>
        {row("Full name",profile.full_name)}
        {row("Role",role==="owner"?"Creator / Owner":role==="admin"?"Super Admin":role==="clinic_admin"?"Clinic Admin":role==="teacher"?"Teacher / Staff":role==="parent"?"Parent / Student":role)}
        {row("Staff ID",profile.staff_code)}
        {row("Email",email)}
        {row("WhatsApp / Phone",profile.phone)}
        {row("Additional contact",profile.additional_contact_number)}
        {row("Preferred language",profile.preferred_language==="ml"?"Malayalam":"English")}
        {row("Member since",new Date(profile.created_at).toLocaleDateString("en-IN"))}
      </>}
      </section>
      <p style={{fontSize:13,color:"#64748b"}}>For corrections to account details, please contact an authorised administrator. Passwords and access roles are not displayed on this page.</p>
    </div>
  </main>;
}
