# Phase 8 — Clinic Operations, Calendar and Progress Analytics

## Audit and design
Build on Phase 7 `clinic_sessions`, `clinic_session_parent_updates`, `teacher_assignments`, `students` and existing reviewed IDP goals and appointment follow-up records. No new child profiles, assessment outcomes, parent notifications or duplicated analytics tables. Owner inherits Super Admin/Admin permissions, Super Admin `admin`, Clinic Admin `clinic_admin`, Teacher `teacher`; Parent is excluded.

## Implemented
- `/staff/operations`: authenticated staff-only, read-only operational view, linked from Teacher/Super Admin/Clinic Admin dashboards.
- Weekly/monthly calendar grouped by **Asia/Kolkata local dates**, Teacher and student filters.
- Session counts, attendance rates, teacher workloads and distribution of session statuses.
- Attended sessions requiring a Parent-summary approval, overdue IDP goal reviews, and leadership-only appointment follow-up totals and overdue queue.
- CSV export of scoped session data with a formula-injection prefix guard, with **no Teacher notes, clinical observations, or Parent contact information**.
- `sql/phase8_clinic_session_conflict_detection.sql`: additive pre-insert/update trigger prevents new future/live `scheduled` or `rescheduled` sessions for the same Teacher or student from overlapping. Transaction advisory locks serialize competing writes. Does not mutate existing sessions.

## Staging verification
Staging migration applied. Transaction-only test with existing assigned active Teacher: first slot accepted, overlapping 20-minute-offset slot denied with expected conflict, adjacent slot accepted, then **ROLLBACK**. No existing records modified.

## Limits and safeguards
- Existing RLS authorizes students and sessions; the application also restricts staff by role and uses permitted student IDs.
- Report loads session data within a one-year lookback and two-year lookahead. A capped result triggers a clear error instead of silently presenting an apparently complete report.
- Only reviewed assessments contribute IDP goals. There are no automated clinical interpretations; comparing scores across different assessment scales is intentionally out of scope.
- Attendance rate is attended/(attended+absent); cancelled and future scheduled sessions excluded.
- Appointment follow-up records are accessible to clinic leadership in this report, not Teacher. Existing follow-up write workflow remains on its original screen.
- Parent dashboard, notifications, appointment workflow, teacher-assignment links, IDP goals, session notes, and existing records are unchanged.
- This operational CSV is not a certified medical report.
- Live Hostinger deployed commit and role-based browser flows must be separately confirmed before treating this as fully signed off.

## Release
**Released 24 November 2026:** Staging overlap test passed with rollback; GitHub CI run #325 passed. Production migration `phase8_clinic_session_conflict_detection` applied successfully and conflict trigger verified. PR #18 merged as `aec9d5092d56d3501f32a474bdc7f293ab8dbb3c`. Post-release production counts: 7 students, 14 Teacher links, 3 existing appointment enquiries, and 0 sessions. Existing records and Parent dashboard settings preserved. Hostinger live deployed commit and authenticated role-browser walkthrough remain external verification gates; see issue #12.
