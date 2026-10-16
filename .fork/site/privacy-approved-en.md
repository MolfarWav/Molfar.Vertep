# Privacy policy

Effective 16 October 2026. Applies to Molfar Vertep, the open-source app published at github.com/MolfarWav/Molfar.Vertep, and to this website.

## Short version
Molfar Vertep runs on your own computer or phone. We run no servers for it, we have no accounts for you, and we collect nothing: no analytics, no telemetry, no crash reports. What you make in the app stays in files on your device, and goes only where you send it.

## What stays on your device
Your account in the app, chats, characters, personas, lorebooks, apps, settings and API keys are stored in plain files in the app's data folder on your device. The account is local: it never leaves the device and we cannot see it.

## Where the app connects, and only when you ask
- **The model you choose.** When you chat or ask Molfar for something, the app sends your messages to the AI provider you configured (for example OpenRouter or a server on your own machine). That provider's own privacy policy applies to what it receives.
- **GitHub.** To check for updates and to install apps from the Store, the app downloads files from github.com. GitHub sees an ordinary download request.
- **Tools you add.** If you connect a tool server to Molfar (for example a web search service), the app talks to that service when the tool is used.
- **Bug reports.** "Report a bug" opens a pre-filled GitHub issue page in your browser; nothing is sent until you submit it there yourself.
- **Google Drive, only if you turn on sync** (below).

## Google Drive sync
Sync is off until you press "Sign in with Google" in Settings > Sync. It copies your workspace between your own devices through your own Google Drive.

- **Permission asked for:** only `drive.file` ("see, edit, create and delete only the specific Google Drive files you use with this app"). The app cannot see any other file in your Drive.
- **What it does with Google data:** it creates one folder, "Molfar Vertep sync", in your Drive and reads and writes only the files inside it (your synced workspace). It also reads your Google account's email address, only to show you in Settings which account is connected. Your API keys go to Drive only if you switch that on, and then sealed with a passphrase you choose, which never goes to Drive.
- **Where the sign-in token is kept:** Google returns a sign-in token straight to the app on your device. It is stored there, in the app's private data folder, and is never sent to us or to anyone else. There is no Molfar Vertep server in between: your device talks to Google directly.
- **Nothing is shared or sold.** Data received from Google is used only to sync your files between your devices. It is not sent to us or third parties, not used for advertising, and not used to train AI models. Molfar Vertep's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

### Stopping sync and removing access
- **Disconnect** in Settings > Sync deletes the sign-in token from that device. Files on Drive stay where they are.
- **Revoke access** at any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions): choose Molfar Vertep and remove its access. The app then can no longer reach your Drive from any device.
- **Delete the synced files** by deleting the "Molfar Vertep sync" folder in your Google Drive (and emptying Drive's trash).

## This website
molfarwav.github.io is a static site hosted by GitHub Pages. It sets no cookies and has no analytics or trackers of ours. GitHub, as the host, may log technical data such as IP addresses for security; see the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Links to Discord and GitHub lead to services with their own policies.

## Children
Molfar Vertep is not directed at children under 13, and we collect no data from anyone.

## Changes
If this policy changes, the new version appears on this page with a new date. The history of every change is public in the website's GitHub repository.

## Contact
Questions about privacy: open an issue at [github.com/MolfarWav/Molfar.Vertep/issues](https://github.com/MolfarWav/Molfar.Vertep/issues) or write to {{CONTACT_EMAIL}}.
