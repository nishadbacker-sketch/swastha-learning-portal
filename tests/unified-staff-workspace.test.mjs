import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const menu = read("app/components/staff-tools-menu.tsx");
const admin = read("app/admin/dashboard/page.tsx");
const clinic = read("app/clinic-admin/dashboard/page.tsx");
const teacher = read("app/teacher/dashboard/page.tsx");
const parent = read("app/parent/dashboard/page.tsx");
const charts = read("app/components/learning-insights-charts.tsx");
const stylesheet = read("app/globals.css");

test("All staff dashboards reuse one role-aware tools menu", () => {
  assert.match(admin, /<StaffToolsMenu role=\{creatorMode\?"owner":"admin"\}/);
  assert.match(clinic, /<StaffToolsMenu role="clinic_admin"/);
  assert.match(teacher, /<StaffToolsMenu role="teacher"/);
  assert.match(menu, /const COMMON_TOOLS/);
  assert.match(menu, /function roleTools\(role: StaffRole\)/);
  assert.doesNotMatch(menu, /"parent"\s*\|\s*"student"/);
});

test("Administrative tools are not included in teacher menus", () => {
  const common = menu.slice(menu.indexOf("const COMMON_TOOLS"), menu.indexOf("function roleTools"));
  assert.doesNotMatch(common, /\/admin\/users|\/admin\/students|\/admin\/audit/);
  const teacherPart = menu.slice(menu.indexOf('if (role === "teacher")'), menu.indexOf('const admin = role === "clinic_admin"'));
  assert.doesNotMatch(teacherPart, /\/admin\//);
  assert.match(menu, /role === "clinic_admin"/);
});

test("Teacher keeps assessment charts, selected student support and assessment review", () => {
  assert.match(teacher, /import LearningInsightsCharts from/);
  assert.match(teacher, /<LearningInsightsCharts audience="teacher" students=\{students\} assessments=\{assessments\} activities=\{activityAssignments\} selectedStudentId=\{analyticsStudentId\} onStudentChange=\{setAnalyticsStudentId\} hideStudentSelector\/>/);
  assert.match(teacher, /<AssessmentAnalytics assessments=\{assessments\} students=\{students\} studentFilterId=\{analyticsStudentId\}/);
  assert.match(charts, /Choose student for learning insights/);
  assert.match(teacher, /assessment-review/);
});

test("Parent dashboard remains separate and unified typography supports Malayalam", () => {
  assert.doesNotMatch(parent, /StaffToolsMenu/);
  assert.match(stylesheet, /Noto Sans Malayalam/);
  assert.match(stylesheet, /swastha-staff-workspace__tool:focus-visible/);
});
