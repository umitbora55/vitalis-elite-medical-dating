# Admin Moderation Deploy Runbook

## Required Environment Variables
- `SUPABASE_ACCESS_TOKEN`
- `PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RETENTION_CRON_SECRET`

## Deploy Commands
```bash
cd "/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating-admin-moderation"
export SUPABASE_ACCESS_TOKEN="<set-in-shell>"
export PROJECT_REF="<set-in-shell>"
export SUPABASE_DB_PASSWORD="<set-in-shell>"
supabase login --token "$SUPABASE_ACCESS_TOKEN"
./scripts/supabase_deploy_admin.sh
```

## Functions Included in Deployment
- `admin-verification-queue`
- `admin-verification-case`
- `admin-claim-verification-request`
- `admin-get-verification-doc-url`
- `admin-decide-verification`
- `admin-settings`
- `admin-audit-logs`
- `scheduled-retention-cleanup`

## Post-Deploy Smoke Checklist
- [ ] `/admin` route rejects non-`moderator+` users.
- [ ] `/admin` route requires MFA `aal2` for moderator/admin/superadmin accounts.
- [ ] Verification queue loads pending records.
- [ ] `Claim` updates request to `UNDER_REVIEW` and sets `claimed_by`.
- [ ] `Approve`, `Reject`, and `Need More Info` decisions update both request and profile status correctly.
- [ ] Document signed URL opens in admin case view and expires in ~60 seconds.
- [ ] `admin_audit_logs` receives claim, document view, decision, and settings update events.
- [ ] Retention cleanup guidance is configured: schedule `scheduled-retention-cleanup` via cron (daily recommended), pass `x-retention-secret` header matching `RETENTION_CRON_SECRET`.

## Required External/Human Steps (If Credentials Are Missing)
1. Set `SUPABASE_ACCESS_TOKEN`, `PROJECT_REF`, and `SUPABASE_DB_PASSWORD` in shell/CI.
2. Run `supabase login --token "$SUPABASE_ACCESS_TOKEN"`.
3. Run `./scripts/supabase_deploy_admin.sh`.
4. In Supabase Dashboard, verify storage bucket `verification-docs` is private.
5. Execute the smoke checklist above and attach results under `release/evidence/admin/`.
