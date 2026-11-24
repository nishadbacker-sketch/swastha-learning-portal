"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { CHECKLIST_DATA, type AssessmentLevel } from "../../lib/assessment-data";

type InputAssessment={id:string;student_id:string;assessment_level:AssessmentLevel;status:string;assigned_at:string};
type InputStudent={id:string;full_name:string};
type Response={question_id:string;score:string|null;observation:string|null};
type Item={id:string;question:string;area:string;domain:string;score:string|null;observation:string};
type Domain={id:string;name:string;area:string;count:number;numeric:number;sum:number;na:number;mastery:number|null};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:14,padding:20,marginBottom:16};
const palette={green:"#176b58",gold:"#c48925",orange:"#e77934",red:"#c44444",blue:"#2a7198",muted:"#657a74"};
const band=(pct:number|null)=>pct===null?"Not scored":pct>=80?"Independent":pct>=50?"Developing":"Needs Support";
const bandColor=(pct:number|null)=>pct===null?"#94a3b8":pct>=80?palette.green:pct>=50?palette.gold:palette.red;
const label=(score:string|null)=>score==="3"?"Independent":score==="2"?"Developing":score==="1"?"Substantial support":score==="0"?"Not demonstrated":score==="NA"?"Not assessed":"Not answered";

function Radar({domains}:{domains:Domain[]}){
 const items=domains.filter(d=>d.mastery!==null);
 if(items.length<3)return <p style={{color:palette.muted}}>At least three scored sub-domains are needed for a radar chart.</p>;
 const size=400,center=size/2,rad=135;
 const xy=(i:number,n:number,r:number)=>{const theta=-Math.PI/2+i*2*Math.PI/n;return [center+Math.cos(theta)*r,center+Math.sin(theta)*r];};
 const polygon=(f:number)=>items.map((_,i)=>xy(i,items.length,rad*f).join(",")).join(" ");
 const values=items.map((d,i)=>xy(i,items.length,rad*(d.mastery||0)/100).join(",")).join(" ");
 return <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
  <svg viewBox="0 0 400 400" role="img" aria-label="Radar chart showing readiness percentage by scored sub-domain" style={{width:"100%",maxWidth:430,height:"auto"}}>
   {[.25,.5,.75,1].map(f=><polygon key={f} points={polygon(f)} fill="none" stroke="#dbe6e0" strokeWidth={1}/>)}
   {items.map((d,i)=><line key={d.id} x1={center} y1={center} x2={xy(i,items.length,rad)[0]} y2={xy(i,items.length,rad)[1]} stroke="#dbe6e0" strokeWidth={1}/>)}
   <polygon points={values} fill="rgba(23,107,88,.16)" stroke={palette.green} strokeWidth={2.5}/>
   {items.map((d,i)=><circle key={d.id} cx={xy(i,items.length,rad*(d.mastery||0)/100)[0]} cy={xy(i,items.length,rad*(d.mastery||0)/100)[1]} r={3.5} fill={palette.green}/>)}
   <text x={center} y="18" fontSize="11" fill={palette.muted} textAnchor="middle">100% = all scored indicators rated 3</text>
  </svg>
  <div style={{flex:"1 1 220px",maxHeight:300,overflowY:"auto",fontSize:12}}>
   {items.map((d,i)=><div key={d.id} style={{display:"flex",gap:9,padding:"5px 0",borderBottom:"1px solid #edf1ed"}}>
    <span style={{minWidth:25,color:palette.green,fontWeight:700}}>{i+1}.</span><span style={{flex:1}}>{d.name}</span><strong>{d.mastery?.toFixed(0)}%</strong>
   </div>)}
  </div>
 </div>;
}

export default function AssessmentAnalytics({assessments,students}:{assessments:InputAssessment[];students:InputStudent[]}){
 const available=assessments.filter(a=>["submitted","reviewed"].includes(a.status));
 const [selected,setSelected]=useState("");
 const [responses,setResponses]=useState<Response[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{if(!available.some(a=>a.id===selected))setSelected(available[0]?.id||"");},[assessments,selected]);
 useEffect(()=>{let cancelled=false;async function load(){
  if(!selected){setResponses([]);return;}
  if(!supabase){setError("Supabase is not configured.");return;}
  setLoading(true);setError("");setResponses([]);
  const {data,error:e}=await supabase.from("assessment_responses").select("question_id,score,observation").eq("assignment_id",selected);
  if(!cancelled){if(e)setError(e.message);else setResponses((data||[]) as Response[]);setLoading(false);}
 }void load();return()=>{cancelled=true;};},[selected]);
 const assignment=available.find(a=>a.id===selected);
 const items=useMemo<Item[]>(()=>{
  if(!assignment)return [];
  const byId=new Map(responses.map(r=>[r.question_id,r]));
  return CHECKLIST_DATA[assignment.assessment_level].areas.flatMap(area=>area.subDomains.flatMap(domain=>domain.items.map((question,i)=>{
   const id=domain.id+"_"+(i+1),res=byId.get(id);
   return {id,question,domain:domain.title,area:area.title,score:res?.score??null,observation:res?.observation||""};
  })));
 },[assignment,responses]);
 const domains=useMemo<Domain[]>(()=>{
  if(!assignment)return [];
  return CHECKLIST_DATA[assignment.assessment_level].areas.flatMap(area=>area.subDomains.map(d=>{
   const list=items.filter(q=>q.domain===d.title&&q.area===area.title);
   const rated=list.filter(q=>["0","1","2","3"].includes(q.score||""));
   const sum=rated.reduce((n,q)=>n+Number(q.score),0);
   return {id:d.id,name:d.title,area:area.title,count:list.length,numeric:rated.length,sum,na:list.filter(q=>q.score==="NA").length,mastery:rated.length?sum/rated.length/3*100:null};
  }));
 },[assignment,items]);
 const counts=["0","1","2","3","NA"].map(v=>({score:v,count:items.filter(q=>q.score===v).length}));
 const rated=items.filter(q=>["0","1","2","3"].includes(q.score||""));
 const assessed=rated.length+counts[4].count;
 const sum=rated.reduce((n,q)=>n+Number(q.score),0);
 const readiness=rated.length?sum/(rated.length*3)*100:null;
 const strengths=items.filter(q=>q.score==="3");
 const needs=items.filter(q=>q.score==="0"||q.score==="1");
 const developing=items.filter(q=>q.score==="2");
 if(!available.length)return <section style={card}><h3>Holistic Student Assessment Analytics</h3><p style={{color:palette.muted}}>Submitted or approved assessments will appear here. Assigned or incomplete assessments are not included.</p></section>;
 return <section style={{marginTop:24}}>
  <div style={{...card,background:"#f0f7f4"}}>
   <h2 style={{marginTop:0}}>Holistic Student Assessment Analytics</h2>
   <p style={{fontSize:13,color:palette.muted}}>Live, question-level analysis of submitted responses. Select an assessment to view its readiness indicators and support priorities. These are educational screening indicators, not a diagnosis.</p>
   <label style={{display:"block",fontWeight:700,marginBottom:6}} htmlFor="analytics-assessment">Select student and assessment</label>
   <select id="analytics-assessment" value={selected} onChange={e=>setSelected(e.target.value)} style={{padding:12,borderRadius:9,border:"1px solid #a9bfb5",maxWidth:"100%",width:650}}>
    {available.map(a=><option key={a.id} value={a.id}>{students.find(s=>s.id===a.student_id)?.full_name||"Student"} — {a.assessment_level} — {a.status} — {new Date(a.assigned_at).toLocaleDateString("en-IN")}</option>)}
   </select>
  </div>
  {error&&<p role="alert" style={{color:palette.red}}>{error}</p>}
  {loading?<p>Loading live assessment analytics...</p>:!responses.length?<p>No recorded responses found for the selected assessment.</p>:<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:13,marginBottom:18}}>
    {[
     ["Overall Readiness",readiness===null?"N/A":Math.round(readiness)+"%",readiness===null?"No numeric ratings":band(readiness)],
     ["Independent Skills (3)",String(strengths.length),"indicators"],
     ["Developing Skills (2)",String(developing.length),"indicators"],
     ["Support Priority (0–1)",String(needs.length),"indicators"]
    ].map(([name,value,detail],i)=><div key={name} style={{...card,margin:0,borderTop:"4px solid "+[palette.green,palette.green,palette.gold,palette.red][i]}}>
     <p style={{fontSize:13,color:palette.muted,marginTop:0}}>{name}</p>
     <div style={{fontSize:34,fontWeight:800,color:[palette.green,palette.green,palette.gold,palette.red][i]}}>{value}</div>
     <small style={{color:palette.muted}}>{detail}</small>
    </div>)}
   </div>
   <p style={{fontSize:13,color:palette.muted}}>Readiness = total numeric ratings ÷ (3 × numeric responses), excluding NA and unanswered questions. {assessed} of {items.length} indicators have recorded scores or NA ({counts[4].count} NA).</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:15}}>
    <div style={card}><h3>Holistic Sub-Domain Competency Radar</h3><p style={{fontSize:13,color:palette.muted}}>Percentage of available rating points across scored sub-domains.</p><Radar domains={domains}/></div>
    <div style={card}><h3>Rating Distribution</h3><p style={{fontSize:13,color:palette.muted}}>Breakdown of scores 0–3, plus NA.</p>
     {counts.map(x=><div key={x.score} style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><strong>{x.score==="NA"?"NA — Not assessed":x.score+" — "+label(x.score)}</strong><span>{x.count}</span></div>
      <div style={{height:14,borderRadius:10,background:"#edf2ef",overflow:"hidden"}}><div style={{height:"100%",width:(items.length?x.count/items.length*100:0)+"%",background:x.score==="3"?palette.green:x.score==="2"?palette.gold:x.score==="1"?palette.orange:x.score==="0"?palette.red:palette.muted}}/></div>
     </div>)}
    </div>
   </div>
   <div style={card}><h3>Sub-Domain Readiness Breakdown (%)</h3>
    <p style={{fontSize:13,color:palette.muted}}>Independent ≥80% · Developing 50–79% · Needs Support below 50%. Categories with no numeric ratings are shown as not scored.</p>
    {domains.map(d=><div key={d.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8e5"}}>
     <small style={{color:palette.muted}}>{d.area}</small>
     <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}><strong>{d.name}</strong><strong style={{color:bandColor(d.mastery)}}>{d.mastery===null?"N/A":Math.round(d.mastery)+"%"} · {band(d.mastery)}</strong></div>
     <div style={{height:11,marginTop:8,background:"#edf1ee",borderRadius:10,overflow:"hidden"}}><div style={{width:(d.mastery??0)+"%",height:"100%",background:bandColor(d.mastery)}}/></div>
     <small style={{color:palette.muted}}>{d.numeric} rated of {d.count} indicators · {d.na} NA</small>
    </div>)}
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:15}}>
    <section style={card}><h3>Observed Strengths (Score 3)</h3><p style={{fontSize:13,color:palette.muted}}>Skills rated independently in this assessment; observations appear only if recorded.</p>
     {!strengths.length?<p>No score-3 indicators recorded.</p>:strengths.map(q=><div key={q.id} style={{padding:"11px 0",borderBottom:"1px solid #e2e8e5"}}>
      <small style={{color:palette.green}}>{q.domain} · Score 3</small><div style={{fontWeight:600,margin:"5px 0"}}>{q.question}</div>
      {q.observation&&<p style={{fontSize:13,whiteSpace:"pre-wrap",color:palette.muted}}>Evidence: {q.observation}</p>}
     </div>)}
    </section>
    <section style={card}><h3>Priority Support Needs (Scores 0 & 1)</h3><p style={{fontSize:13,color:palette.muted}}>Indicators requiring targeted support; context appears only when recorded.</p>
     {!needs.length?<p>No score-0 or score-1 indicators recorded.</p>:needs.map(q=><div key={q.id} style={{padding:"11px 0",borderBottom:"1px solid #e2e8e5"}}>
      <small style={{color:palette.red}}>{q.domain} · Score {q.score}</small><div style={{fontWeight:600,margin:"5px 0"}}>{q.question}</div>
      {q.observation&&<p style={{fontSize:13,whiteSpace:"pre-wrap",color:palette.muted}}>Context: {q.observation}</p>}
     </div>)}
    </section>
   </div>
   <p style={{fontSize:12,color:palette.muted}}>Educational assessment profile based on reported/observed ratings. The number or percentage of indicators is not a clinical diagnosis or a standardised measure of intelligence or developmental age.</p>
  </>}
 </section>;
}
