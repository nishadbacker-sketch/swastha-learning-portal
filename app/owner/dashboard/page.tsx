"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AdminDashboard from "../../admin/dashboard/page";

export default function CreatorDashboard(){
 const router=useRouter();
 const [allowed,setAllowed]=useState(false);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let mounted=true;
  async function verify(){
   if(!supabase){if(mounted)setLoading(false);return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/login");return;}
   const {data:role,error}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
   if(error||role?.role!=="owner"){router.replace("/login");return;}
   if(mounted){setAllowed(true);setLoading(false);}
  }
  void verify();
  return()=>{mounted=false;};
 },[router]);
 if(loading)return <main style={{padding:35}}>Verifying Creator access...</main>;
 if(!allowed)return <main style={{padding:35}}>Creator access is not available.</main>;
 return <AdminDashboard/>;
}
