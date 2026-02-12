# DESIGN_SYSTEM_GAPS

## 1) Layering Token Eksikleri
- Sorun: Z-index değerleri ad-hoc.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1076`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1092`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/CommunityGuidelines.tsx:25`
- Gap: `layer` token seti yok (`header`, `overlay`, `modal`, `toast`).

## 2) Color Token Kapsamı Dar
- Sorun: Theme config sadece sınırlı özel token tanımlıyor.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/tailwind.config.cjs:22`
- Gap: Semantik renk tokenları yok (`success/warning/danger/accent-tier`).

## 3) Typography Scale Standart Değil
- Sorun: 8-10px mikro metin yoğun ve dağınık.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/chat/ChatHeader.tsx:84`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:207`
- Gap: Meta/label/caption için onaylı tipografi basamakları yok.

## 4) Radius ve Shadow Scale Dağınık
- Sorun: Benzer UI rolleri farklı radius/elevation kullanıyor.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:66`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MatchesView.tsx:162`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LandingView.tsx:21`
- Gap: `radius` ve `elevation` token katmanı yok.

## 5) Motion Token Eksikleri
- Sorun: Kullanılan animasyonların bir bölümü tanımsız.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LandingView.tsx:31`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/OnboardingView.tsx:71`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/Tooltip.tsx:12`
- Gap: `tailwind.config.cjs` içinde sadece `fade-in` var (`/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/tailwind.config.cjs:33`).

## 6) Reusable Primitive Eksikleri
- Sorun: Input/switch/modal shell pattern’leri tekrar ediyor.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:52`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/NearbyView.tsx:74`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1221`
- Gap: `Input`, `ToggleSwitch`, `ModalShell`, `PrimaryButton` primitive setleri eksik.

## 7) Copy System Eksikleri
- Sorun: TR/EN metin karışık.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:38`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:185`
- Gap: Merkezi i18n / copy catalog yapısı yok.

## 8) Accessibility Token/Pattern Eksikleri
- Sorun: Focus, dialog, aria naming standardı component seviyesinde tanımlı değil.
- Kanıt: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:87`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:44`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:985`
- Gap: A11Y-ready UI primitive seti yok.

## Önerilen Token Başlıkları (mevcut tasarım dilini koruyarak)
- `layer.*`
- `radius.*`
- `elevation.*`
- `motion.duration.*`, `motion.easing.*`, `motion.keyframes.*`
- `color.semantic.*` (existing palette üzerine)
- `typography.caption/meta/label`
- `a11y.focusRing`, `a11y.dialog`
