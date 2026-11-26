"use client";

import BrandLogo from "../../components/brand-logo";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../../lib/supabase";

type Assessment={
 id:string;student_id:string;assessment_level:string;status:string;assigned_at:string;due_date:string|null;
};
type Student={id:string;student_code:string|null;full_name:string;current_class:string|null};
type View="all"|"pending"|"overdue"|"approved"|"in_progress";

const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:12,padding:16};
const button:React.CSSProperties={padding:"9px 13px",background:"#176b58",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700};
const input:React.CSSProperties={padding:"9px 12px",border:"1px solid #cbd5e1",borderRadius:8,maxWidth:"100%"};
function indiaToday(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date());
 const part=(key:string)=>parts.find(x=>x.type===key)?.value||"";
 return part("year")+"-"+part("month")+"-"+part("day");
}
function overdue(a:Assessment,today:string){
 return Boolean(a.due_date&&a.due_date<today&&!["reviewed","completed","cancelled"].includes(a.status));
}
function displayDate(value:string|null){
 if(!value)return "Not set";
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value.slice(8,10)+"/"+value.slice(5,7)+"/"+value.slice(0,4);
 return new Date(value).toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"});
}

export default function AssessmentOversight(){
 const router=useRouter();
 const [role,setRole]=useState("");
 const [ready,setReady]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [records,setRecords]=useState<Assessment[]>([]);
 const [students,setStudents]=useState<Record<string,Student>>({});
 const [filter,setFilter]=useState<View>("pending");
 const [search,setSearch]=useState("");
 const [partial,setPartial]=useState(false);
 const [lastRefresh,setLastRefresh]=useState("");
 const today=indiaToday();

 const refresh=useCallback(async()=>{
  const db=supabase;
  if(!db)return;
  setLoading(true);setError("");
  try{
   // Capped read-only query. Never silently report capped totals as complete.
   const {data:a,error:ae}=await db.from("assessment_assignments")
    .select("id,student_id,assessment_level,status,assigned_at,due_date")
    .order("assigned_at",{ascending:false}).limit(1000);
   if(ae)throw ae;
   const assignments=(a||[]) as Assessment[];
   const ids=[...new Set(assignments.map(x=>x.student_id))];
   const byId:Record<string,Student>={};
   for(let i=0;i<ids.length;i+=100){
    const {data:s,error:se}=await db.from("students").select("id,student_code,full_name,current_class").in("id",ids.slice(i,i+100)).is("removed_at",null);
    if(se)throw se;
    for(const student of (s||[]) as Student[])byId[student.id]=student;
   }
   setRecords(assignments);
   setStudents(byId);
   setPartial(assignments.length===1000);
   setLastRefresh(new Date().toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}));
  }catch(e){setError(e instanceof Error?e.message:"Unable to load assessments.");}
  finally{setLoading(false);}
 },[]);

 useEffect(()=>{
  let active=true;
  async function init(){
   if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
   const {data:auth,error:authError}=await supabase.auth.getUser();
   if(!active)return;
   if(authError||!auth.user){router.replace("/login");return;}
   const {data:access,error:accessError}=await supabase.from("user_roles").select("role").eq("user_id",auth.user.id).maybeSingle();
   if(!active)return;
   if(accessError||!access||!["admin","owner"].includes(access.role)){router.replace("/login");return;}
   setRole(access.role);setReady(true);
   await refresh();
  }
  void init();
  return()=>{active=false;};
 },[router,refresh]);

 const counts=useMemo(()=>({
  all:records.length,
  pending:records.filter(x=>x.status==="submitted").length,
  overdue:records.filter(x=>overdue(x,today)).length,
  approved:records.filter(x=>x.status==="reviewed").length,
  in_progress:records.filter(x=>["assigned","in_progress"].includes(x.status)).length
 }),[records,today]);
 const visible=useMemo(()=>records.filter(a=>{
  if(filter==="pending"&&a.status!=="submitted")return false;
  if(filter==="overdue"&&!overdue(a,today))return false;
  if(filter==="approved"&&a.status!=="reviewed")return false;
  if(filter==="in_progress"&&!["assigned","in_progress"].includes(a.status))return false;
  const student=students[a.student_id];
  return (a.assessment_level+" "+a.status+" "+(student?.full_name||"")+" "+(student?.student_code||"")).toLowerCase().includes(search.trim().toLowerCase());
 }),[records,students,filter,search,today]);

 if(!ready)return <main style={{padding:35}}>{error||"Checking administrator access..."}</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,sans-serif"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"18px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
   <BrandLogo/>
   <button type="button" style={button} onClick={()=>router.push(role==="owner"?"/owner/dashboard":"/admin/dashboard")}>Back to Dashboard</button>
  </header>
  <div style={{maxWidth:1160,margin:"auto",padding:"25px 16px 60px",display:"grid",gap:15}}>
   <div><h1 style={{fontSize:27,margin:"0 0 8px"}}>Assessment Oversight</h1>
    <p style={{fontSize:13,color:"#64748b",margin:0}}>Read-only administrative view of assignments, submissions, overdue work and teacher-approved reports. Existing assessments and student records are never changed on this screen.</p>
   </div>
   {role==="owner"&&<p style={{...panel,borderColor:"#e7c48a",background:"#fffaf0",fontSize:13}}>Creator access to assessment records is not yet covered by the existing production row-security policy. If records appear empty, this does not mean the clinic has no assessments. Access expansion requires separate authorization and security verification.</p>}
   {error&&<p role="alert" style={{...panel,color:"#b42318"}}>{error}</p>}
   <section style={{...panel,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
    <span style={{fontSize:12,color:"#64748b"}}>{lastRefresh?"Last refreshed: "+lastRefresh+" IST":"Data not refreshed"}</span>
    <button type="button" style={button} disabled={loading} onClick={()=>void refresh()}>{loading?"Loading...":"Refresh Assessments"}</button>
   </section>
   {partial&&<p role="alert" style={{...panel,color:"#a16207"}}>Showing at most the 1,000 latest assignments. Counts and filters may be incomplete. Use database reporting for complete totals.</p>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10}}>
    {([["all","All"],["pending","Awaiting Review"],["overdue","Overdue"],["approved","Approved"],["in_progress","Not Submitted"]] as [View,string][]).map(([id,label])=>
     <button key={id} type="button" onClick={()=>setFilter(id)} style={{...panel,textAlign:"left",cursor:"pointer",borderColor:filter===id?"#176b58":"#dce8e1"}}>
      <span style={{fontSize:12}}>{label}</span><strong style={{fontSize:26,display:"block",marginTop:6}}>{counts[id]}</strong>
     </button>)}
   </div>
   <section style={{...panel,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
    <label style={{fontSize:13}}>View <select value={filter} onChange={e=>setFilter(e.target.value as View)} style={input}>
     <option value="pending">Awaiting teacher review</option><option value="overdue">Overdue, not completed</option>
     <option value="approved">Approved reports</option><option value="in_progress">Assigned / in progress</option><option value="all">All assessments</option>
    </select></label>
    <input aria-label="Search student, student ID, level or status" value={search} onChange={e=>setSearch(e.target.value)} style={{...input,flex:"1 1 260px"}} placeholder="Search by student name, student ID or level"/>
   </section>
   {loading?<section style={panel}>Loading assessment records...</section>:
    !visible.length?<section style={panel}>No assessments match this view. {role==="owner"?"Creator database access may also be restricted by row-level security.":""}</section>:
    visible.map(a=>{
     const student=students[a.student_id];
     return <article key={a.id} style={panel}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
       <div>
        <h2 style={{fontSize:17,margin:"0 0 7px"}}>{student?.full_name||"Student record not visible"} {student?.student_code?"("+student.student_code+")":""}</h2>
        <p style={{fontSize:13,margin:"0 0 5px"}}>Assessment: <strong>{a.assessment_level}</strong> · Status: <strong>{a.status.replace(/_/g," ")}</strong></p>
        <p style={{fontSize:12,color:"#64748b",margin:0}}>Assigned: {displayDate(a.assigned_at)} · Due: {displayDate(a.due_date)}{overdue(a,today)?" · Overdue":""}</p>
       </div>
       <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        {a.status==="submitted"&&role==="admin"&&<button type="button" style={button} onClick={()=>router.push("/teacher/assessment-review/"+a.id)}>Open Teacher Review</button>}
        {a.status==="reviewed"&&role==="admin"&&<button type="button" style={button} onClick={()=>router.push("/assessment-report/"+a.id)}>View Approved Report</button>}
        <button type="button" style={{...button,background:"#0f4c5c"}} onClick={()=>router.push("/admin/students")}>Student Management</button>
       </div>
      </div>
     </article>;
    })}
   <p style={{fontSize:12,color:"#64748b"}}>Overdue means the due date is before today's India date and the assignment has not been reviewed, completed or cancelled. This is an oversight report, not a clinical assessment result.</p>
  </div>
 </main>;
}
