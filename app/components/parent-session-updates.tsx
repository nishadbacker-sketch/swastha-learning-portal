"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
type Update={id:string;student_id:string;session_date:string;summary:string;approved_at:string};
export default function ParentSessionUpdates({studentIds}:{studentIds:string[]}){
 const [updates,setUpdates]=useState<Update[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const key=studentIds.slice().sort().join(",");
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!supabase||!key){setUpdates([]);return;}
   setLoading(true);setError("");
   const {data,error:e}=await supabase.from("clinic_session_parent_updates")
    .select("id,student_id,session_date,summary,approved_at")
    .in("student_id",key.split(",")).order("session_date",{ascending:false}).limit(100);
   if(!active)return;
   if(e)setError("Approved session updates could not be loaded.");
   else setUpdates((data||[]) as Update[]);
   setLoading(false);
  }
  void load();return()=>{active=false;};
 },[key]);
 return <section style={{background:"white",border:"1px solid #dce8e1",borderRadius:13,padding:16,marginBottom:14}}>
  <h2 style={{fontSize:19,margin:"0 0 8px"}}>Approved Session Updates</h2>
  <p style={{fontSize:13,color:"#64748b"}}>Only session updates approved for your linked children appear here. Private Teacher notes are not shared.</p>
  {loading?<p>Loading approved updates...</p>:error?<p role="alert">{error}</p>:!updates.length?<p>No approved session updates have been published yet.</p>:
   updates.map(x=><article key={x.id} style={{background:"#f8faf7",border:"1px solid #e2e8f0",borderRadius:9,padding:12,marginBottom:9}}>
    <strong>{new Date(x.session_date).toLocaleDateString("en-IN")}</strong>
    <p style={{whiteSpace:"pre-wrap",fontSize:13}}>{x.summary}</p>
    <small style={{color:"#64748b"}}>Approved {new Date(x.approved_at).toLocaleDateString("en-IN")}</small>
   </article>)}
 </section>;
}
