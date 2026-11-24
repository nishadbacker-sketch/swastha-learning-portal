# Swastha Release & Phase 6 Final Verification

Audit date: 24 November 2026. This file records what was *actually* verified; it does not imply a successful Hostinger authenticated browser deployment.

## Completed
- GitHub Phase 5 Owner identity hardening merged in PR #13; Phase 6 Teacher progress report merged in PR #14.
- Production Supabase has 7 students, 14 teacher assignments, 3 appointment enquiries, and one reviewed assessment (at last audit). These must not be altered just to populate a sample report.
- Phase 6 existing IDP system already includes assessment-linked goal baselines, targets, current achievement, review dates, progress notes and progress history.
- Audited staging schema and discovered the existing production IDP history trigger and Teacher write permissions were missing in staging.
- Applied **staging-only** migrations `staging_only_phase6_goal_history_parity` and `staging_only_phase6_goal_permissions_parity`. Production schema unchanged.
- Staging SQL transaction using an actual existing assigned Teacher and reviewed assessment: create synthetic goal (baseline 20%, target 80%), update to 50% and `in_progress`, assert exactly one audit-history row, then ROLLBACK.
- Staging SQL transaction using linked Parent: attempt goal creation; verifies permission denied; then ROLLBACK.
- Prior staging Teacher/Parent row-level isolation tests passed; database retains existing records.
- CI source regression tests added for new staging parity checks and existing Teacher-only report.

## Unable to execute with currently connected tools
1. **Hostinger deployment verification.** No Hostinger Website/Web App connector is available. Public URL resolution `portal.swasthalearning.com` failed in the verification environment; DNS failure here does not by itself imply the site is down. Check Hostinger Web App deployment status and latest `main` commit manually or via supported Work cloud browser.
2. **Live authenticated browser test.** No authenticated Teacher browser session or Hostinger dashboard access available. Log in as Teacher, navigate to `/teacher/progress-report`, verify a reviewed assessment report, print/PDF, and no Parent UI regression.
3. **Supabase Auth leaked-password protection.** This is an Auth project setting, not SQL. Production security advisor still reports it disabled; Supabase docs say feature requires Pro or higher. Enable through Dashboard Authentication provider settings if eligible, then rerun advisor.
4. **Owner/Super Admin/Admin/Teacher positive staging login suite.** Staging has Parent and Teacher fixtures only, with no synthetic Owner, Super Admin or Admin account credentials. The opt-in CI suite is present and intentionally skipped until dedicated nonproduction accounts are provisioned and configured securely.
5. **31 SECURITY DEFINER warnings.** Advisor counts callable privileged RPCs even when they intentionally use authenticated, role-gated APIs. Each remains subject to function-specific review; do not globally revoke EXECUTE. The confirmed Owner-identity information disclosure was fixed separately in Phase 5.

## Non-destructive test instructions
- Never put raw patient or parent credentials in GitHub source code.
- For the staging-positive CI suite, create **synthetic staging-only** Auth identities for roles `owner`, `admin`, and `clinic_admin`, without modifying existing test or production accounts. Use repository Actions Secrets defined in `docs/security/phase5-definer-audit.md`; enable `SWASTHA_RUN_PHASE5_ROLE_TESTS` only when all have valid credentials.
- Staging-only migrations are deliberately labelled; do not replay them against production because those policies and the trigger already exist.
- The first actual IDP for a child should be created by an authorised Teacher using appropriate reviewed assessments; do not manufacture medical or developmental claims.
