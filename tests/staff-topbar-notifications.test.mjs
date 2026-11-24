import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261124220000_staff_notification_acknowledgements.sql");
const component=read("app/components/staff-notifications-popup.tsx");
test("all staff dashboards use Parent-style top-bar popup while Parent unchanged",()=>{
 for(const path of ["app/teacher/dashboard/page.tsx","app/admin/dashboard/page.tsx","app/clinic-admin/dashboard/page.tsx"])
  assert.match(read(path),/<StaffNotificationsPopup\s*\/>/);
 const owner=read("app/owner/dashboard/page.tsx");
 assert.match(owner,/AdminDashboard/);
 const parent=read("app/parent/dashboard/page.tsx");
 assert.match(parent,/<ParentNotifications/);
 assert.match(parent,/onShowActivities/);
});
test("staff notifications use personal RLS events, history and unread states",()=>{
 assert.match(component,/role="dialog"/);
 assert.match(component,/Current updates/);
 assert.match(component,/Notification history/);
 assert.match(component,/\.eq\("recipient_user_id",id\)/);
 assert.match(component,/\.from\("staff_notification_acknowledgements"\)/);
 assert.match(component,/\.limit\(100\)/);
});
test("staff acknowledgement database restricts writes to addressed events",()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT SELECT,INSERT/);
 assert.match(sql,/e\.recipient_user_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/recipient_user_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/ur\.role IN \('teacher','admin','clinic_admin','owner'\)/);
 assert.doesNotMatch(sql,/GRANT (UPDATE|DELETE)/);
});
