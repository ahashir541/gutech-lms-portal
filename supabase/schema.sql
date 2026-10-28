-- =====================================================================
-- GUTECH LMS Portal — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db query -f`) on a fresh project.
-- Every table has Row Level Security enabled; authorization is enforced
-- in the database, and the Node.js API forwards the user's JWT.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Types ----------
do $$ begin
  create type public.user_role as enum ('student', 'faculty', 'admin');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        public.user_role not null default 'student',
  department  text,
  roll_number text,
  phone       text,
  bio         text,
  created_at  timestamptz not null default now()
);

create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  title        text not null,
  description  text,
  credit_hours int  not null default 3 check (credit_hours between 1 and 6),
  semester     text not null default 'Fall 2026',
  faculty_id   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  description text,
  due_date    timestamptz not null,
  total_marks int not null default 100 check (total_marks > 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  content       text,
  link          text,
  submitted_at  timestamptz not null default now(),
  marks         numeric(6,2) check (marks >= 0),
  feedback      text,
  graded_at     timestamptz,
  unique (assignment_id, student_id)
);

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid references public.courses (id) on delete cascade, -- null = campus-wide
  author_id  uuid references public.profiles (id) on delete set null,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_courses_faculty      on public.courses (faculty_id);
create index if not exists idx_enrollments_student  on public.enrollments (student_id);
create index if not exists idx_assignments_course   on public.assignments (course_id);
create index if not exists idx_submissions_student  on public.submissions (student_id);
create index if not exists idx_announcements_course on public.announcements (course_id);

-- ---------- Helper functions (security definer → no RLS recursion) ----------
create or replace function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_faculty() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'faculty' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.teaches(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses where id = p_course and faculty_id = auth.uid())
$$;

create or replace function public.enrolled_in(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where course_id = p_course and student_id = auth.uid())
$$;

create or replace function public.assignment_course(p_assignment uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select course_id from public.assignments where id = p_assignment
$$;

-- ---------- Triggers ----------
-- Create a profile row whenever a user signs up. Only student/faculty can be self-selected.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'student';
begin
  if new.raw_user_meta_data ->> 'role' = 'faculty' then
    v_role := 'faculty';
  end if;
  insert into public.profiles (id, full_name, email, role, department, roll_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'roll_number'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users cannot promote themselves: only admins (or the service role) change roles.
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  new.email := old.email;
  return new;
end $$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Students cannot grade themselves; graders cannot rewrite a student's answer.
create or replace function public.protect_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_grader boolean := auth.uid() is null
                      or public.is_admin()
                      or public.teaches(public.assignment_course(new.assignment_id));
begin
  if tg_op = 'INSERT' then
    if not v_grader then
      new.marks := null; new.feedback := null; new.graded_at := null;
    end if;
  else
    if v_grader and auth.uid() is distinct from old.student_id then
      new.content := old.content; new.link := old.link; new.submitted_at := old.submitted_at;
      new.graded_at := case when new.marks is null then null else now() end;
    else
      if old.marks is not null then
        raise exception 'This submission has already been graded';
      end if;
      new.marks := old.marks; new.feedback := old.feedback; new.graded_at := old.graded_at;
      new.submitted_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_submission on public.submissions;
create trigger trg_protect_submission
  before insert or update on public.submissions
  for each row execute function public.protect_submission();

-- Marks may never exceed the assignment total.
create or replace function public.check_submission_marks() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_total int;
begin
  if new.marks is not null then
    select total_marks into v_total from public.assignments where id = new.assignment_id;
    if new.marks > v_total then
      raise exception 'Marks cannot exceed total marks (%)', v_total;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_submission_marks on public.submissions;
create trigger trg_check_submission_marks
  before insert or update on public.submissions
  for each row execute function public.check_submission_marks();

-- ---------- Row Level Security ----------
alter table public.profiles      enable row level security;
alter table public.courses       enable row level security;
alter table public.enrollments   enable row level security;
alter table public.assignments   enable row level security;
alter table public.submissions   enable row level security;
alter table public.announcements enable row level security;

-- profiles
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles: update self or admin" on public.profiles;
create policy "profiles: update self or admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- courses
drop policy if exists "courses: read" on public.courses;
create policy "courses: read" on public.courses
  for select to authenticated using (true);
drop policy if exists "courses: faculty create" on public.courses;
create policy "courses: faculty create" on public.courses
  for insert to authenticated
  with check ((public.is_faculty() and faculty_id = auth.uid()) or public.is_admin());
drop policy if exists "courses: owner update" on public.courses;
create policy "courses: owner update" on public.courses
  for update to authenticated using (faculty_id = auth.uid() or public.is_admin())
  with check (faculty_id = auth.uid() or public.is_admin());
drop policy if exists "courses: owner delete" on public.courses;
create policy "courses: owner delete" on public.courses
  for delete to authenticated using (faculty_id = auth.uid() or public.is_admin());

-- enrollments
drop policy if exists "enrollments: read" on public.enrollments;
create policy "enrollments: read" on public.enrollments
  for select to authenticated using (true);
drop policy if exists "enrollments: student enroll" on public.enrollments;
create policy "enrollments: student enroll" on public.enrollments
  for insert to authenticated
  with check (student_id = auth.uid() and public.current_role_name() = 'student');
drop policy if exists "enrollments: drop" on public.enrollments;
create policy "enrollments: drop" on public.enrollments
  for delete to authenticated
  using (student_id = auth.uid() or public.teaches(course_id) or public.is_admin());

-- assignments
drop policy if exists "assignments: read" on public.assignments;
create policy "assignments: read" on public.assignments
  for select to authenticated
  using (public.enrolled_in(course_id) or public.teaches(course_id) or public.is_admin());
drop policy if exists "assignments: teacher write" on public.assignments;
create policy "assignments: teacher write" on public.assignments
  for all to authenticated
  using (public.teaches(course_id) or public.is_admin())
  with check (public.teaches(course_id) or public.is_admin());

-- submissions
drop policy if exists "submissions: read" on public.submissions;
create policy "submissions: read" on public.submissions
  for select to authenticated
  using (student_id = auth.uid()
         or public.teaches(public.assignment_course(assignment_id))
         or public.is_admin());
drop policy if exists "submissions: student submit" on public.submissions;
create policy "submissions: student submit" on public.submissions
  for insert to authenticated
  with check (student_id = auth.uid() and public.enrolled_in(public.assignment_course(assignment_id)));
drop policy if exists "submissions: update" on public.submissions;
create policy "submissions: update" on public.submissions
  for update to authenticated
  using (student_id = auth.uid()
         or public.teaches(public.assignment_course(assignment_id))
         or public.is_admin());
drop policy if exists "submissions: delete" on public.submissions;
create policy "submissions: delete" on public.submissions
  for delete to authenticated
  using ((student_id = auth.uid() and marks is null) or public.is_admin());

-- announcements
drop policy if exists "announcements: read" on public.announcements;
create policy "announcements: read" on public.announcements
  for select to authenticated
  using (course_id is null or public.enrolled_in(course_id) or public.teaches(course_id) or public.is_admin());
drop policy if exists "announcements: create" on public.announcements;
create policy "announcements: create" on public.announcements
  for insert to authenticated
  with check (author_id = auth.uid()
              and ((course_id is null and public.is_admin())
                   or (course_id is not null and (public.teaches(course_id) or public.is_admin()))));
drop policy if exists "announcements: delete" on public.announcements;
create policy "announcements: delete" on public.announcements
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());
