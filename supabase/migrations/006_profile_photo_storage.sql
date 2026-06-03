insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 1048576, array['image/*'])
on conflict (id) do update
set public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/*'];

drop policy if exists "profile photos read" on storage.objects;
create policy "profile photos read"
on storage.objects for select
using (bucket_id = 'profile-photos');

drop policy if exists "profile photos insert own folder" on storage.objects;
create policy "profile photos insert own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile photos update own folder" on storage.objects;
create policy "profile photos update own folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

