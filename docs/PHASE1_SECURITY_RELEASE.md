# Phase 1 — Security, Release Verification and Workflow Tests

Updated: 2026-11-24. This runbook covers the live Swastha Learning Clinic Next.js/Supabase architecture. **Do not create test students or write test appointments in the production database.**

## Changes completed

- Revoked anonymous and authenticated direct EXECUTE on six SECURITY DEFINER trigger-only functions:
  `enforce_assessment_result_score()`, `protect_assessment_assignment()`,
  `swastha_auto_link_after_enquiry()`, `swastha_auto_link_after_parent_child()`,
  `swastha_issue_student_code()`, `swastha_record_appointment_change()`.
- Existing triggers, student records, assessment results, appointment history, IDs, teacher records and auto-linking logic were **not changed**.
- CI now performs a Next.js production build, starts the built application and runs anonymous, non-destructive portal/API smoke tests.
- CI also checks anonymous access to sensitive Supabase tables and trigger functions when the repository's Supabase URL and anon-key secrets are configured. A skipped test is not a verified result.
- Database owner and privileged methods use Supabase RLS and explicit role checks. This is not a substitute for authenticated-role integration tests.

## Confirm release before Hostinger deployment

1. Review GitHub Actions > Verify Next.js Build for the exact commit to deploy. Confirm both smoke tests and anonymous database checks completed, rather than skipped.
2. In Hostinger Web App confirm repository URL `https://github.com/nishadbacker-sketch/swastha-learning-portal.git`, branch `main`, Node 22, `npm run build`, `.next`, and required `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables. **Never put the Supabase service-role key in NEXT_PUBLIC variables.**
3. Deploy the verified commit, and compare Hostinger's cloned SHA with the GitHub commit SHA. A GitHub build passing **does not** prove Hostinger deployed that revision.
4. In production visit `/login`, `/register`, and `/teacher/appointments` as permitted. Check host application logs for startup errors.
5. If Git clone fails, reconnect the GitHub integration or redeploy; **do not** delete/recreate the site or wipe variables and student data.
6. Keep a tested database backup/restore plan and the previous known-good deployment available for rollback. GitHub source control is not a backup of Supabase data.

## Required isolated end-to-end role tests (staging or dedicated test accounts)

These are **manual until a dedicated staging environment and suitable nonproduction accounts are available**. Use unique fake student information, and never reuse real families' data.

| Account | Scenario | Expected outcome |
| --- | --- | --- |
| Parent | Register, sign in, view own child; attempt to view another child's URL/UUID | Registration succeeds; other child's records are denied |
| Parent | Add a child; try to delete child or modify teacher permissions | Child ID is generated; deletion and privileges are denied |
| Teacher A | View assigned students; claim a shared task and add note | Sees authorised students only; task claimed once |
| Teacher B | Open same task; try to claim it; read handover note | Can view note, cannot double claim |
| Inactive teacher | Open teacher dashboard or read student records | Access denied |
| Admin / Super Admin | Student overview, teacher management and authorised follow-up | Correct records visible without Creator credentials |
| Non-Creator | Try creator-only Super Admin permissions | Denied by backend |
| Creator | Super Admin control and coordination oversight | Authorised actions work; account remains protected |
| Admissions | Submit enquiry, close it, view history; register matching parent and child | Enquiry preserved; phone/name/DOB matching links exact unique record only |
| Assessment | Parent submits; teacher reviews; IDP and activity assigned | Only reviewed results appear to parent; history shows updates |
| Deployment | Deploy and verify source SHA on Hostinger | Matches successful GitHub Actions commit |

Check negative cases both from the UI and by direct Supabase API calls with the appropriate role JWT. Client-side route redirects alone do not prove backend security.

## Open security/operational work

- Supabase Auth leaked-password protection: enable in Auth configuration after checking account policy. It cannot be confirmed through source control alone.
- Signed-in privileged SECURITY DEFINER functions: review each for role, ownership and parameter validation; many are intentionally exposed as RPC endpoints. Do not revoke needed RPC permissions indiscriminately.
- Supabase `payments` has RLS but no policies: deny-all is appropriate while billing is inactive; design rules before activating Razorpay.
- Public appointment endpoint: CORS and honeypot checks are **not** strong anti-abuse controls, as callers can spoof an Origin header. Add server-side request throttling and monitoring before broad public launch.
- GitHub Actions smoke tests do not log in as real users or verify Hostinger's runtime. Do not report full end-to-end sign-off until staging role tests pass.
- Monitor errors, verify recovery from backups, and repeat Supabase security/performance advisors following schema changes.

## Invariants — do not regress

- All active teachers are assigned to all current and newly registered students by the three Swastha automatic-linking triggers.
- Student code is permanent and unique.
- Parent accounts cannot delete student records.
- Creator has exclusive account governance; users cannot promote themselves.
- Appointment follow-up history and previous records must be retained.
