<!-- source: 41cddad16b7f -->
# Modeller ve bağlantılar

Molfar ve uygulamaların yanıt vermek için bir yapay zekâ modeline ihtiyaç duyar. Bu sayfa, nasıl bağlanacağını, hangi modellerin görüneceğini seçmeyi ve görseller ile konuşmayı ayarlamayı açıklar. Hepsi Ayarlar'da bulunur.

## Bağlantılar

Bir bağlantı, bir sağlayıcıya veya sunucuya kaydedilmiş bir bağlantıdır. Ayarlar'ı, ardından "Bağlantılar ve modeller"i ve ardından "Bağlantı ekle"yi aç. Sağlayıcı listesi şunları sunar:

- Bilinen sağlayıcılar: birini seç ve API anahtarını yapıştır.
- "Abonelikler (OAuth)": anahtar yapıştırmak yerine oturum açarsın.
- "Yerel model": kendi bilgisayarında çalışan Ollama, LM Studio, llama.cpp ve diğerleri.
- "Özel uç nokta": OpenAI uyumlu gibi desteklenen biçimlerden birini konuşan herhangi bir sunucu.

Bir bağlantı, anahtarı olduğunda (veya gerekmediğinde) "Bağlı", aksi takdirde "Anahtar gerekli" gösterir. Bu, modelin çalıştığına dair bir test değildir. Anahtarlar yalnızca bu bilgisayarda saklanır.

## Hangi modellerin görüneceğini seçme

Bir bağlantı yüzlerce model getirebilir. Bağlantıların altındaki listede:

- Seçicilerin göstermesi gereken modelleri işaretle. Hiçbir şey işaretli değilse hepsi gösterilir.
- Aralarında geçiş yaptıklarını yıldızla. Bunlar "Hızlı geçiş"i oluşturur ve Molfar'ın sohbetlerinde ve uygulamalarda model seçicilerinde ilk sırada gelir.
- Bir modelin kendi ayarlarını açmak için kaydırıcılar simgesini kullan.

## Model başına ayarlar

Bir modelin ayarları; bağlam penceresini, maksimum çıktı token'ını, akıl yürütmeyi, fiyatları (milyon token başına dolar), bir prompt önbelleği kontrolünü ve cezalar ile Min P gibi örnekleme parametrelerini içerir. "Önerilen ayarlar" makul değerleri doldurabilir ve Geri al geri döner. Molfar'a, uygulamalardaki sohbet yanıtlarına veya tek bir eklentiye ayrı bloklar uygulanabilir. Boş bıraktığın alanlar gönderilmez.

## Görüntü modeli

Uygulamalar, örneğin bir portreden bir karakteri tarif etmek için bu modele resim gönderir. "Otomatik", resim okuyabilen en ucuz modeli seçer. Seninkilerin hiçbiri okuyamıyorsa, böyle bir model içeren bir bağlantı ekle.

## Görseller

Ayarlar'daki "Görseller", her uygulama için görsel üretimini ayarlar. Bağlantılarından görsel modelleri veya görsel sunucuları ekleyebilirsin: API'si açık başlatılmış bir ComfyUI, AUTOMATIC1111 veya Forge sunucusu ya da görsel uç noktası olan herhangi bir hizmet. Yıldızlanan görsel modelleri sık kullanılanlar olur. Molfar, her birinin amacına göre bunlar arasından seçer ve Roleplay bunları kendi seçicisinde ilk sırada listeler.

## Konuşma

"Konuşma", her uygulamaya metin okuma sağlar. Ücretsiz Edge sesleri kutudan çıkar çıkmaz çalışır; her birinin "Dene" düğmesi vardır. Ayrıca bir model adı, varsayılan ses ve anahtarla bir konuşma hizmeti (OpenAI, Groq veya yerel bir sunucu) için "Uç nokta ekle"yi kullanabilirsin.

## Maliyet ve küçük modeller

- Molfar, büyük görevlerden ve ücretli görsellerden önce bir maliyet tahmini gösterir. Bkz. Ayarlar, Molfar'da "Maliyet kontrolleri".
- Bağlam penceresi küçük bir model, Molfar'ın tam talimatları içinde boğulabilir. "Küçük model modu" daha kısa bir prompt gönderir. Varsayılanı olan Otomatik, 32k token veya daha azında ya da boyut bilinmediğinde açılır.

Ayrıca bkz. [[settings]] ve [[first-steps]].
