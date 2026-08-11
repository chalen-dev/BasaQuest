-- File: supabase/migrations/20260809092632_create_profiles_table.sql
create table public.profiles(
                                id uuid primary key references auth.users(id) on delete cascade,
                                username text unique,
                                full_name text,
                                role text not null default 'teacher',
                                avatar_url text,
                                grade_level integer,
                                section text,
                                teacher_id uuid references public.profiles(id) on delete set null,
                                is_non_reader boolean not null default false,
                                created_at timestamptz default now(),
                                updated_at timestamptz default now()
);

comment on column public.profiles.grade_level is 'Pupil grade level, e.g. 3 for "Baitang 3". Null for teacher/guro accounts.';
comment on column public.profiles.section is 'Pupil class section name, e.g. "Sampaguita". Null for teacher/guro accounts.';
comment on column public.profiles.teacher_id is 'The teacher account this pupil belongs to. Null for teacher accounts themselves, and for pupils not yet linked to a roster. Will power the future "log in as this pupil" list on the teacher''s dashboard — not built yet.';
comment on column public.profiles.is_non_reader is 'True if this pupil has been flagged as a non-reader (cannot yet decode text) — routes the reading check-in to the pre-reading path (letter sounds / syllable blending / CVC words) instead of a passage read-aloud. That pre-reading path is not built yet either; for now this just short-circuits passage generation.';

create index if not exists profiles_teacher_id_idx on public.profiles (teacher_id);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
                                    using (true);

create policy "Users can update their own profile"
  on public.profiles for update
                                    using (auth.uid() = id);

create policy "Teachers can update their own pupils' profiles"
  on public.profiles for update
                                    using (auth.uid() = teacher_id)
                         with check (auth.uid() = teacher_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create function public.handle_new_user()
    returns trigger as $$
begin
insert into public.profiles (id, username)
values (new.id, new.raw_user_meta_data->>'username');
return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

grant all on table public.profiles to service_role;
grant select, update on table public.profiles to anon, authenticated;