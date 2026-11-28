import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get("reference")||"";
 const headers={"Cache-Control":"no-store"};
 if(!/^SLF-[A-F0-9]{32}$/.test(code))return NextResponse.json(null,{status:404,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json(null,{status:503,headers});
 const id=code.slice(4).toLowerCase().replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,"$1-$2-$3-$4-$5");
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from("child_screening_submissions").select("student_id,completed_at").eq("id",id).maybeSingle();
 if(error)return NextResponse.json(null,{status:503,headers});
 if(!data?.completed_at)return NextResponse.json(null,{status:404,headers});
 const {data:student,error:studentError}=await db.from("students").select("full_name").eq("id",data.student_id).maybeSingle();
 if(studentError)return NextResponse.json(null,{status:503,headers});
 if(!student)return NextResponse.json(null,{status:404,headers});
 return NextResponse.json({reference_code:code,assessment_title:"Free Child Development Assessment",student_initials:String(student.full_name).split(/\s+/).filter(Boolean).map(s=>s[0]).join("."),completion_date:new Date(data.completed_at).toISOString().slice(0,10),issued_at:data.completed_at,valid:true},{headers});
}
