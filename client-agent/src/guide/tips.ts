// The Molfar page's guide: tips (the help list) and tours. Data only; the logic is guide.ts.
// A tip's `target` is a `data-guide` attribute somewhere in client-agent/src. `open.panel`
// names what "Show me" opens first (see guide-host.tsx). The page's own labels are English,
// so the Ukrainian texts quote them in English, inside «».

import type { Tip, Tour } from "./guide.js"

export const AGENT_TIPS: Tip[] = [
  // ---- Chatting ----
  {
    id: "help.chat.composer",
    target: "agent.composer",
    open: { view: "agent", panel: "chat" },
    help: "chat",
    keywords: {
      en: "write message send enter shift newline attach image picture draft voice dictate phone keyboard",
      uk: "написати повідомлення надіслати enter shift новий рядок додати зображення картинка чернетка голос телефон клавіатура",
    },
    title: { en: "Writing to Molfar", uk: "Як писати Мольфару" },
    body: {
      en: "Type in the box and press Enter to send; Shift+Enter starts a new line. On a phone Enter is a new line and the arrow button sends. The + adds an image, and a message you did not send is kept for that chat.",
      uk: "Пишіть у полі й натисніть Enter, щоб надіслати; Shift+Enter — новий рядок. На телефоні Enter дає новий рядок, а надсилає кнопка зі стрілкою. «+» додає зображення, а ненадіслане повідомлення зберігається для цього чату.",
    },
  },
  {
    id: "help.chat.slash",
    target: "agent.composer",
    open: { view: "agent", panel: "chat" },
    help: "chat",
    keywords: {
      en: "slash command / new compact template card lorebook preset fix skill my commands menu",
      uk: "слеш команда / new compact шаблон картка лорбук пресет skill мої команди меню",
    },
    title: { en: "Slash commands", uk: "Команди зі слешем" },
    body: {
      en: "Type / for a menu: /new starts a chat and /compact summarizes this one, both at once. Templates (/card, /lorebook, /preset, /fix, /skill) start a job and appear only when their skill is installed: /card and /fix fill the box for you to finish, the others send at once. Your own commands from the commands folder and the skills fill the box too.",
      uk: "Введіть /, щоб побачити меню: /new починає чат, а /compact стискає цей, обидві дії відразу. Шаблони (/card, /lorebook, /preset, /fix, /skill) запускають завдання й з’являються, лише якщо встановлено їхню навичку: /card і /fix заповнюють поле, щоб ви дописали, решта надсилаються відразу. Ваші команди з теки commands і навички теж заповнюють поле.",
    },
  },
  {
    id: "help.chat.mention",
    target: "agent.composer",
    open: { view: "agent", panel: "chat" },
    help: "chat",
    keywords: {
      en: "at mention @ file character lorebook preset name path reference",
      uk: "згадка @ файл персонаж лорбук пресет назва шлях посилання",
    },
    title: { en: "@ names a file, character, lorebook or preset", uk: "@ називає файл, персонажа, лорбук чи пресет" },
    body: {
      en: "Type @ and pick a file from your workspace, or a character, lorebook or preset of an app by its name. The message then carries its path, so Molfar looks at exactly that one instead of guessing.",
      uk: "Введіть @ і оберіть файл вашого робочого простору або персонажа, лорбук чи пресет застосунку за назвою. Повідомлення міститиме його шлях, тож Мольфар дивиться саме на нього, а не здогадується.",
    },
  },
  {
    id: "help.chat.quick",
    target: "agent.quick",
    open: { view: "agent", panel: "chat" },
    help: "chat",
    keywords: {
      en: "quick actions starter cards chips grid shorter simpler apply proposal template continue",
      uk: "швидкі дії стартові картки чипи сітка коротше простіше apply proposal шаблон продовжити",
    },
    title: { en: "Quick actions", uk: "Швидкі дії" },
    body: {
      en: "A new chat shows Start something new cards (a 2x2 grid on a phone) when their skill is installed, and Continue reopens your latest chat. In a chat with messages, the chips above the box do the same while the box is empty (computer only). Under the last reply, Shorter, Simpler and Apply proposal (unless that reply changed an app) send a ready message.",
      uk: "Новий чат показує картки «Start something new» (на телефоні — сітка 2x2), якщо встановлено їхню навичку, а «Continue» знову відкриває ваш останній чат. У чаті з повідомленнями чипи над полем роблять те саме, поки поле порожнє (лише на комп’ютері). Під останньою відповіддю «Shorter», «Simpler» і «Apply proposal» (якщо ця відповідь не змінювала застосунок) надсилають готове повідомлення.",
    },
  },
  {
    id: "help.chat.model",
    target: "agent.model",
    open: { view: "agent", panel: "chat" },
    help: "chat",
    keywords: {
      en: "model picker reasoning thinking level switch star favorite quick switch which models free",
      uk: "модель вибір міркування рівень перемкнути зірочка обране швидке перемикання які моделі безкоштовна",
    },
    title: { en: "Model and reasoning", uk: "Модель і міркування" },
    body: {
      en: "The model picker (on a phone, the chip above the box) lists your starred models first, then the ones you chose to show; a search also finds hidden ones. A Reasoning choice appears only for models that have levels. Which models show or are starred is set in the shell’s Settings, Connections and models.",
      uk: "Вибір моделі (на телефоні — чип над полем) спершу показує ваші відмічені зірочкою моделі, потім ті, що ви обрали показувати; пошук знаходить і приховані. «Reasoning» з’являється лише для моделей з рівнями. Які моделі показувати чи відмічати, налаштовується в «Налаштуваннях» оболонки, «Підключення та моделі».",
    },
  },
  {
    id: "help.chat.edit",
    help: "chat",
    keywords: {
      en: "edit message regenerate refresh retry copy branch previous next version rewrite rerun",
      uk: "редагувати повідомлення перегенерувати оновити повторити копіювати гілка попередня наступна версія",
    },
    title: { en: "Edit, retry, versions", uk: "Редагування, повтор, версії" },
    body: {
      en: "Hover a message for its buttons. On a reply, Copy copies it and Refresh asks again. On your message, Edit lets you rewrite it. Edit and Refresh remove that message and everything after it from the chat, then run again from that point; the old reply is not kept, and changes already made to apps are not undone (use Undo for that).",
      uk: "Наведіть на повідомлення, щоб побачити кнопки. На відповіді «Copy» копіює її, а «Refresh» питає знову. На вашому повідомленні «Edit» дає переписати його. «Edit» і «Refresh» прибирають це повідомлення й усе після нього з чату та запускають знову з цього місця; стара відповідь не зберігається, а зміни, вже внесені в застосунки, не скасовуються (для цього є «Undo»).",
    },
  },

  // ---- Safety and undo ----
  {
    id: "help.safety.modes",
    target: "agent.mode",
    open: { view: "agent", panel: "chat" },
    help: "safety",
    keywords: {
      en: "mode full accept plan permission ask before shell commands read only safe",
      uk: "режим full accept plan дозвіл питати перед командами оболонки лише читання безпечно",
    },
    title: { en: "Mode: Full, Accept, Plan", uk: "Режим: Full, Accept, Plan" },
    body: {
      en: "Mode is what Molfar may do without asking. Full plans big changes first, then edits and runs commands. Accept skips the plan step and asks before each shell command. Plan only reads and plans, and changes nothing. The choice is kept in this browser.",
      uk: "«Mode» — що Мольфар може робити, не питаючи. «Full» спершу планує великі зміни, потім редагує й виконує команди. «Accept» пропускає крок плану й питає перед кожною командою оболонки. «Plan» лише читає й планує та нічого не змінює. Вибір зберігається в цьому браузері.",
    },
  },
  {
    id: "help.safety.approve",
    help: "safety",
    keywords: {
      en: "allow deny approve permission protected files shell command always allow ask card",
      uk: "дозволити заборонити схвалити дозвіл захищені файли команда оболонки завжди дозволяти картка",
    },
    title: { en: "When Molfar asks", uk: "Коли Мольфар питає" },
    body: {
      en: "Molfar asks before it changes a protected file: a card with Allow or Don’t allow, valid for that request only (the next one asks again). That includes shell commands that write to such a file, in any mode. By default the protected files are an app’s src folder and index.html; persona.md and model-params.json are always protected. The list is in the shell’s Settings, Molfar, Protected files. In Accept mode every shell command also waits for a card with Run it or Skip. In Full mode a big change first shows a plan card (Go on, Smaller, Stop). Nothing runs until you answer.",
      uk: "Мольфар питає перед зміною захищеного файлу: картка з «Allow» або «Don’t allow» діє лише для цього запиту (наступний питатиме знову). Це стосується й команд оболонки, що пишуть у такий файл, у будь-якому режимі. За замовчуванням захищені тека src застосунку та index.html; persona.md і model-params.json захищені завжди. Список — у «Налаштуваннях» оболонки, «Мольфар», «Захищені файли». У режимі «Accept» кожна команда оболонки теж чекає картку з «Run it» або «Skip». У режимі «Full» велика зміна спершу показує картку плану («Go on», «Smaller», «Stop»). Нічого не виконується, доки ви не відповісте.",
    },
  },
  {
    id: "help.safety.undo",
    target: "agent.run-checkpoints",
    open: { view: "agent", panel: "chat" },
    help: "safety",
    keywords: {
      en: "undo changed files revert restore app code mistake bring back checkpoint run",
      uk: "скасувати змінено файли повернути відновити код застосунку помилка контрольна точка запуск",
    },
    title: { en: "Undo what Molfar changed", uk: "Скасувати зміни Мольфара" },
    body: {
      en: "When a run changes an app, the line “Changed <app> · N files · Undo” sits under the reply. Undo asks first (it says if later runs changed the same app, which are undone too), then puts the app’s code back to how it was before that run. Data, chats and uploads stay. The state you leave is saved too, so the undo can be undone.",
      uk: "Коли запуск змінює застосунок, під відповіддю є рядок «Changed <app> · N files · Undo». «Undo» спершу питає (і каже, якщо пізніші запуски змінювали той самий застосунок, їх теж буде скасовано), а тоді повертає код застосунку до стану перед цим запуском. Дані, чати й завантаження лишаються. Стан, який ви залишаєте, теж зберігається, тож скасування можна скасувати.",
    },
  },
  {
    id: "help.safety.checkpoints",
    target: "agent.section.checkpoints",
    open: { view: "agent", panel: "project-app" },
    help: "safety",
    keywords: {
      en: "checkpoint save restore history app project label code snapshot",
      uk: "контрольна точка зберегти відновити історія застосунок проєкт мітка код знімок",
    },
    title: { en: "Checkpoints of an app", uk: "Контрольні точки застосунку" },
    body: {
      en: "An app’s project page has Checkpoints: saved points of the app’s code, not its data. Molfar takes one before he changes the app, and you can add your own with Save checkpoint (a label is optional). Restore asks first.",
      uk: "На сторінці проєкту застосунку є «Checkpoints»: збережені точки коду застосунку, а не його даних. Мольфар робить одну перед зміною застосунку, а ви можете додати свою через «Save checkpoint» (мітка не обов’язкова). «Restore» спершу питає.",
    },
  },

  // ---- Context and cost ----
  {
    id: "help.context.meter",
    target: "agent.context",
    open: { view: "agent", panel: "chat" },
    help: "context",
    keywords: {
      en: "context meter window tokens percent full cost price spend amber red limit",
      uk: "контекст лічильник вікно токени відсотки заповнено вартість ціна витрати бурштиновий червоний ліміт",
    },
    title: { en: "The context meter and cost", uk: "Лічильник контексту й вартість" },
    body: {
      en: "“context 38k of 128k · 30%” is how much of the model’s window the last run used. It turns amber from 75% and red from 90%. “chat N tok” and a price count everything the chat has used so far, where the model has a known price. Both appear after the first reply.",
      uk: "«context 38k of 128k · 30%» — скільки вікна моделі використав останній запуск. Від 75% він бурштиновий, від 90% червоний. «chat N tok» і ціна рахують усе, що чат використав досі, якщо в моделі є відома ціна. Обидва з’являються після першої відповіді.",
    },
  },
  {
    id: "help.context.compact",
    target: "agent.compact",
    open: { view: "agent", panel: "chat" },
    help: "context",
    keywords: {
      en: "compact summarize long chat free space context full fold summary auto compact",
      uk: "стиснути підсумувати довгий чат звільнити місце контекст повний згорнути підсумок авто",
    },
    title: { en: "Compact a long chat", uk: "Стиснути довгий чат" },
    body: {
      en: "The Context actions button (arrows) offers Compact conversation, or type /compact. Older messages are summarized and the chat continues from the summary. The button is always there but disabled without a chat yet or while a run is going. Settings, Molfar has Auto-compact long sessions.",
      uk: "Кнопка «Context actions» (стрілки) пропонує «Compact conversation», або введіть /compact. Старші повідомлення стискаються в підсумок, і чат продовжується з нього. Кнопка є завжди, але неактивна, поки чату ще немає або триває запуск. У «Налаштуваннях», «Мольфар» є «Автостискання довгих сесій».",
    },
  },
  {
    id: "help.context.inspector",
    target: "agent.inspector",
    open: { view: "agent", panel: "inspector" },
    help: "context",
    keywords: {
      en: "prompt inspector what the model was sent system tools messages tokens debug request eye",
      uk: "інспектор промптів що надіслано моделі system tools повідомлення токени налагодження запит око",
    },
    title: { en: "Prompt inspector", uk: "Інспектор промптів" },
    body: {
      en: "The eye button shows what the model was really sent: the system prompt, the tools, the messages, and the output, each with its tokens. Use it when a small model struggles or a chat costs more than you expect. You can limit it to this chat.",
      uk: "Кнопка з оком показує, що насправді надіслано моделі: системний промпт, інструменти, повідомлення й вивід, кожне з токенами. Користуйтеся нею, коли мала модель не справляється або чат коштує більше, ніж очікуєте. Можна обмежити її цим чатом.",
    },
  },

  // ---- Memory and skills ----
  {
    id: "help.memory.panel",
    target: "agent.memory",
    open: { view: "agent", panel: "memory" },
    help: "memory",
    keywords: {
      en: "memory remember core topics forget search entries about me notes preferences commit",
      uk: "пам’ять запам’ятати core теми забути пошук записи про мене нотатки уподобання коміт",
    },
    title: { en: "Memory", uk: "Пам’ять" },
    body: {
      en: "The brain button opens Memory and skills. Memory holds what Molfar keeps between chats: Core is always in his prompt, the rest sits in topics, and you can search, add, move or forget entries. He proposes entries in the chat and saves them only when you agree. Every change is a commit.",
      uk: "Кнопка з мозком відкриває «Memory and skills». «Memory» містить те, що Мольфар зберігає між чатами: «Core» завжди в його промпті, решта — у темах, а записи можна шукати, додавати, переносити чи забувати. Він пропонує записи в чаті й зберігає їх, лише коли ви погодитесь. Кожна зміна — це коміт.",
    },
  },
  {
    id: "help.memory.skills",
    target: "agent.memory",
    open: { view: "agent", panel: "skills" },
    help: "memory",
    keywords: {
      en: "skills skill write new skill improve procedure repeat load chip tokens teach",
      uk: "навички навичка створити нову покращити процедура повторювати завантажена чип токени навчити",
    },
    title: { en: "Skills", uk: "Навички" },
    body: {
      en: "The Skills tab lists what Molfar can load for a job. New skill writes one, and a skill’s page has Improve with Molfar. A chip under a reply names a skill that run loaded and its tokens; click it to open the skill. Each skill is also a /command.",
      uk: "Вкладка «Skills» перелічує, що Мольфар може завантажити для завдання. «New skill» створює навичку, а на її сторінці є «Improve with Molfar». Чип під відповіддю називає навичку, яку цей запуск завантажив, і її токени; клацніть, щоб відкрити. Кожна навичка також є /командою.",
    },
  },

  // ---- Projects and chats ----
  {
    id: "help.projects.what",
    target: "agent.projects",
    open: { view: "agent", panel: "sidebar" },
    help: "projects",
    keywords: {
      en: "project group chats instructions memory skills files app folder context attached",
      uk: "проєкт група чати інструкції пам’ять навички файли застосунок тека контекст додано",
    },
    title: { en: "Projects", uk: "Проєкти" },
    body: {
      en: "A project groups chats and gives all of them its instructions, memory, skills and files; a chat in one says “Project context attached”. An app’s own folder is a project too (marked APP). Make a free project with + beside Projects.",
      uk: "Проєкт об’єднує чати й дає всім їм свої інструкції, пам’ять, навички та файли; чат у ньому каже «Project context attached». Тека самого застосунку теж є проєктом (позначена APP). Вільний проєкт створюється через «+» біля «Projects».",
    },
  },
  {
    id: "help.projects.new",
    target: "agent.new-project",
    open: { view: "agent", panel: "sidebar" },
    help: "projects",
    keywords: {
      en: "new project create import zip title add",
      uk: "новий проєкт створити імпорт zip назва додати",
    },
    title: { en: "New project, import a zip", uk: "Новий проєкт, імпорт zip" },
    body: {
      en: "The + beside Projects asks for a title and Create, or Import zip to bring in a project someone gave you.",
      uk: "«+» біля «Projects» питає назву й «Create», або «Import zip», щоб додати проєкт, який вам надали.",
    },
  },
  {
    id: "help.projects.page",
    target: "agent.project-pane-toggle",
    open: { view: "agent", panel: "project-chat" },
    help: "projects",
    keywords: {
      en: "project pane page tabs overview instructions files memory skills checkpoints phone chat project switch resize",
      uk: "панель проєкту сторінка вкладки огляд інструкції файли пам’ять навички контрольні точки телефон чат проєкт перемикач розмір",
    },
    title: { en: "Project pane and page", uk: "Панель і сторінка проєкту" },
    body: {
      en: "In a project chat, the header button Show the project pane opens it beside the chat (drag its edge to resize); its arrows button opens the full page with the tabs Overview, Instructions, Memory, Skills, Checkpoints (apps only) and Files. On a phone a Chat | Project switch does the same.",
      uk: "У чаті проєкту кнопка в шапці «Show the project pane» відкриває панель поруч із чатом (перетягніть край, щоб змінити розмір); кнопка зі стрілками відкриває повну сторінку з вкладками «Overview», «Instructions», «Memory», «Skills», «Checkpoints» (лише для застосунків) і «Files». На телефоні те саме робить перемикач «Chat | Project».",
    },
  },
  {
    id: "help.projects.chats",
    target: "agent.search",
    open: { view: "agent", panel: "sidebar" },
    help: "projects",
    keywords: {
      en: "chats sidebar search rename archive delete move project drag new chat conversations list",
      uk: "чати бічна панель пошук перейменувати архівувати видалити перемістити проєкт перетягнути новий чат розмови список",
    },
    title: { en: "Your chats", uk: "Ваші чати" },
    body: {
      en: "The sidebar lists your chats; New chat starts one and the box searches them. A chat’s menu has Rename, Move to project, Archive and Delete, and you can drag a chat onto a project. Archived chats are under Archived. The sidebar folds to a rail; on a phone it is a drawer.",
      uk: "Бічна панель перелічує ваші чати; «New chat» починає новий, а поле шукає серед них. У меню чату є «Rename», «Move to project», «Archive» і «Delete», а чат можна перетягнути на проєкт. Архівовані чати — у «Archived». Панель згортається в смужку; на телефоні це висувна панель.",
    },
  },

  // ---- Help and bugs ----
  {
    id: "help.bug.solution",
    help: "help",
    keywords: {
      en: "bug fix solution works send the fix still broken report github ask molfar first card patch",
      uk: "помилка виправлення рішення працює надіслати виправлення досі зламано звіт github спершу спитайте мольфара картка патч",
    },
    title: { en: "When Molfar fixes a bug for you", uk: "Коли Мольфар виправляє помилку для вас" },
    body: {
      en: "After Report a bug, Ask Molfar first, he looks for the cause and may end with a card. “It works, send the fix” opens a form with what changed and the patch, and GitHub gets it only when you submit there. “Still broken” sends that to Molfar. “Report it on GitHub” is for a bug he cannot fix.",
      uk: "Після «Report a bug», «Ask Molfar first» він шукає причину й може завершити карткою. «It works, send the fix» відкриває форму зі змінами та патчем, і GitHub отримує це, лише коли ви надішлете там. «Still broken» надсилає це Мольфару. «Report it on GitHub» — для помилки, яку він не може виправити.",
    },
  },
  {
    id: "help.help",
    target: "agent.help",
    open: { view: "agent", panel: "chat" },
    help: "help",
    keywords: {
      en: "help tour tours guide replay walkthrough tips turn off",
      uk: "довідка тур тури гайд повторити підказки вимкнути",
    },
    title: { en: "Help and tours", uk: "Довідка й тури" },
    body: {
      en: "This list is the Help button: in the header on a computer, in the sidebar on a phone. A short tour starts the first time you open this page and the project page. You can switch tours off or play them again in the shell’s Settings, General, Guide.",
      uk: "Цей список — кнопка «Help»: у шапці на комп’ютері, у бічній панелі на телефоні. Короткий тур починається, коли ви вперше відкриваєте цю сторінку й сторінку проєкту. Тури можна вимкнути чи пройти знову в «Налаштуваннях» оболонки, «Загальні», «Гайд».",
    },
  },

  // ---- Tour steps (not in the help list) ----
  {
    id: "tour.chat.composer",
    target: "agent.composer",
    title: { en: "Ask in plain words", uk: "Просіть простими словами" },
    body: {
      en: "Write what you want and press Enter. Type / for commands and templates, or @ to name a file, character, lorebook or preset.",
      uk: "Напишіть, що вам потрібно, і натисніть Enter. Введіть /, щоб побачити команди й шаблони, або @, щоб назвати файл, персонажа, лорбук чи пресет.",
    },
  },
  {
    id: "tour.chat.mode",
    target: "agent.mode",
    title: { en: "What Molfar may do", uk: "Що дозволено Мольфару" },
    body: {
      en: "Full plans, edits and runs commands. Accept asks before each shell command. Plan only reads and plans. Change it any time.",
      uk: "«Full» планує, редагує й виконує команди. «Accept» питає перед кожною командою оболонки. «Plan» лише читає й планує. Змінюйте будь-коли.",
    },
  },
  {
    id: "tour.chat.memory",
    target: "agent.memory",
    title: { en: "Memory and skills", uk: "Пам’ять і навички" },
    body: {
      en: "What Molfar remembers between chats, and the skills he can load. He proposes entries in the chat and saves them only when you agree.",
      uk: "Те, що Мольфар пам’ятає між чатами, і навички, які він може завантажити. Він пропонує записи в чаті й зберігає їх, лише коли ви погодитесь.",
    },
  },
  {
    id: "tour.chat.help",
    target: "agent.help",
    title: { en: "Help", uk: "Довідка" },
    body: {
      en: "Short answers about this page, searchable. Show me takes you to the place.",
      uk: "Короткі відповіді про цю сторінку, з пошуком. «Show me» веде до потрібного місця.",
    },
  },
  {
    id: "tour.project.tabs",
    target: "agent.project-tabs",
    title: { en: "A project’s sections", uk: "Розділи проєкту" },
    body: {
      en: "Everything here reaches every chat started in this project. Switch sections with these tabs.",
      uk: "Усе тут потрапляє в кожен чат, розпочатий у цьому проєкті. Розділи перемикаються цими вкладками.",
    },
  },
  {
    id: "tour.project.instructions",
    target: "agent.section.instructions",
    title: { en: "Instructions", uk: "Інструкції" },
    body: {
      en: "A file Molfar reads at the start of every chat in this project. Press edit to change it.",
      uk: "Файл, який Мольфар читає на початку кожного чату цього проєкту. Натисніть «edit», щоб змінити.",
    },
  },
  {
    id: "tour.project.checkpoints",
    target: "agent.section.checkpoints",
    title: { en: "Checkpoints", uk: "Контрольні точки" },
    body: {
      en: "Saved points of the app’s code, not its data. Molfar takes one before he changes the app; Restore puts it back.",
      uk: "Збережені точки коду застосунку, а не його даних. Мольфар робить одну перед зміною застосунку; «Restore» повертає її.",
    },
  },
  {
    id: "tour.project.files",
    target: "agent.section.files",
    title: { en: "Files", uk: "Файли" },
    body: {
      en: "Drop images or text files here, or click to upload. Chats in this project can use them.",
      uk: "Киньте сюди зображення чи текстові файли або клацніть, щоб завантажити. Чати цього проєкту можуть їх використовувати.",
    },
  },
]

export const AGENT_TOURS: Tour[] = [
  { id: "agent.chat", place: "agent.chat", steps: ["tour.chat.composer", "tour.chat.mode", "tour.chat.memory", "tour.chat.help"] },
  { id: "agent.project", place: "agent.project", steps: ["tour.project.tabs", "tour.project.instructions", "tour.project.checkpoints", "tour.project.files"] },
]
