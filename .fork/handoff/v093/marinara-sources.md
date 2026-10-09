<!-- 0.9.3 item 8. Research only. Drafted by an external model from Marinara Engine's Card Browser sources
(main, 2026-10-09: docs/characters/bot-browser.md, server routes bot-browser-*.routes.ts, services/bot-browser,
an excerpt of BotBrowserView.tsx), then checked by Claude Code against those files. Marinara is AGPL-3.0
(not MIT as the task said); we take ideas, not code. In Ukrainian at the user's request. -->

# Marinara: як підключено джерела карток (пункт 8 для 0.9.3)

## 1. Загальна архітектура

**З коду:** Marinara використовує єдиний реєстр провайдерів `ALL_PROVIDERS` зі спільним інтерфейсом `ProviderConfig`: кожен провайдер реалізує `search()` і `fetchDetail()`, які повертають нормалізовані об'єкти `BrowseCard` та `CardDetail`. Клієнтська частина викликає пошук через серверні маршрути `/api/bot-browser/{provider}/...`, які проксірують запити до API джерел. Знайдена картка проходить через `prepareCardImport`, яка отримує PNG/JSON, парсить його через `parsePngCharacterCard` і додає метадані (`_botBrowserSource`) перед імпортом у бібліотеку персонажів.

## 2. Порівняльна таблиця джерел

| Джерело | Пошук | Завантаження | Auth | Крихкість | Дії при блокуванні | Чи можна нам так само (без обходу захисту) |
|---|---|---|---|---|---|---|
| **Pygmalion** | Публічний Connect RPC API через сервер Marinara (`server.pygmalion.chat`) | Через той самий API: Character RPC повертає дані персонажа | None для SFW; опційний токен з localStorage `authn` для NSFW (зберігається лише в RAM сервера) | **Low** — стабільний офіційний API | Сервіс просто повертає помилку; UI показує toast | **Yes** — використовує публічний API; токен лише за явною дією користувача |
| **Wyvern** | Публічний JSON API через сервер (`api.wyvern.chat/exploreSearch`) | Через `api.wyvern.chat/characters/{id}` | None | **Medium** — API може змінюватись; деякі фільтри на UI не працюють (код сам це визнає) | Помилка пошуку; користувачу пропонують спробувати пізніше | **Yes** — легальний публічний API |
| **DataCat** | Публічний JSON API через сервер (`datacat.run/api/characters/recent-public`), з авто-мінтом session token | Через `datacat.run/api/characters/{id}/download` | Автоматичний анонімний session token (сервер сам мінтить через `/api/liberator/identify`) | **Medium** — залежить від внутрішнього API агрегатора; мінтинг токена може зламатись | Помилка; потрібно оновлення Marinara | **Yes** — публічний API, токен анонімний, не обходить Cloudflare |
| **CharacterTavern** | Не працює (unavailable) | Не працює | None | **High** — сайт перебудований, старого API більше немає | Показує `ProviderUnavailableNotice` з кнопками "відкрити сайт" і "імпортувати файл" | **Yes** — Marinara не намагається обійти, просто показує чесне повідомлення |
| **JannyAI** (для порівняння) | Гібрид: скрейпинг токена на сервері + **MeiliSearch POST з браузера** напряму (`search.jannyai.com`) | Браузерний `POST api.jannyai.com/api/v1/download` з `credentials: "include"`, fallback на серверний проксі | Користувацька браузерна сесія (cookies, cf_clearance) | **High** — HTML-скрейпинг, Cloudflare, ротація токенів, публічний fallback-токен | Інструкція "відвідайте jannyai.com і пройдіть Cloudflare вручну"; fallback на corsproxy.io | **Yes with the user's own action** — але є сіра зона (див. §5) |

## 3. JannyAI one-click download — точний механізм

**З коду (певно):**

1. `fetchCompleteJannyCard(characterId)` виконує `fetch("https://api.jannyai.com/api/v1/download", { method: "POST", credentials: "include", ... })` з тілом `{ characterId }`.
2. Очікує JSON: `{ status: "ok", downloadUrl: "https://..." }` — обов'язково HTTPS.
3. Потім виконує другий `fetch(downloadUrl, { credentials: "include", headers: { Accept: "image/png,..." } })` для отримання PNG-картки.
4. При будь-якій помилці (мережа, non-OK, невалідний URL) — fallback на серверний маршрут `/api/bot-browser/janny/download/{id}`.

**З коду (інференція про CORS):** Використання `credentials: "include"` означає, що `api.jannyai.com` має повертати `Access-Control-Allow-Origin`, що точно відповідає origin сторінки (не `*`), і `Access-Control-Allow-Credentials: true`. Це **прямо покладається** на CORS-дозвіл з боку JannyAI для Marinara-походження. У коментарі до MeiliSearch зазначено, що там `Access-Control-Allow-Origin: *` і тому credentials **навмисно опущено** — це підтверджує, що для download API CORS-політика інша (дозволяє credentials).

**Чого не певно з коду:** чи JannyAI дійсно відповідає на браузерний POST без Cloudflare-челенджу, чи залежить від наявності `cf_clearance` cookie, і чи той download URL підписаний та одноразовий. Коментар говорить, що "Cloudflare can reject Marinara's server while accepting the user's real browser session" — це інференція розробників, не доведений факт у коді.

## 4. Дизайн-ідеї для нашого Store

1. **Реєстр провайдерів зі спільним `ProviderConfig`**  
   *Чому:* дозволяє додавати RisuRealm, CharaVault, direct URLs без зміни UI-шару.  
   *Ризик:* початкова абстракція може не врахувати особливості джерел (відео, колекції, версії).

2. **Клієнтський download з користувацькою сесією + серверний fallback**  
   *Чому:* знижує навантаження на сервер і дозволяє використовувати cookies користувача.  
   *Ризик:* CORS може бути відсутній; потрібен fallback; не можна покладатись як на основний шлях.

3. **Login modal для age-gated джерел**  
   *Чому:* чітка явна дія користувача, токен лише в пам'яті.  
   *Ризик:* підтримка різних схем auth (token, cookie, OAuth) — складність зростає.

4. **"Save as PNG" для кожного провайдера**  
   *Чому:* дає користувачу локальний бекап і незалежність від API.  
   *Ризик:* якщо джерело не віддає повну картку, PNG буде неповним.

5. **`UnavailableProviderNotice` замість зламаного провайдера**  
   *Чому:* чесна поведінка при зміні сайту джерела; зберігає UX.  
   *Ризик:* потрібно вчасно виявляти "зламаність" і оновлювати notice.

## 5. Червоні прапорці для нас

**З коду:**

- **JannyAI scraping:** сервер скрейпить HTML (`fetchJannyPage`) для вилучення MeiliSearch-токена, і навіть має **публічний fallback-токен** `JANNY_FALLBACK_TOKEN` — це сіра зона щодо ToS.
- **Скрейпинг Astro island props** для JannyAI — парсинг HTML за відсутності API може порушувати умови сайту.
- **Pyгmalion токен** приймається від користувача і зберігається в пам'яті сервера — це ок, але лише тому, що користувач сам його вставляє. Нам не можна робити це автоматично.
- **DataCat мінтить session token автоматично** — це анонімний токен, але все одно створює "обліковий запис" без відома користувача.

**Інференція (не з коду, але помітно):**

- Використання `corsproxy.io` для обходу CORS/Cloudflare — **ми не повинні цього робити**, навіть через публічний проксі. Це може бути розцінено як обхід захисту.
- Імітація Browser User-Agent на сервері (`BROWSER_UA`) — формально це може бути сприйнято як маскування серверного трафіку під браузерний, що суперечить нашій політиці "не обходимо захист".
- Коментар про "Cloudflare may see browser TLS fingerprint" у JannyAI search — Marinara намагається обійти Cloudflare через TLS fingerprinting, навіть якщо не завжди успішно. **Ми не повинні наслідувати цей підхід.**

## Перевірено по коду (Claude Code)
- Підтверджено: `corsproxy.io` як запасний шлях для сторінок JannyAI (`bot-browser-janny.routes.ts`), вшитий `JANNY_FALLBACK_TOKEN` для пошуку MeiliSearch, анонімний токен DataCat через `/api/liberator/identify`, Pygmalion через публічний Connect API `server.pygmalion.chat/galatea.v1.PublicCharacterService`, Wyvern через `api.wyvern.chat`, CharacterTavern позначено як недоступне.
- Висновок про CORS для JannyAI (§3) лише здогадка з коду. Перевіряти треба в нашому браузері, як і сказано в пункті 4.
- Зауваження про браузерний User-Agent стосується і нас: chub-гілка вже шле `BROWSER_UA`, бо інакше gateway.chub.ai не відповідає. Поведінку chub не змінюємо (правило 0.9.3). Нові джерела шлють чесний `Molfar-Vertep/<версія>`.
- Для нас не годиться: corsproxy.io, вшиті чужі токени, автоматичне створення сесій DataCat без дії користувача.
- Можна взяти пізніше (не в плані 0.9.3): Wyvern (публічний JSON без ключа) і Pygmalion (публічний API; NSFW лише з токеном, який користувач вставляє сам).
