-- 0003 granted anon INSERT/SELECT on storage.objects for story-uploads but
-- not DELETE — so deleteStory()'s storage.remove() call was being silently
-- denied by RLS (no matching policy = denied by default), leaving the
-- uploaded file orphaned even though the user_stories row was gone. Adding
-- the missing policy, same PoC-permissive stance as the other two.
create policy "Allow anon delete on story-uploads"
on storage.objects for delete
to anon
using (bucket_id = 'story-uploads');
