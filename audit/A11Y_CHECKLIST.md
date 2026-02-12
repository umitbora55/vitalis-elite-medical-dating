# A11Y_CHECKLIST

## Form ve Label
- [ ] Label-input bağlantısı (`htmlFor/id`) tüm alanlarda var.
Kanıt: Eksik örnekler `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:44`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:261`

- [ ] Hata mesajları `aria-describedby` ile alana bağlı.
Kanıt: Eksik örnekler `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:71`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:271`

- [ ] Alanlarda `aria-invalid` kullanımı var.
Kanıt: Eşleşen kullanım bulunmadı.

## Etkileşim ve Klavye
- [ ] Tıklanabilir alanlar semantik button/link.
Kanıt: `div` ile etkileşim `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/StoryRail.tsx:28`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:68`

- [ ] Icon-only butonlarda `aria-label` var.
Kanıt: Eksik örnekler `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/AppHeader.tsx:28`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:168`

- [ ] Touch target en az 44x44.
Kanıt: Küçük örnek `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:89`

- [ ] Tüm modal/overlay için `Escape` ile kapanış var.
Kanıt: Uygulama genelinde `Escape` handler bulunmadı.

## Dialog Semantics
- [ ] Modal root `role="dialog"` içeriyor.
Kanıt: Eksik örnek `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:985`

- [ ] `aria-modal="true"` kullanılıyor.
Kanıt: Eşleşen kullanım bulunmadı.

- [ ] Modal açıldığında focus trap + focus restore var.
Kanıt: Eşleşen focus-trap implementasyonu bulunmadı.

## Görsel Erişilebilirlik
- [ ] Kontrast 4.5:1 altında kalan text kombinasyonu yok.
Kanıt: Risk örneği `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/AppHeader.tsx:30` (`gold-500` on `slate-100`).

- [ ] Sadece renge dayalı bilgi yok.
Kanıt: Kısmi risk örneği `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:99`

- [ ] Focus görünürlüğü korunuyor (outline kaldırıldıysa eşdeğer ring var).
Kanıt: `focus:outline-none` yoğun kullanılıyor `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:52`

## Dinamik Mesajlar
- [ ] Toast ve status mesajları `aria-live` ile duyuruluyor.
Kanıt: Eksik örnekler `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1091`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:227`

## Motion Erişilebilirliği
- [ ] `prefers-reduced-motion` desteği var.
Kanıt: Eşleşen kullanım bulunmadı (`index.css`, `tailwind.config.cjs`, componentler).

## Öncelikli Düzeltme Sırası
1. Name/role/label/dialog eksikleri
2. Focus ve keyboard kapanış davranışları
3. Kontrast düzeltmeleri
4. Live region ve reduced-motion desteği
