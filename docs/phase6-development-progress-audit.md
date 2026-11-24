# Phase 6: Development Planning and Progress Reporting Audit

Audit date: 2026-11-24. Production `cyhfsfwwpqgsxefcxkzp`, staging `cuxftykygloeczviknbn`.

## Functionality already implemented
- Teacher IDP editor: `app/teacher/idp/page.tsx`, using `app/components/development-plan.tsx`.
- Reviewed-assessment linked `student_development_goals` with baseline/current/target percentages, review date, status, progress notes, assigned staff and `student_goal_progress_history` audit entries.
- Teacher assigned-student IDP overview: `app/teacher/student-progress/page.tsx`.
- Existing standard and custom assessment assignments, results and student learning activity assignments.
- Parent receives its own RLS-scoped view of **approved** development goals and assessment results; Parent dashboard is out of scope and untouched.
- Administrator already has `admin_student_progress_summary()` rollups.

## Missing integration implemented in this PR
A **new Teacher-only read-only report** `/teacher/progress-report` combines approved standard assessment results, goals, dated goal-change history and learning activities for a selected assigned student. It links from the existing Teacher progress overview. The printable view supports browser Print / Save as PDF without adding a reporting table or modifying Parent dashboard components. The report clearly states that scores from different assessment versions/scales cannot be automatically compared.

## Scope and protections
- Active `teacher` role required; query student IDs via that Teacher's `teacher_assignments`.
- Every cross-table student/assessment query is restricted to previously authorised IDs and approved assessment IDs; database RLS remains the actual enforcement layer.
- Only reads `assessment_results` for reviewed assessments. No stored scores are recalculated.
- No changes to database tables, RLS policies, appointments, IDP history, student assignments, credentials, parent portal, footer or topbar notifications.
- Staging transaction read-only role test: assigned Teacher can read own student rows, Parent cannot read teacher assignment records. Existing schema has RLS on all relevant learning tables.
- CI checks new route, actor restrictions, approved assessment gates, non-destructive source, Parent regressions, and Next.js build.
- UI browser verification in authenticated Teacher session is a separate deployment check. The printable report is **not** a medically validated clinical report or signed clinical record.

## Future work not included
- Cross-assessment trend standardisation requires an explicitly defined scoring guide; avoid plotting raw scores across incompatible levels.
- Parent-facing report approval/publication must not be bypassed by Teacher-only report.
- Any expanded IDP intervention schedules or staff sign-off would require separately scoped schema, security and UX review.

## Release gate
Merge only after GitHub CI passes; no Supabase migration required. Verify Hostinger independently.
