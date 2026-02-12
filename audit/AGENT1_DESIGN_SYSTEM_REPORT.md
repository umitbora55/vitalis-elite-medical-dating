# AGENT 1: DESIGN SYSTEM & TUTARLILIK ANALİSTİ RAPORU

## ÖZET
- Toplam sorun: 10
- Kritik: 0
- Major: 6
- Minor: 4

## KRİTİK SORUNLAR
1. Kritik seviyede (kullanılabilirliği doğrudan kıran) design-system tutarsızlığı tespit edilmedi.

## MAJOR SORUNLAR
1. TUTARSIZLIK: Katmanlama (`z-index`) ad-hoc değerlerle yönetiliyor, tek bir ölçek yok.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1076`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1092`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/FilterView.tsx:33`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileDetailView.tsx:369`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/CommunityGuidelines.tsx:25`
MEVCUT: `z-[45]` vs `z-[60]` vs `z-[70]` vs `z-[100]` vs `z-[150]`
ÖNERİ: Modal/overlay/toast/header için sabit katman token seti tanımlanmalı (ör. `layer.header`, `layer.modal`, `layer.toast`).
GÖRSEL TARİF: Ekran üst üste bindikçe bazı overlay ve toast katmanları beklenmedik şekilde birbirini kapatabilir.

2. TUTARSIZLIK: Tipografide çok küçük ve dağınık boyutlar var; aynı hiyerarşide farklı ölçek kullanılıyor.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/chat/ChatHeader.tsx:84`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:207`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:173`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LandingView.tsx:64`
MEVCUT: `text-[8px]` vs `text-[9px]` vs `text-[10px]` vs `text-xs`
ÖNERİ: Mikro metinler için tek bir alt ölçek (`10px` veya `11px`) belirlenmeli.
GÖRSEL TARİF: Aynı ekranda badge/meta metinleri farklı büyüklükte görünüp kalite algısını düşürüyor.

3. TUTARSIZLIK: Birincil CTA buton görsel dili ekranlar arasında farklılaşıyor.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LandingView.tsx:76`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/FilterView.tsx:163`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MatchOverlay.tsx:137`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:260`
MEVCUT: `rounded-xl + gold gradient` vs `rounded-full + white solid` vs `rounded-full + pink gradient`
ÖNERİ: Ana CTA varyantları (primary/secondary/danger) bileşen seviyesinde standartlaştırılmalı.
GÖRSEL TARİF: Kullanıcı farklı ekranlarda hangi butonun “ana aksiyon” olduğunu tekrar öğrenmek zorunda kalıyor.

4. TUTARSIZLIK: Input stili kopyalanmış ve küçük farklarla çoğalmış; tek bir input primitive yok.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:52`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:268`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MatchesView.tsx:111`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/chat/ChatInput.tsx:92`
MEVCUT: Benzer ama farklı padding, focus, border kombinasyonları
ÖNERİ: Ortak `Input` ve `Select` bileşeni ile tokenize form sistemi kurulmalı.
GÖRSEL TARİF: Formdan forma geçince alan davranışı ve görsel ritim değişiyor.

5. TUTARSIZLIK: Radius ve elevation ölçekleri aynı UI rolünde farklı kullanılıyor.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:66`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MatchesView.tsx:162`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/Tooltip.tsx:13`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LandingView.tsx:21`
MEVCUT: `rounded-3xl` vs `rounded-2xl` vs `rounded-xl` + çok farklı gölge yoğunlukları
ÖNERİ: Card/overlay/button için radius ve shadow skalası ayrı token setiyle sınırlandırılmalı.
GÖRSEL TARİF: Bazı kartlar “farklı ürün” hissi veriyor; bütünlük kaybı oluşuyor.

6. TUTARSIZLIK: Tema token kapsamı sınırlı, çok sayıda renk doğrudan utility ile dağınık kullanılıyor.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/tailwind.config.cjs:22`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:81`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:834`
MEVCUT: Config’de özel token sadece `gold` ve `slate.850`, ekranlarda `rose/violet/purple/pink` doğrudan kullanılıyor.
ÖNERİ: Semantik renk tokenları (`accent-success`, `accent-warning`, `plan-tier-*`) tanımlanmalı.
GÖRSEL TARİF: Premium ve boost yüzeylerinde farklı renk dilleri bir arada, marka paleti dağınık görünüyor.

## MINOR SORUNLAR
1. TUTARSIZLIK: İkon stili (fill vs outline) aynı işlev gruplarında karışık.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/AppHeader.tsx:47`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LikesYouView.tsx:19`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/NotificationsView.tsx:42`
MEVCUT: `Heart` bazen outline, bazen fill
ÖNERİ: Navigation/action ikonlarında tek stil kuralı belirlenmeli.
GÖRSEL TARİF: Üst bar ve kartlarda ikon dili değiştiği için görsel dil kesintili algılanıyor.

2. TUTARSIZLIK: “Verified” badge metni ve görseli ekranlar arasında farklılaştırılmış.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:145`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileDetailView.tsx:153`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:242`
MEVCUT: `Verified`, `Verified Healthcare Professional`, `Verified Healthcare Pro`
ÖNERİ: Tek badge kopyası ve tek icon+label standardı kullanılmalı.
GÖRSEL TARİF: Aynı doğrulama durumunun farklı etiketlerle gösterilmesi güven sinyalini zayıflatıyor.

3. TUTARSIZLIK: Magic spacing değerleri sistem dışı kullanılıyor.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:848`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/CommunityGuidelines.tsx:118`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:745`
MEVCUT: `top-[10.5rem]`, `left-[19px]`, `top-[88px]`
ÖNERİ: Bu konumlar standard spacing basamakları veya layout container ile çözümlenmeli.
GÖRSEL TARİF: Kırılım değişince rozet/çizgi/üst uyarı hizası kayıyor.

4. TUTARSIZLIK: Ürün dili TR/EN karışık.
DOSYALAR: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:185`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:38`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/OnboardingView.tsx:13`
MEVCUT: Aynı akışta Türkçe ve İngilizce başlık/CTA bir arada
ÖNERİ: Tek locale stratejisi ile metinler bir i18n kaynağına alınmalı.
GÖRSEL TARİF: Kullanıcı onboarding/login/premium geçişlerinde dil kırılması görüyor.

## GENEL DEĞERLENDİRME
Güçlü yön: Görsel kalite hedefi net, özellikle dark-surface + premium hissi tutarlı bir temel veriyor. 
Zayıf yön: Token katmanı sınırlı olduğu için sınıf düzeyinde ad-hoc kararlar birikmiş; bu da bileşenler arası tutarlılığı ve ölçeklenebilirliği düşürüyor.

GÖRSEL KANIT DOSYALARI:
- `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/audit/screenshots/01-landing.png`
- `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/audit/screenshots/03-home.png`
