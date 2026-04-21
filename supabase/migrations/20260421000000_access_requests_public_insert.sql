-- Allow unauthenticated users to submit access requests directly.
-- The edge function approach was removed; submission now goes through
-- the Supabase client with the anon key. Duplicate checking is handled
-- in the frontend before the insert.
CREATE POLICY "access_requests_insert_public" ON access_requests
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');
