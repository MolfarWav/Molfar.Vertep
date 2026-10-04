# Android APK: make it start, and make it ours (queued 2026-10-04)

Order: after the relationship dashboard (user's decision, 2026-10-04).

## What the user saw
- Android 11. The installed app was upstream Chrysalis 1.0.2 (not a Molfar Vertep build).
- Pressing Start does nothing: no status change, nothing in the on-screen log.

## Facts (read in code, 2026-10-04)
- `android/`: a small Java app (`MainActivity`, `EngineService`, `Payload`, `Http`, `Versions`) that unpacks
  and runs the whole engine on the phone, then opens the UI in the phone's browser ("Open Chrysalis").
  The screen has a status line, Logs (tail of `data/logs/chrysalis.log` or the service output) and Copy.
- The update check already follows our repository: `BuildConfig.REPOSITORY` comes from the engine's
  `package.json` (`android/app/build.gradle`), which points to MolfarWav/Molfar.Vertep.
- Still upstream: every visible string says "Chrysalis" (`android/app/src/main/res/values/strings.xml`:
  "Open Chrysalis", "Chrysalis logs", "Chrysalis is running", the tagline), the icon/logo, the package
  `org.projectchrysalis.chrysalis` (same `applicationId` as upstream: an installed upstream copy signed with
  another key blocks installing ours; our APK is debug-signed, see README).
- Release assets keep the `Chrysalis-*` names on purpose (`self-update.ts` matches them; CLAUDE.md).

## Plan
1. First test OUR APK (latest release, `Chrysalis-<version>-android-arm64.apk`) on the user's Android 11
   phone after removing the upstream app. If Start still does nothing, get `adb logcat` (USB debugging) or the
   service output, and read `EngineService` start path on API 30 (foreground service start, notification
   channel, unpack of the payload, file permissions, the bun/engine binary for arm64).
2. Visible names and logo: strings to "Molfar Vertep" (and a Ukrainian `values-uk/strings.xml`), launcher
   icon from the Molfar Vertep logo / Molfar avatar (`client/public/molfar-512.webp`), app label.
3. `applicationId`: decide with the user whether to move to our own id (a separate app: data of an old install
   does not move; export a backup first) — it ends the clash with upstream installs. The Java package name can
   stay (internal names stay until the planned rename).
4. Signing: a release keystore secret in GitHub (`ANDROID_KEYSTORE_*` in `release.yml`) would let updates
   install over the old app; the user creates it, never the session.
