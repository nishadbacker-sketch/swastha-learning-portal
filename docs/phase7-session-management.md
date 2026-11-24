# Phase 7 — Student Session & Intervention Management

## Existing modules audited
- `students`, `teachers`, and `teacher_assignments` automatically link Teachers to students; no changes.
- `appointment_enquiries` and `appointment_registration_links` preserve appointment and follow-up histories; session references only verified linked enquiries.
- `student_development_goals` and reviewed `assessment_assignments` remain the authoritative IDP records.
- Existing Parent dashboard Learning Activities and notification components remain unchanged except for a small approved session-updates component displayed inside the **existing** Learning Activities tab.

## Implemented
1. **Schedule** sessions with date/time, duration, session type, active assigned Teacher and optional previously-linked appointment.
2. **Attendance**: scheduled, attended, absent, cancelled, rescheduled.
3. **Private clinical/educational session notes and activities** visible to the assigned Teacher and clinic leadership; never to Parent.
4. **IDP linking** only where the goal belongs to the session student and originates from a reviewed assessment. Does not change goal measurements automatically.
5. **Private change history** records old/new status, activities and Teacher notes; no delete API.
6. **Parent summaries** use a separate table containing only Admin/Clinic Admin-approved text. Leadership can publish only for attended sessions; subsequent attendance reversals are blocked. Parent can view only summaries for linked children. Parent cannot read staff session or history tables.
7. **Teacher, Super Admin and Clinic Admin pages** with dashboards linking to their respective session management pages.

## Files
- `sql/phase7_clinic_sessions.sql`: foundational schema, invariant triggers, indexed queries and RLS.
- `sql/phase7_clinic_session_history.sql`: private change history and approval integrity.
- `app/components/session-manager.tsx`: shared role-aware staff workflow.
- `app/{teacher,admin,clinic-admin}/sessions/page.tsx`: three role-specific routes.
- `app/components/parent-session-updates.tsx`: Parent read-only summaries.
- `tests/phase7-clinic-sessions.test.mjs`: source security regressions.

## Staging verification
Applied both Phase 7 migrations to the *isolated staging* Supabase project. In rollback transactions:
- An actual assigned active staging Teacher scheduled a session and marked it attended with synthetic private notes.
- The history trigger recorded exactly one attendance change.
- A temporarily promoted synthetic staging fixture (transaction-only) with `clinic_admin` authority published a Parent summary.
- The linked Parent could read that summary but **not** the raw session or change history.
- Leadership could not change an already-approved attended session to absent.
- The assigned Teacher linked a valid reviewed-assessment development goal to the session.
- All test data and transient role changes were rolled back.

## Deployment and launch notes
- Run schema migrations **in order**: `phase7_clinic_sessions`, then `phase7_clinic_session_history`. Production has not been changed while auditing and testing.
- The first new empty tables will not generate sessions or summaries until authorised staff records genuine encounters. Never fabricate student intervention outcomes.
- These additive tables do not alter existing appointments, student/Teacher links, assessments, notifications, parent profile, or dashboard layout.
- Before live operational use, check Hostinger build against the merged GitHub `main` commit and exercise an authenticated Teacher/Admin/Parent flow in a browser; those checks require independent access to Hostinger and test accounts.
