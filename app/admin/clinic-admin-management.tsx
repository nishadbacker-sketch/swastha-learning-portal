"use client";

import {useCallback,useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";

type RoleRow={user_id:string;role:string};
type ProfileRow={id:string;full_name:string|null;phone:string|null;staff_code:string|null};
type Account={id:string;role:string;name:string;phone:string|null;staff_code:string|null};
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:14};
const button:React.CSSProperties={background:"#176b58",border:0,color:"#fff",padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700};
const title=(role:string)=>role==="admin"?"Super Admin":role==="clinic_admin"?"Admin":role==="teacher"?"Teacher":"Parent / Student";

export default function ClinicAdminManagement(){
 const [users,setUsers]=useState<Account[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [confirm,setConfirm]=useState<{user:Account;enable:boolean}|null>(null);

 const refresh=useCallback(async()=>{
  if(!supabase){setError("Database not configured.");setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError("Session expired.");setLoading(false);return;}
  const {data:myRole,error:mine}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).single();
  if(mine||myRole?.role!=="admin"){setError("Only Super Admin can manage Admin roles.");setLoading(false);return;}
  const {data:roles,error:re}=await supabase.from("user_roles").select("user_id,role").order("role");
  if(re){setError(re.message);setLoading(false);return;}
  const rows=(roles||[]) as RoleRow[];
  if(!rows.length){setUsers([]);setLoading(false);return;}
  const {data:profiles,error:pe}=await supabase.from("profiles").select("id,full_name,phone,staff_code").in("id",rows.map(x=>x.user_id));
  if(pe){setError(pe.message);setLoading(false);return;}
  const names=new Map(((profiles||[]) as ProfileRow[]).map(x=>[x.id,x]));
  setUsers(rows.map(x=>({id:x.user_id,role:x.role,name:names.get(x.user_id)?.full_name||"Unnamed account",phone:names.get(x.user_id)?.phone||null,staff_code:names.get(x.user_id)?.staff_code||null})));
  setLoading(false);
 },[]);

 useEffect(()=>{void refresh();},[refresh]);

 async function submit(){
  if(!supabase||!confirm)return;
  setBusy(confirm.user.id);setError("");setNotice("");
  const {data,error:e}=await supabase.rpc("super_admin_set_clinic_admin",{p_user_id:confirm.user.id,p_enable:confirm.enable});
  if(e)setError(e.message);
  else {setNotice(typeof data==="string"?data:"Admin role updated successfully.");await refresh();}
  setConfirm(null);setBusy("");
 }

 return <section style={panel}>
  <h2 style={{fontSize:20,margin:"0 0 6px"}}>Admin Role Management</h2>
  <p style={{fontSize:13,color:"#64748b",margin:"0 0 14px"}}>Hierarchy: <strong>Super Admin → Admin → Teacher → Parent / Student</strong>. Only Super Admin can grant or revoke Admin access. Admin oversees appointment enquiries and escalations, without Super Admin privileges.</p>
  {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
  {notice&&<p role="status" style={{color:"#176b58",fontSize:13}}>{notice}</p>}
  {loading?<p style={{fontSize:13}}>Loading accounts...</p>:<div style={{display:"grid",gap:9}}>
   {users.map(u=><div key={u.id} style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap",padding:"10px 12px",background:"#f8faf7",borderRadius:9,border:"1px solid #e7efe9"}}>
    <div style={{minWidth:160,flex:"1 1 auto"}}>
     <strong style={{fontSize:13}}>{u.name}{u.staff_code?" · "+u.staff_code:""}</strong>
     <div style={{fontSize:12,color:"#64748b"}}>{title(u.role)}{u.phone?" · "+u.phone:""}</div>
    </div>
    {u.role==="clinic_admin"
     ?<button type="button" style={{...button,background:"#fff1f2",color:"#9f1239",border:"1px solid #fecdd3"}} onClick={()=>setConfirm({user:u,enable:false})}>Remove Admin</button>
     :["parent","teacher"].includes(u.role)
     ?<button type="button" style={button} onClick={()=>setConfirm({user:u,enable:true})}>Make Admin</button>
     :<span style={{fontSize:12,fontWeight:700,color:"#64748b"}}>{title(u.role)}</span>}
   </div>)}
  </div>}
  {confirm&&<div role="dialog" aria-modal="true" aria-label="Confirm admin role change" style={{marginTop:14,padding:15,border:"1px solid #d6e5dc",borderRadius:10,background:"#fffaf0"}}>
   <strong>{confirm.enable?"Grant Admin access":"Remove Admin access"} — {confirm.user.name}?</strong>
   <p style={{fontSize:13}}>This account has exactly one role. {confirm.enable?"Their existing parent or teacher role will be replaced with Admin.":"They will return to the normal Parent / Student role."} Super Admin access is unaffected.</p>
   <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
    <button type="button" style={button} disabled={!!busy} onClick={()=>void submit()}>{busy?"Saving...":"Confirm"}</button>
    <button type="button" style={{...button,background:"#e2e8f0",color:"#334155"}} disabled={!!busy} onClick={()=>setConfirm(null)}>Cancel</button>
   </div>
  </div>}
 </section>;
}
