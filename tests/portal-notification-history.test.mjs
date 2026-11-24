import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261124210000_portal_notification_events.sql");
const parent=read("app/components/parent-notifications.tsx");

test("events cover assessment assignments, submissions, approval and learning activities",()=>{
 for(const name of ["assessment_assigned","assessment_submitted","assessment_approved","custom_assessment_assigned","custom_assessment_submitted","custom_assessment_approved","activity_assigned"])
  assert.ok(sql.includes(name),name);
 for(const table of ["assessment_assignments","custom_assessment_assignments","student_activity_assignments"])
  assert.ok(sql.includes("ON public."+table),table);
});
test("history is per-recipient and browser-read-only",()=>{
 assert.match(sql,/UNIQUE\(recipient_user_id,event_type,source_type,source_id\)/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.portal_notification_events FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT ON public\.portal_notification_events TO authenticated/);
 assert.match(sql,/recipient_user_id=\(SELECT auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/GRANT (INSERT|UPDATE|DELETE) ON public\.portal_notification_events TO authenticated/);
 assert.doesNotMatch(sql,/\bpg_notify\b|http_post|smtp|send_mail/i);
});
test("parent history read uses RLS, is capped and does not expose sensitive fields",()=>{
 assert.match(parent,/\.from\("portal_notification_events"\)/);
 assert.match(parent,/\.eq\("recipient_user_id",auth\.user\.id\)/);
 assert.match(parent,/\.limit\(100\)/);
 assert.match(parent,/Notification history/);
 assert.doesNotMatch(parent,/\.select\(".*(reason|diagnosis|answers|whatsapp_number)/);
});
