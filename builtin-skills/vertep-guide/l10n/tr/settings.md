<!-- source: 3e8eaf6fcf3f -->
# Ayarlar haritası

Ayarlar, kabuğun tüm uygulamalar tarafından paylaşılan kendi iletişim kutusudur. Üst çubuktaki dişliyle veya telefonda sağ üstteki hesap menüsünden aç. Bu sayfa, nereye bakacağını bilmen için her bölümü listeler.

## Bölümler

- **Genel.** Arayüz dili, "Rehber" bloğu (turları kapat, yeniden oynat, Yenilikler'i yeniden göster) ve hesabın: resim, ad, parola, "Çıkış yap".
- **Yedek.** Başka bir bilgisayara taşımak için tüm profilini dışa aktar ve bir tane içe aktar. Bkz. [[devices]].
- **Depolama.** Kartlarının, sohbetlerinin ve sprite'larının kullandığı resimler. "Kullanılmayan resimleri bul", hiçbir şeyin kullanmadığı resimleri bulur ve çöp kutusuna taşır; "Çöp kutusunu boşalt", sorduktan sonra bunları kalıcı olarak kaldırır.
- **Eşitleme.** Oyunlarını Google Drive veya bir klasörle cihazlar arasında taşı. Bkz. [[devices]].
- **Bağlantılar ve modeller.** Sağlayıcılar, modeller listesi, sık kullanılanlar, model başına ayarlar, görüntü modeli. Bkz. [[models]].
- **Konuşma.** Metin okuma: Edge sesleri ve kendi konuşma uç noktaların.
- **Görseller.** Görsel üretimi: görsel modelleri ve görsel sunucuları.
- **Molfar.** Molfar'ın her uygulamada nasıl davrandığı:
  - kum havuzunda internet erişimi;
  - "Uzun oturumları otomatik sıkıştır";
  - "Küçük model modu";
  - "Maliyet kontrolleri": Otomatik, Her zaman sor veya Hiç sorma;
  - bir şey sorduğunda, bitirdiğinde veya başarısız olduğunda "Bildirimler";
  - "Molfar'ın yönergeleri", onun için kalıcı tercihlerin;
  - korumalı dosyalar listesi.
  Bkz. [[molfar]].
- **Bellek.** Uygulamaların sohbetler arasında şeyleri nasıl hatırladığı ve bulduğu. Ucuz bir embedding modeliyle, yalnızca tam kelimelerle değil, anlama göre eşleştirebilir. Bu isteğe bağlıdır. Varsayılan olarak Molfar Vertep modeli kendisi seçer: önce kendi bilgisayarındaki bir model (LM Studio, Ollama; anahtar gerekmez), sonra anahtarlı bir API bağlantısı, ardından OpenRouter. Hiçbiri kurulu değilse bellek bunu söyler ve yalnızca kelimelerle eşleştirir. Bir modeli tek tıkla kendi bilgisayarına da indirebilirsin: **Bu bilgisayarda (isteğe bağlı)** bölümünde **bge-m3** (önerilir; Ukraynaca, Rusça ve İngilizcede en iyisi) ya da **EmbeddingGemma 2** (daha küçük) seç ve **İndir ve bağlan** düğmesine bas. Motor önce modeli çalıştıran programı kurar (yaklaşık 85 MB, bir kez), sonra modeli indirir (587 MB ya da 346 MB) ve bağlar. Pencereyi kapatsan da indirme sürer; yarım kalan bir indirme kaldığı yerden devam eder. Bundan sonra ücretsizdir, hiçbir şey internete gitmez ve model yalnızca çalıştığı sırada bellek kullanır (yaklaşık 1,1 GB ya da 0,6 GB). **Sil** disk alanını geri verir. Motoru Bun ile çalıştıran bir bilgisayar gerekir, telefon başlatıcısı olmaz; çevrimiçi bağlantı yedek olarak kalır ve modelleri değiştirirsen bellek vektörlerini kendiliğinden yeniden oluşturur.
- **MCP sunucuları.** Molfar'ın ve uygulamalarının çağırabileceği araç sunucuları. Uygulamalar hepsi kapalı başlar ve ihtiyaç duyduklarını açar.
- **Geliştirici.** Her uygulamanın derleme durumunu ve her zaman açık olan canlı sıcak yenilemeyi gösterir.

## Yalnızca yönetici için

- **Sunucu.** Molfar Vertep'in bu bilgisayarda nasıl çalıştığı: bağlantı noktası, başlangıçta tarayıcıyı açma, ağındaki diğer cihazlara izin verme (telefonun için bir QR koduyla), HTTPS, uygulamaların paket indirip indiremeyeceği, sürüm ve nasıl güncelleneceği.
- **Kullanıcılar.** Oturum açabilecek kişiler. Her biri kendi çalışma alanını, ajanını ve uygulamalarını alır.

## Uygulama ayarları

Listenin en üstündeki **Uygulama ayarları** grubu, kendi ayar sayfası olan her kurulu uygulamayı listeler (Roleplay, orada «Vertep» olarak görünür, ve Social). Birine dokunursan Ayarlar kapanır ve uygulama kendi ayar sayfasında açılır: Roleplay için sohbet görünümü, «Chat Behavior» (yazım denetimi, otomatik düzeltme), akış, temalar ve sohbet ayarlarının geri kalanı. Ayar sayfası olmayan uygulama listelenmez. Aynı sayfa uygulamanın içinde de bulunur: bkz. [[apps]].

> Telefonda, Ayarlar önce bölümlerin bir listesini gösterir; birine girmek için dokun ve geri dönmek için Geri'yi kullan.
