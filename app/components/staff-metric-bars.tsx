"use client";

type Metric={label:string;value:number};
type Props={items:Metric[];emptyMessage?:string};
/** Read-only chart: parent screens supply their own approved data; staff callers supply RLS-scoped records. */
export default function StaffMetricBars({items,emptyMessage="No records for this view."}:Props){
 const safe=items.map(item=>({label:item.label,value:Math.max(0,Math.floor(Number.isFinite(item.value)?item.value:0))}));
 const maximum=Math.max(0,...safe.map(x=>x.value));
 if(maximum===0)return <p style={{fontSize:13,color:"#64748b"}}>{emptyMessage}</p>;
 return <div style={{display:"grid",gap:12}}>
  {safe.map(item=><div key={item.label} style={{display:"grid",gap:5}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:9,fontSize:13}}><span>{item.label}</span><strong>{item.value}</strong></div>
   <div role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={item.value} style={{height:12,background:"#e7f1ec",borderRadius:12,overflow:"hidden"}}>
    <div style={{height:"100%",width:Math.min(100,100*item.value/maximum)+"%",background:"#176b58",borderRadius:12}}/>
   </div>
  </div>)}
 </div>;
}
