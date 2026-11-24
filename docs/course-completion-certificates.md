# Swastha digital course completion certificates

## Approved certificate design
Green geometric polygonal landscape A4 certificate based on the user's uploaded green certificate artwork. Uses the user's supplied SWASTHA LEARNING CLINIC logo (included as `public/certificate-assets/swastha-official-logo.jpg`). No handwriting or handwritten signatures. Programme Coordinator and Clinical Director designations are followed by their official names, supplied explicitly by an authorised issuer. Printed student name, unique Student ID, course title, completion date, issue date, and permanent random reference. QR code encodes the verification URL on `portal.swasthalearning.com`.

## Actual issuing conditions
Only an authorised `admin` (including Owner) or `clinic_admin` can execute `issue_course_completion_certificate`. The database requires a matching `confirmed` registration with consent, a real linked student with a unique student code, an existing course package, a valid non-future completion date, and recorded coordinator and director names. Duplicate certificates are rejected by unique registration ID and locked registration row. Zero existing registrations or courses are invented. Issuing means the authorised staff member has checked actual course completion; no automatic course-complete score inference.

## Portal access
- Admin, Clinic Admin: `/staff/certificates`, issue and download.
- Assigned Teacher: `/staff/certificates`, read-only list scoped by student assignment.
- Parent/Learner: `/parent/certificates`, read and download only the certificates of their linked students, secured by RLS.
- Public scan: `/verify/certificate/{reference}`, shows validity, course title, date, and **initials only**. Full minor and guardian details are never returned by the public function.
- Verification references are random `SLC-<32 hex>` values, not predictable sequential certificate numbers.

## Files and migrations
- `sql/course_completion_certificates.sql`: additive table, scoped RLS, security-definer staff issue function and privacy-preserving public verify RPC.
- `sql/course_completion_clinic_admin_read.sql`: read-only confirmed registrations and titles for Clinic Admin.
- `app/staff/certificates/page.tsx`: issuance and staff PDF.
- `app/parent/certificates/page.tsx`: family download.
- `app/verify/certificate/[reference]/page.tsx`: scanner destination.
- `lib/course-certificate-pdf.ts`: local client-side jsPDF rendering using official-logo asset and local QR generation; PDF data is based on a real previously issued row.
- `tests/course-completion-certificates.test.mjs`: source regression.

## Verification performed
Both migrations staged. Transaction-based tests demonstrated: anon cannot SELECT or issue; fabricated verification reference returns no result; authorised temporary admin issued a temporary test certificate against a temporary confirmed registration; duplicate issuance was rejected; public verification succeeded. Tests rolled back entirely. Production does not currently contain any published packages, confirmed registrations or certificates; display a no-data state.

## Limitations
- Browser-generated PDF is not cryptographically signed; **the QR verification database is the authority**. A PDF can be altered by recipients, but that does not alter server-verified data.
- The logo is included as a web-optimised copy of the approved uploaded JPG for the PDF output; visual quality may improve by replacing it with the full-resolution original through normal asset management.
- User-uploaded template is represented as green/yellow polygonal geometric artwork in jsPDF, not a pixel-perfect copyrighted EPS master.
- Printer fonts vary. PDF uses standard Times/Helvetica; no need to embed font binaries.
- Do not claim a production URL is live until Hostinger deployment is independently confirmed.

## Release gates
Run GitHub Next.js build, parent/privacy source tests, staging transactional security checks, then apply migrations to production and merge PR. Hostinger authenticated browser check remains external.

## Release outcome — 24 November 2026
- PR #25 merged as `7fa8ee441b6d9ce06026cc128e15b04b813836b6`; GitHub CI run #340 **SUCCESS** including Next.js build, smoke tests and security regressions.
- Both additive migrations applied to staging first and then production.
- Staging transaction verified authorised issuance, prevention of duplicates, public verification of valid reference, rejection of fake reference, and anonymous read/write denial. **All fixtures rolled back**.
- Production post-release: 7 existing students, 7 parent links, 0 packages, 0 registrations, 0 issued certificates, certificate table RLS ON and 2 scoped policies. No fabricated completions.
- Next operational actions: publish real course packages, confirm genuine registrations, have authorised Admin/Clinic Admin verify completion and enter official designation-holder names, then issue. Verify Hostinger live deployment and an actual browser PDF/QR scan with test credentials before announcing certificates to parents.
