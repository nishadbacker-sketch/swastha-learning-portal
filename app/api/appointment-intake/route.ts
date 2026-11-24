import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const consent = raw.consent === true;
  const submissionKey = typeof raw.submission_key === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.submission_key) ? raw.submission_key : null;
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
