# Assessment completion certificate — Director title

User clarification: the approved green geometric certificate is for **assessment completion**, not a course. The official designation is **Director**, not Clinical Director.

## Implementation
- Add `public.assessment_completion_certificates` with unique, random `SLA-<32 hex>` reference, assignment ID, Student ID and student name, approved assessment name, verified completion/review date, issuer and official names.
- `public.issue_assessment_completion_certificate` permits authorised Super Admin and Clinic Admin to issue **only** after a real standard assessment has `status='reviewed'` and a corresponding teacher-reviewed `assessment_results.reviewed_at`. Prevent duplicate issuance.
- `public.verify_assessment_completion_certificate` exposes only reference, assessment title, Student initial, date and validity.
- Parent/Learner: `/parent/assessment-certificates` read-only and PDF download only for own linked children under RLS.
- Teacher: `/staff/assessment-certificates` read-only for assigned children; authorised Admin and Clinic Admin issue.
- Public QR endpoint `/verify/certificate/SLA-...` chooses the assessment verifier. Legacy `SLC-...` course references remain valid, but the main dashboard links now point to assessment certificates.
- PDF now uses the **Director** designation; the exact-image rendering path also replaces the sample course-completion sentence with **FOR SUCCESSFULLY COMPLETING THE ASSESSMENT**. Student name, assessment name, Student unique ID, official coordinator/director names, date, unique reference and real QR are filled from issued records.
- Existing parent notifications, child records, assessments, assessment scores, course certificates, signatures and header layouts preserved.

## Verification
Staging migration applied. Transaction-only positive test used a real reviewed staging assignment with a temporary issuer role, then verified certificate, rejection of duplicate issue, rejection of fake reference. All changes rolled back. Source regressions `tests/assessment-completion-certificates.test.mjs` included in CI.

## Exact artwork prerequisite
Uploaded certificate bitmap has **not** yet been installed in GitHub. As described in `docs/certificate-approved-template-asset.md`, upload the supplied exact cropped image as `public/certificate-assets/approved-certificate-template.png` to activate exact artwork. Until then the fallback PDF is used with the corrected assessment wording. The download image preview is for layout only, not a valid issued assessment certificate.
