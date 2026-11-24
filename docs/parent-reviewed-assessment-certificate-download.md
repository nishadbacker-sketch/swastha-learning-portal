# Parent self-service PDF certificate for reviewed assessments

## User requirement
A Parent/Learner should be able to download the digital certificate for any linked child **after Teacher review**, without asking an Administrator to issue each certificate.

## Workflow
1. Administrator opens `/staff/assessment-certificates` and configures the actual Programme Coordinator and **Director** names once using the dedicated privileged RPC. These official names are required for all newly issued certificates and stored as a snapshot.
2. Teacher completes review of the standard assessment, with `assessment_assignments.status='reviewed'` and an `assessment_results.reviewed_at` record.
3. Parent opens `/parent/assessment-certificates`, sees all reviewed assessments for linked students, and presses **Download Certificate (PDF)**.
4. The security-definer claim function validates auth, role, parent-child link, approved review evidence, valid student unique ID and configured signatories. It creates one stable, random `SLA-...` certificate reference if absent; subsequent downloads reuse the existing reference. Withdrawn or revoked certificates are not claimable.
5. PDF includes student, verified assessment title, review date, approved clinic names and QR to `/verify/certificate/{reference}`. The public verifier still returns initials only.
6. Existing staff manual issuance and course certificate records remain unchanged. No clinical scores are printed or auto-inferred.

## Safety
- Signatories table is RLS-enabled and not directly readable or writable by anonymous or authenticated users.
- Only Admin/Super Admin or Clinic Admin may configure names.
- Claim is limited to Parent/Student roles and a real linked student.
- Parent reads only certificates whose assessment remains reviewed with a corresponding reviewed result; QR returns invalid if review is withdrawn or certificate revoked.
- All new changes are additive (no existing certificate rows modified), and tests run with transaction rollback.

## Staging QA
Staged migration was applied. Tested real reviewed assignment with a linked Parent, temporary authorised signatory setup, first claim, idempotent repeated claim, Parent RLS read, unauthorised Admin claim denial, anonymous QR verification and anonymous table access denial. **All changes rolled back**.

## Remaining gate
Hostinger must deploy the merged GitHub commit and a real authenticated Parent/Staff browser walkthrough is required. Exact uploaded certificate background remains an independent binary-file installation prerequisite; until installed the working green polygonal fallback PDF applies.
