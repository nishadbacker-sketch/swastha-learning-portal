import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const file=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const staffMail=file("lib/server/appointment-notification.ts");
const intake=file("app/api/appointment-intake/route.ts");
const appointment=file("app/appointment/page.tsx");
const migration=file("supabase/migrations/20261124190000_notification_outbox.sql");

test("staff SMTP notification is disabled by default and uses server-only credentials",()=>{
 assert.match(staffMail,/import "server-only"/);
 assert.match(staffMail,/SWASTHA_ENABLE_APPOINTMENT_STAFF_EMAIL/);
 assert.match(staffMail,/!== "true"\) return "disabled"/);
 assert.match(staffMail,/process\.env\.SWASTHA_SMTP_PASSWORD/);
 assert.doesNotMatch(staffMail,/NEXT_PUBLIC_.*SMTP/);
});
test("appointment emails go only to fixed clinic inbox without child or parent content",()=>{
 assert.match(staffMail,/const SUPPORT_ADDRESS = "support@swasthalearning.com"/);
 assert.match(staffMail,/to: SUPPORT_ADDRESS/);
 assert.doesNotMatch(staffMail,/guardian_name|child_name|whatsapp_number|contact_number/);
});
test("appointment API saves via DB trigger and never emails in request",()=>{
 assert.match(intake,/await db.from\("appointment_enquiries"\).insert/);
 assert.match(intake,/if \(error\)/);
 assert.doesNotMatch(intake,/sendNewAppointmentStaffAlert\(/);
 assert.match(intake,/origin === "https:\/\/portal\.swasthalarning\.com"|origin === "https:\/\/portal\.swasthalearning\.com"/);
 assert.match(intake,/contact_differs, contact_number/);
});
test("private outbox is deduplicated per event and excludes sensitive payload",()=>{
 assert.match(migration,/create schema if not exists swastha_private/);
 assert.match(migration,/unique \(event_type, entity_id\)/);
 assert.match(migration,/alter table swastha_private\.notification_outbox enable row level security/);
 assert.match(migration,/revoke all on swastha_private\.notification_outbox from PUBLIC, anon, authenticated/);
 assert.match(migration,/on conflict \(event_type,entity_id\) do nothing/);
 assert.match(migration,/after insert on public\.appointment_enquiries/);
 assert.doesNotMatch(migration,/guardian_name|child_name|whatsapp_number|date_of_birth|reason/);
});
test("portal appointment form uses validated API instead of direct browser DB insertion",()=>{
 assert.match(appointment,/fetch\("\/api\/appointment-intake"/);
 assert.doesNotMatch(appointment,/from\("appointment_enquiries"\)\.insert/);
 assert.match(appointment,/contact_number:form\.contact_differs/);
});

test("replayed appointment requests cannot create a second appointment",()=>{
 const keySql=file("supabase/migrations/20261124194000_appointment_submission_key.sql");
 assert.match(keySql,/add column if not exists submission_key uuid/);
 assert.match(keySql,/create unique index if not exists appointment_enquiries_submission_key_uq/);
 assert.match(intake,/submission_key: submissionKey/);
 assert.match(intake,/error\.code === "23505"/);
 assert.match(appointment,/crypto\.randomUUID\(\)/);
 assert.match(appointment,/submission_key:submissionKey\.current/);
});

test("public appointment intake never uses the browser anon key to bypass RLS",()=>{
 assert.match(intake,/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(intake,/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
 assert.match(intake,/if \(!url \|\| !key\) return fail/);
});

test("rate limiter is atomic and inaccessible to unauthenticated API clients",()=>{
 const sql=file("supabase/migrations/20261124195000_appointment_rate_limit.sql");
 assert.match(sql,/primary key \(bucket_key, window_number\)/);
 assert.match(sql,/on conflict \(bucket_key,window_number\)/);
 assert.match(sql,/revoke all on function public\.swastha_limit_appointment_request\(text,text\) from PUBLIC,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.swastha_limit_appointment_request\(text,text\) to service_role/);
 assert.match(intake,/createHmac\("sha256", key\)/);
 assert.match(intake,/db\.rpc\("swastha_limit_appointment_request"/);
 assert.match(intake,/status: 429/);
 assert.match(intake,/if \(limitError\)/);
});
