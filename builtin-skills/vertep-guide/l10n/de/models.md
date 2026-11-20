<!-- source: cb493ace9db7 -->
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

Zu den Einstellungen eines Modells gehören sein Kontextfenster, die maximale Ausgabe-Token, Reasoning, Preise (in Dollar pro Million Token), eine Prompt-Cache-Prüfung, eine Cache-Lebensdauer und die Sampling-Parameter wie Strafen und Min P. „Cache prüfen“ sagt dir, ob der Anbieter einen wiederholten Prompt aus seinem Cache liest, was günstiger und schneller ist. Die Cache-Lebensdauer hat drei Auswahlmöglichkeiten: „Anbietereigene“ (normalerweise etwa 5 Minuten, es wird nichts zusätzlich gesendet), „Lang“ (fordert eine Stunde bei Claude und bis zu einen Tag bei GPT an; keine zusätzlichen Anfragen, das Schreiben des Caches kostet mehr; nur bei Verbindungen angeboten, die es beachten: Anthropic selbst, Claude über OpenRouter und OpenAI, und andernorts ausgegraut, weil ein Gateway es ignorieren oder die Anfrage ablehnen kann) und „Am Leben halten“ (nach einer Chat-Antwort sendet die Engine etwa alle 5 Minuten eine kleine Anfrage, bis zu 40 Minuten lang, damit der Cache nicht verfällt; es kostet jedes Mal etwa ein Zehntel des Eingabepreises des Prompts, zählt gegen Anfragelimits und Abos, erfordert, dass die Preise des Modells festgelegt sind, und wird nicht mit Tools verwendet, oder mit Thinking bei Claude (eine Anfrage mit Claudes Thinking braucht eine größere Antwort als die 16 Token, die eine Keep-alive-Anfrage hat); es schreibt nichts in den Chat, das Panel zählt die Anfragen, und wenn es nicht läuft, sagt das Panel warum). Beginne mit „Lang“ für Claude auf Anthropic oder OpenRouter: es braucht keine zusätzlichen Anfragen. Claude über ein Gateway wie NanoGPT ignoriert die lange Lebensdauer, und Gemini-Modelle dort cachen von selbst für ein paar Minuten: nutze Am Leben halten für diese. In Roleplay zeigt die Schaltfläche Request size im Chat-Kopf an, wie viel der letzten Anfrage aus dem Cache kam und wo im Prompt der Cache endet. Am Leben halten ist für Anbieter ohne lange Option, und nicht für kostenlose Modelle mit einem täglichen Anfragelimit. „Empfohlene Einstellungen“ kann sinnvolle Werte eintragen, und Zurücksetzen geht zurück. Getrennte Blöcke können für Molfar, für Chat-Antworten in Apps oder für ein einzelnes Plugin gelten. Felder, die du auslässt, werden nicht gesendet.

## Bildmodell

Apps senden diesem Modell Bilder, zum Beispiel um einen Charakter anhand eines Porträts zu beschreiben. „Auto“ nimmt das günstigste Modell, das Bilder lesen kann. Falls keins von deinen das kann, füge eine Verbindung mit einem solchen hinzu.

## Bilder

„Bilder“ in den Einstellungen richtet die Bilderzeugung für jede App ein. Du kannst Bildmodelle aus deinen Verbindungen hinzufügen oder Bildserver: einen ComfyUI, einen AUTOMATIC1111- oder Forge-Server, der mit eingeschalteter API gestartet wurde, oder jeden Dienst mit einem Bilder-Endpunkt. Ein ComfyUI kann auch einer auf RunPod Serverless sein: ComfyUI wählen, als Adresse `https://api.runpod.ai/v2/` gefolgt von deiner Endpoint-ID eingeben, als Schlüssel deinen RunPod-API-Schlüssel, und unter „Modelle“ die Checkpoint-Dateinamen auf deinem Worker (RunPod kann sie nicht auflisten); „Prüfen“ sagt dir, ob Endpoint-ID und Schlüssel stimmen. Das erste Bild kann bis zu einer halben Minute dauern, während der Worker startet. Mit Stern markierte Bildmodelle werden Favoriten. Molfar wählt danach, wofür jedes gedacht ist, und Roleplay listet sie in seiner Auswahl zuerst auf.

## Sprache

„Sprache“ gibt jeder App Text-zu-Sprache. Kostenlose Edge-Stimmen funktionieren sofort; jede hat eine Schaltfläche „Testen“. Du kannst außerdem „Endpunkt hinzufügen“ für einen Sprachdienst (OpenAI, Groq oder einen lokalen Server) mit Modellname, Standardstimme und Schlüssel.

## Kosten und kleine Modelle

- Molfar zeigt vor großen Aufgaben und kostenpflichtigen Bildern eine Kostenschätzung. Siehe „Kostenprüfungen“ in Einstellungen, Molfar.
- Ein Modell mit kleinem Kontextfenster kann in Molfars vollen Anweisungen untergehen. Der „Modus für kleine Modelle“ sendet einen kürzeren Prompt. Sein Standard Auto schaltet sich bei 32k Token oder weniger ein oder wenn die Größe unbekannt ist.

Siehe auch [[settings]] und [[first-steps]].
