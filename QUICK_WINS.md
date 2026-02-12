# Quick Wins (30 Dakika)

Bu liste, en hızlı etki üreten ve genelde 30 dakika civarında düzeltilebilecek maddeleri içerir.

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/vitest.config.ts:10] Vitest exclude pattern `mobile/node_modules`'u dışlamıyor, testler fail oluyor.
ÖNCELİK: P0
ÖNERİ: `exclude: ['e2e/**', '**/node_modules/**', 'mobile/**']` veya `include: ['**/*.{test,spec}.{ts,tsx}']` gibi daralt.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:950] “DEV: Skip to App” üretimde açık.
ÖNCELİK: P0
ÖNERİ: `import.meta.env.DEV` ile koşullandır veya kaldır.

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:501] “[DEV: Simulate Admin Approval]” üretimde açık.
ÖNCELİK: P0
ÖNERİ: `import.meta.env.DEV` ile koşullandır veya kaldır.

4. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:58] Search highlight regex crash riski.
ÖNCELİK: P0
ÖNERİ: `highlight` escape et ve regex flag kullanımını düzelt (regex injection + invalid pattern crash'ini kapat).

5. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/index.html:55] `index.css` linki var ama dosya yok (build uyarısı).
ÖNCELİK: P2
ÖNERİ: Link'i kaldır veya boş minimal `index.css` oluştur.

6. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:73] Icon-only butonlar (örn Info) erişilebilir değil (aria-label yok).
ÖNCELİK: P2
ÖNERİ: `aria-label` ekle ve gerekiyorsa `title` ile destekle.

7. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileDetailView.tsx:25] Block confirm modal kapanmıyor.
ÖNCELİK: P1
ÖNERİ: `handleBlockConfirm` içinde `setShowBlockConfirm(false)` çağır.

