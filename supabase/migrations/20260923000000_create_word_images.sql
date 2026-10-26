
-- Pictures for the Reading Coach's word notebook (and, later, the
-- foundational-words practice). One row per (language, word); the English
-- and Filipino rows of the same concept ("mango" / "mangga") can point at
-- the same image file, since a picture of a mango is language-neutral.
--
-- WORD KEY: the same normalization pronounce-word's slugify() uses
-- (lowercase, punctuation and apostrophes stripped), so "mangga," from a
-- tokenized passage matches the stored "mangga".
--
-- PUBLIC BUCKET, DELIBERATELY: same reasoning as pronunciation-audio — a
-- generic word picture carries no student data, so the browser can load
-- the public URL directly. Only admins write (upload, replace, delete);
-- the import script uses the service-role client, which bypasses RLS.
create table public.word_images (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('en', 'fil')),
  word text not null,
  image_path text not null,
  source text not null check (source in ('arasaac', 'openmoji', 'wikimedia', 'upload')),
  credit text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (language, word)
);

alter table public.word_images enable row level security;

create policy "Signed-in users can view word images"
  on public.word_images for select
  to authenticated
  using (true);

create policy "Admins can insert word images"
  on public.word_images for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update word images"
  on public.word_images for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete word images"
  on public.word_images for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

grant select, insert, update, delete on table public.word_images to authenticated;
-- The import script (scripts/word-images) writes through the service role.
grant select, insert, update, delete on table public.word_images to service_role;

insert into storage.buckets (id, name, public)
values ('word-images', 'word-images', true)
    on conflict (id) do nothing;

-- Storage's remove/replace calls look the object up first, so admins need
-- to be able to see rows in storage.objects too (the bucket being public
-- only covers fetching the file by URL, not listing it through the API).
create policy "Admins can view word image files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'word-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can upload word images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'word-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can replace word images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'word-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete word images files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'word-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
