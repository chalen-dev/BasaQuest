--  File: supabase/migrations/20260811102600_create_assigned_assessments.sql
-- Teacher-assigned reading check-ins: a teacher picks a language + an
-- offline student on the pre-assessment screen, which writes a pending
-- row here. The next time that student logs in, Login.tsx checks for a
-- pending row, consumes it (deletes it), and routes them straight into
-- the assessment session with the assigned language instead of the
-- dashboard.
create table if not exists public.assigned_assessments (
                                                           id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references public.profiles(id) on delete cascade,
    student_id uuid not null references public.profiles(id) on delete cascade,
    lang text not null check (lang in ('fil', 'en')),
    created_at timestamptz not null default now()
    );
create index if not exists assigned_assessments_student_id_idx on public.assigned_assessments (student_id);
create index if not exists assigned_assessments_teacher_id_idx on public.assigned_assessments (teacher_id);
alter table public.assigned_assessments enable row level security;
-- Teachers can create an assignment, but only targeting one of their own students
create policy "Teachers can assign to their own students"
on public.assigned_assessments
for insert
to authenticated
with check (
    teacher_id = auth.uid()
    and exists (
        select 1 from public.profiles s
        where s.id = student_id
          and s.teacher_id = auth.uid()
          and s.role = 'student'
    )
);
-- Teachers can see their own assigned rows (pending badges / cancel button)
create policy "Teachers can view their own assignments"
on public.assigned_assessments
for select
                      to authenticated
                      using (teacher_id = auth.uid());
-- Teachers can cancel their own pending assignments
create policy "Teachers can cancel their own assignments"
on public.assigned_assessments
for delete
to authenticated
using (teacher_id = auth.uid());
-- Students can see their own pending assignment (needed for the
-- post-login redirect check in Login.tsx)
create policy "Students can view their own assignment"
on public.assigned_assessments
for select
               to authenticated
               using (student_id = auth.uid());
-- Students can delete their own assignment once consumed, so it only
-- ever triggers the redirect once
create policy "Students can consume their own assignment"
on public.assigned_assessments
for delete
to authenticated
using (student_id = auth.uid());

-- RLS policies only govern row visibility once a role is already allowed
-- to touch the table at all — they don't grant that base access
-- themselves. Tables created via the dashboard's table editor get these
-- grants automatically; ones created via raw SQL/migrations (like this
-- one) need them added explicitly, or every request 403s before RLS even
-- gets evaluated.
grant select, insert, update, delete on public.assigned_assessments to authenticated;