"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Account = { user_id:string; role:string; name:string; staff_code:string|null };
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:14};
const button:React.CSSProperties={padding:"9px 12px",border:0,borderRadius:8,background:"#176b58",color:"white",fontSize:13,fontWeight:700,cursor:"pointer"};

export default function SuperAdminManagement(){
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState("");
 const [confirmation,setConfirmation]=useState<{account:Account;enable:boolean}|null>(null);

 const load=useCallback(async()=>{
  if(!supabase){setError("Supabase is unavailable.");setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError("Please sign in.");setLoading(false);return;}
  const {data:ownRole,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(roleError||ownRole?.role!=="owner"){setError("Only the Creator can manage Super Admin accounts.");setLoading(false);return;}
  const {data:roles,error:err}=await supabase.from("user_roles").select("user_id,role").neq("role","owner");
  if(err){setError(err.message);setLoading(false);return;}
  const ids=(roles||[]).map(r=>r.user_id);
  if(!ids.length){setAccounts([]);setLoading(false);return;}
  const {data:profiles,error:pError}=await supabase.from("profiles").select("id,full_name,staff_code").in("id",ids);
  if(pError){setError(pError.message);setLoading(false);return;}
  const names=new Map((profiles||[]).map(p=>[p.id,p]));
  setAccounts((roles||[]).map(r=>({...r,name:names.get(r.user_id)?.full_name||"Unnamed account",staff_code:names.get(r.user_id)?.staff_code||null})));
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);

 async function submit(){
  if(!supabase||!confirmation)return;
  const selected=confirmation;setBusy(selected.account.user_id);setError("");setMessage("");
  const {data,error:e}=await supabase.rpc("creator_set_super_admin",{p_user_id:selected.account.user_id,p_enable:selected.enable});
  if(e)setError(e.message);
  else {setMessage(typeof data==="string"?data:"Super Admin role updated.");await load();}
  setBusy("");setConfirmation(null);
 }
 return <section style={panel}>
  <h2 style={{fontSize:19,margin:"0 0 5px"}}>Creator-only Super Admin Management</h2>
  <p style={{fontSize:13,color:"#64748b"}}>Only the Creator can grant or revoke Super Admin access. Your Creator account is not listed and cannot be changed through this tool.</p>
  {error&&<p role="alert" style={{fontSize:13,color:"#b42318"}}>{error}</p>}
  {message&&<p role="status" style={{fontSize:13,color:"#176b58"}}>{message}</p>}
  {loading?<p style={{fontSize:13}}>Loading accounts...</p>:<div style={{display:"grid",gap:9}}>
   {accounts.map(a=><div key={a.user_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,padding:10,borderRadius:9,background:"#f8faf7",border:"1px solid #e2e8e0"}}>
    <div><strong style={{fontSize:13}}>{a.name}{a.staff_code?" · "+a.staff_code:""}</strong><div style={{fontSize:12,color:"#64748b"}}>{a.role==="admin"?"Super Admin":a.role==="clinic_admin"?"Admin":a.role==="teacher"?"Teacher":"Parent / Student"}</div></div>
    <button type="button" style={{...button,background:a.role==="admin"?"#fff1f2":"#eaf4ef",color:a.role==="admin"?"#9f1239":"#176b58",border:"1px solid #dce8e1"}} onClick={()=>setConfirmation({account:a,enable:a.role!=="admin"})}>{a.role==="admin"?"Remove Super Admin":"Make Super Admin"}</button>
   </div>)}
  </div>}
  {confirmation&&<div role="dialog" aria-modal="true" aria-label="Confirm Super Admin role" style={{marginTop:12,padding:14,borderRadius:9,background:"#fffaf0",border:"1px solid #eddaab"}}>
   <strong>{confirmation.enable?"Grant":"Remove"} Super Admin access for {confirmation.account.name}?</strong>
   <p style={{fontSize:13}}>This replaces the account's current role. It does not change the protected Creator account.</p>
   <div style={{display:"flex",gap:10}}>
    <button type="button" style={button} disabled={!!busy} onClick={()=>void submit()}>{busy?"Saving...":"Confirm"}</button>
    <button type="button" style={{...button,background:"#e2e8f0",color:"#334155"}} disabled={!!busy} onClick={()=>setConfirmation(null)}>Cancel</button>
   </div>
  </div>}
 </section>;
}
