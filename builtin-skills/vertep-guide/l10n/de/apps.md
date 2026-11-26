<!-- source: 9d4c677df24e -->
# Apps

So findest, fügst, aktualisierst und entfernst du Apps. Apps sind das, was du tatsächlich nutzt: Roleplay ist die wichtigste.

## Die Startseite

Ein neuer Tab (+) öffnet die Startseite „Wohin?“. Sie zeigt Molfar und deine installierten Apps. Klicke am Computer auf eine App, um zu sehen, was darin steckt, und drücke „Starten“; die Details haben außerdem „App exportieren“ und, für Apps mit Update-Quelle, „Nach Updates suchen“. Auf dem Handy öffnet ein Tippen sie sofort, und die Schaltfläche (i) zeigt Details. Das Papierkorb-Symbol löscht eine App nach Rückfrage – das entfernt ihre Daten dauerhaft.

Jede geöffnete App hat ihren eigenen Tab. Tabs lassen sich in beliebige Reihenfolge ziehen und sind nach einem Neuladen wieder da.

## Wenn eine App offen ist

Die Werkzeugleiste bietet:

- „Teilen“: links Molfar, rechts die App live.
- „Vollbild“: die App in einem eigenen Browser-Tab, den du wie eine App installieren kannst.
- „Plugins“: die Plugins der App und ihre Rechte; weitere aus Git importieren.
- „Neu bauen“: baut die App sofort neu. Solange ein Build läuft, wird die Schaltfläche zu „Wird gebaut…“ mit einer Uhr (zum Beispiel 1:23) und lässt sich nicht erneut drücken; über der App steht eine dünne Zeile, die sagt, was gerade gebaut wird („Pakete werden gebündelt…“ oder „App-Code wird gebaut…“), mit derselben Uhr. Der erste Build kann einige Minuten dauern, auf dem Handy länger: Lass die Seite geöffnet.

Auf dem Handy liegen diese drei im Kontomenü, und der Eintrag „Neu bauen“ zeigt dieselbe Uhr „Wird gebaut…“.

Nach einem App-Update wird die App beim nächsten Öffnen neu gebaut, aber nur die geänderten Dateien (und die Pakete nur, wenn sie sich geändert haben), deshalb geht es meist schnell. Einstellungen > Entwickler listet jede App mit ihrem Build: „Gebaut und aktuell“, „Früher gebaut. Wird beim Öffnen neu gebaut“, „Noch nicht gebaut. Wird beim Öffnen gebaut“, „Build fehlgeschlagen“ oder „Wird gebaut…“ mit der Uhr, solange einer läuft.

## Wenn eine App eine andere App lesen möchte

Eine App darf Dateien einer anderen App lesen, zum Beispiel liest Social deine Roleplay-Charaktere. Beim ersten Öffnen einer solchen App erscheint eine Frage: „<app> Daten von <other app> lesen lassen?“, mit dem Zweck und den genauen Dateien. „Erlauben“ und „Nicht erlauben“ sind Antworten; „Später entscheiden“ fragt beim nächsten Mal erneut. Der Zugriff ist nur lesend: Die App kann in der anderen App nichts ändern oder löschen und sieht nur die aufgelisteten Dateien. Du kannst deine Antwort jederzeit ändern: Öffne auf der Startseite die Details der App und schau unter „Zugriff auf andere Apps“. Fragt ein Update der App nach mehr Dateien, wirst du erneut gefragt. Wird eine der beiden Apps entfernt, ist die Antwort vergessen.

## Nachrichten von Apps

Eine offizielle App, etwa Social, kann Molfar Vertep mitteilen, dass auf dich etwas wartet. Auf dem Tab der App erscheint eine kleine Zahl, und wenn etwas Neues eintrifft, siehst du eine kurze Meldung: ein Popup unten rechts, während du in Molfar Vertep etwas anderes ansiehst, oder eine Systembenachrichtigung, wenn das Fenster nicht im Vordergrund ist (der Browser fragt einmal nach der Erlaubnis; der Schalter für Systembenachrichtigungen liegt in den Einstellungen). Solange du die App selbst ansiehst, wird nichts angezeigt. Um das für eine App auszuschalten, öffne ihre Details auf der Startseite und schalte „Benachrichtigungen von dieser App“ aus; die Zahl verschwindet dann ebenfalls. Ein Klick auf das Popup öffnet die App.

## Der Store

„Store“ auf der Startseite zeigt Apps von Molfar Vertep (gekennzeichnet „Offizielle App“) und aus der Community. Drücke „Installieren“: Du siehst zuerst, was die App mitbringt und worauf sie zugreifen kann, und nichts läuft, bis du bestätigst. Installiere nur, was du für vertrauenswürdig hältst, denn Apps führen echten Code auf deinem Computer aus. „Aktualisieren“ fragt nach neuen Apps, und ein Zähler zeigt an, wie viele seit deinem letzten Blick hinzugekommen sind.

## Neue und importierte Apps

- „Neue App“: Gib ihr einen Namen (Autor ist optional), und du bekommst eine Vorlage, die Molfar mit dir ausbaut.
- „App importieren“: aus einem Git-Repository oder einer Sicherungsdatei von „App exportieren“. Sie wird zuerst geprüft, und nichts läuft, bis du gelesen hast, was sie mitbringt, und bestätigt hast.

## Updates

Das Download-Symbol in der oberen Leiste bekommt einen Punkt, wenn etwas ansteht. Es listet jede App und hat „Jetzt prüfen“. Eine App ohne Update-Quelle zeigt „Keine Update-Quelle“ und einen kurzen Grund. Eine App, die aus einer Datei (einer ZIP-Datei) installiert wurde, lässt sich hier nicht aktualisieren: Für Updates installiere sie aus dem Store; diese Kopie ist eine eigene App, exportiere also vorher die Datei, wenn sie Daten enthält, die du behalten willst (das Papierkorb-Symbol löscht eine App und ihre Daten). Eine App, die auf diesem Gerät entstanden ist (etwa durch Molfar) oder von Hand hineinkopiert wurde, hat gar keine Quelle, aus der sie sich aktualisieren könnte. Eine App, deren Bereich `engine` einen App-Vertrag nennt, den diese Engine nicht hat (eine Molfar-Vertep-Versionsnummer, die dort versehentlich steht, zählt dazu), wird bei der Installation mit einer entsprechenden Meldung abgelehnt; die Engine-Zeile im Update-Dialog nennt installierte Apps, die schon jetzt nicht passen. „Alle aktualisieren“ erscheint, wenn zwei oder mehr Apps warten, und schließt Molfar Vertep selbst nie ein.

Deine eigenen Änderungen werden in ein Update eingearbeitet, und deine Daten bleiben erhalten. Wo deine Änderungen sich mit der neuen Version überschneiden, ändert sich zuerst nichts: Du wählst „Meine behalten“, „Update übernehmen“ oder „Molfar zum Zusammenführen bitten“. Ein Update, das neue Pakete installiert oder neue Rechte verlangt, wartet auf dein OK.

## Wo die App-Einstellungen sind

Die Einstellungen einer App liegen in der App selbst. Die Einstellungen der Shell verwalten, was alle Apps gemeinsam nutzen: Modelle, Sprache, Bilder, Gedächtnis, MCP-Server. Siehe [[settings]].

## Wenn eine App fehlschlägt

Schlägt der Build einer App fehl, behält sie ihre letzte gute Version, und ihre Fehlerleiste bietet „Molfar fragen“ – das schickt ihm das Problem in einem neuen Chat. Siehe [[help-and-bugs]].
