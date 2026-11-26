"use client";

import {useEffect,useState,type ReactNode} from "react";
import {usePathname,useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";
import {COMMON_TOOLS,roleTools,type StaffRole} from "./staff-tools-menu";

const roles:StaffRole[]=["owner","admin","clinic_admin","teacher"];
const roleHome=(role:StaffRole)=>role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":"/teacher/dashboard";

/**
 * Visual wrapper for staff subpages. Dashboard routes already render StaffToolsMenu.
 * Authorization remains with the individual pages and Supabase RLS.
 */
export default function StaffRouteFrame({children}:{children:ReactNode}){
 const pathname=usePathname()||"";
 const router=useRouter();
 const [role,setRole]=useState<StaffRole|null>(null);
 const [expanded,setExpanded]=useState(false);
 const dashboard=pathname==="/teacher/dashboard"||pathname==="/admin/dashboard"||pathname==="/owner/dashboard"||pathname==="/clinic-admin/dashboard";
 useEffect(()=>{
  if(dashboard)return;
  let mounted=true;
  async function verify(){
   if(!supabase)return;
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)return;
   const {data,error}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
   if(mounted&&!error&&data&&roles.includes(data.role as StaffRole))setRole(data.role as StaffRole);
  }
  void verify();
  return()=>{mounted=false;};
 },[pathname,dashboard]);
 const topbar=<header className="swastha-staff-global-topbar">
  <a href={role?roleHome(role):pathname.startsWith("/admin")?"/admin/dashboard":pathname.startsWith("/clinic-admin")?"/clinic-admin/dashboard":pathname.startsWith("/owner")?"/owner/dashboard":"/teacher/dashboard"} className="swastha-staff-global-topbar__logo" aria-label="Swastha Learning Clinic staff dashboard">
   <img src="/swastha-learning-clinic-logo.png" alt="Swastha Learning Clinic" width={205} height={68}/>
  </a>
  <span className="swastha-staff-global-topbar__label">Staff Portal</span>
 </header>;
 if(dashboard)return <div className="swastha-staff-route">{topbar}{children}</div>;
 const links=role?[...COMMON_TOOLS,...roleTools(role)]:[];
 return <div className="swastha-staff-route swastha-staff-route--subpage">
  {topbar}
  {role&&<aside aria-label="Staff navigation" className={"swastha-staff-sidebar swastha-staff-sidebar--subpage"+(expanded?" is-open":"")}>
   <div className="swastha-staff-sidebar__brand">
    <span className="swastha-staff-sidebar__role">{role.replace("_"," ")} Workspace</span>
   </div>
   <nav aria-label="Staff sections" className="swastha-staff-sidebar__sections">
    <button type="button" onClick={()=>router.push(roleHome(role))}>Dashboard Overview</button>
   </nav>
   <div className="swastha-staff-sidebar__tools"><h2>Staff Tools</h2>
    <nav aria-label="Role-based staff tools">{links.map(item=><button key={item.href} type="button" aria-current={pathname===item.href?"page":undefined}
     className={"swastha-staff-sidebar__tool"+(pathname===item.href?" active":"")}
     onClick={()=>router.push(item.href)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</nav>
   </div>
  </aside>}
  {role&&<button type="button" className="swastha-staff-subpage__mobile-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}> {expanded?"Hide Staff Navigation":"Show Staff Navigation"} </button>}
  <div className={role?"swastha-staff-subpage__content is-navigation-visible":"swastha-staff-subpage__content"}>{children}</div>
 </div>;
}
