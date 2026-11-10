<!-- source: 6b5436de93e1 -->
# Molfar, ajanın

Molfar, Molfar Vertep'e yerleşik yapay zekâ ajanıdır. Buradaki her şey düz dosyalardır ve o bu dosyaları senin için düzenler. Uygulamalarınla ilgili bir şeyi değiştirmek istiyorsan ve elle yapmak istemiyorsan bu sayfayı oku.

## Nerede yaşar

Başlangıç sayfasındaki "Molfar" satırını aç. Kendi sekmesini, ajan sayfasını alır. Kutuya yaz ve göndermek için Enter'a bas (telefonda Enter yeni satır yapar ve ok düğmesi gönderir). Komutlar ve şablonlar için `/` yaz veya tam olarak o dosyaya baksın diye bir dosya, karakter, bilgi kitabı veya ön ayarı adlandırmak için `@` yaz.

Bir uygulama açıkken, "Böl" Molfar'ı sola ve uygulamayı canlı olarak sağa koyar; böylece sen sorarken onun değişmesini izlersin. Telefonda o yalnızca başka bir sekmedir.

## Neler yapabilir

- Bir uygulamayı değiştir: ekranları, davranışı, renkleri, yerleşimi.
- Bir başlangıçtan yeni bir uygulama oluştur, sonra onu seninle birlikte geliştir.
- Uygulamaların içindeki verileri düzenle, örneğin çok büyük olsalar bile karakter kartları ve bilgi kitapları.
- Eklentiler ekle ve temaları değiştir.
- Kurduğun görsel modelleriyle görseller üret.
- Notlar tut, bellek girdileri ve beceriler öner.
- Yöneticiysen, hesaplar ve sunucu ayarları konusunda yardımcı ol. Bu tür her değişiklik senin onayını bekler.

Değiştirmeden önce bakar, küçük adımlarla çalışır, işini kontrol eder ve neyin değiştiği ile nasıl geri alınacağına dair kısa bir raporla bitirir.

## Önce ne sorar

- **Büyük veya belirsiz istekler.** Yeni bir uygulama veya büyük bir özellik için önce seçenekli birkaç soru sorar.
- **Korumalı dosyalar.** Varsayılan olarak bir uygulamanın kaynak dosyaları ve ana sayfası, kendi kalıcı talimatları ve model parametreleri dosyası korunur. Bir kart "İzin ver" veya "İzin verme" diye sorar ve yanıt yalnızca o isteği kapsar. Listeyi Ayarlar, Molfar'da düzenlersin.
- **Maliyet.** Büyük bir görevden, ücretli bir test üretiminden veya ücretli bir görselden önce bir tahmin gösterir ve onayını bekler. Bunu Ayarlar, Molfar, Maliyet kontrolleri'nde değiştir.
- **Kabuk komutları.** Aşağıda, moda bağlı olarak.

## Mod

Başlıktaki mod seçici, sormadan ne yapabileceğine karar verir:

- **Tam**, önce büyük değişiklikleri planlar, sonra düzenler ve komutlar çalıştırır.
- **Kabul**, plan adımını atlar ve her kabuk komutundan önce sorar.
- **Plan**, yalnızca okur ve planlar, hiçbir şeyi değiştirmez. Bir plandan sonra "Öneriyi uygula" moddan çıkar ve onu yürütür.

## Nasıl geri alınır

Bir uygulamayı değiştiren bir yanıtın altında "Değişti <Uygulama> · N dosya · Geri al" görürsün. Geri al önce sorar, sonra uygulamanın kodunu o çalıştırmadan önceki haline getirir. Sohbetlerin ve yüklemelerin kalır. Bir uygulamanın proje sayfasında ayrıca Kontrol Noktaları bulunur: Molfar'ın uygulamayı değiştirmeden önce aldığı, uygulamanın kodunun kaydedilmiş noktaları. "Kontrol noktası kaydet" ile kendin de ekleyebilirsin ve Geri yükle önce sorar. Her geri yüklemenin kendisi de kaydedilir, yani geri alınabilir.

## Bellek ve beceriler

Beyin düğmesi "Bellek ve beceriler"i açar. Bellek, sohbetler arasında tuttuğu şeyleri barındırır; girdileri önerir ve yalnızca sen kabul ettiğinde kaydeder. Beceriler, bir iş türü için kısa talimatlardır; "Yeni beceri" bir tane yazar ve "Molfar ile geliştir" onu inceltir. Projeye özel olanlar için bkz. [[projects-and-chats]].

### Posta kutusu

Bir bellek girdisi ya da beceri öneren kartın üç yanıtı vardır: "Save", "Later" ve "Skip". "Later", öneriyi "Bellek ve beceriler" içindeki "Mailbox" sekmesinde bırakır; kimsenin yanıtlamadığı kart ve Molfar'ın uzun bir görevden sonra yaptığı öneri de oraya düşer. Beyin düğmesindeki sayı kaç tanesinin beklediğini gösterir; bir şey beklerken düğme "Mailbox" sekmesinde açılır.

- Bir bellek girdisi kaydetmeden önce düzenlenebilir. Bir beceri tam olarak gösterilir, ya da sahip olduğun bir beceriyi değiştiriyorsa diff olarak gösterilir ve gösterildiği gibi kaydedilir. Değiştirmek için atla ve Molfar'a neyi düzeltmesi gerektiğini söyle.
- "Skip" hatırlanır, böylece Molfar aynı öneriyi geri getirmez. "Skip all" listeyi boşaltır.
- Sen başka bir sohbetteyken biten bir sohbet de "Open" ve "Dismiss" ile "Mailbox" sekmesinde bekler. Sohbet listesi de onu aynı şekilde işaretler.

## Bilinmesi iyi olanlar

- Küçük veya ücretsiz modeller: Ayarlar, Molfar'daki "Küçük model modu" daha kısa bir prompt gönderir.
- Göz düğmesi, yani prompt denetçisi, modele gerçekte ne gönderildiğini gösterir.
- Uzun sohbetler "Konuşmayı sıkıştır" veya `/compact` ile bir özete indirilebilir.
- Burada kullanılan kelimeler [[glossary]] içinde açıklanmıştır.
