import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const file=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const staffMail=file("lib/server/appointment-notification.ts");
const intake=file("app/api/appointment-intake/route.ts");
const appointment=file("app/appointment/page.tsx");

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
test("appointment API validates and saves before optional notification",()=>{
 const insertion=intake.indexOf('await db.from("appointment_enquiries").insert');
 const notification=intake.indexOf("await sendNewAppointmentStaffAlert()");
 assert.ok(insertion>=0&&notification>insertion);
 assert.match(intake,/if \(error\)/);
 assert.match(intake,/catch \{\s*console\.error\("Appointment staff notification could not be sent\."/);
 assert.match(intake,/origin === "https:\/\/portal\.swasthalearning\.com"/);
 assert.match(intake,/contact_differs, contact_number/);
});
test("portal appointment form uses validated API instead of direct browser DB insertion",()=>{
 assert.match(appointment,/fetch\("\/api\/appointment-intake"/);
 assert.doesNotMatch(appointment,/from\("appointment_enquiries"\)\.insert/);
 assert.match(appointment,/contact_number:form\.contact_differs/);
});
