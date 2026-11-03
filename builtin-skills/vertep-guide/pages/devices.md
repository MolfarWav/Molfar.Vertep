# Devices, sync and backups

How to use Molfar Vertep on a phone, carry your stories between devices, install it like an app and move to a new computer.

## Opening it from a phone

In Settings, Server, "Allow other devices on my network" lets a phone or another computer on the same network open Molfar Vertep. A QR code shows the address; scan it with the phone's camera. Every account still needs its password. Phones only allow the microphone and installing as an app over HTTPS, so for those you switch on "Use HTTPS" in the same section. These sections are visible to the administrator.

## Install it as an app

"Install app" in the account menu puts Molfar Vertep on your home screen or in your computer's app list. It then opens in its own window, without the browser's bar. On an iPhone it shows where Safari keeps it: Share, then Add to Home Screen. A phone that opens your computer at an http address needs https first, and the dialog explains how. An open app also has "Fullscreen", which opens it in its own browser tab that you can install.

## Sync

"Sync devices" in the account menu, or Settings, Sync. Sign in with Google once on each device. When you stop playing, press "Push"; on the other device press "Pull" and go on. After the first time only what changed travels.

- You choose what travels: apps and their data, Molfar's chats and projects, pictures, sound and video, and API keys with MCP settings. Keys travel only if you switch them on, locked with a passphrase you type on each device.
- If the same chat changed on both devices, you choose which version to keep. The other one is saved for 30 days.
- There is also a "Folder" option for a synced folder (Syncthing, Google Drive for desktop) or a USB stick.

## Backup

Settings, Backup exports your whole profile: apps with their data, Molfar's memory and chats. Press "Export profile". Add a password to include your API keys, encrypted; without one the backup has no keys and you enter them again. Import first shows what is inside. When you press "Replace my profile", your current profile is saved before it is replaced.

Use Backup to move to a new computer once. Use Sync to move back and forth often.

## One app only

An app's details on the start page have "Export app", which makes a backup file of just that app. "Import app" brings such a file in. See [[apps]].

See also [[settings]].
