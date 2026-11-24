"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/appointment"];
export default function ProfileTopTab() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  useEffect(() => {
    let active = true;
    if (!supabase) return;
    const refresh = async () => {
      const { data: { user: current } } = await supabase!.auth.getUser();
      if (!active) return;
      setUser(current?.id || null);
      if (!current) { setName(""); setCode(""); return; }
      const { data } = await supabase!.from("profiles").select("full_name,staff_code").eq("id", current.id).maybeSingle();
      if (active) { setName(data?.full_name || "My Profile"); setCode(data?.staff_code || ""); }
    };
    void refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [pathname]);
  if (!user || PUBLIC_ROUTES.some(p => pathname === p || (p !== "/" && pathname.startsWith(p + "/")))) return null;
  return (
    <nav aria-label="Account navigation" style={{position:"sticky",top:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:"9px max(16px, 4%)",background:"#ffffff",borderBottom:"1px solid #dce8e1",boxShadow:"0 2px 8px #183a3510",fontFamily:"Arial,sans-serif"}}>
      <span style={{fontSize:13,color:"#183a35",fontWeight:700}}>Swastha Learning Clinic</span>
      <button type="button" onClick={() => router.push("/my-profile")} aria-current={pathname === "/my-profile" ? "page" : undefined} style={{padding:"9px 15px",borderRadius:9,border:"1px solid #b9d9cc",background:pathname === "/my-profile" ? "#176b58" : "#eaf4ef",color:pathname === "/my-profile" ? "white" : "#176b58",fontWeight:700,cursor:"pointer"}}>
        My Profile{code ? " (" + code + ")" : ""}{name && name !== "My Profile" ? " · " + name : ""}
      </button>
    </nav>
  );
}
