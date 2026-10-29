// The offline page's script (see offline.html): its text in the shell's
// language, and a quiet retry that reloads once the engine answers again.
;(() => {
  const TEXT = {
    en: ["Molfar Vertep is not reachable", "The engine is not answering. Check that it is running on your computer and that this device is on the same network. This page tries again by itself.", "Try again", "Still not answering…"],
    de: ["Molfar Vertep ist nicht erreichbar", "Die Engine antwortet nicht. Prüfe, ob sie auf deinem Computer läuft und ob dieses Gerät im selben Netzwerk ist. Diese Seite versucht es von selbst erneut.", "Erneut versuchen", "Antwortet noch nicht…"],
    es: ["No se puede acceder a Molfar Vertep", "El motor no responde. Comprueba que se está ejecutando en tu ordenador y que este dispositivo está en la misma red. Esta página lo vuelve a intentar sola.", "Reintentar", "Todavía no responde…"],
    fr: ["Molfar Vertep est injoignable", "Le moteur ne répond pas. Vérifie qu’il tourne sur ton ordinateur et que cet appareil est sur le même réseau. Cette page réessaie toute seule.", "Réessayer", "Toujours pas de réponse…"],
    it: ["Molfar Vertep non è raggiungibile", "Il motore non risponde. Controlla che sia avviato sul tuo computer e che questo dispositivo sia sulla stessa rete. La pagina riprova da sola.", "Riprova", "Ancora nessuna risposta…"],
    ja: ["Molfar Vertep に接続できません", "エンジンが応答していません。パソコンで起動しているか、この端末が同じネットワークにあるか確認してください。このページは自動で再試行します。", "再試行", "まだ応答がありません…"],
    ko: ["Molfar Vertep에 연결할 수 없습니다", "엔진이 응답하지 않습니다. 컴퓨터에서 실행 중인지, 이 기기가 같은 네트워크에 있는지 확인하세요. 이 페이지는 자동으로 다시 시도합니다.", "다시 시도", "아직 응답이 없습니다…"],
    nl: ["Molfar Vertep is niet bereikbaar", "De engine antwoordt niet. Controleer of hij op je computer draait en of dit apparaat op hetzelfde netwerk zit. Deze pagina probeert het zelf opnieuw.", "Opnieuw proberen", "Nog steeds geen antwoord…"],
    pl: ["Molfar Vertep jest nieosiągalny", "Silnik nie odpowiada. Sprawdź, czy działa na twoim komputerze i czy to urządzenie jest w tej samej sieci. Ta strona sama spróbuje ponownie.", "Spróbuj ponownie", "Nadal brak odpowiedzi…"],
    pt: ["Molfar Vertep não está acessível", "O motor não responde. Verifica se está a correr no teu computador e se este dispositivo está na mesma rede. Esta página tenta de novo sozinha.", "Tentar de novo", "Ainda sem resposta…"],
    ru: ["Molfar Vertep недоступен", "Движок не отвечает. Проверьте, что он запущен на компьютере и что это устройство в той же сети. Страница сама попробует снова.", "Повторить", "Пока не отвечает…"],
    tr: ["Molfar Vertep’e ulaşılamıyor", "Motor yanıt vermiyor. Bilgisayarında çalıştığını ve bu cihazın aynı ağda olduğunu kontrol et. Bu sayfa kendiliğinden yeniden dener.", "Yeniden dene", "Hâlâ yanıt yok…"],
    uk: ["Molfar Vertep недоступний", "Рушій не відповідає. Перевірте, що він запущений на комп’ютері і що цей пристрій у тій самій мережі. Сторінка сама спробує ще раз.", "Спробувати ще", "Поки не відповідає…"],
    zh: ["无法连接 Molfar Vertep", "引擎没有响应。请确认它正在你的电脑上运行，并且此设备在同一网络中。此页面会自动重试。", "重试", "仍无响应…"],
  }
  let saved = null
  try {
    saved = localStorage.getItem("molfar-lang") || localStorage.getItem("chrysalis-lang")
  } catch {
    // blocked site data: fall back to the browser's language
  }
  const tags = [saved, navigator.language, ...(navigator.languages || [])].filter(Boolean)
  const lang = tags.map((t) => String(t).toLowerCase().split("-")[0]).find((t) => t in TEXT) || "en"
  const [title, body, retry, still] = TEXT[lang]
  document.documentElement.lang = lang
  document.getElementById("title").textContent = title
  document.getElementById("body").textContent = body
  const button = document.getElementById("retry")
  const status = document.getElementById("status")
  button.textContent = retry

  let checking = false
  const check = async (byHand) => {
    if (checking) return
    checking = true
    try {
      const res = await fetch("/v1/health", { cache: "no-store" })
      if (res.ok) {
        location.reload()
        return
      }
    } catch {
      // still down
    }
    checking = false
    if (byHand) status.textContent = still
  }
  button.addEventListener("click", () => check(true))
  setInterval(() => check(false), 5000)
  window.addEventListener("online", () => check(false))
})()
