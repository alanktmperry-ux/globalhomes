
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-videos', 'property-videos', true, 209715200, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view property videos"
on storage.objects for select
using (bucket_id = 'property-videos');

create policy "Agents can upload property videos to own folder"
on storage.objects for insert
with check (bucket_id = 'property-videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Agents can update own property videos"
on storage.objects for update
using (bucket_id = 'property-videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Agents can delete own property videos"
on storage.objects for delete
using (bucket_id = 'property-videos' and auth.uid()::text = (storage.foldername(name))[1]);
