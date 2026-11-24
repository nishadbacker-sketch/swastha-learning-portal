import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const popup=read("app/components/staff-notifications-popup.tsx");
const parent=read("app/components/parent-notifications.tsx");
test("appointment follow-up alerts reuse staff popup and existing RLS-protected enquiry source",()=>{
 assert.match(popup,/\.from\("appointment_enquiries"\)/);
 assert.match(popup,/\.select\("id,child_name,next_followup_date,status"\)/);
 assert.match(popup,/\.not\("next_followup_date","is",null\)/);
 assert.match(popup,/\.limit\(250\)/);
 assert.match(popup,/\["teacher","admin","clinic_admin","owner"\]/);
 assert.match(popup,/aria-label="Appointment follow-up alerts"/);
 assert.match(popup,/router\.push\("\/teacher\/appointments"\)/);
});
test("alerts are time-zoned, open-only and do not create duplicates or change appointments",()=>{
 assert.match(popup,/timeZone:"Asia\/Kolkata"/);
 assert.match(popup,/\["completed","not_interested"\]/);
 assert.match(popup,/r\.next_followup_date<=nextDay\(today\)/);
 assert.match(popup,/Overdue/);
 assert.match(popup,/Due today/);
 assert.match(popup,/Due tomorrow/);
 assert.doesNotMatch(popup,/\.from\("appointment_enquiries"\)\.update/);
 assert.doesNotMatch(popup,/\.from\("appointment_enquiries"\)\.insert/);
 assert.doesNotMatch(popup,/\.from\("appointment_followup_history"\)\.delete/);
 assert.match(parent,/Notification history/);
});

test("daily persistent history is unique, staff-recipient scoped and never edits enquiry records",()=>{
 const sql=read("sql/phase3b_appointment_followup_history.sql");
 assert.match(sql,/UNIQUE \(enquiry_id,recipient_user_id,followup_date,kind\)/);
 assert.match(sql,/ON CONFLICT \(enquiry_id,recipient_user_id,followup_date,kind\) DO NOTHING/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/recipient_user_id = \(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/status NOT IN \('completed','not_interested'\)/);
 assert.match(sql,/cron\.schedule/);
 assert.match(sql,/45 18 \* \* \*/);
 assert.doesNotMatch(sql,/UPDATE public\.appointment_enquiries/);
 assert.doesNotMatch(sql,/DELETE FROM public\.appointment_enquiries/);
 assert.match(popup,/appointment_followup_notification_history/);
 assert.match(popup,/aria-label="Appointment reminder history"/);
});
