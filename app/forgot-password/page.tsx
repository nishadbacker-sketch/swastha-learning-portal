"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

export default function ForgotPassword(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [sent,setSent]=useState(false);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  setMessage("");
  if(!supabase){setMessage("Email recovery is not configured.");return;}
  setBusy(true);
  try{
   const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{
    redirectTo:window.location.origin+"/reset-password"
   });
   if(error)throw error;
   // Don't reveal whether this address belongs to an account.
   setSent(true);
  }catch(error){
   setMessage(error instanceof Error?error.message:"Unable to request a reset link.");
  }finally{setBusy(false);}
 }
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f8faf7",fontFamily:"Arial,sans-serif",padding:20,color:"#183a35"}}>
  <section style={{width:"100%",maxWidth:450,padding:30,background:"#fff",border:"1px solid #dce8e1",borderRadius:16}}>
   <h1 style={{fontSize:25}}>Reset your password</h1>
   <p style={{fontSize:14,color:"#64748b"}}>Enter your registered email to request a password reset link from Swastha Learning Clinic.</p>
   {sent?<p role="status" style={{background:"#eaf4ef",padding:15,borderRadius:9}}>If an account exists for that address, a password reset email has been requested. Check your inbox and spam folder.</p>:<form onSubmit={submit}>
    <label style={{display:"grid",gap:8,fontSize:14}}>Email address
     <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" style={{padding:11,border:"1px solid #cbd5e1",borderRadius:8}}/>
    </label>
    <button disabled={busy} type="submit" style={{background:"#176b58",color:"white",border:0,padding:"12px 15px",borderRadius:8,fontWeight:700,marginTop:16,cursor:"pointer"}}>{busy?"Sending...":"Send reset link"}</button>
   </form>}
   {message&&<p role="alert" style={{color:"#b42318"}}>{message}</p>}
   <p><button type="button" style={{border:0,background:"none",padding:0,color:"#176b58",cursor:"pointer"}} onClick={()=>router.push("/login")}>Back to sign in</button></p>
  </section>
 </main>;
}
