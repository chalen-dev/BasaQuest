
alter table public.profiles
    add column if not exists grade_level integer,
    add column if not exists section text;

comment on column public.profiles.grade_level is 'Pupil grade level, e.g. 3 for "Baitang 3". Null for teacher/guro accounts.';
comment on column public.profiles.section is 'Pupil class section name, e.g. "Sampaguita". Null for teacher/guro accounts.';