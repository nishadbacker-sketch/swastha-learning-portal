# Swastha Learning Clinic — Isolated Staging Setup

**Project:** `swastha-learning-staging`  
**Supabase reference:** `cuxftykygloeczviknbn`  
**Production reference (NEVER seed here):** `cyhfsfwwpqgsxefcxkzp`

## Current verified stage

- **30 public tables**, with **248 columns** matching production column types and nullability.
- **51 foreign key constraints**; 30 staging RLS policies.
- All 30 public tables have RLS enabled.
- No real or synthetic accounts and no students in staging as of creation.
- An authenticated user cannot directly delete students or directly update role records.
- The staging-specific immutable student ID prefix is `SWA-STG-`.
- The staging trigger automatically shares new students with active teachers, and a newly activated teacher with existing students.
- `add_child_for_parent` and `admin_assign_teacher_to_student` provide compatible, role-checked RPC entry points for the initial workflows.

**Not an exact production clone.** At last comparison, production had 52 public functions, 20 public table triggers and 69 RLS policies; staging initially has only its foundation subset. Schema match is necessary, but does not prove identical business logic. Do not point the production portal to staging or claim full workflow equivalence yet.

## Step 1 — Create synthetic Auth accounts (staging only)

Use [Staging Supabase Dashboard](https://supabase.com/dashboard/project/cuxftykygloeczviknbn/auth/users) → **Authentication → Users → Add user**.

Create three distinct synthetic email/password accounts, marking their emails confirmed when supported:

- Parent A: `swastha.staging.parent.a@example.com`
- Parent B: `swastha.staging.parent.b@example.com`
- Teacher: `swastha.staging.teacher@example.com`

Use unique random passwords, and store them securely. Do **not** use real parent, staff or student email addresses. Supabase Auth should trigger new `profiles` and default `parent` entries automatically. If the Auth UI cannot confirm synthetic addresses, check Auth configuration; don't bypass authentication by editing `auth.users` directly.

## Step 2 — Seed fictional roles and children only in staging

After all three users exist, open the **staging** SQL Editor. Verify the project reference in the dashboard URL first. The following SQL assumes the three example addresses above and deliberately fails if any account is absent. Do not execute it in production.

```sql
begin;

do $$
declare
  parent_a uuid;
  parent_b uuid;
  teacher_user uuid;
  teacher_record uuid;
  first_student uuid;
  second_student uuid;
begin
  select id into strict parent_a from auth.users
    where email='swastha.staging.parent.a@example.com';
  select id into strict parent_b from auth.users
    where email='swastha.staging.parent.b@example.com';
  select id into strict teacher_user from auth.users
    where email='swastha.staging.teacher@example.com';

  if parent_a=parent_b or parent_a=teacher_user or parent_b=teacher_user then
    raise exception 'All accounts must be distinct';
  end if;

  if exists (select 1 from public.students)
    or exists (select 1 from public.teachers)
    or exists (select 1 from public.parent_student_links) then
    raise exception 'Seed requires empty staging students and teachers';
  end if;

  update public.user_roles set role='teacher' where user_id=teacher_user;

  insert into public.teachers(user_id,designation,status)
    values(teacher_user,'Staging Test Teacher','active')
    returning id into teacher_record;

  -- The staging BEFORE INSERT trigger replaces TEMP with permanent synthetic IDs.
  insert into public.students(student_code,full_name,date_of_birth,current_class,status)
    values('TEMP','Demo Child A','2017-05-12','Class 3','active')
    returning id into first_student;

  insert into public.students(student_code,full_name,date_of_birth,current_class,status)
    values('TEMP','Demo Child B','2016-08-21','Class 4','active')
    returning id into second_student;

  insert into public.parent_student_links(parent_user_id,student_id,relationship)
    values(parent_a,first_student,'Parent'),
          (parent_b,second_student,'Parent');

  if (select count(*) from public.teacher_assignments)<>2 then
    raise exception 'Automatic teacher–student linking failed';
  end if;
end;
$$;
commit;

select student_code,full_name from public.students order by student_code;
```

This fixture deliberately creates **no real student data**, and all records are linked to synthetic Auth users. The script is not run automatically.

## Step 3 — Configure isolated GitHub CI authentication checks

In GitHub → Repository Settings → Secrets and variables → Actions, configure the eight `SWASTHA_STAGING_...` secrets listed in `docs/PHASE1_SECURITY_RELEASE.md`. Use the **staging** publishable/legacy anon key and those three synthetic accounts only. Do not put secrets in the repository or send passwords to chat.

Re-run **Verify Next.js Build** and inspect the test output. A workflow step with conclusion `success` is **not sufficient** if the tests say `# SKIP`: require individual authenticated tests to pass.

## Step 4 — Complete functional parity before broader browser tests

Port and review required production-safe migrations for assessment submission/review, admin permissions, appointment follow-up, IDP history, announcements and complete role routing. Do **not** bulk-copy functions using `SECURITY DEFINER` without reviewing their permissions and search path. Then run actual isolated browser flows against a staging-only web app, never against the production Hostinger URL.

### Invariants

- Never change the live Supabase production project as part of staging setup.
- Parents cannot delete students.
- Students have immutable unique codes.
- New students automatically link to all active teachers.
- Teacher and admin permissions are enforced in database policies/RPCs, not only client-side redirects.
