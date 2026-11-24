import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sql = read("sql/parent_reviewed_assessment_certificate_download.sql");
const parent = read("app/parent/assessment-certificates/page.tsx");
const pdf = read("lib/course-certificate-pdf.ts");

test("certificate issuance requires a linked child, completed teacher review, and account authentication", () => {
  assert.match(sql, /auth\.uid\(\) IS NULL OR NOT/);
  assert.match(sql, /l\.student_id=a\.student_id AND l\.parent_user_id=auth\.uid\(\)/);
  assert.match(sql, /a\.status<>'reviewed'/);
  assert.match(sql, /r\.reviewed_at IS NOT NULL/);
  assert.match(sql, /c\.revoked_at IS NOT NULL/);
  assert.match(sql, /FOR UPDATE/);
});

test("verification is privacy-minimised and checks review and revocation", () => {
  assert.match(sql, /left\(c\.student_name,1\)\|\|'\.'/);
  assert.match(sql, /c\.revoked_at IS NULL/);
  assert.match(sql, /a\.status='reviewed'/);
  assert.match(sql, /c\.reference_code=p_reference_code/);
  assert.doesNotMatch(sql, /SELECT c\.\*/, "public verification should not expose entire certificate rows");
});

test("certificates use the approved background and show correct staff designations", () => {
  assert.match(pdf, /approved-certificate-template\.png/);
  assert.match(pdf, /drawCentered\("Programmer"/);
  assert.match(pdf, /drawCentered\("Director"/);
  assert.match(pdf, /pdf\.text\("Programmer"/);
  assert.match(pdf, /pdf\.text\("Director"/);
  assert.match(pdf, /kind==="assessment"\?"Assessment":"Course"/);
  assert.match(pdf, /downloadAssessmentCertificatePDF/);
});

test("parent certificate list avoids duplicates and does not modify child or result records", () => {
  assert.match(parent, /const pending=reviewed\.filter\(a=>!items\.some\(c=>c\.assignment_id===a\.id\)\)/);
  assert.match(parent, /\.eq\("status","reviewed"\)/);
  assert.match(parent, /\.not\("reviewed_at","is",null\)/);
  assert.doesNotMatch(parent, /\.from\("students"\)[\s\S]*?\.delete\(/);
  assert.doesNotMatch(parent, /Download Certificate Again/);
});
