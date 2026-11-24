"use client";

import BrandLogo from "../components/brand-logo";
import {useRef,useState} from "react";

type FormState={
 guardian_name:string;whatsapp_number:string;contact_differs:boolean;contact_number:string;child_name:string;date_of_birth:string;current_class:string;preferred_date:string;preferred_time:string;reason:string;consent:boolean;
};
const initial:FormState={guardian_name:"",whatsapp_number:"",contact_differs:false,contact_number:"",child_name:"",date_of_birth:"",current_class:"",preferred_date:"",preferred_time:"",reason:"",consent:false};
const field:React.CSSProperties={width:"100%",padding:"10px 12px",border:"1px solid #cbd5e1",borderRadius:8,fontSize:14,background:"white"};
const label:React.CSSProperties={display:"grid",gap:5,fontSize:13,fontWeight:700,color:"#183a35"};
const card:React.CSSProperties={background:"white",borderRadius:15,border:"1px solid #dce8e1",padding:20,boxShadow:"0 4px 25px #0f4c5c0b"};
const clean=(x:string)=>x.trim();
export default function PublicAppointmentPage(){
 const [form,setForm]=useState<FormState>(initial);
 const [bot,setBot]=useState("");
 const [busy,setBusy]=useState(false);
 const submissionKey=useRef<string|null>(null);
 const [message,setMessage]=useState("");
 const [completed,setCompleted]=useState(false);
 function edit<K extends keyof FormState>(key:K,value:FormState[K]){submissionKey.current=null;setForm(p=>({...p,[key]:value}));}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage("");
  if(bot){setCompleted(true);return;}
  if(!form.consent){setMessage("Please give consent to be contacted.");return;}
  const phone=/^[+\d\s()-]{8,20}$/;
  if(!phone.test(form.whatsapp_number)||form.contact_differs&&!phone.test(form.contact_number)){setMessage("Enter a valid contact number.");return;}
  if(form.date_of_birth>new Date().toLocaleDateString("en-CA")){setMessage("Date of birth cannot be in the future.");return;}
  setBusy(true);
  if(!submissionKey.current) submissionKey.current=crypto.randomUUID();
  try {
   const response=await fetch("/api/appointment-intake",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     submission_key:submissionKey.current,
     guardian_name:clean(form.guardian_name),
     whatsapp_number:clean(form.whatsapp_number),
     contact_differs:form.contact_differs,
     contact_number:form.contact_differs?clean(form.contact_number):null,
     child_name:clean(form.child_name),
     date_of_birth:form.date_of_birth,
     current_class:clean(form.current_class),
     preferred_date:form.preferred_date||null,
     preferred_time:form.preferred_time||null,
     reason:clean(form.reason),
     consent:true,
     website:bot,
    }),
   });
   if(!response.ok) {
    setMessage("Could not submit your appointment request. Please try again.");
   } else {
    setCompleted(true);
    submissionKey.current=null;
    setForm(initial);
   }
  } catch {
   setMessage("Appointment service is unavailable. Please try again.");
  } finally {
   setBusy(false);
  }
 }
 return <main style={{background:"#f8faf7",minHeight:"100vh",color:"#183a35",padding:"24px 14px 55px"}}>
  <div style={{maxWidth:760,margin:"auto"}}>
   <header className="appointment-intro-header" style={{marginBottom:17}}>
    <a href="https://swasthalearning.com" style={{color:"#176b58",fontWeight:800,textDecoration:"none",fontSize:13}}><BrandLogo /></a>
    <h1 style={{fontSize:27,margin:"12px 0 5px"}}>Appointment Details</h1>
    <p style={{color:"#64748b",fontSize:13}}>Request an appointment. Our teaching team will review your details and contact you to arrange the next step.</p>
   </header>
   {completed?<section style={card} role="status"><h2 style={{color:"#176b58",fontSize:21}}>Request submitted successfully</h2><p>Thank you. Your appointment request has been sent to our teacher follow-up queue. A team member will contact you using the number provided.</p><a href="https://swasthalearning.com" style={{color:"#176b58",fontWeight:700}}>Back to Swastha Learning Clinic</a></section>:
   <form style={card} onSubmit={submit}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:13}}>
     <label style={label}>Parent / Guardian name *<input style={field} required maxLength={160} value={form.guardian_name} onChange={e=>edit("guardian_name",e.target.value)}/></label>
     <label style={label}>WhatsApp number *<input style={field} required type="tel" maxLength={20} value={form.whatsapp_number} onChange={e=>edit("whatsapp_number",e.target.value)}/></label>
     <label style={{...label,gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={form.contact_differs} onChange={e=>edit("contact_differs",e.target.checked)}/> Contact number differs from WhatsApp number</label>
     {form.contact_differs&&<label style={label}>Additional contact number *<input style={field} required type="tel" maxLength={20} value={form.contact_number} onChange={e=>edit("contact_number",e.target.value)}/></label>}
     <label style={label}>Child's name *<input style={field} required maxLength={160} value={form.child_name} onChange={e=>edit("child_name",e.target.value)}/></label>
     <label style={label}>Date of birth *<input style={field} required type="date" max={new Date().toISOString().slice(0,10)} value={form.date_of_birth} onChange={e=>edit("date_of_birth",e.target.value)}/></label>
     <label style={label}>Current class *<input style={field} required maxLength={80} placeholder="e.g. Class 4" value={form.current_class} onChange={e=>edit("current_class",e.target.value)}/></label>
     <label style={label}>Preferred appointment date (optional)<input style={field} type="date" value={form.preferred_date} onChange={e=>edit("preferred_date",e.target.value)}/></label>
     <label style={label}>Preferred time (optional)<select style={field} value={form.preferred_time} onChange={e=>edit("preferred_time",e.target.value)}><option value="">Flexible</option><option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Evening">Evening</option></select></label>
     <label style={{...label,gridColumn:"1/-1"}}>Reason for appointment (optional)<textarea style={{...field,minHeight:75,resize:"vertical"}} maxLength={2000} value={form.reason} onChange={e=>edit("reason",e.target.value)} placeholder="Briefly describe what support you are seeking"/></label>
    </div>
    <div style={{position:"absolute",left:"-9999px"}} aria-hidden="true"><label>Leave blank<input tabIndex={-1} autoComplete="off" value={bot} onChange={e=>setBot(e.target.value)}/></label></div>
    <label style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:12,margin:"16px 0",lineHeight:1.5}}><input type="checkbox" required checked={form.consent} onChange={e=>edit("consent",e.target.checked)}/> I agree that Swastha Learning Clinic may use these details to contact me about my appointment request. *</label>
    {message&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{message}</p>}
    <button type="submit" disabled={busy} style={{border:0,borderRadius:8,background:"#176b58",color:"white",padding:"12px 20px",fontWeight:700,cursor:"pointer",opacity:busy?0.6:1}}>{busy?"Submitting...":"Submit Appointment Request"}</button>
   </form>}
  </div>
 </main>;
}
