-- Profile pictures. profiles.avatar_url already exists (the column was made with
-- the table); this adds the bucket the pictures live in.
--
-- PUBLIC BUCKET: a profile picture is shown in the top bar, so the browser loads
-- the public URL directly. Each person's files live in a folder named after their
-- own user id ("<uid>/<file>"), and the policies below only let you write inside
-- your own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
    on conflict (id) do nothing;

-- Storage's replace/remove calls look the object up first, so you need to be
-- able to see your own rows in storage.objects too.
create policy "Users can view their own avatar files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
