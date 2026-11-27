import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const dynamic="force-dynamic";
const staffRoles=new Set(["owner","admin","clinic_admin","teacher"]);
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}});

export async function GET(request:NextRequest){
  const auth=request.headers.get("authorization")||"";
  const match=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(auth);
  if(!match)return respond({error:"Sign in to the staff portal to view free assessment results."},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return respond({error:"Staff results service is not configured."},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  // Verify the JWT against Supabase Auth on every request. Do not trust a role in the browser or token metadata.
  const {data:authData,error:authError}=await db.auth.getUser(match[1]);
  if(authError||!authData.user)return respond({error:"Your session has expired. Sign in again."},401);
  const userId=authData.user.id;
  const {data:roleRow,error:roleError}=await db.from("user_roles").select("role").eq("user_id",userId).maybeSingle();
  if(roleError)return respond({error:"Unable to verify staff permissions."},503);
  if(!roleRow||!staffRoles.has(roleRow.role))return respond({error:"Only authorized clinic staff can view screening results."},403);

  let assignedIds:string[]|null=null;
  if(roleRow.role==="teacher"){
    const {data:teacher,error:teacherError}=await db.from("teachers").select("id").eq("user_id",userId).eq("status","active").maybeSingle();
    if(teacherError)return respond({error:"Unable to verify teacher assignment."},503);
    if(!teacher)return respond({results:[],role:roleRow.role,total:0});
    const {data:assignments,error:assignmentError}=await db.from("teacher_assignments").select("student_id").eq("teacher_id",teacher.id);
    if(assignmentError)return respond({error:"Unable to verify assigned students."},503);
    assignedIds=[...new Set((assignments||[]).map(row=>row.student_id))];
    if(assignedIds.length===0)return respond({results:[],role:roleRow.role,total:0});
  }

  let query=db.from("child_screening_submissions")
    .select("id,student_id,appointment_enquiry_id,responses,source,completed_at,reviewed_at")
    .order("completed_at",{ascending:false}).limit(250);
  if(assignedIds!==null)query=query.in("student_id",assignedIds);
  const {data:submissions,error:submissionError}=await query;
  if(submissionError){
    console.error("Free screening staff list failed:",submissionError.code);
    return respond({error:"Unable to load free assessment results."},503);
  }
  const rows=submissions||[];
  if(!rows.length)return respond({results:[],role:roleRow.role,total:0});
  const studentIds=[...new Set(rows.map(row=>row.student_id))];
  const enquiryIds=[...new Set(rows.map(row=>row.appointment_enquiry_id))];
  const [studentResult,enquiryResult]=await Promise.all([
    db.from("students").select("id,student_code,full_name,current_class,date_of_birth,status").in("id",studentIds),
    db.from("appointment_enquiries").select("id,guardian_name,whatsapp_number,contact_number,reason").in("id",enquiryIds)
  ]);
  if(studentResult.error||enquiryResult.error){
    console.error("Free screening staff details unavailable:",studentResult.error?.code||enquiryResult.error?.code);
    return respond({error:"Unable to load the linked student or guardian details."},503);
  }
  const students=new Map((studentResult.data||[]).map(row=>[row.id,row]));
  const enquiries=new Map((enquiryResult.data||[]).map(row=>[row.id,row]));
  const results=rows.map(row=>({
    id:row.id,completed_at:row.completed_at,reviewed_at:row.reviewed_at,
    responses:row.responses,
    student:students.get(row.student_id)||null,
    guardian:enquiries.get(row.appointment_enquiry_id)||null
  }));
  return respond({results,role:roleRow.role,total:results.length});
}
