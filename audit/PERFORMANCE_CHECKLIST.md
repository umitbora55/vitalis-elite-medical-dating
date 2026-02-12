# PERFORMANCE CHECKLIST

## Build & Bundle
- [ ] Main bundle < 300 kB gzip hedefi
  - Kanit: `vite build` ciktisi `index-CmGAfcEd.js` 562.79 kB
- [ ] Route-level code splitting tamamlandi
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/vite.config.ts:5`
- [ ] Mock data production bundle'dan temizlendi
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/constants.ts:248`

## Rendering & UX
- [ ] Buyuk listeler virtualized
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LikesYouView.tsx:36`
- [ ] Tum medya lazy-load / responsive source ile sunuluyor
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LikesYouView.tsx:46`
- [ ] Agir componentlerde memoizasyon profilleme ile dogrulandi
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:69`

## Network & Data
- [ ] API caching/deduplication stratejisi eklendi
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/subscriptionService.ts:11`
- [ ] Startup critical fetch path optimize edildi
- [ ] Timeout/retry/backoff politikalari standardize edildi

## Runtime Monitoring
- [ ] Web vitals toplaniyor (LCP, INP, CLS, TTFB)
- [ ] Sentry/APM ile transaction tracing acik
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/sentry.ts:7`
- [ ] Startup target (<3s) olculuyor ve alert tanimli

## Offline
- [ ] Offline cache stratejisi var (SW cache + fallback)
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/public/firebase-messaging-sw.js:15`

## Sonuc
- Mevcut durumda performans checklisti **PASS degil**.
