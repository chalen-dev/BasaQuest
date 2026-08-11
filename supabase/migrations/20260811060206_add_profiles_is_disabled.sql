alter table public.profiles
    add column is_disabled boolean not null default false;

comment on column public.profiles.is_disabled is 'True if a teacher has disabled this pupil''s account. toggle-student-status also sets a matching Auth-layer ban via admin.updateUserById (ban_duration) — that''s what actually blocks sign-in; this column mirrors that state for the UI and for a defense-in-depth check in impersonate-student. Always false for teacher accounts.';