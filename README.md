<div align="center"><img src="client/public/vertep-logo.svg" width="128" alt="Molfar Vertep logo" /></div>

# Molfar Vertep

**Your own AI corner. Ask — and Molfar rebuilds the app right before your eyes. 🏠✨**

![release](https://img.shields.io/github/v/release/MolfarWav/Molfar.Vertep) ![license](https://img.shields.io/github/license/MolfarWav/Molfar.Vertep) ![platform](https://img.shields.io/badge/platform-Win%20%C2%B7%20mac%20%C2%B7%20Linux%20%C2%B7%20Android-blue)

## 🏠 Imagine: evening, your Vertep

You open the browser. Your chats, characters and worlds are there. Everything lives at home, not in someone else's cloud. No accounts to feed, no keys to lose — your device holds it all.

## 🧙 Ask — and it gets built

> *"Ask, child, and I shall reshape it while you watch." — Molfar*

"Molfar, make the Continue button brighter." The screen rebuilds while you watch. Every app is plain files, and the built-in agent changes them live: a feature, a theme, a whole section. Small thing or big rework — you ask, he builds, you approve.

## 🎭 Three heroes of the house

<div align="center"><img src="client/public/molfar-512.webp" width="160" alt="Molfar" /></div>

**The Engine** — a local server with apps, permissions and updates. Runs on your computer or phone, opens in your browser.

**Molfar** — the built-in agent, an old Carpathian molfar: kind, wise, knows today's code. He looks at your project, asks before large work, and rebuilds any screen while you watch.

**Roleplay** — the first official app: characters, personas, lorebooks, chats.

## ✨ Things people feel first

🏠 **Home that waits for you** — Continue story, Create, recent chats with persona and character filters.
<!-- SCREENSHOT 1: Home, 1280px, Vertep theme (pending live session) -->

💬 **Chats that bend** — streaming replies with swipes, branches, group scenes, per-message tools.
<!-- SCREENSHOT 2: open chat with drawer (pending) -->

🧭 **Dashboard that remembers the story** — NEW in Roleplay 4.22.0: a relationship dashboard with character Souls, the scene strip, the constellation view and the notebook. Every card carries a Soul now — imported or created — rated by Molfar, accepted or tuned by you in the Soul tab. The full live dashboard lands with engine 0.8.0.
<!-- SCREENSHOT 4: Soul tab on an imported card + a created card (pending live session) -->
<!-- SCREENSHOT 5: dashboard strip + constellation (pending; 0.8.0 live dashboard = showcase picture) -->

🧙 **Rebuilds on request** — "Ask Molfar" drafts the request inside the app; nothing sends without you.
<!-- SCREENSHOT 3: agent rebuilding a screen (pending) -->
<!-- GIF: screen rebuilding on request (separate brief, pending) -->

🎨 **Vertep look** — black, oxblood red, Kurale headings, embroidery dividers. Ukrainian and 13 more languages.

## 🔒 Trust: your data sleeps at home

Chats, characters and keys stay on your device. Apps run sandboxed and ask for permissions before install; an update that wants more stops for review. Molfar Vertep is a modified version of [Chrysalis Engine](https://github.com/ProjectChrysalis/Chrysalis-Engine) by ProjectChrysalis, licensed AGPL-3.0-only — see [LICENSE](LICENSE) and [CHANGELOG.md](CHANGELOG.md) for what changed.

<div align="center"><img src=".github/assets/divider.svg" width="480" alt="" aria-hidden="true" /></div>

## 🚀 Start in 5 minutes

Grab your system from the [releases page](https://github.com/MolfarWav/Molfar.Vertep/releases), open the one-time setup link, create your account, add a model in **Settings > API connections**. Full table stays below under Install.

## 🌱 What grows next

**Memory that stays yours.** Litopys already keeps story facts beside the chat; next it becomes the quiet background worker of one Memory — it fills the Facts, its curator cleans them with proposals you see in the Memory panel, and nothing rides the prompt twice. Your facts migrate, your recap stays readable, your device keeps it all.
<!-- SCREENSHOT: Memory panel with Facts + proposals (pending live session) -->

To move an app to another device, or keep a copy before uninstalling, use **Export app** in its info pane, then **Import app > Backup file** on the other side. The backup carries the app's data and keeps updating from where it came from.

---

<details><summary><b>Install — all systems</b></summary>

|| System | Download | Start it |
|| --- | --- | --- |
|| Windows | `Chrysalis-<version>-windows-x64.zip` | Unzip, double-click `chrysalis.exe` |
|| macOS (Apple silicon) | `Chrysalis-<version>-macos-arm64.tar.gz` | Unpack, double-click `start.command` |
|| macOS (Intel) | `Chrysalis-<version>-macos-x64.tar.gz` | Unpack, double-click `start.command` |
|| Linux | `Chrysalis-<version>-linux-x64.tar.gz` (or `-arm64`) | Unpack, run `./chrysalis` |
|| Android 9+ | `Molfar-Vertep-<version>-android-arm64.apk` | Install, open the app |
|| Docker (from 0.3.0) | `ghcr.io/molfarwav/molfar-vertep` | See README section below |

Archive names stay `Chrysalis-<version>-<system>` on purpose: self-update looks for them. Internal names stay too (`chrysalis` command, `CHRYSALIS_*`, data folders) so installs keep working.

On Windows you can also run from source with one file: put `Molfar-Vertep.bat` (in the repository root) in any folder and double-click it. It installs Git and Bun if they are missing, downloads Molfar Vertep next to itself, offers each new release before installing it, builds what changed, offers a desktop shortcut and opens Molfar Vertep in your browser. `Molfar-Vertep.bat dev` follows the newest work in progress instead of releases. Folder names with spaces or in any language are fine.

On macOS, start with `start.command`, not `chrysalis`. These builds do not carry a signature macOS accepts, so opening `chrysalis` directly is blocked or closes straight away with `killed`. `start.command` clears the download flag, signs the program for that Mac and starts it; use it again after each update.

The Android APK is debug-signed, so it cannot update an installed copy: remove the old app first (export your apps' backups before that, because uninstalling deletes the app's data).

### Docker

From version 0.3.0 the release workflow publishes `ghcr.io/molfarwav/molfar-vertep` (tags `latest` and the version). Settings and data live in the `/chrysalis` volume, and the container listens on port 8788:

```sh
docker run -d --name chrysalis -p 8788:8788 -v chrysalis-data:/chrysalis \
  ghcr.io/molfarwav/molfar-vertep:latest
docker logs chrysalis        # the first start prints the setup link
```

The repository's `docker-compose.yml` does the same; `docker compose up -d --build` builds an image from your checkout instead of pulling one.

### Running from source

You need [Git](https://git-scm.com) and [Bun](https://bun.sh) 1.4 or newer.

```sh
git clone https://github.com/MolfarWav/Molfar.Vertep
cd Molfar.Vertep
bun install
(cd client-agent && bun install)
bun run build:client
bun start
```

`bun run dev` restarts on every change. `bun run test` runs the tests and `bun run typecheck` checks every project.

</details>

<details><summary><b>First start, Store, Updating, Languages, Phone</b></summary>

Molfar Vertep opens your browser (or prints a link) with a one-time setup address. Open it, create your account, and add a model connection in **Settings > API connections**. The first account is the admin: it can add more people, each with their own workspace, agent and apps.

Lost the link? It is in the window where Molfar Vertep started and in `data/logs/chrysalis.log`. Forgot a password? Stop Molfar Vertep and run `chrysalis reset-password <name>`.

The Store's list of apps comes from [MolfarWav/Molfar.Vertep-Store](https://github.com/MolfarWav/Molfar.Vertep-Store). Official apps are the ones under the MolfarWav account on GitHub, and Roleplay is one of them. Other apps are community apps: Molfar Vertep shows what they ask for (plugin permissions, network hosts, packages) and you review that before installing. A later update that asks for more stops for review again.

Apps run in a sandbox and reach the engine only through a short list of allowed calls. [SECURITY.md](SECURITY.md) describes the boundaries.

To move an app to another device, or keep a copy before uninstalling, use **Export app** in its info pane, then **Import app > Backup file** on the other side. The backup carries the app's data and keeps updating from where it came from.

Molfar Vertep keeps your data in its own folder, so an update never touches it.

- Updates button in the top bar: shows a badge when anything is newer and opens one panel with Molfar Vertep itself (for admins) and every app installed from a repository. Each row shows the current and new version, a link to the changes and an Update button; "Update all" goes through the apps one by one. If your own edits overlap with an update, you choose: keep yours, take the update, or ask the agent to merge. Checks run when Molfar Vertep starts and on "Check now". See [CHANGELOG.md](CHANGELOG.md) for details.
- Downloads (Windows, macOS, Linux, portable): the engine's update button downloads the new version, restarts and reloads the page. It is also in **Settings > Server**.
- Android: remove the old app and install the new APK (see the note above).
- Docker: `docker pull ghcr.io/molfarwav/molfar-vertep:latest`, then remove and recreate the container with the same volume.
- From source: `git pull && bun install && (cd client-agent && bun install) && bun run build:client`, then restart.

Apps you have changed are never overwritten: updating merges the new version with your edits.

The interface comes in 14 languages, including Ukrainian (Українська). Pick one in **Settings > General > Language**; it is chosen automatically from your browser's language when it is one of them.

- Molfar Vertep on your computer, phone on the same Wi-Fi: turn on *Allow other devices on my network* in Settings > Server and scan the QR code.
- Molfar Vertep on the phone itself: install the Android app. It runs the server on the phone and opens it in your browser. Uninstalling the app deletes its data, so export backups from your apps first.
- Away from home: put both devices on [Tailscale](https://tailscale.com) and use the computer's Tailscale address. `tailscale cert` gives you HTTPS files for `ssl.certPath` and `ssl.keyPath`.

</details>

<details><summary><b>Built on</b></summary>

|| Project | Used for | License |
|| --- | --- | --- |
|| [Bun](https://bun.sh) | The runtime: HTTP and WebSocket server, bundler, package manager, test runner | MIT |
|| [pi-ai / pi-agent-core](https://github.com/earendil-works/pi/tree/main/packages/ai) | The LLM kernel — provider catalog, auth formats, generation, agent loop | MIT |
|| [Hono](https://hono.dev) | HTTP server and routing | MIT |
|| [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Connecting to external MCP servers for agent tools | MIT |
|| [QuickJS-ng](https://github.com/quickjs-ng/quickjs) via [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten) | The app plugin sandbox | MIT |
|| [wasmsh](https://github.com/mayflower/wasmsh) with [Pyodide](https://pyodide.org) | The agent's in-browser sandbox: an actual shell and a Python runtime, both in wasm | Apache-2.0 |
|| [isomorphic-git](https://isomorphic-git.org) | Workspace version control, and installing apps from git without a git program | MIT |
|| [esbuild](https://esbuild.github.io) | Bundling app frontends and app builds (WASM inside the browser builder) | MIT |
|| [React](https://react.dev) | The web client shell and the agent chat UI | MIT |
|| [Base UI](https://base-ui.com) | Component behaviour in the client shell | MIT |
|| [assistant-ui](https://assistant-ui.com) | The agent chat UI | MIT |
|| [Tailwind CSS](https://tailwindcss.com) | Styling, including the in-browser compiler for apps | MIT |
|| [Phosphor Icons](https://phosphoricons.com) | Iconography in the client shell and agent UI | MIT |
|| [Zod](https://zod.dev) | Schema validation | MIT |

Every other dependency is MIT, BSD, ISC, Apache-2.0, or OFL-1.1.

</details>

<details><summary><b>Workspace, settings, release builds</b></summary>

### Bring your own tools

Your whole workspace is a folder of plain files under git. Run `chrysalis workspace` in a terminal (Molfar Vertep makes itself a command the first time it starts, so there is nothing to install; open a new terminal if it was already running). It prints where the workspace is; point your editor or coding agent at it and work normally, saves reach open pages on their own. `AGENTS.md` there explains the layout to whatever agent reads it. For the parts that are not files, `./chrysalis api GET /v1/apps` calls the running engine's API.

### Settings file

Server settings live in `config.yaml`, created on first start with a note on every line. `chrysalis paths` prints where it is:

| Install | config.yaml and data |
| --- | --- |
| Windows | `%LOCALAPPDATA%\Chrysalis` |
| macOS | `~/Library/Application Support/Chrysalis` |
| Linux | `~/.local/share/chrysalis` |
| Docker | the `/chrysalis` volume |
| From source | the repository folder |

Put a `config.yaml` next to the program to keep everything in that folder instead (a portable copy, for example on a USB drive).

```yaml
port: 8788
lan: false          # true: phones and other computers on your network can open it
allowedHosts: []    # extra names, like chrysalis.home or a Tailscale name
ssl:
  enabled: false    # HTTPS: phones need it for the microphone and installing as an app
```

Admins can change the same settings in **Settings > Server**, which applies them right away, shows a QR code for your phone, and tells you when a new version is out. You can also ask the agent ("let my phone connect"); it shows you exactly what will change and waits for you to approve.

Every setting also works for a single run as an environment variable or a flag:

```sh
CHRYSALIS_PORT=9000 chrysalis
chrysalis --lan --port 9000 --no-open-browser
chrysalis --help
```

### Release builds

```sh
bun run dist                      # every platform, from any one machine
bun run dist linux-x64 windows-x64   # some of them
ANDROID_HOME=~/android-sdk bun run dist android-apk   # the APK (JDK 17+)
```

Output lands in `out/dist/`. Set `CHRYSALIS_ANDROID_KEYSTORE`, `CHRYSALIS_ANDROID_KEYSTORE_PASSWORD`, `CHRYSALIS_ANDROID_KEY_ALIAS` and `CHRYSALIS_ANDROID_KEY_PASSWORD` to sign the APK for release; keep that keystore, since Android only updates an app signed with the same key.

Releases are built by `.github/workflows/release.yml` when a `vX.Y.Z` tag that matches `package.json` is pushed on `main`. Every push and pull request runs the tests and builds every download.

</details>

## License

Licensed under the **GNU Affero General Public License v3.0 only** (AGPL-3.0-only). See [LICENSE](LICENSE) for the full text. The source is at [MolfarWav/Molfar.Vertep](https://github.com/MolfarWav/Molfar.Vertep); if you run a modified copy for other people over a network, the AGPL requires you to offer them your source.

## Inspiration

The idea comes from [pi](https://pi.dev), the minimal coding agent you adapt by asking it to build what you need. Molfar Vertep brings that idea to an AI frontend, and its agent runs on pi's own libraries.

## 💬 Support

- Bugs and questions: [GitHub issues](https://github.com/MolfarWav/Molfar.Vertep/issues).
- Security problems: private vulnerability report via the **Security** tab, not a public issue.
