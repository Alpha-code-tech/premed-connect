@echo off
echo Deploying Supabase Edge Functions...
echo.
echo Step 1: Login to Supabase CLI
echo Get your access token from: https://supabase.com/dashboard/account/tokens
echo Then run: npx supabase login --token YOUR_ACCESS_TOKEN
echo.
echo Step 2: Link project
npx supabase link --project-ref tuucbxdaiclbyzrzhava
echo.
echo Step 3: Deploy functions
npx supabase functions deploy create-user --project-ref tuucbxdaiclbyzrzhava
npx supabase functions deploy delete-user --project-ref tuucbxdaiclbyzrzhava
echo.
echo Done! Functions deployed to:
echo https://tuucbxdaiclbyzrzhava.supabase.co/functions/v1/create-user
echo https://tuucbxdaiclbyzrzhava.supabase.co/functions/v1/delete-user
