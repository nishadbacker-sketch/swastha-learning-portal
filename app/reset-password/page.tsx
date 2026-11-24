"use client";

import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

export default function ResetPassword(){
 const router=useRouter();
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState(false);
 const [message,setMessage]=useState("");

 useEffect(()=>{
  if(!supabase){setMessage("Password recovery is not configured.");return;}
  const client=supabase;
  let active=true;
  // Recovery email establishes a temporary session when its link is opened.
  const {data:subscription}=client.auth.onAuthStateChange((event,session)=>{
   if(!active)return;
   if(event==="PASSWORD_RECOVERY"&&session)setReady(true);
  });
  void client.auth.getSession().then(({data,error})=>{
   if(!active)return;
   if(error){setMessage("Unable to verify recovery link.");return;}
   if(data.session)setReady(true);
  });
  return()=>{active=false;subscription.subscription.unsubscribe();};
 },[]);

 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage("");
  if(!supabase||!ready)return;
  if(password.length<8){setMessage("Use at least eight characters.");return;}
  if(password!==confirm){setMessage("Passwords do not match.");return;}
  setBusy(true);
  try{
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   await supabase.auth.signOut();
   setDone(true);setReady(false);setPassword("");setConfirm("");
  }catch(error){setMessage(error instanceof Error?error.message:"Unable to change password.");}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f8faf7",fontFamily:"Arial,sans-serif",padding:20,color:"#183a35"}}>
  <section style={{width:"100%",maxWidth:450,padding:30,background:"#fff",border:"1px solid #dce8e1",borderRadius:16}}>
   <h1 style={{fontSize:25}}>Choose a new password</h1>
   {done?<p role="status">Your password was updated. Please sign in using your new password.</p>:
    ready?<form onSubmit={save} style={{display:"grid",gap:12}}>
     <label style={{display:"grid",gap:7}}>New password
      <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/>
     </label>
     <label style={{display:"grid",gap:7}}>Confirm new password
      <input type="password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" style={{padding:10,border:"1px solid #cbd5e1",borderRadius:8}}/>
     </label>
     <button disabled={busy} type="submit" style={{background:"#176b58",color:"white",border:0,padding:12,borderRadius:8,cursor:"pointer"}}>{busy?"Updating...":"Update password"}</button>
    </form>:<p>Open your password recovery link from your email. If the link is expired, request another from the sign-in page.</p>}
   {message&&<p role="alert" style={{color:"#b42318"}}>{message}</p>}
   <button type="button" onClick={()=>router.replace("/login")} style={{marginTop:20,color:"#176b58",background:"none",border:0,padding:0,cursor:"pointer"}}>Back to sign in</button>
  </section>
 </main>;
}
