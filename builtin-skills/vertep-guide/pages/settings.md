# Settings map

Settings is the shell's own dialog, shared by all apps. Open it with the gear in the top bar, or on a phone from the account menu at the top right. This page lists each section so you know where to look.

## Sections

- **General.** The interface language, the "Guide" block (turn tours off, play them again, show What's new again) and your account: picture, name, password, "Log out".
- **Backup.** Export your whole profile to move to another computer, and import one. See [[devices]].
- **Storage.** The pictures your cards, chats and sprites use. "Find unused pictures" locates ones nothing uses and moves them to the trash; "Empty trash" removes them for good, after asking.
- **Sync.** Carry your games between devices with Google Drive or a folder. See [[devices]].
- **Connections and models.** Providers, the models list, favorites, per-model settings, the vision model. See [[models]].
- **Speech.** Text-to-speech: Edge voices and your own speech endpoints.
- **Images.** Picture generation: image models and image servers.
- **Molfar.** How Molfar behaves, across every app:
  - his internet access in the sandbox;
  - "Auto-compact long sessions";
  - "Small-model mode";
  - "Cost checks": Auto, Always ask or Never ask;
  - "Notifications" when he asks something, finishes or fails;
  - "Molfar's instructions", your standing preferences for him;
  - the protected files list.
  See [[molfar]].
- **Memory.** How apps remember and find things across chats. It can match by meaning, not only exact words, with one cheap embedding model. This is optional. By default Molfar Vertep picks the model itself: one on your own computer first (LM Studio, Ollama, no key needed), then an API connection with a key, then OpenRouter. If none is set up, the memory says so and matches by words only. You can also download a model to your own computer with one click: in **On this computer (optional)** pick **bge-m3** (recommended, best on Ukrainian, Russian and English) or **EmbeddingGemma 2** (smaller) and press **Download and connect**. The engine first installs the program that runs the model (about 85 MB, once), then downloads the model (587 MB or 346 MB), and connects it. The download goes on if you close the window, and an interrupted one continues where it stopped. After that it is free, nothing goes to the internet, and the model takes memory (about 1.1 GB or 0.6 GB) only while it works. **Delete** gives the disk space back. It needs a computer that runs the engine with Bun, not a phone launcher; the online connection stays as a backup, and if you switch models the memory makes its vectors again by itself.
- **MCP servers.** Tool servers Molfar and your apps can call. Apps start with each one off and switch on what they need.
- **Developer.** Shows each app's build state and live hot reload, which is always on.

## Only for the administrator

- **Server.** How Molfar Vertep runs on this computer: port, opening the browser at start, allowing other devices on your network (with a QR code for your phone), HTTPS, whether apps may download packages, the version and how to update.
- **Users.** People who can sign in. Each gets their own workspace, agent and apps.

## Not here

There is no section for individual apps. An app's own settings are inside the app. See [[apps]].

> On a phone, Settings shows a list of sections first; tap one to go in and use Back to return.
