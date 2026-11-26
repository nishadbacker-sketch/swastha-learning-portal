import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const menu=read("app/components/staff-tools-menu.tsx");
const css=read("app/globals.css");
test("Sidebar uses existing official clinic logo, never generated artwork",()=>{
 assert.match(menu,/<img src="\/swastha-learning-clinic-logo\.png"/);
 assert.match(read("app/components/brand-logo.tsx"),/src="\/swastha-learning-clinic-logo\.png"/);
 assert.match(menu,/className="swastha-staff-sidebar"/);
 assert.match(menu,/aria-label="Staff navigation"/);
 assert.match(menu,/const tools = \[\.\.\.COMMON_TOOLS, \.\.\.roleTools\(role\)\]/);
});
test("Teacher tabs and common staff links move to sidebar without losing click actions",()=>{
 assert.match(menu,/onSectionChange\?\.\(item\.id\)/);
 assert.match(menu,/router\.push\(tool\.href\)/);
 assert.match(menu,/aria-current=\{activeSection===item\.id/);
 assert.match(menu,/aria-label="Role-based staff tools"/);
 assert.doesNotMatch(menu,/summary\.map\(item/);
 assert.match(menu,/<StaffLiveDashboard role=\{role\}/);
});
test("All four staff role dashboards use the same responsive sidebar layout",()=>{
 const teacher=read("app/teacher/dashboard/page.tsx");
 const admin=read("app/admin/dashboard/page.tsx");
 const clinic=read("app/clinic-admin/dashboard/page.tsx");
 const owner=read("app/owner/dashboard/page.tsx");
 for(const source of [teacher,admin,clinic]) assert.match(source,/className="swastha-staff-dashboard-shell"/);
 assert.match(owner,/AdminDashboard/);
 assert.match(css,/\.swastha-staff-sidebar\{position:fixed/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/\.swastha-staff-dashboard-content/);
});
