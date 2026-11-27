import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

const origins = new Set([
  "https://swasthalearning.com",
  "https://www.swasthalearning.com",
  "https://portal.swasthalearning.com",
]);
const MAX_BYTES = 12_000;

function cors(origin: string | null): Record<string, string> {
  return origin && origins.has(origin)
    ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
    : { "Vary": "Origin" };
}
const fail = (reason: string, status: number, origin: string | null) =>
  NextResponse.json({ ok: false, error: reason }, { status, headers: cors(origin) });

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: origins.has(origin || "") ? 204 : 403, headers: cors(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !origins.has(origin)) return fail("This form must be submitted from the Swastha Learning Clinic website.", 403, origin);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > MAX_BYTES) return fail("Appointment details are too large.", 413, origin);
  // Enforce the actual streamed payload size, not only the caller-supplied
  // Content-Length header, which can be absent or misleading.
  let raw: Record<string, unknown>;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Invalid appointment request.", 400, origin);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        return fail("Appointment details are too large.", 413, origin);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)) as Record<string, unknown>;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid request");
  } catch {
    return fail("Invalid appointment request.", 400, origin);
  }
  // Reject filled honeypot submissions; never report a database save unless one occurred.
  if (raw.website) return fail("Invalid appointment submission. Please try again.", 422, origin);
  const guardian_name = text(raw.parent ?? raw.guardian_name, 160);
  const whatsapp_number = text(raw.phone ?? raw.whatsapp_number, 20);
  const contact_differs = raw.contact_differs === true;
  const contact_number = contact_differs ? text(raw.contact_number, 20) : null;
  const child_name = text(raw.child ?? raw.child_name, 160);
  const date_of_birth = text(raw.date_of_birth, 10) || null;
  const age_range = text(raw.age ?? raw.age_range, 80) || null;
  const current_class = text(raw.current_class ?? raw["class"], 80) || "Not specified";
  const preferred_date = text(raw.date ?? raw.preferred_date, 10) || null;
  const preferred_time = text(raw.time ?? raw.preferred_time, 80) || null;
  const support = text(raw.support, 350);
  const note = text(raw.message ?? raw.reason, 1500);
  const reason = [support, note].filter(Boolean).join(" — ").slice(0, 2000);
  // Optional public child-development screening: require a complete, fixed 25-answer set.
  const hasScreening = raw.screening_answers !== undefined;
  const answers = raw.screening_answers;
  if (hasScreening) {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return fail("Invalid screening responses.", 400, origin);
    const entries = Object.entries(answers as Record<string,unknown>);
    if (entries.length !== 25 || entries.some(([k,v]) => !/^(?:[1-9]|1[0-9]|2[0-5])$/.test(k) || !["yes","sometimes","no"].includes(String(v)))) {
      return fail("Please answer all 25 screening questions.", 400, origin);
    }
  }
  const consent = raw.consent === true;
  const submissionKey = typeof raw.submission_key === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.submission_key) ? raw.submission_key : null;
  if (hasScreening && !submissionKey) return fail("A valid assessment submission reference is required.", 400, origin);
  const phonePattern = /^[+\d\s()-]{8,20}$/;
  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d + "T00:00:00Z").getTime()) && new Date(d + "T00:00:00Z").toISOString().slice(0,10) === d;
  if (guardian_name.length < 2 || child_name.length < 2 || !phonePattern.test(whatsapp_number) || (contact_differs && !phonePattern.test(contact_number || "")) || !consent ||
      (!age_range && !date_of_birth) || (date_of_birth && (!validDate(date_of_birth) || date_of_birth > new Date().toISOString().slice(0,10))) ||
      (preferred_date && !validDate(preferred_date)))
    return fail("Please complete all required appointment details and consent.", 400, origin);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The public table intentionally denies anonymous inserts. Only the server
  // can write validated enquiries, using a credential kept out of the browser.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail("Appointment intake is unavailable.", 503, origin);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // A replay of a previously saved browser request is a successful no-op.
  // This check runs before throttling, so an ordinary network retry is safe.
  if (submissionKey) {
    const { data: existing, error: replayError } = await db
      .from("appointment_enquiries").select("id").eq("submission_key", submissionKey).maybeSingle();
    if (replayError) return fail("Appointment intake is unavailable.", 503, origin);
    if (existing) {
      if (hasScreening) {
        const {data:saved,error:lookupError}=await db.from("child_screening_submissions").select("student_id").eq("appointment_enquiry_id",existing.id).maybeSingle();
        if(lookupError||!saved) return fail("We could not verify the saved assessment.",503,origin);
        const {data:student,error:studentError}=await db.from("students").select("student_code").eq("id",saved.student_id).maybeSingle();
        if(studentError||!student) return fail("We could not verify the student ID.",503,origin);
        return NextResponse.json({ok:true,message:"Assessment already received.",student_code:student.student_code},{status:200,headers:cors(origin)});
      }
      return NextResponse.json({ ok: true, message: "Appointment request already received." }, { status: 200, headers: cors(origin) });
    }
  }

  // Fail closed when rate-limit storage/RPC is unavailable. HMAC avoids
  // persisting raw phone/IP values in the limiter table.
  const suppliedIp = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const proxyIp = request.headers.get("x-real-ip")?.trim() || "";
  const ip = suppliedIp || proxyIp || "unknown";
  const digest = (value: string) => createHmac("sha256", key).update(value).digest("hex");
  const { data: allowed, error: limitError } = await db.rpc("swastha_limit_appointment_request", {
    p_ip_key: digest("ip:" + ip),
    p_phone_key: digest("phone:" + whatsapp_number.replace(/\D/g, "")),
  });
  if (limitError) {
    console.error("Appointment rate limiter failed:", limitError.code);
    return fail("Appointment intake is temporarily unavailable.", 503, origin);
  }
  if (allowed !== true) {
    return NextResponse.json({ ok: false, error: "Too many appointment requests. Please try again later." }, {
      status: 429, headers: { ...cors(origin), "Retry-After": "900" }
    });
  }

  if (hasScreening) {
    // The database RPC saves the appointment, a new permanent pending student ID,
    // and all 25 responses atomically. A phone number is only a matching hint,
    // never proof of access to an existing child's record.
    const {data:stored,error:screenError}=await db.rpc("swastha_record_public_screening",{p_request:{
      submission_key:submissionKey,guardian_name,whatsapp_number,
      contact_differs,contact_number,child_name,date_of_birth,age_range,current_class,
      preferred_date,preferred_time,reason,source:"website_free_screening",screening_answers:answers
    }});
    if(screenError){
      if(submissionKey && screenError.code==="23505"){
        const {data:duplicate}=await db.from("appointment_enquiries").select("id").eq("submission_key",submissionKey).maybeSingle();
        if(duplicate)return NextResponse.json({ok:true,message:"Assessment already received."},{status:200,headers:cors(origin)});
      }
      console.error("Screening intake failed:",screenError.code);
      return fail("We could not save the assessment. Please try again.",503,origin);
    }
    return NextResponse.json({ok:true,message:"Free assessment saved.",student_code:stored?.student_code||null},{status:201,headers:cors(origin)});
  }
  const { error } = await db.from("appointment_enquiries").insert({
    submission_key: submissionKey, guardian_name, whatsapp_number, contact_differs, contact_number, child_name, date_of_birth, age_range, current_class,
    preferred_date, preferred_time, reason, consent: true, source: origin === "https://portal.swasthalearning.com" ? "portal_appointment" : "website_appointment"
  });
  if (error) {
    // A replayed submission_key already saved the first request successfully.
    // The unique index also ensures that no second outbox alert is queued.
    if (submissionKey && error.code === "23505" && /submission_key/i.test(error.message || "")) {
      return NextResponse.json({ ok: true, message: "Appointment request already received." }, { status: 200, headers: cors(origin) });
    }
    console.error("Appointment intake failed:", error.code);
    return fail("We could not record your appointment. Please try again.", 503, origin);
  }
  // A private database trigger creates one pending staff notification per
  // saved enquiry. No SMTP request runs in this public API endpoint.
  return NextResponse.json({ ok: true, message: "Appointment request received." }, { status: 201, headers: cors(origin) });
}
