import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("app/globals.css");
const menu=read("app/components/staff-tools-menu.tsx");

test("Every staff route uses the same compact visual scope, without wrapping the parent portal",()=>{
 for(const role of ["teacher","admin","clinic-admin","owner","staff"]){
  const layout=read("app/"+role+"/layout.tsx");
  assert.match(layout,/StaffRouteFrame/);
  assert.match(layout,/\{children\}/);
 }
 assert.match(css,/\.swastha-staff-route\{/);
 assert.doesNotMatch(css,/\.swastha-parent-route/);
});
test("Official Swastha logo sits at the left of shared staff top bar",()=>{
 assert.match(menu,/swastha-staff-sidebar__brand/);
 const frame=read("app/components/staff-route-frame.tsx");
 assert.match(frame,/swastha-staff-global-topbar__logo/);
 assert.match(frame,/swastha-learning-clinic-logo\.png/);
 assert.doesNotMatch(menu,/<img src="\/swastha-learning-clinic-logo\.png"/);
 assert.match(css,/\.swastha-staff-global-topbar__logo img/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/display:block!important/);
});
test("Dashboard actions remain available and duplicate top logo is hidden on wide screens",()=>{
 assert.match(css,/justify-content:flex-end/);
 assert.match(css,/div:first-child:not\(:last-child\)/);
 for(const role of ["teacher","admin","clinic-admin"]){
  const file=read("app/"+role+"/dashboard/page.tsx");
  assert.match(file,/StaffToolsMenu/);
  assert.match(file,/StaffNotificationsPopup/);
  assert.match(file,/My Profile/);
  assert.match(file,/Sign out/);
 }
});
test("Existing in-person assessment route is preserved in staff navigation",()=>{
 assert.match(menu,/label: "In-Person Assessments"/);
 assert.match(menu,/href: "\/staff\/in-person-assessments"/);
 assert.match(read("app/staff/in-person-assessments/page.tsx"),/staff_assessment_start/);
});

test("Every staff subpage reuses canonical role-appropriate navigation with responsive toggle",()=>{
 const frame=read("app/components/staff-route-frame.tsx");
 assert.match(frame,/COMMON_TOOLS,roleTools/);
 assert.match(frame,/supabase\.auth\.getUser\(\)/);
 assert.match(frame,/from\("user_roles"\)/);
 assert.match(frame,/swastha-staff-sidebar--subpage/);
 assert.match(frame,/swastha-staff-subpage__mobile-toggle/);
 assert.match(frame,/if\(dashboard\)return/);
 assert.match(css,/swastha-staff-subpage__content\.is-navigation-visible/);
 assert.match(css,/swastha-staff-sidebar--subpage\.is-open/);
});
