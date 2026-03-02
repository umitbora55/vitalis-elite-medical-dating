# Vitalis — Elite Medical Dating Platform
### Proje Kapsamlı Dökümanı

---

## İçindekiler

1. [Proje Vizyonu](#1-proje-vizyonu)
2. [Teknoloji Yığını](#2-teknoloji-yığını)
3. [Mimari Yapı](#3-mimari-yapı)
4. [Temel Özellikler](#4-temel-özellikler)
5. [Veritabanı Şeması](#5-veritabanı-şeması)
6. [Ekranlar ve Akışlar](#6-ekranlar-ve-akışlar)
7. [Servis Katmanı](#7-servis-katmanı)
8. [State Management](#8-state-management)
9. [Güvenlik ve Gizlilik](#9-güvenlik-ve-gizlilik)
10. [Admin Paneli](#10-admin-paneli)
11. [Monetizasyon](#11-monetizasyon)
12. [CI/CD ve Deployment](#12-cicd-ve-deployment)
13. [İstatistikler](#13-proje-istatistikleri)

---

## 1. Proje Vizyonu

**Vitalis**, Türkiye'deki sağlık çalışanlarına özel tasarlanmış, **güvenlik öncelikli ve etik değerlere dayalı** bir premium dating platformudur.

### Neden Vitalis?

Sağlık çalışanları (doktorlar, hemşireler, eczacılar, fizyoterapistler vb.) standart dating uygulamalarına uyum sağlamakta güçlük çeker:

- **Düzensiz çalışma saatleri** — Vardiya, nöbet, gece mesaileri
- **Yoğun iş yükü** — "Infinite swipe" formatı yorucu ve verimsiz
- **Güvenlik kaygıları** — Kimlik doğrulaması yapılmamış kişilerle karşılaşma riski
- **Ortak mesleki referanslar** — Diğer sağlık çalışanlarıyla paylaşılan değerler, stres deneyimleri, mesleki etik

Vitalis bu sorunları **doğrudan ele alarak** tasarlanmıştır:

| Sorun | Vitalis Çözümü |
|-------|---------------|
| Kimlik belirsizliği | Sağlık kurumu email + belge + liveness doğrulaması |
| Sonsuz kaydırma yorgunluğu | Günlük 7 profil (Daily Slate) sınırı |
| "Neden bu kişi?" şüphesi | 11 faktörlü şeffaf açıklama sistemi (DSA Art.27) |
| Vardiya uyumsuzluğu | Nöbet saati bazlı randevu planlama |
| Gizlilik endişeleri | Tüm güvenlik ayarları varsayılan AÇIK |

### Temel Felsefe

> **"Sattığımız şey hizmet, erişim değil."**

- Eşleşme, mesajlaşma, randevu planlama — **her zaman ücretsiz**
- Güvenlik özellikleri — **her zaman ücretsiz**
- Ücretli olan: Kolaylık, Gizlilik, Koçluk, Concierge hizmetleri

---

## 2. Teknoloji Yığını

### Frontend

| Kategori | Teknoloji | Versiyon |
|----------|-----------|---------|
| Framework | React | 19.2.4 |
| Dil | TypeScript (strict) | ~5.8.2 |
| Build Aracı | Vite | 6.2.0 |
| State Yönetimi | Zustand | 5.0.11 |
| Form Yönetimi | React Hook Form | 7.71.1 |
| Doğrulama | Zod | 4.3.6 |
| Stil | Tailwind CSS | 3.4.17 |
| İkonlar | Lucide React | 0.563.0 |
| Animasyon | Framer Motion | 12.34.1 |

### Backend & Altyapı

| Bileşen | Teknoloji |
|---------|-----------|
| Backend-as-a-Service | Supabase |
| Veritabanı | PostgreSQL (Supabase hosted) |
| Kimlik Doğrulama | Supabase Auth (JWT) |
| Dosya Depolama | Supabase Storage |
| Gerçek Zamanlı | Supabase Realtime (WebSocket) |
| Satır Düzeyinde Güvenlik | PostgreSQL RLS |
| Push Bildirimleri | Firebase Cloud Messaging (FCM) |

### Üçüncü Taraf Entegrasyonlar

| Servis | Kullanım Amacı |
|--------|---------------|
| Stripe | Premium abonelik yönetimi |
| Google Gemini AI | Profil koçluğu, AI bias denetimi |
| TensorFlow Lite | On-device yüz analizi (liveness check) |
| Sentry | Hata izleme ve performans monitoring |
| Mixpanel | Kullanıcı davranış analitiği |
| PostHog | Ürün analitiği |

---

## 3. Mimari Yapı

```
vitalis-medical-dating/
│
├── src/
│   ├── components/          # 90+ React bileşeni
│   │   ├── admin/           # Admin paneli bileşenleri
│   │   ├── security/        # Güvenlik ve gizlilik bileşenleri
│   │   ├── [Auth]           # Giriş, kayıt, doğrulama ekranları
│   │   ├── [Discovery]      # Profil keşfi, filtreler
│   │   ├── [Matching]       # Profil kartları, eşleşmeler
│   │   ├── [Chat]           # Mesajlaşma
│   │   ├── [Dating]         # Randevu davetleri, planlar
│   │   └── [Community]      # Etkinlikler, kulüpler
│   │
│   ├── services/            # 40+ servis modülü
│   │   ├── authService.ts
│   │   ├── verificationService.ts
│   │   ├── healthcareVerificationService.ts
│   │   ├── slateService.ts
│   │   ├── explanationService.ts
│   │   ├── dateInvitationService.ts
│   │   ├── dateSafetyService.ts
│   │   ├── contentModerationService.ts
│   │   ├── profileRiskService.ts
│   │   ├── subscriptionService.ts
│   │   ├── adminModerationService.ts
│   │   └── [30+ diğer servis]
│   │
│   ├── stores/              # Zustand store'ları
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── discoveryStore.ts
│   │   ├── matchStore.ts
│   │   ├── slateStore.ts
│   │   ├── notificationStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types.ts             # 50+ global TypeScript tipi
│   ├── constants.ts         # Uygulama sabitleri
│   ├── App.tsx              # Ana router ve yaşam döngüsü
│   └── index.tsx            # React giriş noktası
│
└── supabase/
    └── migrations/          # 30+ SQL migration dosyası
```

### Veri Akışı

```
Kullanıcı Eylemi
     │
     ▼
React Component
     │
     ▼
Zustand Store ◄──── Gerçek Zamanlı (Supabase WebSocket)
     │
     ▼
Service Modülü
     │
     ▼
Supabase Client (supabase-js)
     │
     ├── PostgreSQL (RLS korumalı)
     ├── Supabase Auth
     └── Supabase Storage
```

---

## 4. Temel Özellikler

### Özellik 1: Kimlik ve Canlılık Doğrulaması

Vitalis'e kayıt olan her kullanıcı gerçek bir sağlık çalışanı olduğunu **çok katmanlı bir süreçle kanıtlar.**

**Doğrulama Aşamaları:**

```
1. Email Domain Kontrolü
   └── @hacettepe.edu.tr, @sbu.edu.tr, @medicana.com.tr vs.
       (40+ Türk sağlık kurumu domain'i katalogda)
       └── Bilinmeyen domain → domain_addition_requests tablosuna

2. İsim–Email Eşleşmesi
   └── Email prefix vs. gerçek ad-soyad (%75+ → otomatik onay)
       └── Düşük skor → manuel inceleme

3. Belge Yükleme
   └── Diploma, kurum kimlik kartı, SGK belgesi

4. Canlılık Kontrolü (Liveness Check)
   └── 4 challenge: göz kırpma, sağa dön, sola dön, gülümse
   └── Skor ≥ 0.75 → geçti
   └── Skor < 0.75 → 3 deneme → manuel inceleme

5. Yüz Embedding (Duplikat Hesap Tespiti)
   └── 1:1 selfie vs belge karşılaştırma
   └── 1:N tüm kayıtlı embeddings ile kıyaslama
```

**Önemli Notlar:**
- Yüz verisi KVKK kapsamında özel nitelikli veri — açık rıza ekranı zorunlu
- Doğrulama durumları: `UNVERIFIED` → `PENDING` → `VERIFIED / REJECTED`
- Reddedilen kullanıcılar **48 saatlik SLA** ile itiraz edebilir

---

### Özellik 2: "Neden Eşleştik?" Şeffaflık Sistemi

AB Dijital Hizmetler Yasası (DSA) Madde 27 uyumlu öneri sistemi şeffaflığı.

**11 Eşleşme Faktörü:**

| Faktör | Ağırlık | Örnek Açıklama |
|--------|---------|----------------|
| `interests` | %20 | "{N} ortak ilgi alanınız var" |
| `work_schedule` | %15 | "Çalışma saatleriniz uyumlu" |
| `location` | %15 | "Aynı şehirdesiniz" |
| `dating_intention` | %10 | "İkiniz de ciddi ilişki arıyor" |
| `profession` | %10 | "Aynı mesleki arka plana sahipsiniz" |
| `specialty` | %10 | "Benzer tıbbi alanda çalışıyorsunuz" |
| `career_stage` | %10 | "Kariyer yolculuğunuz benzer" |
| `values` | %10 | "Yaşam değerleriniz örtüşüyor" |
| `lifestyle` | %10 | "Yaşam tarzlarınız uyumlu" |
| `dealbreaker` | %10 | — |
| `institution_type` | %5 | "Aynı tür kurumda çalışıyorsunuz" |

**Anti-Creepy Filtresi:**
- Fiziksel özellikler (boy, kilo) açıklama olarak gösterilmez
- Hassas konum bilgisi ifşa edilmez
- Davranış kalıpları (kaç kez profil baktı) gizlenir

**Kullanıcı Kontrolü:**
- Her faktör için ağırlık ayarlanabilir (0.1× – 2.0×)
- "Bunun gibi daha fazla göster / daha az göster" geri bildirimi
- DSA opt-out: `personalized_recommendations = false` → yalnızca yaş/cinsiyet/konum filtresi

---

### Özellik 3: Günlük Öneri Sistemi (Daily Slate)

Sonsuz kaydırma yerine, **her gün yalnızca 7 özenle seçilmiş profil.**

**Slate Kompozisyonu:**

```
7 Profil / Gün
├── 3 × Yüksek Uyum (high_compatibility)
├── 2 × Keşif (exploration — farklı specialty/konum)
├── 1 × Sürpriz (serendipity — beklenmedik eşleşme)
└── 1 × Yeni Doğrulanmış (fresh_verified)
```

**Sıralama Algoritması (Date-Conversion-First):**

```
date_prob   = intention(30%) × distance(25%) × schedule(25%)
              × completeness(10%) × recency(10%)

response_prob = doğrulama durumu × hızlı yanıt geçmişi × son aktiflik

trust_score = doğrulama rozetleri × yüz eşleşme güveni

final_score = sigmoid(date × response × trust × freshness × 6 − 3)
```

- Karşılıklı ilgi (her iki taraf da beğendiyse): **×1.5 bonus**
- Popülarite bias önleme: Çok beğenilen profiller ceza puanı alır (exposure tracking)

**Bekleyen Eşleşme Kısıtlayıcısı:**

| Bekleyen Eşleşme | Günlük Öneri |
|:---:|:---:|
| 0–3 | 7 profil |
| 4–5 | 5 profil |
| 6–7 | 3 profil |
| 8+ | 0 (kilitli) |

**Tasarım İlkesi:** Kullanıcıları mevcut eşleşmelerini ilerletmeye yönlendiriyor; yeni eşleşme biriktirmeyi engelliyor.

---

### Özellik 4: Randevu Odaklı Akış Sistemi

**Eşleşme → Davet → Buluşma → Geri Bildirim** tam döngüsü.

**7 Randevu Tipi:**

| Tip | Süre | Sağlık Çalışanına Özel |
|-----|------|----------------------|
| Kahve | 30–45 dk | — |
| Yürüyüş | 45–60 dk | — |
| Akşam yemeği | 60–90 dk | — |
| **Nöbet Sonrası Kahve** | 20–30 dk | ✓ Sabah nöbet bitişi |
| **Mola Arası** | 15–20 dk | ✓ Çalışma arası |
| **Gece Nöbeti Öncesi** | 45–60 dk | ✓ Gece nöbeti öncesi |
| Özel | Esnek | — |

**48 Saatlik Davet Akışı:**

```
Eşleşme oluşur
    │
    ▼
Davet Gönderilir (expires_at = şimdi + 48 saat)
    │
    ├─ Kabul edilirse → Plan otomatik oluşturulur
    ├─ Reddedilirse → Bildirim gönderilir
    └─ 48 saat dolarse → Davet sona erer
```

**Güvenlik Özellikleri:**
- Randevu Paylaşımı: WhatsApp / SMS / link kopyalama
- Güvenilir Kişiler: Birincil kişi + randevu bildirimleri
- SOS Butonu: Konum + güvenilir kişiler bildirim paketi
- Check-in: Randevu öncesi ve sonrası onay
- **Pasif konum takibi yok** (KVKK uyumu)

**Randevu Sonrası Değerlendirme (Anonim):**
1. Buluştunuz mu?
2. Değerlendirme (1–5 yıldız)
3. Etiketler (eğlenceli, saygılıydı, tekrar yaparım, vs.)
4. Tamamlandı

---

### Özellik 5: Güvenlik Varsayılan Açık Sistemi

**Tüm güvenlik ayarları varsayılan olarak AÇIK gelir.** Kullanıcı isteğe bağlı kapatabilir.

| Kategori | Ayar | Varsayılan |
|----------|------|-----------|
| **Konum** | Gizlilik seviyesi | Yaklaşık (500–1500m obfuscation) |
| **İçerik** | Taciz filtresi | AÇIK |
| | Tehdit filtresi | AÇIK |
| | Dolandırıcılık filtresi | AÇIK |
| | Spam filtresi | AÇIK |
| | Gönderim öncesi inceleme | AÇIK |
| **Görsel** | Müstehcen görsel bulanıklaştırma | AÇIK |
| | Ekran görüntüsü bildirimi | AÇIK |
| **Sohbet** | Link güvenlik kontrolü | AÇIK |
| | Kişisel bilgi uyarısı | AÇIK |
| | Finansal uyarı | AÇIK |
| | Dış uygulama uyarısı | AÇIK |
| **Keşif** | Risk uyarısı göster | AÇIK |
| **Sağlık** | Hasta gizliliği hatırlatıcısı | AÇIK |

**İçerik Moderasyonu:**
- Kural tabanlı (ML yok), **<5ms** gecikme
- Türkçe normalasyon (büyük/küçük harf, özel karakterler)
- 7 kategori: taciz, tehdit, dolandırıcılık, spam, müstehcen, nefret söylemi, kişisel bilgi

**Risk Puanlama:**

```
Risk Puanı: 0–100
├── 0–20   → Düşük Risk       (yeşil rozet)
├── 21–40  → Orta Risk        (sarı rozet)
├── 41–60  → Orta-Yüksek Risk (turuncu rozet)
├── 61–80  → Yüksek Risk      (kırmızı rozet)
└── 81–100 → Kritik Risk      (kırmızı + uyarı)
```

---

### Özellik 6: Etik Monetizasyon

**Parayla satılmayan şeyler:** Keşif, eşleşme, mesajlaşma, randevu planlama, güvenlik.

**Abonelik Planları:**

| Plan | Fiyat | İçerik |
|------|-------|--------|
| CONVENIENCE | 49 TL/ay | Seyahat Modu + Gelişmiş Filtreler + Okundu Bilgisi |
| PRIVACY | 59 TL/ay | Gizli Mod + Görünürlük Kontrolü + Aktivite Gizleme |
| PREMIUM_FULL | 79 TL/ay | Convenience + Privacy + Öncelikli Destek |
| PREMIUM_COACHING | 149 TL/ay | Full + Aylık Profil Koçluğu |
| TRIP_ADDON | 29 TL/ay | Yalnızca Seyahat Modu |
| FILTERS_ADDON | 19 TL/ay | Yalnızca Gelişmiş Filtreler |
| INCOGNITO_ADDON | 39 TL/ay | Yalnızca Gizli Mod |
| COACHING_ONCE | 99 TL (tek seferlik) | Tek Koçluk Seansı |
| CONCIERGE_ONCE | 149 TL (randevu başına) | Randevu Planlama Hizmeti |

---

## 5. Veritabanı Şeması

### Çekirdek Tablolar

| Tablo | Açıklama |
|-------|---------|
| `profiles` | Kullanıcı profil verileri |
| `matches` | Eşleşme kayıtları |
| `daily_picks` | Günlük öneriler (slate) |
| `conversations` | Sohbet kanalları |
| `messages` | Mesaj geçmişi |
| `date_plans` | Planlanan buluşmalar |
| `date_invitations` | 48 saatlik davet zamanlayıcısı |

### Doğrulama Tabloları

| Tablo | Açıklama |
|-------|---------|
| `healthcare_domains` | 40+ Türk sağlık kurumu domain'i |
| `domain_addition_requests` | Bilinmeyen domain talepleri |
| `verification_requests` | Belge doğrulama talepleri |
| `verification_documents` | Yüklenen belgeler |
| `liveness_checks` | Video-selfie oturumları |
| `face_embeddings` | Yüz vektörleri (KVKK: özel nitelikli veri) |
| `face_match_results` | 1:1 ve 1:N eşleşme sonuçları |
| `name_email_match_logs` | İsim-email eşleşme kayıtları |
| `verification_appeals` | İtiraz sistemi (48h SLA) |

### Güvenlik ve Gizlilik Tabloları

| Tablo | Açıklama |
|-------|---------|
| `user_security_settings` | Kişisel güvenlik tercihleri |
| `location_privacy` | Konum gizlilik offseti |
| `blocked_users` | Engellenen kullanıcılar |
| `user_risk_scores` | Profil risk puanı |
| `fraud_signals` | Sahte/duplikat hesap sinyalleri |
| `safety_alerts` | SOS ve check-in uyarıları |
| `moderation_queue` | Admin inceleme kuyruğu |

### Öneri ve Şeffaflık Tabloları

| Tablo | Açıklama |
|-------|---------|
| `user_daily_slates` | Günlük slate container |
| `user_match_status` | Bekleyen/aktif eşleşme sayısı |
| `user_exposure_tracking` | Fairness tracking (popülarite bias önleme) |
| `explanation_templates` | Açıklama şablonları |
| `user_factor_weights` | Dinamik faktör ağırlıkları |
| `explanation_audit_log` | DSA Art.27 denetim logu |

### Randevu ve Güvenlik Tabloları

| Tablo | Açıklama |
|-------|---------|
| `user_availability` | Müsaitlik slotları |
| `user_shifts` | Nöbet takvimi |
| `venues` | Mekan kataloğu |
| `trusted_contacts` | Güvenilir kişiler |
| `safety_alerts` | SOS tetikleyici kayıtları |
| `date_feedback` | Anonim randevu değerlendirmesi |

### Admin ve Denetim Tabloları

| Tablo | Açıklama |
|-------|---------|
| `admin_users` | Admin hesapları (4 rol) |
| `admin_action_log` | Tüm admin işlemleri denetim kaydı |
| `verification_queue` | Belge inceleme kuyruğu (SLA-aware) |
| `appeal_queue` | Kullanıcı itiraz kuyruğu |

### Abonelik Tabloları

| Tablo | Açıklama |
|-------|---------|
| `subscriptions` | Aktif abonelikler |
| `ethical_plan_configs` | Plan yetenekleri |
| `user_capabilities` | Abonelik bazlı gerçek yetenekler |

---

## 6. Ekranlar ve Akışlar

### Kimlik Doğrulama Akışı

```
Landing Ekranı
    ├── Giriş Yap → LoginView
    └── Kayıt Ol → RegistrationFlow (14 adım)
                        ├── İsim, Yaş, Cinsiyet
                        ├── Şehir, Rol, Uzmanlık
                        ├── Email, Şifre
                        ├── Belgeler (upload)
                        ├── Canlılık Kontrolü (video)
                        └── Topluluk Kuralları
                               │
                               ▼
                    PendingVerificationView
                               │
                        ┌──────┴──────┐
                     Onay          Red
                        │              │
                    Onboarding    VerificationAppealModal
                        │
                     Ana Uygulama
```

### Ana Uygulama Navigasyonu

```
Ana Uygulama
├── 🃏 Günlük Öneri (DailyPicksView)
│       ├── ProfileDetailView (profil detayı)
│       ├── MatchOverlay (eşleşme kutlaması)
│       └── FilterView (gelişmiş filtreler)
│
├── 💬 Eşleşmeler (MatchesView)
│       ├── ChatView (mesajlaşma)
│       │       ├── DateChatBanner (sticky banner)
│       │       ├── ToxicityNudge (içerik uyarısı)
│       │       └── ChatSafetyBanner (güvenlik banner)
│       └── DateInvitationFlow (randevu daveti)
│               ├── Tip seçimi
│               ├── Zaman seçimi
│               ├── Mesaj yazma
│               └── Gönderildi
│
├── 👤 Profilim (MyProfileView)
│       ├── PreferenceWeightsPanel (faktör ağırlıkları)
│       ├── TransparencyCenter (şeffaflık merkezi)
│       └── SecurityCenter (güvenlik merkezi, 8 sekme)
│
├── 🌟 Beğenenler (LikesYouView)
│
└── 🏥 Topluluk
        ├── EventFeed → EventDetailView
        ├── NearbyView (yakın profiller)
        ├── ClubsView → ClubDetailView
        └── ConferencesView
```

### Admin Paneli Yapısı

```
Admin Paneli (AdminPanelV2)
├── KPI Dashboard
├── Doğrulama Kuyruğu (VerificationQueue)
├── İtiraz Kuyruğu (AppealQueue)
├── Şüpheli Kullanıcılar
├── Rapor Kuyruğu (ReportQueue)
├── Duplikat Fotoğraf Kuyruğu
└── AI Bias Denetim (AIBiasAudit)
```

---

## 7. Servis Katmanı

### Kimlik Doğrulama ve Güvenlik

| Servis | Sorumluluk |
|--------|-----------|
| `authService` | Email/OAuth/magic link giriş/kayıt, şifre sıfırlama |
| `verificationService` | Email doğrulama, belge yükleme, domain kontrolü |
| `healthcareVerificationService` | Sağlık kurumu domain arama, isim-email eşleştirme, liveness |
| `deviceAbuseService` | Çok cihazlı kayıt engelleme |

### Keşif ve Eşleşme

| Servis | Sorumluluk |
|--------|-----------|
| `discoveryService` | Profil çekme, filtreleme, swipe geçmişi |
| `slateService` | Günlük slate oluşturma, puanlama algoritması |
| `explanationService` | Açıklama şablonu üretimi, faktör eşleştirme |
| `advancedFilterService` | 15+ filtre kombinasyonu |

### Randevu ve Etkinlikler

| Servis | Sorumluluk |
|--------|-----------|
| `dateInvitationService` | 48h davet gönderme/kabul/red |
| `datePlanService` | Plan oluşturma, mekan seçimi |
| `dateSafetyService` | Randevu paylaşımı, güvenilir kişiler, SOS |
| `dateCheckinService` | Randevu öncesi/sonrası check-in |
| `eventService` | Etkinlik CRUD |

### Güvenlik ve Moderasyon

| Servis | Sorumluluk |
|--------|-----------|
| `contentModerationService` | Kural tabanlı mesaj filtreleme (<5ms) |
| `profileRiskService` | Risk puanı hesaplama (0–100) |
| `locationPrivacyService` | Konum obfuscation (500–1500m) |
| `adminModerationService` | Doğrulama, itiraz, rapor yönetimi |
| `blockAndReportService` | Kullanıcı engelleme/raporlama |

### Profil ve Premium

| Servis | Sorumluluk |
|--------|-----------|
| `profileService` | Profil CRUD |
| `photoService` | Fotoğraf yükleme/silme |
| `profileCoachingService` | AI profil koçluğu (Google Gemini) |
| `subscriptionService` | Aktif abonelik kontrolleri |

---

## 8. State Management

| Store | Yönettiği Durum |
|-------|----------------|
| `authStore` | Kimlik doğrulama adımı (LANDING → APP) |
| `userStore` | Profil, premium durumu, abonelik tipi |
| `discoveryStore` | Swipe geçmişi, filtreler, günlük limit |
| `matchStore` | Eşleşmeler, bekleyen eşleşmeler |
| `slateStore` | Günlük slate, mevcut index, oturum istatistikleri |
| `notificationStore` | Bildirimler, okunmamış sayısı |
| `uiStore` | Mevcut ekran, loading durumları |
| `capabilityStore` | Abonelik bazlı kullanıcı yetenekleri |

---

## 9. Güvenlik ve Gizlilik

### Kimlik ve Yetkilendirme

- Supabase Auth (JWT tabanlı)
- Tüm hassas tablolarda Row Level Security (RLS)
- Admin işlemleri için servis rolü tespiti
- OAuth + Email + Magic Link desteği

### Gizlilik Katmanları

```
Konum Gizliliği:
├── 'approximate' → 500–1500m rastgele offset (varsayılan)
├── 'city_only'   → Yalnızca şehir
└── 'hidden'      → Konum gizlenmiş

Sağlık Gizliliği:
├── Kurum adını gizle (opt-in)
├── Meslek detayını gizle (opt-in)
└── Hasta gizliliği hatırlatıcısı (varsayılan açık)
```

### Veri Koruma (KVKK Uyumu)

- Biyometrik veri (yüz) → Özel nitelikli veri → Açık rıza zorunlu
- Konum verisi → Obfuscation ile şifrelenmiş
- Çıkışta: localStorage + sessionStorage temizleme
- SOS → Yalnızca tetikleme anında konum alınır, pasif takip yok

### İçerik Güvenliği

```
Mesaj Gönderim Akışı:
└── Kullanıcı yazar
    └── contentModerationService kontrolü (<5ms)
        ├── Temiz → gönderilir
        └── Şüpheli → ToxicityNudge uyarısı gösterilir
            ├── Kullanıcı düzeltir → tekrar kontrol
            └── Kullanıcı zorla gönderir → moderasyon kuyruğuna
```

---

## 10. Admin Paneli

### Roller

| Rol | Yetki |
|-----|-------|
| `super_admin` | Tüm yetkiler |
| `admin` | Kullanıcı yönetimi, doğrulama |
| `moderator` | Rapor ve itiraz işlemleri |
| `support` | Sadece görüntüleme |

### Kuyruk Yönetimi

| Kuyruk | SLA | Açıklama |
|--------|-----|---------|
| Doğrulama Kuyruğu | Normal / Premium / Elite | Belge inceleme |
| İtiraz Kuyruğu | 48 saat | Red kararına itirazlar |
| Rapor Kuyruğu | — | Kullanıcı şikayetleri |
| Şüpheli Kullanıcılar | — | Risk skoru yüksek hesaplar |
| Duplikat Fotoğraf | — | Sahte profil tespiti |

### İşlemler

- Doğrulama onaylama / reddetme / ek bilgi isteme
- Rozet iptal etme
- Kullanıcı yasaklama (gerekçe ile)
- İtiraz inceleme ve karar
- Tüm işlemler `admin_action_log`'a zaman damgalı kaydedilir

### Şeffaflık

- **Admin Eylem Logu:** Tüm admin işlemleri imzalı kaydedilir
- **Açıklama Audit Logu:** DSA Art.27 öneri şeffaflığı
- **Moderasyon Denetimi:** Kullanıcı itirazları, kararlar, SLA takibi
- **AI Bias Denetimi:** Öneri sistemindeki bias tespiti

---

## 11. CI/CD ve Deployment

### Mevcut Dal Yapısı

```
main
└── feature/admin-moderation (birleştirildi)
└── release/hardening-rc (aktif geliştirme)
```

### CI/CD Pipeline

```
Push
 └── Build kontrolü (Vite)
 └── TypeScript tip kontrolü
 └── E2E testleri (smoke tests, selector-stable)
     └── Supabase env değişkenleri sağlanır (VITE_SUPABASE_*)
```

### Performans Optimizasyonları

- **Code Splitting:** Lazy-loaded bileşenler (Eşleşmeler, Sohbet, Admin)
- **Bundle Chunking:** vendor-react, vendor-supabase, vendor-zustand, vendor-icons
- **Memoization:** React.memo, useMemo, useCallback

---

## 12. Proje İstatistikleri

| Metrik | Değer |
|--------|-------|
| React Bileşenleri | 90+ |
| Servis Modülleri | 40+ |
| Zustand Store'ları | 8 |
| SQL Migration Dosyaları | 30+ |
| TypeScript Arayüzleri | 50+ |
| Toplam SQL Satırı | ~7.800 |
| Admin Panel Bileşenleri | 18 |
| Güvenlik Bileşenleri | 7 |
| Üretim Bağımlılıkları | 18 |
| Geliştirme Bağımlılıkları | 51 |

---

## Özet

Vitalis, swipe-first yaklaşımı yerine **date-conversion-first** felsefesiyle tasarlanmış, sağlık çalışanlarının özel ihtiyaçlarını merkeze alan bir platformdur:

| Konu | Vitalis Yaklaşımı |
|------|-----------------|
| Kimlik doğrulama | Çok katmanlı (domain + belge + liveness + yüz) |
| Eşleşme | 7 profil/gün — kalite > miktar |
| Şeffaflık | DSA Art.27 uyumlu 11 faktörlü açıklama sistemi |
| Randevu | Nöbet saatine uygun 7 randevu tipi |
| Güvenlik | Varsayılan AÇIK — kullanıcı kapatabilir |
| Monetizasyon | Core özellikler ücretsiz — yalnızca kolaylık ücretli |
| Gizlilik | KVKK uyumlu — biyometrik veri açık rıza ile |
| Moderasyon | SLA-aware admin kuyruğu + şeffaf denetim logu |

---

*Son güncelleme: 2026-02-28 | Branch: release/hardening-rc*
