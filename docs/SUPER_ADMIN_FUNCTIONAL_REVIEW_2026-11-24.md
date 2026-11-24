# Super Admin Functional Review — 24 November 2026

**Scope:** GitHub `main` source review and read-only production Supabase schema inspection. No production data mutations. Reviewed Super Admin dashboard, question bank, student management, coordination, appointment follow-up and audit timeline.

## Verified capabilities

| Area | Evidence in current code | Status |
| --- | --- | --- |
| Super Admin and Creator access | `app/admin/dashboard/page.tsx` checks `user_roles` and accepts `owner`/`admin` | Present; authenticated E2E access tests outstanding |
| Question bank editing | `app/admin/questions/page.tsx` supports LP/UP/HS/HSS item revisions via `admin_revise_standard_question`; `lib/assessment-question-versions.ts` selects revisions at assessment assignment timestamp | Present; do not overwrite historical versions |
| Custom questionnaire review | `app/admin/questions/page.tsx` lists custom templates and directs authorized staff to builder | Present; custom editing workflow not authenticated-E2E verified |
| Student IDs | `app/admin/dashboard/page.tsx`, `app/admin/students/page.tsx`, and `app/teacher/appointments/page.tsx` reference `student_code` | Present in reviewed surfaces; exhaustive all-page review outstanding |
| Staff IDs | `profiles.staff_code` exists in production and dashboard staff listings | Present in reviewed surfaces; exhaustive display consistency check outstanding |
| Appointment & follow-up history | `app/teacher/appointments/page.tsx` supports all/open/closed/registered filters, links registered students and shows student codes; `app/components/student-appointment-history.tsx` loads verified linked enquiries and follow-up events | Present; links should be identity-verified before staff confirmation |
| Admin audit trail | `app/admin/audit/page.tsx` reads `admin_audit_timeline` with a 300-event display cap | Present; audit export and retention not yet established |
| Teacher assignments | Admin dashboard uses `admin_assign_teacher_to_student` RPC | Present; authenticated production-role checks outstanding |

## Improvement made in this review

- Added a direct **Appointment Follow-ups & Registration History** panel on the Super Admin dashboard linking to the existing role-authorized full queue (`/teacher/appointments`).
- This exposes closed, linked and historical records without altering any database record or RLS policy.
- The existing overdue escalation widget remains in place.

## Outstanding risks before declaring fully production ready

1. **Authenticated authorization tests:** automated staging tests were blocked by invalid fictional account passwords. Do not interpret passing anonymous RLS tests as proof of parent/teacher/admin isolation.
2. **Backup and restore:** daily encrypted off-site backup workflow is installed but is not active until secrets/bucket and restore drill are complete. There is no verified recoverable backup.
3. **Operational audit completeness:** admin timeline shows only 300 latest events, and some historical events predate audit enablement. Do not infer a full historical audit from the UI.
4. **Scale:** the follow-up queue loads up to 250 enquiries and 1,500 events; implement server-driven pagination and filter-by-student when the number of cases grows.
5. **Identity verification:** never auto-link enquiry histories solely because a phone number matches; verify child and guardian identity to avoid cross-family history disclosure.
6. **Release:** Hostinger was previously verified at `acac78c`. New GitHub commits need their own build/Hostinger deployment verification. Do not assume Hostinger has published this change.

**Testing notes:** Source and schema review do not substitute for E2E browser tests. No payment, account, student, assessment or appointment records were altered during this review.
