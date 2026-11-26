"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

/** Backward-compatible redirect for existing Clinic Operations bookmarks. */
export default function LegacyClinicOperationsRedirect(){
 const router=useRouter();
 const [message,setMessage]=useState("Opening Clinic Dashboard operations…");
 useEffect(()=>{
  let alive=true;
  async function redirect(){
   if(!supabase){if(alive)setMessage("Unable to connect. Please sign in to the clinic portal.");return;}
   const {data:{user},error}=await supabase.auth.getUser();
   if(error||!user){router.replace("/login");return;}
   const rr=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(rr.error||!rr.data){if(alive)setMessage("Unable to load account permissions.");return;}
   const home:Record<string,string>={owner:"/owner/dashboard",admin:"/admin/dashboard",clinic_admin:"/clinic-admin/dashboard",teacher:"/teacher/dashboard"};
   const target=home[rr.data.role];
   if(!target){router.replace("/login");return;}
   const params=new URLSearchParams({clinic:"operations"});
   const current=new URLSearchParams(window.location.search);
   if(["calendar","attention","workload"].includes(current.get("view")||""))params.set("view",current.get("view")!);
   router.replace(target+"?"+params.toString()+"#clinic-operations");
  }
  void redirect();return()=>{alive=false;};
 },[router]);
 return <main style={{padding:"24px 18px",color:"#176b58"}} role="status">{message}</main>;
}
