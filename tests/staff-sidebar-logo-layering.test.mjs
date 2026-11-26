import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("app/globals.css");
const menu=read("app/components/staff-tools-menu.tsx");
const frame=read("app/components/staff-route-frame.tsx");

test("Shared staff sidebar retains official logo in overview and subpages",()=>{
 assert.match(menu,/<img src="\/swastha-learning-clinic-logo\.png"/);
 assert.match(frame,/<img src="\/swastha-learning-clinic-logo\.png"/);
 for(const area of ["teacher","admin","clinic-admin","owner","staff"]) {
  assert.match(read("app/"+area+"/layout.tsx"),/StaffRouteFrame/);
 }
});
test("Sidebar starts at viewport top above header without losing main content offset",()=>{
 assert.match(css,/\.swastha-staff-route \.swastha-staff-sidebar \{[\s\S]*?top:0!important;[\s\S]*?z-index:120!important/);
 assert.match(css,/\.swastha-staff-route--subpage \.swastha-staff-subpage__content\.is-navigation-visible \{\s*margin-left:294px!important/);
});
test("Only duplicate staff page-header logos are suppressed, not the sidebar brand or parent page",()=>{
 assert.match(css,/swastha-staff-dashboard-shell>header img\[src="\/swastha-learning-clinic-logo\.png"\]/);
 assert.match(css,/swastha-staff-subpage__content img\[src="\/swastha-learning-clinic-logo\.png"\]/);
 assert.match(css,/swastha-staff-sidebar__brand img\[src="\/swastha-learning-clinic-logo\.png"\]/);
 assert.doesNotMatch(css,/\.swastha-parent-route/);
});
test("Mobile keeps official logo visible on every staff route with existing navigation toggle",()=>{
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/swastha-staff-sidebar--subpage:not\(\.is-open\)/);
 assert.match(css,/max-width:210px!important/);
 assert.match(frame,/swastha-staff-subpage__mobile-toggle/);
 assert.match(menu,/In-Person Assessments/);
});
