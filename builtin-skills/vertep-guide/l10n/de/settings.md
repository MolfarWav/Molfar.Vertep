<!-- source: 3e8eaf6fcf3f -->
# Einstellungen im Überblick

Einstellungen ist das eigene Fenster der Shell, das alle Apps gemeinsam nutzen. Öffne es mit dem Zahnrad in der oberen Leiste oder auf dem Handy über das Kontomenü oben rechts. Diese Seite listet jeden Abschnitt auf, damit du weißt, wo du suchen musst.

## Abschnitte

- **Allgemein.** Die Sprache der Oberfläche, der Block „Anleitung“ (Rundgänge ausschalten, erneut abspielen, Was ist neu erneut zeigen) und dein Konto: Bild, Name, Passwort, „Abmelden“.
- **Backup.** Exportiere dein ganzes Profil, um auf einen anderen Computer umzuziehen, und importiere eines. Siehe [[devices]].
- **Speicher.** Die Bilder, die deine Karten, Chats und Sprites verwenden. „Unbenutzte Bilder finden“ findet solche, die niemand verwendet, und verschiebt sie in den Papierkorb; „Papierkorb leeren“ entfernt sie nach Rückfrage endgültig.
- **Synchronisierung.** Nimm deine Spiele mit Google Drive oder einem Ordner zwischen Geräten mit. Siehe [[devices]].
- **Verbindungen und Modelle.** Anbieter, die Modellliste, Favoriten, Einstellungen pro Modell, das Bildmodell. Siehe [[models]].
- **Sprache.** Text-zu-Sprache: Edge-Stimmen und deine eigenen Sprach-Endpunkte.
- **Bilder.** Bilderzeugung: Bildmodelle und Bildserver.
- **Molfar.** Wie Molfar sich in jeder App verhält:
  - sein Internetzugang in der Sandbox;
  - „Lange Sitzungen automatisch verdichten“;
  - „Modus für kleine Modelle“;
  - „Kostenprüfungen“: Auto, Immer fragen oder Nie fragen;
  - „Benachrichtigungen“, wenn er etwas fragt, fertig wird oder fehlschlägt;
  - „Molfars Anweisungen“, deine festen Vorlieben für ihn;
  - die Liste der geschützten Dateien.
  Siehe [[molfar]].
- **Gedächtnis.** Wie Apps sich Dinge über Chats hinweg merken und wiederfinden. Es kann nach Bedeutung abgleichen, nicht nur nach exakten Wörtern, mit einem einzigen günstigen Embedding-Modell. Das ist optional. Standardmäßig wählt Molfar Vertep das Modell selbst: zuerst eines auf deinem eigenen Computer (LM Studio, Ollama, kein Schlüssel nötig), dann eine API-Verbindung mit Schlüssel, dann OpenRouter. Ist keines eingerichtet, sagt das Gedächtnis es und gleicht nur nach Wörtern ab. Du kannst außerdem mit einem Klick ein Modell auf deinen eigenen Computer laden: Wähle unter **On this computer (optional)** **bge-m3** (empfohlen, am besten für Ukrainisch, Russisch und Englisch) oder **EmbeddingGemma 2** (kleiner) und drücke **Download and connect**. Die Engine installiert zuerst das Programm, das das Modell ausführt (etwa 85 MB, einmalig), lädt dann das Modell herunter (587 MB oder 346 MB) und verbindet es. Der Download läuft weiter, wenn du das Fenster schließt, und ein unterbrochener setzt dort fort, wo er stehen blieb. Danach ist es kostenlos, nichts geht ins Internet, und das Modell braucht Speicher (etwa 1.1 GB oder 0.6 GB) nur, während es arbeitet. **Delete** gibt den Speicherplatz zurück. Dafür braucht es einen Computer, auf dem die Engine mit Bun läuft, nicht den Launcher auf dem Telefon; die Online-Verbindung bleibt als Reserve, und wenn du das Modell wechselst, erstellt das Gedächtnis seine Vektoren von selbst neu.
- **MCP-Server.** Tool-Server, die Molfar und deine Apps aufrufen können. Apps starten mit allen ausgeschaltet und schalten ein, was sie brauchen.
- **Entwickler.** Zeigt den Build-Zustand jeder App und Live-Hot-Reload, das immer an ist.

## Nur für den Administrator

- **Server.** Wie Molfar Vertep auf diesem Computer läuft: Port, Browser beim Start öffnen, andere Geräte in deinem Netzwerk erlauben (mit QR-Code für dein Handy), HTTPS, ob Apps Pakete herunterladen dürfen, die Version und wie man aktualisiert.
- **Benutzer.** Personen, die sich anmelden können. Jede bekommt einen eigenen Arbeitsbereich, Agenten und Apps.

## App-Einstellungen

Ganz oben in der Liste nennt eine Gruppe **App-Einstellungen** jede installierte App, die eine eigene Einstellungsseite hat (Roleplay, dort als „Vertep“ angezeigt, und Social). Drückst du eine davon, schließt sich Einstellungen, und die App öffnet ihre Einstellungsseite: bei Roleplay das Chat-Aussehen, „Chat Behavior“ (Rechtschreibprüfung, Autokorrektur), Streaming, Designs und die übrigen Chat-Einstellungen. Eine App ohne Einstellungsseite wird nicht aufgeführt. Dieselbe Seite gibt es auch innerhalb der App: siehe [[apps]].

> Auf dem Handy zeigt Einstellungen zuerst eine Liste der Abschnitte; tippe einen an, um hineinzugehen, und nutze Zurück, um zurückzukehren.
