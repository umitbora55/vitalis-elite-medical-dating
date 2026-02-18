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

## Automation
- Daily retention cleanup is automated via `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating-admin-moderation/.github/workflows/retention-cleanup.yml`.
- Required GitHub Actions secrets:
  - `SUPABASE_PROJECT_REF`
  - `RETENTION_SECRET`

## Functions Included in Deployment
- `admin-verification-queue`
- `admin-verification-case`
- `admin-claim-verification-request`
- `admin-get-verification-doc-url`
- `admin-decide-verification`
- `admin-settings`
- `admin-audit-logs`
- `scheduled-retention-cleanup`

## Bucket Privacy and Policy Checklist (`verification-docs`)
- [ ] Bucket exists with name/id `verification-docs`.
- [ ] Bucket visibility is `private` (not public).
- [ ] No public read policy exists on `storage.objects` for `verification-docs`.
- [ ] Upload policy is scoped to owner path:
  - `auth.uid()::text = (storage.foldername(name))[1]`.
- [ ] Read policy for moderators exists and uses moderation RBAC helper:
  - `public.auth_has_moderation_access()`.
- [ ] Delete policy for regular users is scoped to own path only.
- [ ] Confirm app client never uses `service_role` key.

## SQL Snippet: Assign Moderator Role
```sql
update public.profiles
set user_role = 'moderator'
where id = '<USER_UUID>';
```

## MFA / AAL2 Verification Steps
1. Sign in with a moderator/admin account and enroll TOTP MFA in Supabase Auth UI.
2. Complete a fresh login with MFA challenge.
3. Verify JWT contains `aal: "aal2"` (Supabase session access token decode).
4. Open `/admin` and confirm access is granted.
5. Disable/skip MFA and confirm `/admin` shows blocked state (`MFA aal2 required`).

## Canary Smoke Command
```bash
cd "/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating-admin-moderation"
export SUPABASE_PROJECT_REF="<set>"
export NON_ADMIN_ACCESS_TOKEN="<set>"
export MODERATOR_ACCESS_TOKEN="<set>"
export VERIFICATION_REQUEST_ID="<set>"
./scripts/admin_canary_smoke.sh
```

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
4. Assign at least one moderator role via SQL snippet above.
5. Execute canary smoke and post-deploy checklist, then attach results under `release/evidence/admin/`.
