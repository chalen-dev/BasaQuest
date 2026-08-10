

alter table public.profiles
    add column if not exists teacher_id uuid references public.profiles(id) on delete set null,
    add column if not exists is_non_reader boolean not null default false;

comment on column public.profiles.teacher_id is 'The teacher account this pupil belongs to. Null for teacher accounts themselves, and for pupils not yet linked to a roster. Will power the future "log in as this pupil" list on the teacher''s dashboard — not built yet.';
comment on column public.profiles.is_non_reader is 'True if this pupil has been flagged as a non-reader (cannot yet decode text) — routes the reading check-in to the pre-reading path (letter sounds / syllable blending / CVC words) instead of a passage read-aloud. That pre-reading path is not built yet either; for now this just short-circuits passage generation.';

create index if not exists profiles_teacher_id_idx on public.profiles (teacher_id);