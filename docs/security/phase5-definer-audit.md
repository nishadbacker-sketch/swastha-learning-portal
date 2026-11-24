# Swastha Phase 5: SECURITY DEFINER Function Audit

**Release update (2026-11-24):** The targeted `is_creator_account` hardening was applied to production and released in PR #13 (merge commit `bfd781129d937310378b32ec5e6af5115a48af2e`). Production post-migration read-only checks passed: Parent and Teacher cannot identify the Owner through this helper; Owner access to the legitimate profile and identity check remains intact. The 31 advisor warnings remain because authenticated, role-gated RPC endpoints are intentionally callable; these require ongoing function-specific review rather than blanket revocation. Leaked Password Protection remains disabled and requires Supabase Auth settings access. The original audit narrative below reflects its **pre-release** checkpoint.

Audit date: 2026-11-24. Production project: `cyhfsfwwpqgsxefcxkzp`. Staging project: `cuxftykygloeczviknbn`.

## Summary
Production Supabase security advisors flagged 31 public-schema, authenticated-callable SECURITY DEFINER functions. Every one has a fixed `search_path`, anonymous EXECUTE is unavailable, and EXECUTE is explicitly limited to `authenticated` (and the database owner). No audited function used editable user metadata as an authorization check. This is an exposure inventory, **not** a declaration that all 31 are vulnerable. SECURITY DEFINER can bypass RLS, so the built-in caller and resource checks remain security critical.

### Function-by-function inventory
| Function | Existing boundary / intended use | Audit action |
|---|---|---|
| `add_child_for_parent` | Parent and authenticated user check | Retain; test child ownership |
| `admin_archive_parent_announcement` | Super Admin / Clinic Admin guard | Retain; review target ID |
| `admin_assign_teacher_to_student` | Super Admin / Clinic Admin and active Teacher target | Retain; negative-role test |
| `admin_audit_timeline` | Super Admin / Clinic Admin guard | Retain |
| `admin_change_student_teacher` | Super Admin / Clinic Admin guard | Retain; preserve links |
| `admin_parent_announcement_ack_details` | Super Admin / Clinic Admin guard | Retain |
| `admin_parent_announcement_recipients` | Super Admin / Clinic Admin guard | Retain |
| `admin_parent_announcement_stats` | Super Admin / Clinic Admin guard | Retain |
| `admin_publish_parent_announcement` | Super Admin / Clinic Admin guard | Retain |
| `admin_revise_standard_question` | Super Admin / Clinic Admin guard | Retain; test permissions |
| `admin_save_student_contact_details` | Super Admin / Clinic Admin guard | Retain; protect private contact data |
| `admin_set_teacher_active` | Super Admin / Clinic Admin guard | Retain |
| `admin_student_progress_summary` | SQL-level authenticated and admin/clinic guard | Parent returns zero rows (tested) |
| `admin_update_child_details` | Super Admin / Clinic Admin guard | Retain |
| `approve_assessment` | Super Admin or authorised active Teacher checks | Retain; evaluate per-student rules |
| `calculate_assessment_score` | Super Admin or assigned active Teacher checks | Retain |
| `coordination_staff_directory` | Authenticated active Teacher / Admin / Clinic Admin | Parent returns zero rows (tested) |
| `coordination_student_work_summary` | Admin / Clinic Admin guard | Parent returns zero rows (tested) |
| `coordination_teacher_assigned` | Authenticated active assigned Teacher check | Retain; used by task transitions |
| `coordination_transition_task` | Authenticated and `coordination_teacher_assigned` resource check | Retain; no direct literal role but delegated check |
| `creator_set_super_admin` | Owner-only guard; protects creator account | Retain, do not revoke |
| `get_assigned_student_guardians` | Teacher guard | Parent returns zero rows (tested) |
| `has_role` | Per-session role lookup with active-Teacher check | Retain; required for RLS |
| **`is_creator_account`** | **Pre-fix: any authenticated caller could test arbitrary UUID for Owner identity** | **Hardened in staging to require Admin/Clinic Admin. Production unchanged pending release** |
| `review_custom_assessment` | Active Teacher / Admin guard | Retain |
| `save_assessment_review` | Teacher / Admin guard | Retain |
| `save_custom_assessment` | Parent and assignment ownership checks | Retain; test child ownership |
| `super_admin_set_clinic_admin` | Super Admin role guard | Retain |
| `swastha_appointment_match_candidates` | Authorised appointment staff only | Retain; sensitive personal data |
| `swastha_link_appointment_to_student` | Authorised appointment staff and confirmation | Retain; preserve history |
| `swastha_visible_staff_codes` | Per-caller staff role checks | Parent returns zero rows (tested) |

### Role access tests
- Production read-only simulated Parent session: no access to Admin student progress, coordination summaries, staff directory, teacher guardian directory or staff codes.
- Production read-only simulated Parent session: reproduced positive Owner identity lookup by passing an existing Owner UUID into `is_creator_account`. No UUID was returned in the audit report.
- Staging Parent and Teacher sessions: hardened Owner lookup returns false. Tests did not modify user roles or data.
- Full regression for real staging Owner/Admin/Clinic Admin logins is **not yet possible** because staging has only two Parent and one Teacher role records.

### Staging-parity limitation
Staging currently exposes four authenticated-callable SECURITY DEFINER functions; production exposes 31. Do not claim all 31 have been exercised in staging or deploy broad permission changes until schemas and role fixtures can be brought into parity safely.

### Authentication configuration
Supabase reports `auth_leaked_password_protection` warning in production. This is an Auth-project setting, not an SQL table permission. Enable **Leaked Password Protection** in Dashboard → Authentication → Providers → Email → password security, if the account's plan supports it (Supabase documents availability on Pro and above). Auth setting cannot be changed with the currently connected Supabase tooling; verify the warning clears afterward. Consider stronger minimum password requirements after validating login/registration experience.

### Safety
No production SQL mutation in Phase 5 audit. Staging migration updates only the Owner-identity helper, not Parent UI, roles, students, assessments or appointment history. Avoid blanket REVOKE on the 31 functions: doing so would break authenticated portal operations.

### Release gates
- [x] Enumerate 31 functions, ACL and search_path.
- [x] Test selected production read-only Parent role isolation.
- [x] Prove Owner lookup disclosure.
- [x] Apply Owner lookup hardening to staging and test non-admin denial.
- [ ] Positive authenticated Admin/Clinic Admin test in a staging environment with parity.
- [ ] CI + source regression pass.
- [ ] Manual leaked-password protection project-setting change; recheck advisor.
- [ ] Explicitly review any broader SECURITY DEFINER refactoring before production.

## Staging test parity setup (non-production only)

The opt-in test `tests/staging-phase5-role-positive.test.mjs` signs in using **dedicated staging-only** Parent, Teacher, Admin and Clinic Admin accounts, checks the expected role stored in `user_roles`, and verifies `is_creator_account` returns false for Parent/Teacher and true for Admin/Clinic Admin when given a staged Owner's UUID.

The staging project currently has **no Owner, Admin or Clinic Admin fixtures**, so **positive role testing is not yet done**. Do not promote or repurpose any existing real account for this test. Provision dedicated synthetic accounts via an authorised staging-only process and store credentials only in GitHub Actions Secrets (never in Git). Required secrets are `SWASTHA_STAGING_SUPABASE_URL`, `SWASTHA_STAGING_SUPABASE_ANON_KEY`, `SWASTHA_STAGING_OWNER_USER_ID`, and `SWASTHA_STAGING_{PARENT_A,TEACHER,ADMIN,CLINIC_ADMIN}_{EMAIL,PASSWORD}`. Once provisioned, enable repository Actions Variable `SWASTHA_RUN_PHASE5_ROLE_TESTS=true` to run the test. The test fails if secrets are missing and restricts its connection to the known staging project hostname.

This is **not** an instruction to copy production user or child data to staging. Staging fixtures must be synthetic. This suite does not modify user roles, appointments, students, or assessment records.
