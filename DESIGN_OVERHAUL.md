# Vitalis - Premium UI/UX Tasarım Revizyonu

## ALTIN KURAL
⚠️ MEVCUT RENK PALETİ KESİNLİKLE KORUNACAK
⚠️ FONKSİYONALİTE DEĞİŞMEYECEK
⚠️ SADECE GÖRSEL İYİLEŞTİRME YAPILACAK

---

## REFERANS UYGULAMALAR (Benchmark)

### Bumble
- Temiz, beyaz arka plan
- Bol whitespace
- Yumuşak köşeler
- Minimal ikonlar
- Tek renk accent
- Büyük, okunabilir tipografi

### Tinder
- Kart-based UI
- Smooth swipe animations
- Gradient overlays on photos
- Floating action buttons
- Clear visual hierarchy

### Hinge
- Elegant typography
- Prompt-based cards
- Subtle shadows
- Premium feel with restraint
- Thoughtful micro-interactions

---

## 8 TASARIM AJANYI

### 🎨 AGENT 1: VISUAL HIERARCHY & SPACING MASTER
**Görev:** Görsel hiyerarşi ve spacing sistemini düzelt

**Kontrol & Düzelt:**
- [ ] Her ekranda net görsel hiyerarşi var mı?
- [ ] Primary action her zaman en belirgin mi?
- [ ] Spacing tutarlı mı? (8px grid system)
- [ ] Padding'ler yeterli mi? (min 16px container padding)
- [ ] Element'ler arası boşluk dengeli mi?
- [ ] Kalabalık/sıkışık görünen alanlar var mı?
- [ ] Breathing room yeterli mi?

**Spacing Scale (8px grid):**
```
xs: 4px   (tight elements)
sm: 8px   (related elements)
md: 16px  (standard gap)
lg: 24px  (section gap)
xl: 32px  (major sections)
2xl: 48px (page sections)
3xl: 64px (hero spacing)
```

**Aksiyon:**
- Sıkışık alanları tespit et
- Spacing'i 8px grid'e oturt
- Her değişikliği listele

---

### 🔤 AGENT 2: TYPOGRAPHY & READABILITY EXPERT
**Görev:** Tipografi sistemini Bumble/Tinder seviyesine çıkar

**Kontrol & Düzelt:**
- [ ] Font size hiyerarşisi net mi?
- [ ] Line-height okunabilir mi? (1.4-1.6 body, 1.2 headings)
- [ ] Font weight kullanımı tutarlı mı?
- [ ] Letter-spacing doğru mu?
- [ ] Truncation/ellipsis düzgün mü?
- [ ] Responsive font sizing var mı?

**Typography Scale:**
```
text-xs: 12px / 16px (caption, meta)
text-sm: 14px / 20px (secondary text)
text-base: 16px / 24px (body)
text-lg: 18px / 28px (emphasized body)
text-xl: 20px / 28px (card titles)
text-2xl: 24px / 32px (section headers)
text-3xl: 30px / 36px (page titles)
text-4xl: 36px / 40px (hero)
```

**Font Weights:**
```
Regular (400): Body text
Medium (500): Emphasized, buttons
Semibold (600): Subheadings
Bold (700): Headlines only
```

---

### 🃏 AGENT 3: CARD & COMPONENT DESIGN SPECIALIST
**Görev:** Tüm kartları ve component'ları premium hale getir

**Kontrol & Düzelt:**
- [ ] Profile card'lar Tinder kadar clean mi?
- [ ] Card radius tutarlı mı? (16px-24px premium feel)
- [ ] Shadow'lar soft ve subtle mı?
- [ ] Card içi padding yeterli mi?
- [ ] Image aspect ratio tutarlı mı?
- [ ] Overlay gradient'lar smooth mu?
- [ ] Card hover/press state'leri var mı?

**Card Styles:**
```css
/* Profile Card */
border-radius: 24px;
box-shadow: 0 4px 24px rgba(0,0,0,0.08);
overflow: hidden;

/* Info Card */
border-radius: 16px;
box-shadow: 0 2px 12px rgba(0,0,0,0.06);
padding: 20px;

/* Action Card */
border-radius: 12px;
box-shadow: 0 1px 4px rgba(0,0,0,0.04);
padding: 16px;
```

**Photo Overlay:**
```css
/* Bottom gradient for text readability */
background: linear-gradient(
  to top,
  rgba(0,0,0,0.7) 0%,
  rgba(0,0,0,0.3) 50%,
  transparent 100%
);
```

---

### 🔘 AGENT 4: BUTTON & INTERACTIVE ELEMENT DESIGNER
**Görev:** Tüm butonları ve interaktif öğeleri premium yap

**Kontrol & Düzelt:**
- [ ] Primary button yeterince dikkat çekici mi?
- [ ] Secondary button net ayrışıyor mu?
- [ ] Button padding'leri yeterli mi? (min 12px vertical, 24px horizontal)
- [ ] Touch target min 44px mi?
- [ ] Hover/press/disabled state'ler var mı?
- [ ] Icon button'lar tutarlı mı?
- [ ] FAB (Floating Action Button) varsa premium mi?

**Button Styles:**
```css
/* Primary (CTA) */
padding: 14px 28px;
border-radius: 12px;
font-weight: 600;
font-size: 16px;
min-height: 48px;

/* Secondary */
padding: 12px 24px;
border-radius: 10px;
font-weight: 500;
border: 1.5px solid;

/* Ghost/Text */
padding: 8px 16px;
font-weight: 500;

/* Icon Button */
width: 48px;
height: 48px;
border-radius: 50%;

/* Large Action (Like/Dislike) */
width: 64px;
height: 64px;
border-radius: 50%;
box-shadow: 0 4px 16px rgba(0,0,0,0.12);
```

---

### 📝 AGENT 5: FORM & INPUT DESIGN SPECIALIST
**Görev:** Form elemanlarını modern ve kullanışlı yap

**Kontrol & Düzelt:**
- [ ] Input field'lar yeterince büyük mü? (min 48px height)
- [ ] Border/focus state'ler net mi?
- [ ] Label'lar okunabilir mi?
- [ ] Error state'ler kırmızı mı ve net mi?
- [ ] Placeholder text appropriate mi?
- [ ] Textarea'lar auto-resize mi?
- [ ] Select/dropdown'lar native mi custom mı?

**Input Styles:**
```css
/* Text Input */
height: 52px;
padding: 14px 16px;
border-radius: 12px;
border: 1.5px solid #E2E8F0;
font-size: 16px;

/* Focus */
border-color: primary;
box-shadow: 0 0 0 3px rgba(primary, 0.1);

/* Error */
border-color: #EF4444;
box-shadow: 0 0 0 3px rgba(239,68,68,0.1);

/* Textarea */
min-height: 120px;
padding: 16px;
resize: vertical;
```

---

### 🖼️ AGENT 6: IMAGE & MEDIA TREATMENT EXPERT
**Görev:** Fotoğraf ve medya görünümünü optimize et

**Kontrol & Düzelt:**
- [ ] Profile fotoğrafları crop edilmiş mi? (aspect ratio)
- [ ] Image loading placeholder var mı? (blur/skeleton)
- [ ] Avatar'lar tutarlı boyutta mı?
- [ ] Gallery view smooth mu?
- [ ] Image zoom/preview var mı?
- [ ] Fallback avatar var mı?
- [ ] Image overlay'lar text'i okunabilir yapıyor mu?

**Image Standards:**
```css
/* Profile Photo (Main) */
aspect-ratio: 3/4;
object-fit: cover;
border-radius: 24px;

/* Avatar (Small) */
width: 48px;
height: 48px;
border-radius: 50%;
object-fit: cover;

/* Avatar (Medium) */
width: 64px;
height: 64px;

/* Gallery Thumbnail */
aspect-ratio: 1/1;
border-radius: 12px;
```

---

### ✨ AGENT 7: ANIMATION & MICRO-INTERACTION DESIGNER
**Görev:** Smooth, premium animasyonlar ekle

**Kontrol & Düzelt:**
- [ ] Page transition'lar smooth mu?
- [ ] Card swipe animasyonu Tinder-level mi?
- [ ] Button press feedback var mı?
- [ ] Loading state'ler animated mi?
- [ ] Modal open/close smooth mu?
- [ ] List item stagger animation var mı?
- [ ] Skeleton shimmer effect var mı?

**Animation Standards:**
```css
/* Quick (button press, hover) */
duration: 150ms;
easing: ease-out;

/* Standard (card, modal) */
duration: 300ms;
easing: cubic-bezier(0.4, 0, 0.2, 1);

/* Slow (page transitions) */
duration: 500ms;
easing: cubic-bezier(0.4, 0, 0.2, 1);

/* Spring (bouncy feedback) */
type: spring;
stiffness: 400;
damping: 25;
```

**Mandatory Animations:**
- Button: scale(0.98) on press
- Card: lift shadow on hover
- Modal: fade + slide up
- Page: fade + slight slide
- Like/Dislike: fly off screen
- Match: celebration explosion

---

### 🔍 AGENT 8: QUALITY ASSURANCE & CONSISTENCY CHECKER
**Görev:** Diğer 7 agent'ın işini kontrol et, tutarsızlıkları bul

**Her Agent Sonrası Kontrol:**
- [ ] Değişiklikler mevcut renk paletini koruyor mu?
- [ ] Fonksiyonalite bozulmamış mı?
- [ ] Tüm ekranlarda tutarlılık var mı?
- [ ] Responsive davranış korunmuş mu?
- [ ] Accessibility bozulmamış mı?
- [ ] Performance etkilenmemiş mi?

**Cross-Check Matrix:**
```
| Ekran | Spacing | Typo | Cards | Buttons | Forms | Images | Anim |
|-------|---------|------|-------|---------|-------|--------|------|
| Home  |   ✓     |  ✓   |   ✓   |    ✓    |   -   |   ✓    |  ✓   |
| Profile|  ✓     |  ✓   |   ✓   |    ✓    |   ✓   |   ✓    |  ✓   |
| Chat  |   ✓     |  ✓   |   ✓   |    ✓    |   ✓   |   ✓    |  ✓   |
| ...   |   ...   |  ... |  ...  |   ...   |  ...  |  ...   | ...  |
```

---

## AGENT İLETİŞİM PROTOKOLÜ

Her agent diğerlerinin çalışmasını review eder:
```
AGENT 1 tamamladı → AGENT 8 kontrol
AGENT 2 tamamladı → AGENT 8 kontrol
...
AGENT 7 tamamladı → AGENT 8 final review

Tutarsızlık bulunursa:
AGENT 8: "AGENT 3, card radius ProfileCard'da 24px ama MatchCard'da 16px. Hangisi standart?"
AGENT 3: "24px standart, MatchCard'ı düzeltiyorum."
```

---

## TARTIŞMA KURALLARI

1. Her agent değişiklik yapmadan önce NEDEN'i açıklar
2. Diğer agent'lar itiraz edebilir
3. İtiraz varsa tartışılır, consensus sağlanır
4. Agent 8 final onay verir
5. Hiçbir değişiklik Agent 8 onayı olmadan merge edilmez

**Örnek Tartışma:**
```
AGENT 3: "Profile card shadow'unu 0 4px 24px yapıyorum, daha premium."
AGENT 7: "Bu kadar güçlü shadow dark mode'da kötü görünür."
AGENT 3: "Haklısın, dark mode için 0 4px 16px rgba(0,0,0,0.3) yapalım."
AGENT 8: "Onay. Her iki mode'u da test edin."
```

---

## DOKUNULMAYACAKLAR

❌ Renk paleti
❌ İş mantığı (swipe logic, match logic)
❌ API çağrıları
❌ State management
❌ Routing
❌ Authentication
❌ Data models

---

## ÇIKTI BEKLENTİSİ

Her agent için:
```markdown
## AGENT [N] RAPORU

### Yapılan Değişiklikler
1. [dosya:satır] - [değişiklik açıklaması]
2. ...

### Before/After
- ÖNCE: [kod/değer]
- SONRA: [kod/değer]
- NEDEN: [açıklama]

### Diğer Agent'lara Not
- Agent X'in Y konusuna dikkat etmesi gerekiyor
```

---

## FİNAL KONTROL LİSTESİ

- [ ] Tüm ekranlar Bumble/Tinder kadar clean görünüyor
- [ ] Spacing tutarlı ve 8px grid'e uygun
- [ ] Typography hiyerarşisi net
- [ ] Kartlar premium shadow ve radius ile
- [ ] Butonlar modern ve touchable
- [ ] Form elemanları kullanışlı
- [ ] Fotoğraflar optimize ve consistent
- [ ] Animasyonlar smooth ve 60fps
- [ ] Dark mode tutarlı
- [ ] Mevcut renkler korunmuş
- [ ] Hiçbir fonksiyon bozulmamış

---

## BAŞLA

Agent 1'den başla, sırayla ilerle. Her agent tamamlayınca Agent 8 kontrol etsin.
Tartışmalar açık yapılsın, her karar gerekçelendirilsin.

HEDEF: Kullanıcı uygulamayı açtığında "vay be, bu premium bir uygulama" demeli.
