"use client";
import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import {supabase} from "../../../lib/supabase";

type Answer="yes"|"sometimes"|"no";
type Item={id:number;area:string;question:string;positive?:boolean};
const items:Item[]=[
{id:1,area:"Academic Skills",question:"Does your child have difficulty reading at the level expected for their class?",positive:false},
{id:2,area:"Academic Skills",question:"Does your child find it difficult to understand school lessons?",positive:false},
{id:3,area:"Attention & Concentration",question:"Does your child find it difficult to maintain attention while studying?",positive:false},
{id:4,area:"Attention & Concentration",question:"Can your child complete an activity while staying focused?",positive:true},
{id:5,area:"Memory & Cognitive Skills",question:"Does your child find it difficult to recall what they have learned?",positive:false},
{id:6,area:"Memory & Cognitive Skills",question:"Can your child solve small everyday problems independently?",positive:true},
{id:7,area:"Language & Communication",question:"Can your child understand what others say and the instructions they give?",positive:true},
{id:8,area:"Language & Communication",question:"Can your child clearly express their own needs and ideas?",positive:true},
{id:9,area:"Emotional Regulation",question:"Can your child manage anger, sadness and disappointment?",positive:true},
{id:10,area:"Emotional Regulation",question:"Can your child adapt to unexpected changes?",positive:true},
{id:11,area:"Social Skills",question:"Can your child interact comfortably with other children?",positive:true},
{id:12,area:"Social Skills",question:"Can your child cooperate with others during group activities?",positive:true},
{id:13,area:"Digital Habits",question:"Does your child follow limits on mobile phone and TV usage?",positive:true},
{id:14,area:"Digital Habits",question:"Does your child enthusiastically join activities beyond digital devices?",positive:true},
{id:15,area:"Responsibility & Independence",question:"Can your child do daily age-appropriate tasks independently?",positive:true},
{id:16,area:"Responsibility & Independence",question:"Can your child finish responsibilities without constant reminders?",positive:true},
{id:17,area:"Learning Motivation",question:"Does your child show interest in learning independently without pressure?",positive:true},
{id:18,area:"Learning Motivation",question:"Does your child show enthusiasm for learning and understanding new things?",positive:true},
{id:19,area:"Self-Confidence",question:"Does your child show confidence in trying new activities?",positive:true},
{id:20,area:"Self-Confidence",question:"Does your child speak up when faced with mistakes or failures?",positive:true},
{id:21,area:"Creativity",question:"Does your child generate new ideas or approach things creatively?",positive:true},
{id:22,area:"Special Talents",question:"Does your child show a special talent in an area such as art, music, dance, sport or craft?",positive:true},
{id:23,area:"Curiosity & Exploration",question:"Does your child ask questions, explore and seek answers about new things?",positive:true},
{id:24,area:"Leadership & Initiative",question:"Does your child take initiative and help others during activities?",positive:true},
{id:25,area:"Empathy & Helping Skills",question:"Does your child understand the feelings of others and offer help?",positive:true}
];
const areas=[...new Set(items.map(x=>x.area))];
const demo=[{name:"Student A",stage:"Baseline completed",action:"Guidance meeting"},{name:"Student B",stage:"Course ongoing",action:"Post-course check"},{name:"Student C",stage:"Follow-up complete",action:"Discuss progress"}];
const card:React.CSSProperties={background:"#fff",border:"1px solid #dce8e1",borderRadius:14,padding:20,boxShadow:"0 4px 16px #163b3010"};
const button:React.CSSProperties={border:0,borderRadius:9,padding:"11px 16px",fontWeight:700,cursor:"pointer",background:"#176b58",color:"#fff"};
export default function ChildDevelopmentScreeningPreview(){
 const router=useRouter();
 const [allowed,setAllowed]=useState(false);
 const [checking,setChecking]=useState(true);
 const [mode,setMode]=useState<"form"|"report"|"dashboard">("form");
 const [answers,setAnswers]=useState<Record<number,Answer>>({});
 const [name,setName]=useState("Demo Child");
 const [notes,setNotes]=useState("");
 const [stage,setStage]=useState<"baseline"|"followup">("baseline");
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;async function check(){
  if(!supabase){if(active){setError("Authentication is unavailable.");setChecking(false);}return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){router.replace("/login");return;}
  const {data,error:roleError}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
  if(!active)return;
  if(roleError||!data||!["teacher","admin","owner","clinic_admin"].includes(data.role)){
   setError("This preview is for authorized clinic staff.");setChecking(false);return;
  }
  setAllowed(true);setChecking(false);
 }void check();return()=>{active=false;};},[router]);
 const answered=items.filter(x=>answers[x.id]).length;
 const summary=useMemo(()=>areas.map(area=>{const group=items.filter(x=>x.area===area);const selected=group.filter(x=>answers[x.id]);const score=selected.length?Math.round(selected.reduce((n,x)=>n+(x.positive ? ({yes:2,sometimes:1,no:0}[answers[x.id]]) : ({yes:0,sometimes:1,no:2}[answers[x.id]])),0)/(selected.length*2)*100):null;return{area,score,count:selected.length,total:group.length};}),[answers]);
 const complete=answered===items.length;
 if(checking)return <main style={{padding:32}}>Checking staff access…</main>;
 if(!allowed)return <main style={{padding:32}} role="alert">{error||"Access denied."}</main>;
 return <main style={{minHeight:"100vh",background:"#f8faf7",color:"#183a35",fontFamily:"Arial,Helvetica,sans-serif"}}>
  <header style={{background:"#fff",borderBottom:"1px solid #dce8e1",padding:"18px 5%",display:"flex",gap:16,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
   <BrandLogo/><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span style={{fontSize:12,color:"#996515",fontWeight:700}}>DRAFT • NOT LIVE</span><button style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>router.push("/teacher/dashboard")}>← Teacher Dashboard</button></div>
  </header>
  <div style={{maxWidth:1120,margin:"0 auto",padding:"26px 18px 70px"}}>
   <section style={{...card,background:"linear-gradient(120deg,#075b4d,#176b58)",color:"#fff",marginBottom:18}}>
    <div style={{fontSize:11,letterSpacing:2,fontWeight:800,color:"#d9f5ea"}}>SWASTHA LEARNING CLINIC • STAFF WORKSPACE</div>
    <h1 style={{fontSize:"clamp(24px,3vw,34px)",color:"#fff",margin:"12px 0 7px"}}>Holistic Child Development Screening</h1>
    <p style={{color:"#e0f3ed",maxWidth:760,fontSize:14,margin:0}}>Parent questionnaire • 25 responses • 10 development areas + 5 strengths • baseline and post-course review</p>
   </section>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
    {([["form","Questionnaire"],["report","Individual Result"],["dashboard","Multi-student Dashboard"]] as const).map(([v,label])=><button key={v} onClick={()=>setMode(v)} aria-current={mode===v?"page":undefined} style={{...button,background:mode===v?"#176b58":"#fff",color:mode===v?"#fff":"#176b58",border:"1px solid #b7d7ca"}}>{label}</button>)}
   </div>
   <p style={{color:"#667a74",fontSize:12,margin:"0 0 16px"}}>Design preview only. Answers stay in this browser session; no student record is saved, no result is sent to parents, and no validated diagnostic score is claimed. Question wording is an English working adaptation of the supplied Malayalam form and requires source verification before publication.</p>
   {mode==="form"&&<div style={{display:"grid",gap:15}}>
    <section style={card}><h2 style={{fontSize:20,margin:"0 0 14px"}}>New screening • Parent responses</h2>
     <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <label style={{display:"grid",gap:5,flex:"2 1 220px",fontSize:13,fontWeight:700}}>Child's name (demo)<input value={name} onChange={e=>setName(e.target.value)} style={{padding:12,border:"1px solid #cbded5",borderRadius:8,fontSize:15}}/></label>
      <label style={{display:"grid",gap:5,flex:"1 1 200px",fontSize:13,fontWeight:700}}>Screening stage<select value={stage} onChange={e=>setStage(e.target.value as typeof stage)} style={{padding:12,border:"1px solid #cbded5",borderRadius:8,fontSize:15}}><option value="baseline">Initial / Baseline</option><option value="followup">After course / Follow-up</option></select></label>
     </div>
     <p style={{fontSize:12,color:"#667a74",margin:"13px 0 6px"}}>{answered} / 25 answered</p><div style={{height:8,borderRadius:30,background:"#eaf4ef",overflow:"hidden"}}><div style={{height:"100%",width:(answered/25*100)+"%",background:"#176b58"}}/></div>
    </section>
    {areas.map((area,i)=><section key={area} style={card}><h2 style={{fontSize:17,margin:"0 0 15px",color:"#176b58"}}><span style={{color:"#d97706",marginRight:10}}>{String(i+1).padStart(2,"0")}</span>{area}</h2>
     {items.filter(x=>x.area===area).map(x=><fieldset key={x.id} style={{border:0,borderTop:"1px solid #edf2ef",padding:"15px 0 10px",margin:0}}><legend style={{fontWeight:650,fontSize:14,paddingTop:12}}>{x.id}. {x.question}</legend><div style={{display:"flex",gap:18,flexWrap:"wrap",marginTop:11}}>{(["yes","sometimes","no"] as Answer[]).map(v=><label key={v} style={{display:"flex",gap:5,alignItems:"center",fontSize:14,cursor:"pointer"}}><input type="radio" name={"q"+x.id} checked={answers[x.id]===v} onChange={()=>setAnswers(p=>({...p,[x.id]:v}))}/>{v==="yes"?"Yes":v==="no"?"No":"Sometimes"}</label>)}</div></fieldset>)}
    </section>)}
    <section style={card}><label style={{display:"grid",gap:8,fontWeight:700,fontSize:14}}>Additional parent input<textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What do you see as your child's strongest ability?" style={{border:"1px solid #cbded5",borderRadius:9,padding:12,fontSize:14,fontFamily:"inherit"}}/></label><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginTop:16}}><button style={{...button,background:"#eaf4ef",color:"#176b58"}} onClick={()=>{setAnswers({});setNotes("");}}>Clear demo answers</button><button disabled={!complete} style={{...button,opacity:complete?1:.45}} onClick={()=>setMode("report")}>View self-evaluation summary →</button></div></section>
   </div>}
   {mode==="report"&&<div style={{display:"grid",gap:16}}><section style={card}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><div style={{fontSize:12,color:"#176b58",fontWeight:700}}>PARENT RESPONSE SUMMARY</div><h2 style={{margin:"8px 0 5px"}}>{name||"Demo Child"}</h2><p style={{color:"#667a74",margin:0,fontSize:13}}>{stage==="baseline"?"Initial screening":"Post-course follow-up"} • {answered}/25 responses</p></div><span style={{fontSize:12,color:"#996515",fontWeight:700}}>NOT A DIAGNOSIS</span></div></section>
    <section style={card}><h3 style={{margin:"0 0 8px"}}>Development areas & strengths</h3><p style={{fontSize:12,color:"#667a74"}}>Illustrative positive-response proportion, not a standardized test score. Compare with the child's own future answers, not other children.</p>{summary.map(x=><div key={x.area} style={{display:"grid",gridTemplateColumns:"minmax(155px,1.3fr) minmax(80px,2fr) 55px",alignItems:"center",gap:12,margin:"13px 0",fontSize:13}}><span>{x.area}</span><div style={{height:11,background:"#eaf4ef",borderRadius:20,overflow:"hidden"}}><div style={{height:"100%",width:(x.score??0)+"%",background:"#176b58"}}/></div><strong style={{textAlign:"right"}}>{x.score===null?"—":x.score+"%"}</strong></div>)}</section>
    <section style={card}><h3>Next steps for parents</h3><p style={{fontSize:14,lineHeight:1.65}}>Celebrate strengths, discuss areas where support may be helpful, and consider a teacher-guided review. Advanced courses should be suggested only when their objectives match the child's needs and family goals—not on the basis of an automatically assigned risk label.</p><button style={button} onClick={()=>setMode("form")}>Edit questionnaire</button></section>
   </div>}
   {mode==="dashboard"&&<div style={{display:"grid",gap:16}}><section style={card}><h2 style={{margin:"0 0 6px"}}>Screening & Course Progress</h2><p style={{color:"#667a74",fontSize:13}}>Illustrative dashboard layout — fictional records, not actual clinic data.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>{[["Students screened","24"],["Follow-ups completed","12"],["Courses underway","8"],["Parent reviews pending","5"]].map(([label,v])=><div key={label} style={{background:"#eaf4ef",padding:15,borderRadius:10}}><div style={{fontSize:28,fontWeight:800,color:"#176b58"}}>{v}</div><div style={{fontSize:12}}>{label}</div></div>)}</div></section>
   <section style={card}><h3 style={{marginTop:0}}>Illustrative group trends</h3><p style={{fontSize:12,color:"#667a74"}}>Hypothetical before/after proportions; no actual cohort outcomes have been measured here.</p>{[["Academic Skills",48,65],["Attention",42,59],["Memory",56,70],["Communication",60,72],["Confidence",49,68]].map(([label,before,after])=><div key={label} style={{margin:"15px 0"}}><strong style={{fontSize:13}}>{label}</strong><div style={{display:"flex",alignItems:"center",gap:9,marginTop:7}}><span style={{fontSize:11,width:50}}>Initial</span><div style={{background:"#eaf4ef",flex:1,height:10,borderRadius:9}}><div style={{background:"#9bbab0",width:before+"%",height:"100%",borderRadius:9}}/></div><span style={{fontSize:12,width:35}}>{before}%</span></div><div style={{display:"flex",alignItems:"center",gap:9,marginTop:5}}><span style={{fontSize:11,width:50}}>Later</span><div style={{background:"#eaf4ef",flex:1,height:10,borderRadius:9}}><div style={{background:"#176b58",width:after+"%",height:"100%",borderRadius:9}}/></div><span style={{fontSize:12,width:35}}>{after}%</span></div></div>)}</section>
   <section style={card}><h3 style={{marginTop:0}}>Student follow-up queue</h3><div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%",fontSize:13}}><thead><tr style={{textAlign:"left",background:"#eaf4ef"}}>{["Student","Status","Recommended action"].map(h=><th key={h} style={{padding:12}}>{h}</th>)}</tr></thead><tbody>{demo.map(s=><tr key={s.name} style={{borderBottom:"1px solid #dce8e1"}}><td style={{padding:12}}>{s.name}</td><td style={{padding:12}}>{s.stage}</td><td style={{padding:12}}>{s.action}</td></tr>)}</tbody></table></div></section>
   </div>}
  </div>
 </main>;
}
