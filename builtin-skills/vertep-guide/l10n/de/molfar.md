<!-- source: 6b5436de93e1 -->
# Molfar, dein Agent

Molfar ist der KI-Agent, der in Molfar Vertep eingebaut ist. Alles hier sind einfache Dateien, und er bearbeitet diese Dateien für dich. Lies diese Seite, wenn du etwas an deinen Apps ändern willst und es nicht von Hand tun möchtest.

## Wo er lebt

Öffne die Zeile „Molfar“ auf der Startseite. Er bekommt einen eigenen Tab, die Agentenseite. Schreib in das Feld und drücke Enter zum Senden (auf dem Handy macht Enter eine neue Zeile, und die Pfeiltaste sendet). Tippe `/` für Befehle und Vorlagen oder `@`, um eine Datei, einen Charakter, ein Lorebuch oder ein Preset zu nennen, damit er genau das ansieht.

Bei geöffneter App legt „Teilen“ Molfar links und die App live rechts, sodass du ihr beim Ändern zusiehst, während du fragst. Auf dem Handy ist er einfach ein weiterer Tab.

## Was er kann

- Eine App ändern: ihre Bildschirme, ihr Verhalten, ihre Farben, ihr Layout.
- Aus einer Vorlage eine neue App erstellen und sie dann mit dir ausbauen.
- Daten in Apps bearbeiten, zum Beispiel Charakterkarten und Lorebücher, auch sehr große.
- Plugins hinzufügen und Designs ändern.
- Bilder mit den von dir eingerichteten Bildmodellen erzeugen.
- Notizen führen sowie Gedächtniseinträge und Skills vorschlagen.
- Wenn du Administrator bist, bei Konten und Servereinstellungen helfen. Jede solche Änderung wartet auf deine Zustimmung.

Er schaut, bevor er ändert, arbeitet in kleinen Schritten, prüft seine Arbeit und endet mit einem kurzen Bericht, was geändert wurde und wie man es rückgängig macht.

## Was er zuerst fragt

- **Große oder unklare Anfragen.** Bei einer neuen App oder einem großen Feature stellt er zuerst ein paar Fragen mit Optionen.
- **Geschützte Dateien.** Standardmäßig sind der Quellcode einer App und ihre Hauptseite geschützt, ebenso seine eigenen festen Anweisungen und die Datei mit den Modellparametern. Eine Karte fragt „Erlauben“ oder „Nicht erlauben“, und die Antwort gilt nur für diese eine Anfrage. Du bearbeitest die Liste in Einstellungen, Molfar.
- **Kosten.** Vor einer großen Aufgabe, einer kostenpflichtigen Testgenerierung oder einem kostenpflichtigen Bild zeigt er eine Schätzung und wartet auf dein Ja. Ändern kannst du das in Einstellungen, Molfar, Kostenprüfungen.
- **Shell-Befehle.** Je nach Modus, siehe unten.

## Modus

Die Modusauswahl in der Kopfzeile entscheidet, was er ohne Rückfrage tun darf:

- **Voll** plant große Änderungen zuerst, bearbeitet dann und führt Befehle aus.
- **Akzeptieren** überspringt den Planschritt und fragt vor jedem Shell-Befehl.
- **Planen** liest und plant nur und ändert nichts. Nach einem Plan verlässt „Vorschlag anwenden“ den Modus und führt ihn aus.

## Rückgängig machen

Unter einer Antwort, die eine App geändert hat, siehst du „<App> geändert · N Dateien · Rückgängig“. Rückgängig fragt zuerst und setzt dann den Code der App auf den Stand vor diesem Durchlauf zurück. Deine Chats und Uploads bleiben. Die Projektseite einer App hat außerdem Prüfpunkte: gespeicherte Punkte des App-Codes, die Molfar anlegt, bevor er die App ändert. Mit „Prüfpunkt speichern“ kannst du eigene hinzufügen, und Wiederherstellen fragt zuerst. Jede Wiederherstellung wird selbst gespeichert und kann daher rückgängig gemacht werden.

## Gedächtnis und Skills

Die Gehirn-Schaltfläche öffnet „Gedächtnis und Skills“. Das Gedächtnis hält fest, was er zwischen Chats behält; er schlägt Einträge vor und speichert einen erst, wenn du zustimmst. Skills sind kurze Anweisungen für eine Art von Aufgabe; „Neuer Skill“ schreibt einen, und „Mit Molfar verbessern“ verfeinert ihn. Siehe [[projects-and-chats]] für die projektspezifischen.

### Das Postfach

Eine Karte, die einen Gedächtniseintrag oder einen Skill vorschlägt, hat drei Antworten: „Save“, „Later“ und „Skip“. „Later“ lässt den Vorschlag im Tab „Mailbox“ von „Gedächtnis und Skills“ liegen, ebenso eine Karte, die niemand beantwortet hat, und einen Vorschlag, den Molfar nach einer langen Aufgabe macht. Eine Zahl auf der Gehirn-Schaltfläche zeigt, wie viele warten; wartet etwas, öffnet die Schaltfläche den Tab „Mailbox“.

- Ein Gedächtniseintrag lässt sich vor dem Speichern bearbeiten. Ein Skill wird vollständig gezeigt, oder als Diff, wenn er einen vorhandenen Skill ändert, und so gespeichert, wie er gezeigt wird. Um ihn zu ändern, überspringe ihn und sage Molfar, was er korrigieren soll.
- „Skip“ wird gemerkt, damit Molfar denselben Vorschlag nicht erneut bringt. „Skip all“ leert die Liste.
- Ein Chat, der fertig wurde, während du in einem anderen Chat warst, wartet ebenfalls im Tab „Mailbox“, mit „Open“ und „Dismiss“. Die Chatliste markiert ihn genauso.

## Gut zu wissen

- Kleine oder kostenlose Modelle: „Modus für kleine Modelle“ in Einstellungen, Molfar sendet einen kürzeren Prompt.
- Die Augen-Schaltfläche, der Prompt-Inspektor, zeigt, was dem Modell wirklich gesendet wurde.
- Lange Chats lassen sich mit „Gespräch verdichten“ oder `/compact` zu einer Zusammenfassung falten.
- Die hier verwendeten Wörter werden in [[glossary]] erklärt.
