// The shell guide's registry: every tip and tour. Data only; the logic is in guide.ts.
// A tip's `target` is a `data-guide` attribute somewhere in client/src. A new feature that
// users decide with gets a tip here with `since` = the release that ships it, so What's new
// points it out once. Ukrainian texts use the labels the Ukrainian shell shows
// (client/src/i18n/uk.ts), English texts the English ones.

import type { Tip, Tour } from "./guide.js"

/** Tips shown only while no model is connected yet (a tour step that is moot afterwards). */
export const ONLY_WITHOUT_MODEL: readonly string[] = ["tour.home.model"]

export const TIPS: Tip[] = [
  // ---- What's new ----
  {
    id: "new.ask-molfar",
    since: "1.0.9",
    target: "menu.report-bug",
    open: { view: "home", menu: "account" },
    help: "help",
    keywords: {
      en: "bug fix report error broken problem github send fix ask molfar first",
      uk: "помилка баг виправити виправлення зламалось проблема github надіслати запитати мольфара",
    },
    title: { en: "Ask Molfar before you report a bug", uk: "Спитайте Мольфара, перш ніж писати про помилку" },
    body: {
      en: "“Ask Molfar first” in Report a bug opens a new chat and sends your description at once, with your device details, the latest errors and the app’s name. They go to Molfar and the model you connected, not to GitHub. He looks for the cause and tries a fix in your app’s copy, and you test it. If it works, a card opens a form you can edit; the fix goes to GitHub only when you press Open on GitHub and submit there. If the cause is in Molfar Vertep itself he cannot fix it, and the card offers a report instead.",
      uk: "«Спершу спитайте Мольфара» у «Повідомити про помилку» відкриває новий чат і одразу надсилає ваш опис разом з даними пристрою, останніми помилками та назвою застосунку. Вони йдуть Мольфару і підключеній вами моделі, а не на GitHub. Він шукає причину й пробує виправити у копії вашого застосунку, а ви перевіряєте. Якщо працює, картка відкриває форму, яку можна змінити; виправлення потрапляє на GitHub, лише коли ви натиснете «Відкрити на GitHub» і надішлете там. Якщо причина в самому Molfar Vertep, він не може виправити, і картка пропонує звіт.",
    },
  },
  {
    id: "new.help",
    since: "1.0.9",
    target: "menu.help",
    open: { view: "home", menu: "account" },
    help: "help",
    keywords: {
      en: "help tips guide tutorial walkthrough tour what is new question how do i",
      uk: "довідка допомога підказки гайд тур навчання що нового питання як",
    },
    title: { en: "Help in the account menu", uk: "Довідка в меню облікового запису" },
    body: {
      en: "Help is a searchable list of short answers about Molfar Vertep, and “Show me” takes you to the place. Each screen also gets a short tour the first time you open it.",
      uk: "«Довідка» — це список коротких відповідей про Molfar Vertep з пошуком, а кнопка «Показати» веде до потрібного місця. Кожен екран також показує короткий тур, коли ви відкриваєте його вперше.",
    },
  },

  // ---- Getting started ----
  {
    id: "help.start.home",
    target: "home.apps",
    open: { view: "home" },
    help: "start",
    keywords: {
      en: "start page where to home open app launch picker roleplay details export delete",
      uk: "стартова сторінка куди головна відкрити застосунок запустити roleplay деталі експорт видалити",
    },
    title: { en: "The start page and your apps", uk: "Стартова сторінка й ваші застосунки" },
    body: {
      en: "“Where to?” lists Molfar and your apps. On a computer, click an app to see what is inside, then press Launch; the details also have an Export app icon, and Check for updates for apps with an update source. On a phone a tap opens it at once, and the (i) button shows the details. The trash icon deletes an app after asking.",
      uk: "«Куди?» показує Мольфара й ваші застосунки. На комп’ютері клацніть застосунок, щоб побачити, що всередині, і натисніть «Запустити»; у подробицях є також іконка «Експортувати застосунок» і «Перевірити оновлення» для застосунків із джерелом оновлень. На телефоні дотик відкриває його одразу, а кнопка (i) показує подробиці. Іконка кошика видаляє застосунок після підтвердження.",
    },
  },
  {
    id: "help.start.tabs",
    target: "header.tabs",
    open: { view: "home" },
    help: "start",
    keywords: {
      en: "tabs new tab plus close reorder drag molfar tab refresh",
      uk: "вкладки нова вкладка плюс закрити порядок перетягнути вкладка мольфара оновити сторінку",
    },
    title: { en: "Tabs", uk: "Вкладки" },
    body: {
      en: "Molfar and every app you open live in tabs. + opens a new tab (the start page), × closes one, and tabs can be dragged into any order. The tabs you had open come back after a refresh.",
      uk: "Мольфар і кожен відкритий застосунок живуть у вкладках. «+» відкриває нову вкладку (стартову сторінку), «×» закриває, а вкладки можна перетягувати. Відкриті вкладки повертаються після оновлення сторінки.",
    },
  },
  {
    id: "help.start.look",
    target: "menu.theme",
    open: { view: "home", menu: "account" },
    help: "start",
    keywords: {
      en: "theme dark light vertep colors appearance language account password name picture",
      uk: "тема темна світла вертеп кольори вигляд мова обліковий запис пароль ім’я зображення",
    },
    title: { en: "Theme, language, account", uk: "Тема, мова, обліковий запис" },
    body: {
      en: "Theme is in the account menu (top right): Vertep, Dark, Light, and any themes in your workspace. The language of the interface and your account (picture, name, password) are in Settings, General.",
      uk: "Тема — у меню облікового запису (вгорі праворуч): «Вертеп», «Темна», «Світла» та теми з вашого робочого простору. Мова інтерфейсу й обліковий запис (зображення, ім’я, пароль) — у «Налаштуваннях», «Загальні».",
    },
  },
  {
    id: "help.start.backup",
    target: "settings.backup",
    open: { view: "settings", section: "backup" },
    help: "start",
    keywords: {
      en: "backup export import profile move another computer restore migrate",
      uk: "резервна копія експорт імпорт профіль перенести інший комп’ютер відновити",
    },
    title: { en: "Move to another computer", uk: "Перенесення на інший комп’ютер" },
    body: {
      en: "Settings, Backup exports your whole profile: apps with their data, Molfar’s memory and chats. Add a password to include your API keys, encrypted. Import shows what is inside first; when you press Replace my profile, your current profile is saved to data/backups before it is replaced.",
      uk: "«Налаштування», «Резервна копія» експортує весь профіль: застосунки з даними, пам’ять і чати Мольфара. Додайте пароль, щоб ключі API потрапили в копію зашифрованими. Імпорт спершу показує вміст; коли ви натиснете «Замінити мій профіль», поточний профіль зберігається в data/backups, а потім замінюється.",
    },
  },

  // ---- Models ----
  {
    id: "help.models.connect",
    target: "settings.add-connection",
    open: { view: "settings", section: "api" },
    help: "models",
    keywords: {
      en: "model connect connection provider api key openrouter anthropic openai gemini deepseek add no model",
      uk: "модель підключити підключення провайдер ключ api openrouter anthropic openai gemini deepseek додати немає моделі",
    },
    title: { en: "Connect a model", uk: "Підключити модель" },
    body: {
      en: "Molfar and the apps need a model. In Settings, Connections and models, press Add connection, pick a provider and paste its API key. A connection shows Connected once it has a key (or needs none) and Needs key otherwise; that is not a test that the model works. Keys are stored on this computer only.",
      uk: "Мольфару й застосункам потрібна модель. У «Налаштуваннях», «Підключення та моделі» натисніть «Додати підключення», оберіть провайдера й вставте його ключ API. Підключення позначене «Підключено», коли має ключ (або ключ не потрібен), інакше «Потрібен ключ»; це не перевірка, що модель працює. Ключі зберігаються лише на цьому комп’ютері.",
    },
  },
  {
    id: "help.models.local",
    target: "settings.add-connection",
    open: { view: "settings", section: "api" },
    help: "models",
    keywords: {
      en: "local ollama lm studio llama.cpp kobold vllm subscription oauth custom endpoint openai compatible free model",
      uk: "локальна ollama lm studio llama.cpp kobold vllm підписка oauth власний endpoint сумісний з openai безкоштовна модель",
    },
    title: { en: "Subscription, local server or your own endpoint", uk: "Підписка, локальний сервер чи власна адреса" },
    body: {
      en: "When you press Add connection, the provider list also has Subscriptions (OAuth), where you sign in instead of pasting a key, Local model (Ollama, LM Studio, llama.cpp and others) and Custom endpoint for any OpenAI-compatible server.",
      uk: "Після «Додати підключення» в списку провайдерів є також «Підписки (OAuth)», де ви входите замість вставляння ключа, «Локальна модель» (Ollama, LM Studio, llama.cpp та інші) і «Власна кінцева точка» для будь-якого сервера, сумісного з OpenAI.",
    },
  },
  {
    id: "help.models.pick",
    target: "settings.quick-switch",
    open: { view: "settings", section: "api" },
    help: "models",
    keywords: {
      en: "models shown picker star favorite quick switch settings sliders list too many models",
      uk: "моделі показувати вибір зірочка обране швидке перемикання повзунки занадто багато моделей",
    },
    title: { en: "Which models show up", uk: "Які моделі показуються" },
    body: {
      en: "A connection can bring hundreds of models. In the list below, tick the ones the pickers should show (nothing ticked shows all), star the ones you switch between in chats (Quick switch), and use the sliders icon for a model’s own settings.",
      uk: "Підключення може принести сотні моделей. У списку нижче позначте ті, що мають показуватися у виборі (якщо нічого не позначено, показуються всі), додайте зірочкою ті, між якими перемикаєтесь у чатах («Швидке перемикання»), а іконка повзунків відкриває налаштування моделі.",
    },
  },
  {
    id: "help.models.vision",
    target: "settings.vision",
    open: { view: "settings", section: "api" },
    help: "models",
    keywords: {
      en: "vision picture image describe portrait multimodal photo",
      uk: "зображення картинки опис портрет мультимодальна фото",
    },
    title: { en: "Vision model", uk: "Модель для зображень" },
    body: {
      en: "Apps send pictures to this model, for example to describe a character from a portrait. Auto takes the cheapest model that reads pictures; if none of yours does, add a connection with one.",
      uk: "Застосунки надсилають зображення цій моделі, наприклад щоб описати персонажа за портретом. «Авто» бере найдешевшу модель, що вміє читати зображення; якщо жодна з ваших не вміє, додайте підключення з такою.",
    },
  },

  // ---- Apps ----
  {
    id: "help.apps.store",
    target: "home.store",
    open: { view: "home" },
    help: "apps",
    keywords: {
      en: "store install apps community official browse download find new roleplay",
      uk: "магазин встановити застосунки спільнота офіційні переглянути знайти нові roleplay",
    },
    title: { en: "Store", uk: "Магазин" },
    body: {
      en: "Apps from Molfar Vertep (marked Official App) and from the community. Install first shows what the app bundles and what it can reach, and nothing runs until you confirm. A badge counts apps added since you last looked.",
      uk: "Застосунки від Molfar Vertep (позначені «Офіційний») і від спільноти. «Встановити» спершу показує, що в застосунку і до чого він має доступ, і нічого не запускається, доки ви не підтвердите. Позначка рахує застосунки, додані після вашого останнього перегляду.",
    },
  },
  {
    id: "help.apps.new",
    target: "home.new-app",
    open: { view: "home" },
    help: "apps",
    keywords: {
      en: "new app create build make your own starter molfar builds",
      uk: "новий застосунок створити зробити власний стартовий мольфар будує",
    },
    title: { en: "New app", uk: "Новий застосунок" },
    body: {
      en: "Give it a name (an author is optional) and you get a starter app that Molfar builds out with you: describe what you want in his tab and watch it change.",
      uk: "Дайте йому назву (автор не обов’язковий), і отримаєте стартовий застосунок, який Мольфар розбудовує разом із вами: опишіть бажане в його вкладці й дивіться, як він змінюється.",
    },
  },
  {
    id: "help.apps.import",
    target: "home.import-app",
    open: { view: "home" },
    help: "apps",
    keywords: {
      en: "import app git repository github zip backup file restore plugin from file",
      uk: "імпорт застосунок git репозиторій github zip резервна копія файл відновити плагін з файлу",
    },
    title: { en: "Import an app", uk: "Імпорт застосунку" },
    body: {
      en: "Bring an app in from a git repository or from a backup file made with Export app. It is inspected first, and nothing runs until you have read what it bundles and confirmed. Only import what you trust: apps run real code on your server.",
      uk: "Додайте застосунок із git-репозиторію або з файлу, створеного через «Експортувати застосунок». Його спершу перевіряють, і нічого не запускається, доки ви не прочитаєте, що в ньому, і не підтвердите. Імпортуйте лише те, чому довіряєте: застосунки виконують справжній код на вашому сервері.",
    },
  },
  {
    id: "help.apps.split",
    target: "app.split",
    open: { view: "app" },
    help: "apps",
    keywords: {
      en: "split side by side molfar app live watch changes unsplit divider resize",
      uk: "розділити поруч мольфар застосунок наживо стежити зміни об’єднати роздільник розмір",
    },
    title: { en: "Split: Molfar and the app side by side", uk: "Розділення: Мольфар і застосунок поруч" },
    body: {
      en: "With an app open, Split puts Molfar on the left and the app live on the right, so you watch it change while you ask for edits. Drag the divider to resize; press Unsplit to go back. On a phone there is no room, and Molfar is just another tab.",
      uk: "Коли застосунок відкрито, «Розділити» ставить Мольфара ліворуч, а застосунок наживо праворуч, тож ви бачите зміни, поки просите правки. Роздільник можна перетягнути; «Об’єднати» повертає як було. На телефоні місця немає, і Мольфар — просто ще одна вкладка.",
    },
  },
  {
    id: "help.apps.tools",
    target: "app.toolbar",
    open: { view: "app" },
    help: "apps",
    keywords: {
      en: "fullscreen standalone install pwa plugins rebuild permissions git toolbar build",
      uk: "на весь екран окрема вкладка встановити pwa плагіни перезібрати дозволи git панель збірка",
    },
    title: { en: "Fullscreen, Plugins, Rebuild", uk: "На весь екран, Плагіни, Перезібрати" },
    body: {
      en: "Fullscreen opens the app in its own browser tab, which you can install like an app. Plugins lists this app’s plugins and imports more from git, with their permissions. Rebuild rebuilds the app right now. On a phone these three are in the account menu while an app is open.",
      uk: "«На весь екран» відкриває застосунок в окремій вкладці браузера, яку можна встановити як застосунок. «Плагіни» показують плагіни цього застосунку й імпортують нові з git разом з їхніми дозволами. «Перезібрати» перезбирає застосунок просто зараз. На телефоні ці три дії є в меню облікового запису, поки відкрито застосунок.",
    },
  },

  // ---- Molfar ----
  {
    id: "help.molfar.what",
    target: "home.molfar",
    open: { view: "home" },
    help: "molfar",
    keywords: {
      en: "molfar agent assistant ask build edit change app chat memory skills ask molfar button error",
      uk: "мольфар агент помічник запитати створити змінити застосунок чат пам’ять навички кнопка помилка",
    },
    title: { en: "Molfar, your agent", uk: "Мольфар, ваш агент" },
    body: {
      en: "Molfar builds, edits and manages your apps. He opens in his own tab: ask in plain words and look at what changes. When an app fails, its error bar has an Ask Molfar button that, when you press it, sends him the problem in a new chat.",
      uk: "Мольфар створює, змінює й веде ваші застосунки. Він відкривається у власній вкладці: просіть простими словами й дивіться, що змінюється. Коли застосунок падає, у смузі помилки є кнопка «Запитати Мольфара»: коли ви її натиснете, вона надішле йому проблему в новому чаті.",
    },
  },
  {
    id: "help.molfar.settings",
    target: "settings.agent",
    open: { view: "settings", section: "agent" },
    help: "molfar",
    keywords: {
      en: "instructions persona protected files sandbox internet ask permission safety agents.md context compact",
      uk: "інструкції персона захищені файли пісочниця інтернет дозвіл безпека контекст стиснення",
    },
    title: { en: "Molfar’s instructions and limits", uk: "Інструкції й межі Мольфара" },
    body: {
      en: "Settings, Molfar holds your standing instructions for him, the list of protected files he may change only after you allow it in the chat, his internet access in the sandbox, and when long chats are folded into a summary.",
      uk: "«Налаштування», «Мольфар» містять ваші постійні інструкції для нього, список захищених файлів, які він змінює лише після вашого дозволу в чаті, його доступ до інтернету в пісочниці та те, коли довгі чати згортаються в підсумок.",
    },
  },
  {
    id: "help.molfar.small",
    target: "settings.agent",
    open: { view: "settings", section: "agent" },
    help: "molfar",
    keywords: {
      en: "small model free model context window short prompt tools limit slow cheap openrouter",
      uk: "мала модель безкоштовна модель вікно контексту короткий промпт інструменти ліміт дешева openrouter",
    },
    title: { en: "Small or free models", uk: "Малі чи безкоштовні моделі" },
    body: {
      en: "A model with a small context window can drown in Molfar’s full instructions. Small-model mode (Settings, Molfar) sends a shorter prompt and only the core tools, and loads the rest when a task needs it. Auto switches it on for 32k tokens or less, or when the size is unknown.",
      uk: "Модель з малим вікном контексту може потонути в повних інструкціях Мольфара. «Режим малої моделі» («Налаштування», «Мольфар») надсилає коротший запит і лише основні інструменти, а решту підвантажує, коли завдання цього потребує. «Авто» вмикає його для 32k токенів і менше або коли розмір невідомий.",
    },
  },
  {
    id: "help.molfar.memory",
    target: "settings.memory",
    open: { view: "settings", section: "memory" },
    help: "molfar",
    keywords: {
      en: "memory embeddings meaning search semantic openrouter lorebook find",
      uk: "пам’ять вектори зміст пошук семантичний openrouter лорбук знайти",
    },
    title: { en: "Memory that finds by meaning", uk: "Пам’ять, що шукає за змістом" },
    body: {
      en: "Settings, Memory can make memory and lorebooks match by meaning, not only exact words. It is optional and uses one cheap embedding model (about $0.02 per million tokens); without it they match by words only.",
      uk: "«Налаштування», «Пам’ять» можуть зіставляти пам’ять і лорбуки за змістом, а не лише за точними словами. Це необов’язково й використовує одну дешеву модель вбудовувань (близько $0,02 за мільйон токенів); без неї зіставлення йде лише за словами.",
    },
  },

  // ---- Updates ----
  {
    id: "help.updates.panel",
    target: "header.updates",
    open: { view: "home" },
    help: "updates",
    keywords: {
      en: "update upgrade new version check apps release download badge dot",
      uk: "оновлення оновити нова версія перевірити застосунки реліз завантажити позначка крапка",
    },
    title: { en: "Updates", uk: "Оновлення" },
    body: {
      en: "The download icon in the top bar gets a dot when something is waiting. It lists every app that has an update source, with Check now. Update all appears when two or more apps wait, and never includes Molfar Vertep itself. The “Update” badge on an app on the start page means the same.",
      uk: "На іконці завантаження вгорі з’являється крапка, коли щось очікує. Вона показує кожен застосунок із джерелом оновлень, з кнопкою «Перевірити зараз». «Оновити все» з’являється, коли чекають два чи більше застосунків, і ніколи не включає сам Molfar Vertep. Позначка «Оновити» біля застосунку на стартовій сторінці означає те саме.",
    },
  },
  {
    id: "help.updates.app",
    help: "updates",
    keywords: {
      en: "update conflict merge keep mine take update my edits changed overlap molfar merge",
      uk: "оновлення конфлікт злиття залишити моє взяти оновлення мої правки зміни перетин",
    },
    title: { en: "Updating an app you have changed", uk: "Оновлення застосунку, який ви змінювали" },
    body: {
      en: "Your own edits are merged into an update and your data is kept. Where they overlap with the new version nothing changes yet: you choose Keep mine, Take update, or Ask Molfar to merge. An update that installs new packages or asks for new permissions waits for your OK.",
      uk: "Ваші власні правки зливаються з оновленням, а дані зберігаються. Якщо вони перетинаються з новою версією, нічого ще не змінюється: ви обираєте «Залишити моє», «Взяти оновлення» або «Попросити Мольфара об’єднати». Оновлення, що ставить нові пакети чи просить нових дозволів, чекає вашого підтвердження.",
    },
  },
  {
    id: "help.updates.engine",
    target: "home.version",
    open: { view: "home" },
    help: "updates",
    keywords: {
      en: "engine version update molfar vertep release new version restart launcher source",
      uk: "рушій версія оновлення molfar vertep реліз нова версія перезапуск запускач код",
    },
    title: { en: "Updating Molfar Vertep itself", uk: "Оновлення самого Molfar Vertep" },
    body: {
      en: "The version is at the bottom of the start page. When a newer one exists, the administrator sees a notice there and a row in Updates. Where this copy can update itself, a button installs it; otherwise the notice links to the release page, and a copy that runs from source updates by restarting it with its launcher.",
      uk: "Версія вказана внизу стартової сторінки. Коли є новіша, адміністратор бачить там сповіщення і рядок в «Оновленнях». Якщо ця копія може оновитися сама, кнопка встановлює оновлення; інакше сповіщення веде на сторінку релізу, а копію, запущену з коду, оновлюють перезапуском через її запускач.",
    },
  },

  // ---- Help and bugs ----
  {
    id: "help.bug.menu",
    target: "menu.report-bug",
    open: { view: "home", menu: "account" },
    help: "help",
    keywords: {
      en: "bug report problem issue error broken github discord screenshot feedback",
      uk: "помилка баг повідомити проблема збій зламалось github discord знімок екрана відгук",
    },
    title: { en: "Report a bug", uk: "Повідомити про помилку" },
    body: {
      en: "In the account menu: describe what happened, check the device and browser, take a screenshot on a computer, then open a pre-filled GitHub issue (it needs a free account) or copy the text for Discord. Versions, screen size and the latest errors go with it. Nothing is sent from here, you read it first. The one exception is the Ask Molfar first block: it hands the text to Molfar, not to GitHub.",
      uk: "У меню облікового запису: опишіть, що сталося, перевірте пристрій і браузер, зробіть знімок екрана на комп’ютері, а тоді відкрийте заповнене звернення на GitHub (потрібен безкоштовний обліковий запис) або скопіюйте текст для Discord. Версії, розмір екрана й останні помилки додаються. Звідси нічого не надсилається, ви спершу все читаєте. Єдиний виняток — блок «Спершу спитайте Мольфара»: він передає текст Мольфару, а не на GitHub.",
    },
  },
  {
    id: "help.bug.footer",
    target: "home.report-bug",
    open: { view: "home" },
    help: "help",
    keywords: {
      en: "bug report github discord community footer start page link",
      uk: "помилка баг повідомити github discord спільнота підвал стартова сторінка посилання",
    },
    title: { en: "Report a bug from the start page", uk: "Повідомити про помилку зі стартової сторінки" },
    body: {
      en: "The bottom of the start page has the same Report a bug, next to the Discord link (and GitHub, where this copy knows its repository).",
      uk: "Унизу стартової сторінки є те саме «Повідомити про помилку», поруч із посиланням на Discord (і на GitHub, якщо ця копія знає свій репозиторій).",
    },
  },
  {
    id: "help.tours",
    target: "settings.guide",
    open: { view: "settings", section: "general" },
    help: "help",
    keywords: {
      en: "guide tour tours what is new replay again walkthrough tutorial turn off hints",
      uk: "гайд тур тури що нового повторити знову навчання вимкнути підказки",
    },
    title: { en: "Tours and What’s new", uk: "Тури й «Що нового»" },
    body: {
      en: "A short tour starts the first time you open a screen, and What’s new shows after an update. In Settings, General, Guide you can turn the tours off, play them again, or show What’s new again.",
      uk: "Короткий тур починається, коли ви вперше відкриваєте екран, а «Що нового» показується після оновлення. У «Налаштуваннях», «Загальні», «Гайд» тури можна вимкнути, пройти знову або знову показати «Що нового».",
    },
  },

  // ---- Tour steps (not in the help list) ----
  {
    id: "tour.home.model",
    target: "header.settings",
    title: { en: "Connect a model first", uk: "Спершу підключіть модель" },
    body: {
      en: "Molfar and the apps need a model to answer. Open Settings (the gear; on a phone, the account menu at the top right), then Connections and models, then Add connection. Pick a provider and paste its key. Keys are stored on this computer only.",
      uk: "Мольфару й застосункам потрібна модель, щоб відповідати. Відкрийте «Налаштування» (шестерня; на телефоні — меню облікового запису вгорі праворуч), далі «Підключення та моделі» і «Додати підключення». Оберіть провайдера й вставте його ключ. Ключі зберігаються лише на цьому комп’ютері.",
    },
  },
  {
    id: "tour.home.welcome",
    target: "home.welcome",
    title: { en: "Pick your first apps", uk: "Оберіть перші застосунки" },
    body: {
      en: "The official apps are ticked for you; untick any you do not want, then press Install. The first one that installs opens. Skip to look around first: the Store has them any time.",
      uk: "Офіційні застосунки вже позначені; зніміть позначку з зайвих і натисніть «Встановити». Перший встановлений застосунок відкриється. «Пропустити», щоб спершу роздивитись: у магазині вони є завжди.",
    },
  },
  {
    id: "tour.home.apps",
    target: "home.apps",
    title: { en: "Your apps", uk: "Ваші застосунки" },
    body: {
      en: "One row per app. On a computer, click a row to see what is inside, then press Launch; on a phone a tap opens it. An installed app such as Roleplay opens the same way.",
      uk: "Один рядок на застосунок. На комп’ютері клацніть рядок, щоб побачити вміст, і натисніть «Запустити»; на телефоні дотик відкриває його. Встановлений застосунок, наприклад Roleplay, відкривається так само.",
    },
  },
  {
    id: "tour.home.molfar",
    target: "home.molfar",
    title: { en: "Molfar", uk: "Мольфар" },
    body: {
      en: "Your agent. He builds, edits and manages your apps in a tab of his own. Ask in plain words and look at what changes.",
      uk: "Ваш агент. Він створює, змінює й веде ваші застосунки у власній вкладці. Просіть простими словами й дивіться, що змінюється.",
    },
  },
  {
    id: "tour.home.add",
    target: "home.add",
    title: { en: "Add more", uk: "Додайте ще" },
    body: {
      en: "Store: apps from Molfar Vertep and the community. New app: a starter Molfar builds out with you. Import app: from git or a backup file.",
      uk: "«Магазин»: застосунки від Molfar Vertep і спільноти. «Новий застосунок»: заготовка, яку Мольфар розбудовує разом із вами. «Імпортувати застосунок»: з git або з файлу копії.",
    },
  },
  {
    id: "tour.app.tabs",
    target: "header.tabs",
    title: { en: "Tabs", uk: "Вкладки" },
    body: {
      en: "Molfar and every app you open get a tab. + opens a new tab (the start page), × closes one, and tabs can be dragged into any order.",
      uk: "Мольфар і кожен відкритий застосунок мають вкладку. «+» відкриває нову вкладку (стартову сторінку), «×» закриває, а вкладки можна перетягувати.",
    },
  },
  {
    id: "tour.app.split",
    target: "app.split",
    title: { en: "Split", uk: "Розділити" },
    body: {
      en: "Puts Molfar on the left and this app live on the right, so you watch it change while you ask for edits. Press it again to unsplit.",
      uk: "Ставить Мольфара ліворуч, а цей застосунок наживо праворуч, тож ви бачите зміни, поки просите правки. Натисніть ще раз, щоб об’єднати.",
    },
  },
  {
    id: "tour.app.toolbar",
    target: "app.toolbar",
    title: { en: "Fullscreen, Plugins, Rebuild", uk: "На весь екран, Плагіни, Перезібрати" },
    body: {
      en: "Fullscreen opens this app in its own browser tab, which you can install. Plugins shows this app’s plugins and imports more from git. Rebuild rebuilds the app right now.",
      uk: "«На весь екран» відкриває застосунок в окремій вкладці браузера, яку можна встановити. «Плагіни» показують плагіни застосунку й імпортують нові з git. «Перезібрати» перезбирає застосунок просто зараз.",
    },
  },
  {
    id: "tour.app.menu",
    target: "header.account",
    title: { en: "Your menu", uk: "Ваше меню" },
    body: {
      en: "Settings, Help, Theme and Report a bug are here. On a phone this menu also holds this app’s Fullscreen, Plugins and Rebuild.",
      uk: "Тут «Налаштування», «Довідка», «Тема» і «Повідомити про помилку». На телефоні це меню також містить «На весь екран», «Плагіни» й «Перезібрати» для цього застосунку.",
    },
  },
  {
    id: "tour.settings.api",
    target: "settings.api",
    title: { en: "Connections and models", uk: "Підключення та моделі" },
    body: {
      en: "Add a connection to a provider, a local server or your own endpoint. Then choose which models the pickers show and star the ones you switch between.",
      uk: "Додайте підключення до провайдера, локального сервера чи власної адреси. Потім оберіть, які моделі показувати у виборі, і позначте зірочкою ті, між якими перемикаєтесь.",
    },
  },
  {
    id: "tour.settings.agent",
    target: "settings.agent",
    title: { en: "Molfar", uk: "Мольфар" },
    body: {
      en: "How Molfar behaves: your standing instructions, the files he must ask about first, and a mode for small models.",
      uk: "Як поводиться Мольфар: ваші постійні інструкції, файли, про які він мусить спершу спитати, і режим для малих моделей.",
    },
  },
  {
    id: "tour.settings.general",
    target: "settings.general",
    title: { en: "General", uk: "Загальні" },
    body: {
      en: "The language of the interface and your account: picture, name, password. The Guide block here plays the tours again.",
      uk: "Мова інтерфейсу й ваш обліковий запис: зображення, ім’я, пароль. Блок «Гайд» тут запускає тури знову.",
    },
  },
  {
    id: "tour.settings.backup",
    target: "settings.backup",
    title: { en: "Backup", uk: "Резервна копія" },
    body: {
      en: "Export your whole profile to move to another computer. Add a password to include your API keys, encrypted.",
      uk: "Експортуйте весь профіль, щоб перенести на інший комп’ютер. Додайте пароль, щоб ключі API потрапили в копію зашифрованими.",
    },
  },
  {
    id: "tour.store.list",
    target: "store.list",
    title: { en: "Apps to install", uk: "Застосунки для встановлення" },
    body: {
      en: "Official apps are made by Molfar Vertep, Community ones by other people. Install only what you trust.",
      uk: "Офіційні застосунки створює Molfar Vertep, застосунки зі «Спільноти» — інші люди. Встановлюйте лише те, чому довіряєте.",
    },
  },
  {
    id: "tour.store.install",
    target: "store.install",
    title: { en: "Install", uk: "Встановити" },
    body: {
      en: "Shows what the app bundles and what it can reach first. Nothing runs until you confirm.",
      uk: "Спершу показує, що в застосунку і до чого він має доступ. Нічого не запускається, доки ви не підтвердите.",
    },
  },
  {
    id: "tour.store.refresh",
    target: "store.refresh",
    title: { en: "Refresh", uk: "Оновити" },
    body: {
      en: "Asks the Store for new apps. A badge on the start page counts the ones added since you last looked.",
      uk: "Питає магазин про нові застосунки. Позначка на стартовій сторінці рахує ті, що додані після вашого останнього перегляду.",
    },
  },
]

export const TOURS: Tour[] = [
  { id: "shell.home", place: "shell.home", steps: ["tour.home.model", "tour.home.welcome", "tour.home.apps", "tour.home.molfar", "tour.home.add"] },
  { id: "shell.app", place: "shell.app", steps: ["tour.app.tabs", "tour.app.split", "tour.app.toolbar", "tour.app.menu"] },
  { id: "shell.settings", place: "shell.settings", steps: ["tour.settings.api", "tour.settings.agent", "tour.settings.general", "tour.settings.backup"] },
  { id: "shell.store", place: "shell.store", steps: ["tour.store.list", "tour.store.install", "tour.store.refresh"] },
]
