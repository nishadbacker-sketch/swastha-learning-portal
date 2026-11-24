import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const parent=read("app/parent/dashboard/page.tsx");
const notices=read("app/components/parent-notifications.tsx");
test("notifications appear in the existing parent dashboard tab row",()=>{
 assert.match(parent,/\["Overview","My Child","Assessments","Learning Activities","Progress Summary","Notifications"\]/);
 assert.match(parent,/tab==="Notifications"&&<ParentNotifications/);
 assert.doesNotMatch(parent,/<ParentNotifications[^>]*\/>.*<button style=\{btn\} onClick=\{\(\)=>router.push\("\/my-profile"\)\}/);
});
test("notification history and current updates remain inside parent tab, not popup",()=>{
 assert.match(notices,/Current updates/);
 assert.match(notices,/Notification history/);
 assert.match(notices,/Mark all as read/);
 assert.doesNotMatch(notices,/role="dialog"|aria-modal="true"|setOpen\(/);
});
test("parent notices use authenticated user id and existing RLS protected tables",()=>{
 assert.match(notices,/\.from\("parent_notification_acknowledgements"\)/);
 assert.match(notices,/\.from\("portal_notification_events"\)/);
 assert.match(notices,/\.eq\("recipient_user_id",auth\.user\.id\)/);
 assert.match(notices,/\.eq\("parent_user_id",auth\.user\.id\)/);
});
