# DEPLOYMENT CHECKLIST

## CI/CD
- [ ] Web + Mobile icin ayri pipeline joblari var
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/.github/workflows/ci.yml:1`
- [ ] Build, test, security scan, deploy ve post-deploy smoke test zinciri tamam
- [ ] Secrets only CI secret store uzerinden geliyor

## Mobile Release Readiness
- [ ] `ios.bundleIdentifier` tanimli
- [ ] `android.package` tanimli
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/mobile/app.json:11`
- [ ] `eas.json` veya fastlane konfigurasyonu var
- [ ] Signing/provisioning sureci otomatik

## Environment
- [ ] dev/staging/prod ortamlari ayri
- [ ] Staging URL + data isolation mevcut
- [ ] Production env validation fail-fast
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/supabase.ts:11`

## Quality Gates
- [x] Type check pass
- [x] Unit tests pass
- [x] Basic E2E pass
- [ ] Coverage threshold enforced
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/vitest.config.ts:12`
- [ ] Lint gate CI'da zorunlu

## Release Governance
- [ ] SemVer release politikasi var
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/package.json:4`
- [ ] Changelog tutuluyor
- [ ] Rollback runbook hazir
- [ ] Release checklist tamamlandi

## Store Assets
- [ ] App Store metadata tamam
- [ ] Play Store metadata tamam
- [ ] Screenshot/preview asset seti hazir
- [ ] Privacy Policy/Terms URL store listinge ekli

## Sonuc
- Deployment checklisti mevcut durumda **PASS degil**.
