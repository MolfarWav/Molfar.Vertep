# Trying the places map before any release (#454)

Nothing here is merged or released. Two branches named `claude/map-454`: the engine (this repo) and Roleplay (MolfarWav/Molfar.Vertep-Roleplay).
Roleplay has no new packages, so no `bun install` is needed.

## 1. The engine (the icons and the route that serves them)
From the engine folder, in PowerShell:
```powershell
.\Molfar-Vertep.bat dev map-454
```
`dev NAME` takes exactly `claude/map-454`, whatever other branch is newer. Back to normal later: `.\Molfar-Vertep.bat` (latest release).

## 2. Roleplay (the map itself)
Roleplay is updated from the repository's `ref`. Point it at the branch, then update it in the shell:
1. Stop the engine. In the engine folder open `data\credentials\<your user>\app-upstream\roleplay.source.json`. It looks like
   `{"git":"https://github.com/MolfarWav/Molfar.Vertep-Roleplay","ref":"HEAD"}`. Change `"ref"` to `"claude/map-454"`. Keep a copy of the file first.
2. Start the engine (step 1). In the top bar, the download icon, "Check now", then update Roleplay. Your edits are merged and your data
   (chats, cards, books) stays. If the shell shows a conflict, choose "Take update" for the map files or "Ask Molfar to merge".
3. Open a chat that has World places: a round map button appears bottom left of the chat. Gear in the map header: "Upload a map picture".
   The finished plans (`map-city`, `map-village`, `map-region`, ...) are the pictures made for this, kept outside the repo.

## 3. Going back
Put `"ref"` back to `"HEAD"` and update Roleplay again, then `.\Molfar-Vertep.bat` for the release engine. The map data stays in each
chat's meta (`placeMap`) and is ignored by code that does not know it.

## What to look at
- Icons: a tavern, a forge, a forest... each place has one of four pictures; a place with no recognised name gets a brass pin.
- Drag places; reload; the picture and positions stay. Phone width: the map steps aside while you type.
- Not checked yet: more than about 40 places, a real phone, a custom theme.
