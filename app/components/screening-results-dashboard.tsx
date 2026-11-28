"use client";
const ML_AREAS:Record<string,string>={"Academic Skills":"അക്കാദമിക് കഴിവുകൾ","Attention & Concentration":"ശ്രദ്ധയും ഏകാഗ്രതയും","Memory & Cognitive Skills":"ഓർമ്മശക്തിയും ബൗദ്ധിക കഴിവുകളും","Language & Communication":"ഭാഷയും ആശയവിനിമയവും","Emotional Regulation":"വികാരനിയന്ത്രണം","Social Skills":"സാമൂഹിക കഴിവുകൾ","Digital Habits":"ഡിജിറ്റൽ ശീലങ്ങൾ","Responsibility & Independence":"ഉത്തരവാദിത്വവും സ്വയംപര്യാപ്തതയും","Learning Motivation":"പഠനതാൽപര്യം","Self-Confidence":"ആത്മവിശ്വാസം","Creativity":"സർഗാത്മകത","Special Talents":"പ്രത്യേക കഴിവുകൾ","Curiosity & Exploration":"ജിജ്ഞാസയും അന്വേഷണവും","Leadership & Initiative":"നേതൃത്വവും മുൻകൈയും","Empathy & Helping Skills":"സഹാനുഭൂതിയും സഹായമനോഭാവവും"};

type Row={area:string;yes:number;sometimes:number;no:number;total:number};
const primary:React.CSSProperties={border:0,borderRadius:9,background:"#176b58",color:"#fff",padding:"13px 20px",fontSize:14,fontWeight:750,cursor:"pointer"};
export default function ScreeningResultsDashboard({rows,malayalam=false}:{rows:Row[];malayalam?:boolean}){
 const development=rows.slice(0,10),strengths=rows.slice(10),discuss=development.filter(x=>x.sometimes+x.no>0);
 if(rows.length!==15||rows.some(r=>r.total<=0||r.yes+r.sometimes+r.no!==r.total))return <p role="status">{malayalam?"പൂർണ്ണമായ ഉത്തരങ്ങൾ ലഭ്യമല്ല.":"Complete saved responses are required to display the dashboard."}</p>;
 return <div className="shared-screening-dashboard">
    <style>{`
     .shared-screening-dashboard .dash-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
     .shared-screening-dashboard .dash-card{background:#fff;border:1px solid #dce8e1;border-radius:14px;padding:16px;box-shadow:0 2px 5px #153b2810;min-width:0}
     .shared-screening-dashboard .dash-card h3{font-size:17px;margin:0 0 12px;color:#183a35}
     .shared-screening-dashboard .dash-card p, .shared-screening-dashboard .dash-card li{font-size:13px;line-height:1.55}
     .shared-screening-dashboard .dash-card ul{padding-inline-start:19px;margin:8px 0}
     .shared-screening-dashboard .dash-card li{margin:6px 0}
     .shared-screening-dashboard .span4{grid-column:span 4}  .shared-screening-dashboard .span8{grid-column:span 8}  .shared-screening-dashboard .span3{grid-column:span 3}  .shared-screening-dashboard .span9{grid-column:span 9}
    @media(max-width:800px){ .shared-screening-dashboard .dash-card{grid-column:span 6}}
    @media(max-width:520px){ .shared-screening-dashboard .dash-card{grid-column:1/-1}}
    `}</style>
    {(() => {
      const t=(en:string,ml:string)=>malayalam?ml:en;
      const name=(r:typeof rows[number])=>malayalam?ML_AREAS[r.area]:r.area;
      const yes=development.reduce((s,r)=>s+r.yes,0);
      const total=development.reduce((s,r)=>s+r.total,0);
      const pct=Math.round(100*yes/total);
      const strong=development.filter(r=>r.yes===r.total);
      const mixed=development.filter(r=>r.yes>0&&r.yes<r.total);
      const occasional=development.filter(r=>r.yes===0&&r.sometimes>0);
      const absent=development.filter(r=>r.no===r.total);
      const point=(i:number,v:number)=>[150+82*v*Math.sin(i*2*Math.PI/development.length),105-82*v*Math.cos(i*2*Math.PI/development.length)];
      const polygon=(v:number)=>development.map((_,i)=>point(i,v).join(",")).join(" ");
      const activities=[
       ["Read together and discuss a short passage.","ഒരുമിച്ച് വായിച്ച് ചെറിയ ഭാഗം ചർച്ച ചെയ്യുക."],
       ["Try short focused tasks with breaks.","ഇടവേളകളോടെ ചെറിയ ശ്രദ്ധാ പ്രവർത്തനങ്ങൾ ചെയ്യുക."],
       ["Play recall and matching games.","ഓർമ്മയും പൊരുത്തവും പരിശോധിക്കുന്ന കളികൾ കളിക്കുക."],
       ["Practice storytelling and expressing needs.","കഥ പറയാനും ആവശ്യങ്ങൾ പ്രകടിപ്പിക്കാനും പരിശീലിക്കുക."],
       ["Name feelings and practice calming routines.","വികാരങ്ങൾ തിരിച്ചറിഞ്ഞ് ശാന്തമാകാൻ പരിശീലിക്കുക."],
       ["Practice turn-taking in shared games.","കൂട്ടായ കളികളിൽ ഊഴം പാലിക്കാൻ പരിശീലിക്കുക."],
       ["Agree on screen limits and offline activities.","സ്ക്രീൻ സമയപരിധിയും മറ്റു പ്രവർത്തനങ്ങളും നിശ്ചയിക്കുക."],
       ["Use a simple daily responsibility checklist.","ദൈനംദിന ഉത്തരവാദിത്വങ്ങൾക്ക് ലളിതമായ പട്ടിക ഉപയോഗിക്കുക."],
       ["Offer choices in enjoyable learning tasks.","ഇഷ്ടമുള്ള പഠന പ്രവർത്തനങ്ങൾ തിരഞ്ഞെടുക്കാൻ അവസരം നൽകുക."],
       ["Praise effort and encourage small new challenges.","ശ്രമത്തെ അഭിനന്ദിച്ച് ചെറിയ പുതിയ വെല്ലുവിളികൾ പ്രോത്സാഹിപ്പിക്കുക."]
      ];
      return <div className="dash-grid">
       <section className="dash-card span4"><h3>{t("Overall Performance","മൊത്തത്തിലുള്ള പ്രകടനം")}</h3><div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}><div role="img" aria-label={t("Yes responses","അതെ ഉത്തരങ്ങൾ")+" "+pct+"%"} style={{width:142,height:142,borderRadius:"50%",background:"conic-gradient(#55b91c "+pct+"%,#e5ebe8 0)",display:"grid",placeItems:"center",margin:"auto"}}><div style={{width:114,height:114,borderRadius:"50%",background:"white",display:"grid",placeContent:"center",textAlign:"center"}}><strong style={{fontSize:34}}>{pct}%</strong><small>{t("Yes responses","അതെ ഉത്തരങ്ങൾ")}</small></div></div><p style={{flex:"1 1 100px"}}><strong>{yes}/{total}</strong> {t("positive development responses. This is not a standardized score.","അനുകൂല വികസന ഉത്തരങ്ങൾ. ഇത് മാനദണ്ഡപ്പെടുത്തിയ സ്കോർ അല്ല.")}</p></div></section>
       <section className="dash-card span8"><h3>{t("Domain-wise Performance","മേഖല തിരിച്ചുള്ള പ്രകടനം")}</h3>{development.map(r=><div key={r.area} style={{display:"grid",gridTemplateColumns:"minmax(100px,1fr) minmax(65px,1fr) 38px",alignItems:"center",gap:8,margin:"8px 0",fontSize:12}}><span>{name(r)}</span><div style={{height:11,borderRadius:9,overflow:"hidden",display:"flex",background:"#e5ebe8"}}>{[[r.yes,"#159447"],[r.sometimes,"#f4b52b"],[r.no,"#d96b70"]].map(([n,color],i)=><div key={i} style={{width:Number(n)/r.total*100+"%",background:String(color)}}/>)}</div><strong>{r.yes}/{r.total}</strong></div>)}<small>{t("Green: Yes · Amber: Sometimes · Pink: No","പച്ച: അതെ · മഞ്ഞ: ചിലപ്പോൾ · പിങ്ക്: ഇല്ല")}</small></section>
       <section className="dash-card span3"><h3>{t("Development Profile","വികസന പ്രൊഫൈൽ")}</h3><svg viewBox="0 0 300 210" width="100%" role="img" aria-label={t("Radar chart of yes response proportions","അതെ ഉത്തരങ്ങളുടെ റഡാർ ചാർട്ട്")}>{[.25,.5,.75,1].map(v=><polygon key={v} points={polygon(v)} fill="none" stroke="#dce8e1"/>)}{development.map((r,i)=>{const [x,y]=point(i,1);const [a,b]=point(i,1.16);return <g key={r.area}><line x1="150" y1="105" x2={x} y2={y} stroke="#dce8e1"/><text x={a} y={b} fontSize="11" textAnchor="middle">{i+1}</text></g>})}<polygon points={development.map((r,i)=>point(i,r.yes/r.total).join(",")).join(" ")} fill="#a8e9d0" fillOpacity=".7" stroke="#087a4a" strokeWidth="2"/></svg><div style={{fontSize:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>{development.map((r,i)=><span key={r.area}>{i+1}. {name(r)}</span>)}</div></section>
       <section className="dash-card span3" style={{background:"#effbef"}}><h3 style={{color:"#087a36"}}>✓ {t("Strengths","മികവുകൾ")}</h3><ul>{[...strong,...strengths.filter(r=>r.yes>0)].map(r=><li key={r.area}>{name(r)}</li>)}</ul>{!strong.length&&!strengths.some(r=>r.yes>0)&&<p>{t("Explore interests with your child.","കുട്ടിയുടെ താൽപര്യങ്ങൾ കണ്ടെത്തുക.")}</p>}</section>
       <section className="dash-card span3" style={{background:"#fff5df"}}><h3 style={{color:"#92520b"}}>◎ {t("Areas to Improve","മെച്ചപ്പെടുത്തേണ്ട മേഖലകൾ")}</h3><ul>{discuss.map(r=><li key={r.area}>{name(r)}</li>)}</ul>{!discuss.length&&<p>{t("No areas flagged by these responses.","ഈ ഉത്തരങ്ങളിൽ മേഖലകൾ സൂചിപ്പിച്ചിട്ടില്ല.")}</p>}</section>
       <section className="dash-card span3" style={{background:"#fff0f2"}}><h3 style={{color:"#a12739"}}>♡ {t("Support Required","ആവശ്യമായ പിന്തുണ")}</h3><ul>{discuss.map(r=><li key={r.area}>{name(r)} — {r.no>0?t("Discuss with an expert","വിദഗ്ധനുമായി ചർച്ച ചെയ്യുക"):t("Practice and observe","പരിശീലിക്കുകയും നിരീക്ഷിക്കുകയും ചെയ്യുക")}</li>)}</ul>{!discuss.length&&<p>{t("Continue encouragement and observation.","പ്രോത്സാഹനവും നിരീക്ഷണവും തുടരുക.")}</p>}</section>
       <section className="dash-card span4"><h3>{t("Performance by Category","വിഭാഗം തിരിച്ചുള്ള പ്രകടനം")}</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[[strong.length,t("All Yes","എല്ലാം അതെ"),"#e5f7df"],[mixed.length,t("Some Yes","ചിലത് അതെ"),"#e3f0ff"],[occasional.length,t("Sometimes / No","ചിലപ്പോൾ / ഇല്ല"),"#fff0d3"],[absent.length,t("All No","എല്ലാം ഇല്ല"),"#ffe3e7"]].map(([n,label,bg])=><div key={String(label)} style={{background:String(bg),borderRadius:9,padding:12,textAlign:"center"}}><strong style={{fontSize:24,display:"block"}}>{n}</strong><small>{label}</small></div>)}</div></section>
       <section className="dash-card span4"><h3>{t("Learning Progress","പഠന പുരോഗതി")}</h3><div style={{height:100,display:"flex",alignItems:"end",justifyContent:"center",borderBottom:"1px solid #c9ddd3"}}><div style={{height:pct+"%",minHeight:3,width:55,background:"#35a85d",borderRadius:"6px 6px 0 0",textAlign:"center",color:"#183a35"}}>{pct}%</div></div><p>{t("Current screening only. Previous comparable results are not available here.","നിലവിലെ സ്ക്രീനിംഗ് മാത്രം. മുൻ ഫലങ്ങൾ ഇവിടെ ലഭ്യമല്ല.")}</p></section>
       <section className="dash-card span4"><h3>{t("Additional Insights","അധിക നിരീക്ഷണങ്ങൾ")}</h3><ul><li>{t("25 parent responses completed","25 രക്ഷിതൃ ഉത്തരങ്ങൾ പൂർത്തിയായി")}</li><li>{strengths.filter(r=>r.yes>0).length}/5 {t("reported talent areas","രേഖപ്പെടുത്തിയ കഴിവിന്റെ മേഖലകൾ")}</li><li>{discuss.length}/10 {t("development areas to explore","പരിശോധിക്കേണ്ട വികസന മേഖലകൾ")}</li><li>{t("Expert review can clarify the findings.","വിദഗ്ധ വിലയിരുത്തൽ ഫലങ്ങൾ വ്യക്തമാക്കും.")}</li></ul></section>
       <section className="dash-card span9"><h3>{t("Recommended Learning Plan","നിർദേശിക്കുന്ന പഠന പദ്ധതി")}</h3><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,160px),1fr))",gap:9}}><div style={{background:"#eaf2ff",borderRadius:10,padding:12}}><strong>{t("Skill Development","കഴിവ് വികസനം")}</strong><ul>{(discuss.length?discuss:development.slice(0,3)).map(r=><li key={r.area}>{activities[development.indexOf(r)][malayalam?1:0]}</li>)}</ul></div><div style={{background:"#f2e9fc",borderRadius:10,padding:12}}><strong>{t("Parent Guidance","രക്ഷിതൃ മാർഗനിർദേശം")}</strong><ul><li>{t("Daily reading and conversation","ദിവസേന വായനയും സംഭാഷണവും")}</li><li>{t("Positive feedback and regular breaks","പ്രോത്സാഹനവും ഇടവേളകളും")}</li><li>{t("Observe changes without pressure","സമ്മർദമില്ലാതെ മാറ്റങ്ങൾ നിരീക്ഷിക്കുക")}</li></ul></div><div style={{background:"#e7f7e7",borderRadius:10,padding:12}}><strong>{t("Expert Advice & Continuous Guidance","വിദഗ്ധ ഉപദേശവും തുടർച്ചയായ മാർഗനിർദേശവും")}</strong><ul><li>{t("Personalised developmental guidance","വ്യക്തിഗത വികസന മാർഗനിർദേശം")}</li><li>{t("Individual skill development strategies","വ്യക്തിഗത കഴിവ് വികസന തന്ത്രങ്ങൾ")}</li><li>{t("Progress monitoring and periodic review","പുരോഗതി നിരീക്ഷണവും ഇടയ്ക്കുള്ള വിലയിരുത്തലും")}</li></ul></div></div></section>
       <section className="dash-card span3"><h3>{t("Next Steps","അടുത്ത ഘട്ടങ്ങൾ")}</h3><p>✓ {t("Free assessment completed","സൗജന്യ വിലയിരുത്തൽ പൂർത്തിയായി")}</p><p>○ {t("Expert review recommended","വിദഗ്ധ വിലയിരുത്തൽ നിർദേശിക്കുന്നു")}</p><p>○ {t("Discuss follow-up assessment","തുടർ വിലയിരുത്തൽ ചർച്ച ചെയ്യുക")}</p><a href="https://swasthalearning.com/#appointment" style={{...primary,display:"block",textAlign:"center",textDecoration:"none"}}>{t("Book a Consultation","കൺസൾട്ടേഷൻ ബുക്ക് ചെയ്യുക")}</a></section>
      </div>;
    })()}

 </div>;
}
