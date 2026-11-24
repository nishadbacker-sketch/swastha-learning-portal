# Role-based learning insights — Parent, Learner and Teacher

## Reference review
Reviewed external examples of stakeholder dashboards and learning analytics:
- Learnorama (student/parent/teacher reporting): https://www.learnorama.in/reports-dashboards/
- TeacherEase parent SBL visualisations: https://www.teacherease.com/app/news/article/Visualizations-Added-to-Standards-based-Learning-SBL-Parent-Portal
- Learning Accelerator, progress-monitoring dashboards: https://practices.learningaccelerator.org/strategies/data-dashboard-for-progress-monitoring
- Co-designing K–12 teacher dashboards: https://www.mdpi.com/2227-7102/13/12/1190

Adopted role-sensitive summaries, simple staged-completion diagrams, per-student drilldown and explicit empty states. Avoid speculative mastery predictions and class/student rankings.

## Implemented
- `app/components/learning-insights-charts.tsx` — reusable display-only charts:
  - Assessment journey: stages assigned, in progress, awaiting review and reviewed
  - Activity completion bar and completed/remaining counts
  - Per-student progress bars using student name and unique code
  - Family-only published assessment readiness bars, using **only** results associated with reviewed assessment IDs
- `app/parent/dashboard/page.tsx`: add charts inside existing **Overview**. The `parent` and `student` roles both already route to this shared Parent/Learner dashboard; both gain the charts.
- `app/teacher/dashboard/page.tsx`: add assignment-scoped per-student charts to existing **Overview**, retaining existing Teacher overview and assessment analytics.
- No assessment score writes, new clinical assertions, role changes, Parent notification edits, IDP goal modifications, student data replication or new Supabase tables.
- Empty records display no-data messages, never fake 0% ability. Published readiness scores are shown only after review; no cross-version trend comparisons.

## Data protection
- Shared component has no Supabase client, direct SQL, or fetch. It can only display the records supplied by the host dashboard.
- Parent/Learner passes only linked students and results already gated by `assessment_assignments.status = reviewed`.
- Teacher passes scoped assigned students and activity/assessment workflow statuses, but not parent-facing approved-result scores.
- Existing Supabase RLS and auth checks remain authoritative.

## Validation
- `tests/role-based-learning-insights-charts.test.mjs` added to GitHub build workflow.
- Live authenticated role-browser verification remains a separate release signoff, and Hostinger deployment must be independently checked.
