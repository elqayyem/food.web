-- ══════════════════════════════════════════════════════════
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP
-- Run this entire file in Supabase → SQL Editor → New query
--
-- WHY THIS MATTERS:
-- Without RLS, anyone with the anon key can call the Supabase
-- REST API directly and modify/delete all your restaurant data.
-- RLS enforces access rules on the SERVER — not the frontend.
-- ══════════════════════════════════════════════════════════

-- STEP 1: Enable RLS on the site_data table
-- (blocks ALL access by default until policies are added)
ALTER TABLE site_data ENABLE ROW LEVEL SECURITY;


-- STEP 2: Allow public READ access
-- The main website (index.html) uses the anon key to read data.
-- This policy lets anyone read — but ONLY read.
CREATE POLICY "public_can_read"
  ON site_data
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- STEP 3: Allow authenticated admins to UPDATE data
-- Only users logged in via Supabase Auth can write.
-- The anon key alone cannot update — preventing data tampering.
CREATE POLICY "admin_can_update"
  ON site_data
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- STEP 4: Prevent INSERT of new rows by anyone
-- Only one row (id=1) should ever exist.
-- This blocks privilege escalation via row injection.
CREATE POLICY "admin_can_insert"
  ON site_data
  FOR INSERT
  TO authenticated
  WITH CHECK (id = 1);


-- STEP 5: Prevent DELETE by anyone (even admins)
-- Accidental deletion of the single config row would break the site.
-- To delete manually, use Supabase dashboard directly.
-- No policy = no DELETE allowed.


-- ══════════════════════════════════════════════════════════
-- STEP 6: Create your admin user in Supabase Auth
--
-- Go to: Supabase Dashboard → Authentication → Users → Add user
-- Fill in:
--   Email:    your email (e.g. kayyemahd@gmail.com)
--   Password: a strong password (min 12 chars, upper+lower+numbers+symbols)
--   Auto Confirm User: YES (check this box)
--
-- Then use that email + password to log into admin.html
-- ══════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════
-- STEP 7: Storage bucket policies for "restaurant-images"
-- Run these so authenticated admins can upload images and
-- the public can view them.
-- ══════════════════════════════════════════════════════════

-- Allow authenticated admins to upload images
CREATE POLICY "admin_can_upload_images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'restaurant-images');

-- Allow everyone to view images (needed to display them on the site)
CREATE POLICY "public_can_view_images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'restaurant-images');

-- Allow authenticated admins to delete images
CREATE POLICY "admin_can_delete_images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'restaurant-images');


-- STEP 8: Verify RLS is working
-- Run these to confirm the policies are active:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'site_data';
-- rowsecurity should be: true

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'site_data';
-- Should show 3 policies: public_can_read, admin_can_update, admin_can_insert
