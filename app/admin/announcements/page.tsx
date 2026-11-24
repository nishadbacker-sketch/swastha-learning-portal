"use client";

import BrandLogo from "../../components/brand-logo";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

type Parent={user_id:string;display_name:string};
type Announcement={id:string;title:string;message:string;target_parent_user_id:string|null;created_at:string;active:boolean;expires_at:string|null};
const button:React.CSSProperties={border:0,borderRadius:9,background:"#176b58",color:"#fff",fontWeight:700,fontSize:13,padding:"10px 14px",cursor:"pointer"};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",padding:16,borderRadius:13};
const input:React.CSSProperties={width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:8,boxSizing:"border-box",background:"#fff"};

export default function ParentAnnouncementManagement(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [ready,setReady]=useState(false);
 const [parents,setParents]=useState<Parent[]>([]);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [title,setTitle]=useState("");
 const [message,setMessage]=useState("");
 const [recipient,setRecipient]=useState("all");
 const [expires,setExpires]=useState("");
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  if(!supabase)return;
  setLoading(true);
  const [a,p]=await Promise.all([
   supabase.from("parent_announcements").select("id,title,message,target_parent_user_id,created_at,active,expires_at").order("created_at",{ascending:false}).limit(100),
   supabase.rpc("admin_parent_announcement_recipients")
  ]);
  if(a.error||p.error)setError(a.error?.message||p.error?.message||"Unable to load announcements.");
  else{setAnnouncements((a.data||[]) as Announcement[]);setParents((p.data||[]) as Parent[]);}
  setLoading(false);
 },[]);
 useEffect(()=>{
  let live=true;
  async function init(){
   if(!supabase){setError("Database unavailable.");setLoading(false);return;}
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){router.replace("/login");return;}
   const {data:access,error:accessError}=await supabase.from("user_roles")
    .select("role").eq("user_id",auth.user.id).maybeSingle();
   if(accessError||!access||!["owner","admin","clinic_admin"].includes(access.role)){
    router.replace("/login");return;
   }
   if(live){setRole(access.role);setReady(true);await load();}
  }
  void init();return()=>{live=false;};
 },[router,load]);
 async function publish(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy)return;
  setError("");setSuccess("");setBusy("publish");
  const {error:publishError}=await supabase.rpc("admin_publish_parent_announcement",{
   p_title:title.trim(),p_message:message.trim(),p_target_parent_user_id:recipient==="all"?null:recipient,
   p_expires_at:expires?new Date(expires+"T23:59:59").toISOString():null
  });
  if(publishError)setError(publishError.message);
  else{setTitle("");setMessage("");setRecipient("all");setExpires("");setSuccess("Announcement published to the selected audience.");await load();}
  setBusy("");
 }
 async function archive(id:string){
  if(!supabase||busy)return;
  setError("");setSuccess("");setBusy(id);
  const {data,error:e}=await supabase.rpc("admin_archive_parent_announcement",{p_announcement_id:id});
  if(e)setError(e.message);else{setSuccess(data?"Announcement archived. It will no longer be shown to parents.":"This announcement is already inactive.");await load();}
  setBusy("");
 }
 const home=role==="owner"?"/owner/dashboard":role==="admin"?"/admin/dashboard":"/clinic-admin/dashboard";
 if(!ready&&!error)return <main style={{padding:30}}>Checking administrator access...</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{padding:"17px 5%",borderBottom:"1px solid #dce8e1",background:"#fff"}}>
   <div style={{maxWidth:1080,margin:"auto",display:"flex",gap:14,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
    <div><BrandLogo/><p style={{fontSize:12,color:"#64748b",margin:"5px 0 0"}}>ADMIN · PARENT ANNOUNCEMENTS</p></div>
    <button type="button" style={button} onClick={()=>router.push(home)}>Back to Dashboard</button>
   </div>
  </header>
  <div style={{maxWidth:1080,margin:"auto",padding:"25px 16px 70px",display:"grid",gap:15}}>
   <div><h1 style={{fontSize:26,margin:"0 0 8px"}}>Parent Portal Announcements</h1>
    <p style={{fontSize:13,color:"#64748b",margin:0}}>Publish a popup notice to all parents or one selected parent account. Announcements appear in the parent portal and can be acknowledged there. No external messages are sent.</p>
   </div>
   {error&&<section style={{...card,color:"#b42318"}} role="alert">{error}</section>}
   {success&&<section style={{...card,color:"#176b58"}} role="status">{success}</section>}
   <form onSubmit={publish} style={{...card,display:"grid",gap:13}}>
    <h2 style={{fontSize:19,margin:0}}>Create Announcement</h2>
    <label style={{fontSize:13,fontWeight:700}}>Title *
     <input required minLength={3} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} style={{...input,display:"block",marginTop:6}} placeholder="Example: Parent orientation session"/>
    </label>
    <label style={{fontSize:13,fontWeight:700}}>Message *
     <textarea required minLength={5} maxLength={2500} rows={5} value={message} onChange={e=>setMessage(e.target.value)} style={{...input,display:"block",marginTop:6,resize:"vertical"}} placeholder="Enter the announcement parents should see"/>
    </label>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
     <label style={{fontSize:13,fontWeight:700}}>Recipients
      <select style={{...input,display:"block",marginTop:6}} value={recipient} onChange={e=>setRecipient(e.target.value)}>
       <option value="all">All parent accounts</option>
       {parents.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name} ({p.user_id.slice(0,8)})</option>)}
      </select>
     </label>
     <label style={{fontSize:13,fontWeight:700}}>Expiry date (optional)
      <input type="date" min={new Date().toLocaleDateString("en-CA")} value={expires} onChange={e=>setExpires(e.target.value)} style={{...input,display:"block",marginTop:6}}/>
     </label>
    </div>
    <p style={{fontSize:12,color:"#64748b",margin:0}}>Published messages cannot be edited. To correct a notice, archive it and publish a new one.</p>
    <button type="submit" disabled={!!busy||!ready} style={{...button,justifySelf:"start",opacity:busy?.6:1}}>{busy==="publish"?"Publishing...":"Publish Announcement"}</button>
   </form>
   <section style={{...card,display:"grid",gap:11}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><h2 style={{fontSize:19,margin:0}}>Published Announcements</h2><button type="button" style={{...button,background:"#eaf4ef",color:"#176b58"}} disabled={loading} onClick={()=>void load()}>Refresh</button></div>
    {loading?<p>Loading announcements...</p>:announcements.length===0?<p>No announcements published yet.</p>:announcements.map(a=><article key={a.id} style={{border:"1px solid #dce8e1",borderRadius:10,padding:13}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <strong>{a.title}</strong><span style={{fontSize:12,color:a.active?"#176b58":"#64748b"}}>{a.active?"Active":"Archived"}</span>
     </div>
     <p style={{whiteSpace:"pre-wrap",fontSize:13}}>{a.message}</p>
     <p style={{fontSize:12,color:"#64748b"}}>Audience: {a.target_parent_user_id?parents.find(p=>p.user_id===a.target_parent_user_id)?.display_name||a.target_parent_user_id:"All parents"} · Published {new Date(a.created_at).toLocaleString("en-IN")}{a.expires_at?" · Expires "+new Date(a.expires_at).toLocaleDateString("en-IN"):""}</p>
     {a.active&&<button type="button" style={{...button,background:"#fff1f2",color:"#9f1239"}} disabled={!!busy} onClick={()=>void archive(a.id)}>{busy===a.id?"Archiving...":"Archive Announcement"}</button>}
    </article>)}
   </section>
  </div>
 </main>;
}
