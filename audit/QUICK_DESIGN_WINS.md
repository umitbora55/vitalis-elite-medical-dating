# QUICK_DESIGN_WINS

## Kapsam
- Bu liste mevcut tasarım dilini koruyarak, ortalama 30 dakika içinde uygulanabilecek düşük riskli iyileştirmeleri içerir.
- Tüm maddeler kodda doğrulanmış bulgulara dayanır.

## Hızlı Kazanımlar (<= 30 dk)

1. WIN: Icon-only butonlara `aria-label` eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/AppHeader.tsx:28`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:87`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/StoryViewer.tsx:113`
ETKİ: Screen reader kullanıcıları aksiyonları anlamlı duyabilir.

2. WIN: Login/registration alanlarına `id + htmlFor` bağının eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:44`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:261`
ETKİ: Form erişilebilirliği ve hata bağlamı hemen iyileşir.

3. WIN: Toast/status katmanına `aria-live="polite"` eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1091`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:227`
ETKİ: Dinamik mesajlar yardımcı teknolojilere otomatik duyurulur.

4. WIN: Modal root’lara temel dialog semantiklerinin eklenmesi (`role="dialog"`, `aria-modal`).
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileDetailView.tsx:444`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:985`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1221`
ETKİ: A11Y kritik riskleri hızlıca düşer.

5. WIN: Focus görünürlüğü kaldırılan alanlarda ring geri eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:52`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:268`
ETKİ: Klavye ile gezinme görünür hale gelir.

6. WIN: Empty state ekranlarına tek CTA eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/NotificationsView.tsx:99`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/NearbyView.tsx:105`
ETKİ: Kullanıcı çıkışsız boş ekran yerine bir sonraki adımı görür.

7. WIN: `REJECTED` doğrulama ekranına yeniden deneme aksiyonu eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PendingVerificationView.tsx:20`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PendingVerificationView.tsx:48`
ETKİ: Kritik akışta kullanıcı terk oranı azalır.

8. WIN: Story reaction sonrası kısa başarı feedback’i eklenmesi.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/StoryViewer.tsx:76`
ETKİ: Kullanıcı aksiyonunun işlendiğini anlar.

9. WIN: Tanımsız animasyon sınıflarını kaldırma veya mevcut tanımlı sınıflarla hizalama.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LandingView.tsx:31`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/OnboardingView.tsx:71`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/Tooltip.tsx:12`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/tailwind.config.cjs:33`
ETKİ: Boşa düşen animasyon class kullanımı temizlenir.

10. WIN: `transition-all` yerine hedefli transition kullanımı.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:69`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/FilterView.tsx:144`
ETKİ: Gereksiz property animasyonu azalır, hissedilen akıcılık artar.

## Uygulama Sırası (Hızlı Etki)
1. A11Y temel düzeltmeler (`aria-label`, `htmlFor/id`, `aria-live`, dialog semantics)
2. Empty/rejected/reaction feedback boşlukları
3. Motion class ve transition temizliği

## Not
- Bu doküman sadece audit çıktısıdır; burada listelenen maddeler uygulanmadan önce mevcut sprint kapsamı ve regresyon riskiyle birlikte planlanmalıdır.

