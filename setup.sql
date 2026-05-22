-- ============================================================
-- Recovery Lab -- Supabase Setup
-- Run this in the Supabase SQL Editor (supabase.com dashboard)
-- ============================================================

-- 1. Create the videos metadata table
create table if not exists public.videos (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  section text not null,
  file_path text not null,
  url text not null,
  created_at timestamp with time zone default now()
);

-- 2. Enable Row Level Security
alter table public.videos enable row level security;

-- 3. Allow anyone to read videos (public site)
create policy "Public read access"
  on public.videos for select
  using (true);

-- 4. Allow inserts (protected by admin PIN on frontend)
create policy "Allow inserts"
  on public.videos for insert
  with check (true);

-- 5. Allow deletes (protected by admin PIN on frontend)
create policy "Allow deletes"
  on public.videos for delete
  using (true);

-- ============================================================
-- STORAGE POLICIES
-- After running the SQL above, go to Storage in the dashboard,
-- create a bucket called "videos" with Public access enabled,
-- then come back here and run the lines below.
-- ============================================================

-- 6. Allow public reads from the videos bucket
create policy "Public read videos bucket"
  on storage.objects for select
  using (bucket_id = 'videos');

-- 7. Allow uploads to the videos bucket
create policy "Allow uploads to videos bucket"
  on storage.objects for insert
  with check (bucket_id = 'videos');

-- 8. Allow deletions from the videos bucket
create policy "Allow deletes from videos bucket"
  on storage.objects for delete
  using (bucket_id = 'videos');
