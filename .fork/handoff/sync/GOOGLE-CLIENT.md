# Register the "Molfar Vertep" Google client (once, by the maintainer)

Every player syncs into their own Google Drive; this client is only the name Google shows at
sign-in ("Molfar Vertep wants to see files it created"). It stores nothing and costs nothing.
Scope `drive.file` is non-sensitive: no Google review is needed for it.

1. https://console.cloud.google.com/ → top bar → project picker → **New project**, name `Molfar Vertep`.
2. **APIs & Services → Library** → search "Google Drive API" → **Enable**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform → Branding / Audience / Data access):
   - App name `Molfar Vertep`, support email: yours, developer contact: yours.
   - Audience: **External**.
   - Data access → Add scope → `.../auth/drive.file` ("See, edit, create and delete only the
     specific Google Drive files you use with this app"). Nothing else.
   - Audience → **Publish app** (status "In production"). In "Testing" only listed test users can
     sign in and their sign-in expires after 7 days.
4. **Clients → Create client** → Application type **Desktop app**, name `Molfar Vertep engine`.
   Copy the **Client ID** (ends with `.apps.googleusercontent.com`) and the **Client secret**.
   A Desktop client's secret is not a secret (Google says so for installed apps); it goes into the
   public repo like rclone's does.
5. Give both to the Claude session (or put them yourself into `BUILTIN_CLIENT` in
   `src/sync/drive.ts`). Until then: Settings → Sync → Advanced → "Your own Google client", or the
   env vars `CHRYSALIS_DRIVE_CLIENT_ID` / `CHRYSALIS_DRIVE_CLIENT_SECRET`.

What the player sees the first time: Google's sign-in, then the consent screen with the app name
and the one permission. A brand-new unverified app may show "Google hasn't verified this app" for a
while; with only `drive.file` that warning should not appear, but if it does, "Advanced → Go to
Molfar Vertep" continues. Brand verification (logo on the consent screen) is optional.
