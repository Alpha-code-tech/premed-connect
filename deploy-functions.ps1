# PreMed Connect — Deploy Edge Functions
# Run this script to deploy both edge functions to Supabase.
#
# Prerequisites:
#   1. Get your personal access token from:
#      https://supabase.com/dashboard/account/tokens
#   2. Run this script:
#      .\deploy-functions.ps1 -Token "your-access-token"

param(
  [Parameter(Mandatory=$true)]
  [string]$Token
)

$env:SUPABASE_ACCESS_TOKEN = $Token
$ProjectRef = "tuucbxdaiclbyzrzhava"

Write-Host "Linking project..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectRef

Write-Host "`nDeploying create-user function..." -ForegroundColor Cyan
npx supabase functions deploy create-user --project-ref $ProjectRef

Write-Host "`nDeploying delete-user function..." -ForegroundColor Cyan
npx supabase functions deploy delete-user --project-ref $ProjectRef

Write-Host "`n✓ Done! Functions deployed." -ForegroundColor Green
Write-Host "  create-user: https://${ProjectRef}.supabase.co/functions/v1/create-user"
Write-Host "  delete-user: https://${ProjectRef}.supabase.co/functions/v1/delete-user"
