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

test("staff inbox is limited to individually addressed submission and teacher-assignment events",()=>{
 const staff=read("app/staff/notifications/page.tsx");
 assert.match(staff,/roleDestination\[access\.role\]/);
 assert.match(staff,/\.eq\("recipient_user_id",auth\.user\.id\)/);
 assert.match(staff,/\["assessment_submitted","custom_assessment_submitted","teacher_assigned"\]/);
 assert.match(staff,/\.limit\(100\)/);
 assert.doesNotMatch(staff,/\.from\("portal_notification_events"\)\.insert/);
 for(const file of ["app/teacher/dashboard/page.tsx","app/admin/dashboard/page.tsx","app/clinic-admin/dashboard/page.tsx"])
  assert.match(read(file),/<StaffNotificationsPopup\s*\/>/);
});

test("teacher assignment alerts retain recipient-scoped access and do not change parent notifications",()=>{
 const migration=read("sql/phase3_teacher_assignment_alerts.sql");
 const staffPopup=read("app/components/staff-notifications-popup.tsx");
 assert.match(migration,/AFTER INSERT ON public\.teacher_assignments/);
 assert.match(migration,/JOIN public\.user_roles AS r ON r\.user_id=t\.user_id AND r\.role='teacher'/);
 assert.match(migration,/e\.recipient_user_id = \(SELECT auth\.uid\(\)\)/);
 assert.match(migration,/ON CONFLICT \(recipient_user_id,event_type,source_type,source_id\) DO NOTHING/);
 assert.match(staffPopup,/teacher_assigned/);
 assert.match(staffPopup,/\.eq\("recipient_user_id",user\)/);
 assert.doesNotMatch(staffPopup,/\.from\("portal_notification_events"\)\.insert/);
});
