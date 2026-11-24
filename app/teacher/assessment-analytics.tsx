"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { CHECKLIST_DATA, type AssessmentLevel } from "../../lib/assessment-data";

type InputAssessment={id:string;student_id:string;assessment_level:AssessmentLevel;status:string;assigned_at:string};
type InputStudent={id:string;full_name:string;student_code?:string|null};
type Response={question_id:string;score:string|null;observation:string|null};
type Item={id:string;question:string;area:string;domain:string;score:string|null;observation:string};
type Domain={id:string;name:string;area:string;count:number;numeric:number;sum:number;na:number;mastery:number|null};
const card:React.CSSProperties={background:"#fff",border:"1px solid #e2e8f0",borderRadius:13,padding:16,marginBottom:14,boxShadow:"0 1px 3px rgba(15,23,42,.045)"};
const palette={green:"#10b981",gold:"#0284c7",orange:"#f97316",red:"#ef4444",blue:"#0f4c5c",muted:"#64748b"};
const band=(pct:number|null)=>pct===null?"Not scored":pct>=80?"Independent":pct>=50?"Developing":"Needs Support";
const bandColor=(pct:number|null)=>pct===null?"#94a3b8":pct>=80?palette.green:pct>=50?palette.gold:palette.orange;
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

function RatingDoughnut({counts,total}:{counts:{score:string;count:number}[];total:number}){
 const colors=["#ef4444","#f97316","#0284c7","#10b981","#94a3b8"];
 const circumference=2*Math.PI*83;
 let running=0;
 const arcs=counts.map((entry,i)=>{
  const fraction=total?entry.count/total:0;
  const arc={key:entry.score,color:colors[i],dash:fraction*circumference,offset:running*circumference};
  running+=fraction;
  return arc;
 });
 return <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
  <svg role="img" aria-label="Doughnut chart of rating distribution: scores zero through three and NA" viewBox="0 0 260 260" style={{width:"100%",maxWidth:280}}>
   <circle cx="130" cy="130" r="83" stroke="#e2e8f0" strokeWidth="35" fill="none"/>
   <g transform="rotate(-90 130 130)">
    {arcs.filter(a=>a.dash>0).map(a=><circle key={a.key} cx="130" cy="130" r="83" fill="none" stroke={a.color} strokeWidth="35" strokeDasharray={String(a.dash)+" "+String(circumference-a.dash)} strokeDashoffset={-a.offset}/>)}
   </g>
   <text x="130" y="130" dominantBaseline="middle" textAnchor="middle" fontSize="29" fontWeight="800" fill="#1e293b">{total}</text>
   <text x="130" y="158" dominantBaseline="middle" textAnchor="middle" fontSize="12" fill="#64748b">assessed</text>
  </svg>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(95px,1fr))",gap:9,width:"100%",marginTop:8}}>
   {counts.map((entry,i)=><div key={entry.score} style={{fontSize:12,display:"flex",alignItems:"center",gap:6}}>
    <span style={{background:colors[i],borderRadius:4,width:11,height:11,flexShrink:0}}/>
    <span>{entry.score==="NA"?"NA":entry.score+" — "+label(entry.score)}</span>
    <strong style={{marginLeft:"auto"}}>{entry.count}</strong>
   </div>)}
  </div>
 </div>;
}

export default function AssessmentAnalytics({assessments,students,hideSelector=false,hideDetailedInsights=false}:{assessments:InputAssessment[];students:InputStudent[];hideSelector?:boolean;hideDetailedInsights?:boolean}){
 const available=assessments.filter(a=>["submitted","reviewed"].includes(a.status));
 const [selected,setSelected]=useState("");
 const [responses,setResponses]=useState<Response[]>([]);
 const [loadedAssessmentId,setLoadedAssessmentId]=useState("");
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{if(!available.some(a=>a.id===selected))setSelected(available[0]?.id||"");},[assessments,selected]);
 useEffect(()=>{let cancelled=false;async function load(){
  if(!selected){setResponses([]);setLoadedAssessmentId("");return;}
  setLoading(true);setError("");setLoadedAssessmentId("");setResponses([]);
  if(!supabase){setError("Supabase is not configured.");setLoading(false);return;}
  const {data,error:e}=await supabase.from("assessment_responses").select("question_id,score,observation").eq("assignment_id",selected);
  if(!cancelled){if(e){setError(e.message);setResponses([]);}else setResponses((data||[]) as Response[]);setLoadedAssessmentId(selected);setLoading(false);}
 }void load();return()=>{cancelled=true;};},[selected]);
 const assignment=available.find(a=>a.id===selected);
 const items=useMemo<Item[]>(()=>{
  if(!assignment)return [];
  const byId=new Map((loadedAssessmentId===selected?responses:[]).map(r=>[r.question_id,r]));
  return CHECKLIST_DATA[assignment.assessment_level].areas.flatMap(area=>area.subDomains.flatMap(domain=>domain.items.map((question,i)=>{
   const id=domain.id+"_"+(i+1),res=byId.get(id);
   return {id,question,domain:domain.title,area:area.title,score:res?.score??null,observation:res?.observation||""};
  })));
 },[assignment,responses,loadedAssessmentId,selected]);
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
  <div style={{...card,background:"#f8fafc"}}>
   <h2 style={{marginTop:0,fontSize:22,color:"#0f4c5c"}}>Analytics Dashboard</h2>
   <p style={{fontSize:13,color:palette.muted}}>Live, question-level analysis of submitted responses. Select an assessment to view its readiness indicators and support priorities. These are educational screening indicators, not a diagnosis.</p>
   {!hideSelector && <>
   <label style={{display:"block",fontWeight:700,marginBottom:6}} htmlFor="analytics-assessment">Select student and assessment</label>
   <select id="analytics-assessment" value={selected} onChange={e=>setSelected(e.target.value)} style={{padding:12,borderRadius:9,border:"1px solid #a9bfb5",maxWidth:"100%",width:650}}>
    {available.map(a=><option key={a.id} value={a.id}>{((s)=>s?s.full_name+(s.student_code?" · "+s.student_code:""):"Student")(students.find(s=>s.id===a.student_id))} — {a.assessment_level} — {a.status} — {new Date(a.assigned_at).toLocaleDateString("en-IN")}</option>)}
   </select>
   </>}
  </div>
  {error&&<p role="alert" style={{color:palette.red}}>{error}</p>}
  {loading||loadedAssessmentId!==selected?<p>Loading submitted answers for the selected assessment...</p>:error?<p role="alert">Analytics are unavailable because the saved responses could not be loaded.</p>:!responses.length?<p>No recorded responses found for the selected assessment.</p>:<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:16,marginBottom:19}}>
    {[
     ["Overall Readiness",readiness===null?"—":Math.round(readiness)+"%",readiness===null?"Awaiting Scores":band(readiness),"Weighted across assessed items (excl. NA)","#0f4c5c","◉"],
     ["Independent Skills (3)",String(strengths.length),"indicators","Demonstrated consistently & independently","#10b981","✓"],
     ["Developing Skills (2)",String(developing.length),"indicators","Performs partly or with occasional prompts","#0284c7","✦"],
     ["Support Priority (0–1)",String(needs.length),"indicators","Requires direct assistance or scaffolding","#f97316","♡"]
    ].map(([name,value,detail,subtitle,color,symbol])=><div key={name} style={{...card,margin:0,padding:20}}>
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
      <span style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",color:"#64748b"}}>{name}</span>
      <span style={{display:"grid",placeItems:"center",background:color+"17",color:color,borderRadius:9,fontWeight:800,width:34,height:34,fontSize:19}}>{symbol}</span>
     </div>
     <div style={{display:"flex",alignItems:"baseline",gap:9,marginTop:13,flexWrap:"wrap"}}>
      <strong style={{fontSize:28,lineHeight:1.1,color:name==="Overall Readiness"?"#1e293b":color}}>{value}</strong>
      <span style={{fontSize:12,color:color,fontWeight:700}}>{detail}</span>
     </div>
     <p style={{fontSize:12,color:"#94a3b8",margin:"11px 0 0"}}>{subtitle}</p>
    </div>)}
   </div>
   <p style={{fontSize:13,color:palette.muted}}>Readiness = total numeric ratings ÷ (3 × numeric responses), excluding NA and unanswered questions. {assessed} of {items.length} indicators have recorded scores or NA ({counts[4].count} NA).</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:14,alignItems:"stretch"}}>
    <div style={{...card,gridColumn:"span 1"}}><h3 style={{margin:"0 0 4px",fontSize:18}}>Holistic Sub-Domain Competency Radar</h3><p style={{fontSize:12,color:palette.muted,margin:"0 0 14px"}}>Percentage mastery across all checklist sub-domains for active student</p><Radar domains={domains}/></div>
    <div style={card}><h3 style={{margin:"0 0 4px",fontSize:18}}>Rating Distribution</h3><p style={{fontSize:12,color:palette.muted,margin:"0 0 14px"}}>Breakdown of 0–3 scores & NA items</p><RatingDoughnut counts={counts} total={assessed}/><p style={{fontSize:12,color:"#64748b",background:"#f8fafc",borderRadius:10,padding:12,marginTop:14}}>Assessed {assessed} of {items.length} indicators ({counts[4].count} marked NA).</p></div>
   </div>
   <section style={{...card,padding:14,marginBottom:14}}>
    <h3 style={{fontSize:15,margin:"0 0 5px",fontWeight:700}}>Sub-Domain Readiness Breakdown (%)</h3>
    <p style={{fontSize:11,color:palette.muted,margin:"0 0 12px"}}>Independent ≥80% · Developing 50–79% · Needs Support &lt;50% · NA excluded</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:"7px 18px"}}>
     {domains.map(d=><div key={d.id} style={{padding:"6px 0",borderBottom:"1px solid #edf1ee",minWidth:0}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10}}>
       <span style={{fontSize:12,fontWeight:600,lineHeight:1.35,flex:"1 1 auto"}}>{d.name}</span>
       <strong style={{color:bandColor(d.mastery),fontSize:12,flexShrink:0}}>{d.mastery===null?"N/A":Math.round(d.mastery)+"%"}</strong>
      </div>
      <div style={{height:5,marginTop:5,background:"#edf1ee",borderRadius:8,overflow:"hidden"}}>
       <div style={{width:(d.mastery??0)+"%",height:"100%",background:bandColor(d.mastery)}}/>
      </div>
      <span style={{fontSize:10,color:palette.muted}}>{d.numeric} scored · {d.na} NA · {band(d.mastery)}</span>
     </div>)}
    </div>
   </section>
   {!hideDetailedInsights&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:15}}>
    <section style={{...card,borderColor:"#bbf7d0"}}><h3 style={{margin:"0 0 6px",fontSize:17}}>Observed Strengths (Score 3 & Talents)</h3><p style={{fontSize:13,color:palette.muted}}>Skills rated independently in this assessment; observations appear only if recorded.</p>
     {!strengths.length?<p>No score-3 indicators recorded.</p>:strengths.map(q=><div key={q.id} style={{padding:"11px 0",borderBottom:"1px solid #e2e8e5"}}>
      <small style={{color:palette.green}}>{q.domain} · Score 3</small><div style={{fontWeight:600,margin:"5px 0"}}>{q.question}</div>
      {q.observation&&<p style={{fontSize:13,whiteSpace:"pre-wrap",color:palette.muted}}>Evidence: {q.observation}</p>}
     </div>)}
    </section>
    <section style={{...card,borderColor:"#fed7aa"}}><h3 style={{margin:"0 0 6px",fontSize:17}}>Priority Support Needs (Scores 0 & 1)</h3><p style={{fontSize:13,color:palette.muted}}>Indicators requiring targeted support; context appears only when recorded.</p>
     {!needs.length?<p>No score-0 or score-1 indicators recorded.</p>:needs.map(q=><div key={q.id} style={{padding:"11px 0",borderBottom:"1px solid #e2e8e5"}}>
      <small style={{color:palette.red}}>{q.domain} · Score {q.score}</small><div style={{fontWeight:600,margin:"5px 0"}}>{q.question}</div>
      {q.observation&&<p style={{fontSize:13,whiteSpace:"pre-wrap",color:palette.muted}}>Context: {q.observation}</p>}
     </div>)}
    </section>
   </div>}
   <p style={{fontSize:12,color:palette.muted}}>Educational assessment profile based on reported/observed ratings. The number or percentage of indicators is not a clinical diagnosis or a standardised measure of intelligence or developmental age.</p>
  </>}
 </section>;
}
