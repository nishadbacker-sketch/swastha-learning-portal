import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const popup=read("app/components/staff-notifications-popup.tsx");
const sql=read("supabase/migrations/20261124220000_staff_notification_acknowledgements.sql");
test("staff pages share the parent top-bar popup without editing parent pages",()=>{
 for(const page of ["app/teacher/dashboard/page.tsx","app/admin/dashboard/page.tsx","app/clinic-admin/dashboard/page.tsx"])
  assert.match(read(page),/<StaffNotificationsPopup\s*\/>/);
 assert.match(read("app/owner/dashboard/page.tsx"),/<AdminDashboard\s*\/>/);
 assert.match(read("app/parent/dashboard/page.tsx"),/<ParentNotifications /);
 assert.match(read("app/components/parent-notifications.tsx"),/aria-modal="true"/);
});
test("staff popup provides parent-style history and current updates",()=>{
 for(const phrase of ["Notifications","Current updates","Notification history","Got it","View details"])
  assert.ok(popup.includes(phrase));
 assert.match(popup,/aria-modal="true"/);
 assert.match(popup,/\.eq\("recipient_user_id",user\)/);
 assert.match(popup,/\.in\("event_type",\["assessment_submitted","custom_assessment_submitted"\]\)/);
 assert.doesNotMatch(popup,/\.from\("parent_notification_acknowledgements"\)/);
});
test("acknowledgement RLS requires recipient ownership and no delete permission",()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/user_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/n\.recipient_user_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/GRANT SELECT, INSERT ON public\.staff_notification_acknowledgements TO authenticated/);
 assert.doesNotMatch(sql,/GRANT UPDATE|GRANT DELETE/);
});
