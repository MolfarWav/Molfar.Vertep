<!-- source: 41cddad16b7f -->
# Modelle und Verbindungen

Molfar und deine Apps brauchen ein KI-Modell, um zu antworten. Diese Seite erklärt, wie du eines verbindest, auswählst, welche Modelle angezeigt werden, und Bilder und Sprache einrichtest. Das alles liegt in den Einstellungen.

## Verbindungen

Eine Verbindung ist ein gespeicherter Link zu einem Anbieter oder Server. Öffne Einstellungen, dann „Verbindungen und Modelle“, dann „Verbindung hinzufügen“. Die Anbieterliste bietet:

- Bekannte Anbieter: wähle einen und füge seinen API-Schlüssel ein.
- „Abos (OAuth)“: du meldest dich an, statt einen Schlüssel einzufügen.
- „Lokales Modell“: Ollama, LM Studio, llama.cpp und andere, die auf deinem eigenen Computer laufen.
- „Benutzerdefinierter Endpunkt“: jeder Server, der eines der unterstützten Formate spricht, etwa OpenAI-kompatibel.

Eine Verbindung zeigt „Verbunden“, sobald sie einen Schlüssel hat (oder keinen braucht), sonst „Schlüssel nötig“. Das ist kein Test, ob das Modell funktioniert. Schlüssel werden nur auf diesem Computer gespeichert.

## Auswählen, welche Modelle angezeigt werden

Eine Verbindung kann Hunderte Modelle mitbringen. In der Liste unter den Verbindungen:

- Hake die Modelle an, die die Auswahllisten zeigen sollen. Ist nichts angehakt, werden alle gezeigt.
- Gib den Modellen, zwischen denen du wechselst, einen Stern. Sie bilden die „Schnellauswahl“ und erscheinen zuerst in den Modellauswahlen, in Molfars Chats und in Apps.
- Nutze das Regler-Symbol, um die Einstellungen eines Modells zu öffnen.

## Einstellungen pro Modell

Zu den Einstellungen eines Modells gehören sein Kontextfenster, die maximale Ausgabe-Token, Reasoning, Preise (in Dollar pro Million Token), eine Prompt-Cache-Prüfung und Sampling-Parameter wie Strafen und Min P. „Empfohlene Einstellungen“ kann sinnvolle Werte eintragen, und Zurücksetzen geht zurück. Getrennte Blöcke können für Molfar, für Chat-Antworten in Apps oder für ein einzelnes Plugin gelten. Felder, die du auslässt, werden nicht gesendet.

## Bildmodell

Apps senden diesem Modell Bilder, zum Beispiel um einen Charakter anhand eines Porträts zu beschreiben. „Auto“ nimmt das günstigste Modell, das Bilder lesen kann. Falls keins von deinen das kann, füge eine Verbindung mit einem solchen hinzu.

## Bilder

„Bilder“ in den Einstellungen richtet die Bilderzeugung für jede App ein. Du kannst Bildmodelle aus deinen Verbindungen hinzufügen oder Bildserver: einen ComfyUI, einen AUTOMATIC1111- oder Forge-Server, der mit eingeschalteter API gestartet wurde, oder jeden Dienst mit einem Bilder-Endpunkt. Mit Stern markierte Bildmodelle werden Favoriten. Molfar wählt danach, wofür jedes gedacht ist, und Roleplay listet sie in seiner Auswahl zuerst auf.

## Sprache

„Sprache“ gibt jeder App Text-zu-Sprache. Kostenlose Edge-Stimmen funktionieren sofort; jede hat eine Schaltfläche „Testen“. Du kannst außerdem „Endpunkt hinzufügen“ für einen Sprachdienst (OpenAI, Groq oder einen lokalen Server) mit Modellname, Standardstimme und Schlüssel.

## Kosten und kleine Modelle

- Molfar zeigt vor großen Aufgaben und kostenpflichtigen Bildern eine Kostenschätzung. Siehe „Kostenprüfungen“ in Einstellungen, Molfar.
- Ein Modell mit kleinem Kontextfenster kann in Molfars vollen Anweisungen untergehen. Der „Modus für kleine Modelle“ sendet einen kürzeren Prompt. Sein Standard Auto schaltet sich bei 32k Token oder weniger ein oder wenn die Größe unbekannt ist.

Siehe auch [[settings]] und [[first-steps]].
