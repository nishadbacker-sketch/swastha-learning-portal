"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Item = { id:string; title:string; description:string|null; level:string|null; status:string|null };
type Publisher = { template_id:string; creator_name:string; creator_staff_id:string|null; creator_user_id:string };
type CatalogueCard = {
 id:string; title:string; subtitle:string; category:"Standard assessment"|"Custom assessment";
 route:string; details:string; status?:string|null; publisher?:Publisher;
};
const standard = [
 ["LP","Lower Primary","Classes 1–4"],
 ["UP","Upper Primary","Classes 5–7"],
 ["HS","High School","Classes 8–10"],
 ["HSS","Higher Secondary","Classes 11–12"]
] as const;
const button:CSSProperties={background:"#176b58",color:"white",border:0,borderRadius:8,padding:"10px 14px",cursor:"pointer",fontWeight:600};
const grid:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:12,alignItems:"stretch"};

function AssessmentCard({item,onOpen}:{item:CatalogueCard;onOpen:(route:string)=>void}){
 return <article style={{border:"1px solid #dce8e1",borderRadius:12,padding:16,background:"#fff",display:"flex",flexDirection:"column",minHeight:230}}>
  <div style={{fontSize:12,color:"#176b58",fontWeight:700,marginBottom:10}}>{item.category}</div>
  <h3 style={{fontSize:17,lineHeight:1.4,margin:"0 0 8px"}}>{item.title}</h3>
  <p title={item.subtitle} style={{fontSize:14,lineHeight:1.5,color:"#526b63",margin:"0 0 12px",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{item.subtitle}</p>
  <div style={{fontSize:12,color:"#526b63",marginTop:"auto"}}>{item.details}{item.status?" · "+item.status:""}</div>
  {item.category==="Custom assessment"&&item.status==="published"&&
   <p style={{fontSize:12,color:"#526b63",margin:"8px 0 0",overflowWrap:"anywhere"}}>
    <strong>Published by:</strong> {item.publisher?.creator_name||"Creator unavailable"} ({item.publisher?.creator_staff_id||item.publisher?.creator_user_id||"ID unavailable"})
   </p>}
  <button type="button" style={{...button,marginTop:14,width:"100%"}} onClick={()=>onOpen(item.route)} aria-label={"Open assessment: "+item.title}>Open assessment</button>
 </article>;
}
export default function Courses(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [items,setItems]=useState<Item[]>([]);
 const [publishers,setPublishers]=useState<Record<string,Publisher>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setError("Database unavailable");setLoading(false);return;}
  setLoading(true);setError("");
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){router.replace("/login");return;}
  const {data:userRole,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(roleError||!["owner","admin","clinic_admin","teacher"].includes(userRole?.role)){router.replace("/login");return;}
  setRole(userRole.role);
  const [templates,attribution]=await Promise.all([
   supabase.from("custom_assessment_templates").select("id,title,description,level,status").order("title"),
   supabase.rpc("get_custom_assessment_publishers")
  ]);
  if(templates.error)setError("Custom assessments could not be loaded: "+templates.error.message);
  else setItems(templates.data||[]);
  if(attribution.error)setError(previous=>[previous,"Publisher details unavailable: "+attribution.error.message].filter(Boolean).join(" | "));
  else setPublishers(Object.fromEntries(((attribution.data||[]) as Publisher[]).map(item=>[item.template_id,item])));
  setLoading(false);
 },[router]);
 useEffect(()=>{void load();const refresh=()=>void load();window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh)},[load]);
 const standardCards:CatalogueCard[]=standard.map(([id,title,classes])=>({
  id:"standard-"+id,title:title+" ("+id+")",subtitle:classes,
  category:"Standard assessment",route:"/staff/courses/view/"+id,details:"Standard learning assessment"
 }));
 const customCards:CatalogueCard[]=items.map(item=>({
  id:"custom-"+item.id,title:item.title,
  subtitle:item.description||"Custom learning assessment",
  category:"Custom assessment",route:"/staff/courses/view/custom-"+item.id,
  details:item.level||"All levels",status:item.status,publisher:publishers[item.id]
 }));
 const match=(item:CatalogueCard)=>{
  const haystack=[item.title,item.subtitle,item.details,item.category,item.status||"",item.publisher?.creator_name||"",item.publisher?.creator_staff_id||""].join(" ").toLowerCase();
  return haystack.includes(search.trim().toLowerCase());
 };
 const standards=standardCards.filter(match);
 const customs=customCards.filter(match);
 const open=(route:string)=>router.push(route);
 return <main style={{maxWidth:1100,margin:"auto",padding:20,color:"#183a35"}}>
  <button type="button" style={button} onClick={()=>router.push(role==="teacher"?"/teacher/dashboard":role==="clinic_admin"?"/clinic-admin/dashboard":role==="owner"?"/owner/dashboard":"/admin/dashboard")}>Back to Staff Tools</button>
  <h1>Courses &amp; Assessments</h1>
  <p>All assessments now share the same card layout and Open assessment button. Previews are read-only; student assignment and teacher review remain in their existing workflows.</p>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
   <input aria-label="Search catalogue" placeholder="Search courses and assessments" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:10,flex:1,minWidth:180,border:"1px solid #dce8e1",borderRadius:8}}/>
   <button type="button" style={button} onClick={()=>void load()}>Refresh</button>
   {role==="teacher"&&<button type="button" style={button} onClick={()=>router.push("/teacher/custom-assessments")}>Custom Assessment Builder</button>}
  </div>
  {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
  {role&&<>
   <h2>Standard assessments</h2>
   {standards.length?<div style={grid}>{standards.map(item=><AssessmentCard key={item.id} item={item} onOpen={open}/>)}</div>:<p>No matching standard assessments.</p>}
   <h2 style={{marginTop:26}}>Custom assessments</h2>
   {loading?<p>Loading catalogue...</p>:customs.length?<div style={grid}>{customs.map(item=><AssessmentCard key={item.id} item={item} onOpen={open}/>)}</div>:<p>No matching custom assessments.</p>}
  </>}
 </main>;
}
