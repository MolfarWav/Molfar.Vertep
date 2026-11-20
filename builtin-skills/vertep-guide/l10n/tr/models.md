<!-- source: cb493ace9db7 -->
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

Bir modelin ayarları; bağlam penceresini, maksimum çıktı token'ını, akıl yürütmeyi, fiyatları (milyon token başına dolar), bir prompt önbelleği kontrolünü, bir önbellek ömrünü ve cezalar ile Min P gibi örnekleme parametrelerini içerir. "Önbelleği kontrol et", sağlayıcının tekrarlanan bir prompt'u kendi önbelleğinden okuyup okumadığını söyler; bu daha ucuz ve daha hızlıdır. Önbellek ömrünün üç seçeneği vardır: "Sağlayıcının kendi" (genellikle yaklaşık 5 dakika, fazladan hiçbir şey gönderilmez), "Uzun" (Claude ile bir saat, GPT ile bir güne kadar ister; fazladan istek yok, önbelleği yazmak daha pahalıdır; yalnızca buna uyan bağlantılarda sunulur: Anthropic'in kendisi, OpenRouter üzerinden Claude ve OpenAI, diğer yerlerde gri gösterilir, çünkü bir ağ geçidi bunu yok sayabilir veya isteği reddedebilir) ve "Canlı tut" (bir sohbet yanıtından sonra motor, önbellek düşmesin diye 40 dakikaya kadar yaklaşık her 5 dakikada bir küçük bir istek gönderir; her seferinde prompt'un giriş fiyatının yaklaşık onda birine mal olur, istek sınırlarına ve aboneliklere sayılır, modelin fiyatlarının ayarlanmış olmasını gerektirir ve araçlarla ya da Claude'da düşünmeyle kullanılmaz (Claude'un düşünmesiyle bir istek, canlı tutma isteğinin sahip olduğu 16 token'dan daha büyük bir yanıt gerektirir); sohbete hiçbir şey yazmaz, panel istekleri sayar ve çalışmadığında panel nedenini söyler). Anthropic veya OpenRouter üzerinden Claude için "Uzun" ile başla: fazladan istek gerektirmez. NanoGPT gibi bir ağ geçidi üzerinden Claude uzun ömrü yok sayar ve oradaki Gemini modelleri birkaç dakika boyunca kendi başlarına önbelleğe alır: bunlar için Canlı tut kullan. Roleplay'de, sohbet başlığındaki Request size düğmesi son isteğin ne kadarının önbellekten geldiğini ve prompt'ta önbelleğin nerede bittiğini gösterir. Canlı tut, uzun seçeneği olmayan sağlayıcılar içindir, günlük istek sınırı olan ücretsiz modeller için değil. "Önerilen ayarlar" makul değerleri doldurabilir ve Geri al geri döner. Molfar'a, uygulamalardaki sohbet yanıtlarına veya tek bir eklentiye ayrı bloklar uygulanabilir. Boş bıraktığın alanlar gönderilmez.

## Görüntü modeli

Uygulamalar, örneğin bir portreden bir karakteri tarif etmek için bu modele resim gönderir. "Otomatik", resim okuyabilen en ucuz modeli seçer. Seninkilerin hiçbiri okuyamıyorsa, böyle bir model içeren bir bağlantı ekle.

## Görseller

Ayarlar'daki "Görseller", her uygulama için görsel üretimini ayarlar. Bağlantılarından görsel modelleri veya görsel sunucuları ekleyebilirsin: API'si açık başlatılmış bir ComfyUI, AUTOMATIC1111 veya Forge sunucusu ya da görsel uç noktası olan herhangi bir hizmet. ComfyUI, RunPod Serverless üzerinde de olabilir: ComfyUI'yi seçin, adres olarak `https://api.runpod.ai/v2/` ve ardından uç nokta kimliğinizi, anahtar olarak RunPod API anahtarınızı girin ve "Modeller" altına worker'ınızdaki checkpoint dosya adlarını yazın (RunPod bunları listeleyemez); "Kontrol et" uç nokta kimliğinin ve anahtarın doğru olup olmadığını söyler. Worker başlarken ilk görsel yarım dakikaya kadar sürebilir. Yıldızlanan görsel modelleri sık kullanılanlar olur. Molfar, her birinin amacına göre bunlar arasından seçer ve Roleplay bunları kendi seçicisinde ilk sırada listeler.

## Konuşma

"Konuşma", her uygulamaya metin okuma sağlar. Ücretsiz Edge sesleri kutudan çıkar çıkmaz çalışır; her birinin "Dene" düğmesi vardır. Ayrıca bir model adı, varsayılan ses ve anahtarla bir konuşma hizmeti (OpenAI, Groq veya yerel bir sunucu) için "Uç nokta ekle"yi kullanabilirsin.

## Maliyet ve küçük modeller

- Molfar, büyük görevlerden ve ücretli görsellerden önce bir maliyet tahmini gösterir. Bkz. Ayarlar, Molfar'da "Maliyet kontrolleri".
- Bağlam penceresi küçük bir model, Molfar'ın tam talimatları içinde boğulabilir. "Küçük model modu" daha kısa bir prompt gönderir. Varsayılanı olan Otomatik, 32k token veya daha azında ya da boyut bilinmediğinde açılır.

Ayrıca bkz. [[settings]] ve [[first-steps]].
