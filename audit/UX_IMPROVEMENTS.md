# UX_IMPROVEMENTS

## Amaç
- Bu doküman mevcut tasarım dilini koruyarak UX state/feedback açıklarını önceliklendirir.
- Kapsam sadece web kodu ve doğrulanmış bulgulardır.

## Önceliklendirilmiş İyileştirmeler

### 1) Critical - Akışı kıran durumlar

1. EKSİK STATE: Hesap dondurma/silme işlemlerinde bloklayıcı `alert/confirm` ve zorunlu `reload` kullanımı.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:95`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:100`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:101`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:160`
SENARYO: Kullanıcı kritik hesap işlemlerinde adım adım ilerleme göremiyor, akış kopuyor.
ÖNERİ: Aynı görsel dilde modal tabanlı onay + işlem sırasında loading + işlem sonrası sonuç state’i.
GÖRSEL TARİF: Profil ekranında işlem sonrası aniden browser popup ve sayfa yenilemesi görülüyor.

2. EKSİK STATE: `REJECTED` doğrulama durumunda recovery CTA yok.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PendingVerificationView.tsx:20`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PendingVerificationView.tsx:48`
SENARYO: Reddedilen kullanıcı uygulamada çıkış dışında bir aksiyon bulamıyor.
ÖNERİ: “Yeniden doğrulama başlat” ve “destekle iletişime geç” CTA’ları eklenmeli.
GÖRSEL TARİF: Bekleme ekranında red sonrası tek seçenek “Çıkış Yap”.

### 2) Major - Sık akışlarda kayıp yaratan durumlar

1. EKSİK STATE: Bildirim boş durumunda eyleme geçirilebilir CTA yok.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/NotificationsView.tsx:99`
SENARYO: Kullanıcı “boş ekran” görüp sonraki adımı anlayamıyor.
ÖNERİ: Mevcut görsel stilde “Keşfe Dön” veya “Yeni profil gör” CTA’sı.

2. EKSİK STATE: Nearby boş durumunda yeniden deneme/ayar CTA’sı yok.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/NearbyView.tsx:105`
SENARYO: “Scanning...” metni pasif bekleme hissi yaratıyor.
ÖNERİ: “Tekrar Tara” ve “Filtreyi Genişlet” aksiyonları.

3. EKSİK STATE: Story reaction gönderiminde başarı geri bildirimi yok.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/StoryViewer.tsx:76`
SENARYO: Emojiye basıldıktan sonra işlemin gönderilip gönderilmediği belirsiz.
ÖNERİ: Kısa süreli toast veya mikro “gönderildi” feedback’i.

4. EKSİK STATE: Email verification async akışında hata yakalama eksik.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:130`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:156`
SENARYO: Ağ hatalarında kullanıcıya anlamlı geri dönüş olmayabilir.
ÖNERİ: `try/catch` + normalize edilmiş kullanıcı mesajı + retry aksiyonu.

5. EKSİK STATE: Kritik butonlarda işlem sırasında disable/loading standardı tutarsız.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:451`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:560`
SENARYO: Kullanıcı aynı işlemi birden fazla kez tetikleyebiliyor.
ÖNERİ: Tek tip `isSubmitting` davranışı ve çift tetikleme koruması.

### 3) Minor - Kalite/polish iyileştirmeleri

1. EKSİK STATE: Login hata metni backend ham mesajına dayanıyor.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:23`, `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/LoginView.tsx:71`
SENARYO: Teknik dil kullanıcı güvenini düşürüyor.
ÖNERİ: Kullanıcı dostu error map (`invalid_credentials`, `network_error`, `rate_limited`).

2. EKSİK STATE: Veri indirme talebi mock timer ile tutuluyor, kalıcı durum yok.
DOSYA: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:84`
SENARYO: Yenileme sonrası işlem ilerleme durumu kayboluyor.
ÖNERİ: İşlem statüsünü store/backend kaynağına bağlamak.

## Ölçülebilir Başarı Kriterleri
1. Kritik kullanıcı akışlarında (hesap işlemleri, doğrulama red) çıkışsız ekran kalmaması.
2. Tüm async aksiyonlarda minimum: `loading + error + success` state üçlüsünün görünür olması.
3. Empty state ekranlarında en az bir CTA bulunması.
4. Çift tıklama/çift submit kaynaklı tekrar işlem riskinin kaldırılması.

