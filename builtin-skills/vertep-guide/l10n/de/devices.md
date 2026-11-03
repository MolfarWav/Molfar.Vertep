<!-- source: abe560e8cdbc -->
# Geräte, Synchronisierung und Backups

So nutzt du Molfar Vertep auf dem Handy, nimmst deine Geschichten zwischen Geräten mit, installierst es wie eine App und ziehst auf einen neuen Computer um.

## Vom Handy aus öffnen

Unter Einstellungen, Server erlaubt „Andere Geräte in meinem Netzwerk erlauben“ einem Handy oder einem anderen Computer im selben Netzwerk, Molfar Vertep zu öffnen. Ein QR-Code zeigt die Adresse; scanne ihn mit der Handykamera. Jedes Konto braucht weiterhin sein Passwort. Handys erlauben Mikrofon und Installation als App nur über HTTPS; dafür schaltest du im selben Abschnitt „HTTPS verwenden“ ein. Diese Abschnitte sind für den Administrator sichtbar.

## Als App installieren

„App installieren“ im Kontomenü legt Molfar Vertep auf deinen Home-Bildschirm oder in die App-Liste deines Computers. Es öffnet sich dann in einem eigenen Fenster, ohne die Leiste des Browsers. Auf einem iPhone zeigt es, wo Safari es ablegt: Teilen, dann „Zum Home-Bildschirm“. Ein Handy, das deinen Computer unter einer http-Adresse öffnet, braucht zuerst https; der Dialog erklärt, wie. Eine offene App hat außerdem „Vollbild“ – das öffnet sie in einem eigenen Browser-Tab, den du installieren kannst.

## Synchronisierung

„Geräte synchronisieren“ im Kontomenü oder Einstellungen, Synchronisierung. Melde dich auf jedem Gerät einmal mit Google an. Wenn du aufhörst zu spielen, drücke „Hochladen“; auf dem anderen Gerät drücke „Übernehmen“ und spiele weiter. Nach dem ersten Mal reist nur noch, was sich geändert hat.

- Du wählst, was reist: Apps und ihre Daten, Molfars Chats und Projekte, Bilder, Ton und Video sowie API-Schlüssel mit MCP-Einstellungen. Schlüssel reisen nur, wenn du sie einschaltest, gesperrt mit einer Passphrase, die du auf jedem Gerät eingibst.
- Wurde derselbe Chat auf beiden Geräten geändert, wählst du, welche Version du behalten willst. Die andere wird 30 Tage gespeichert.
- Es gibt auch eine Option „Ordner“ für einen synchronisierten Ordner (Syncthing, Google Drive für Desktop) oder einen USB-Stick.

## Backup

Einstellungen, Backup exportiert dein ganzes Profil: Apps mit ihren Daten, Molfars Gedächtnis und Chats. Drücke „Profil exportieren“. Mit einem Passwort nimmst du deine API-Schlüssel verschlüsselt mit; ohne eines enthält das Backup keine Schlüssel, und du gibst sie erneut ein. Der Import zeigt zuerst, was darin steckt. Wenn du „Mein Profil ersetzen“ drückst, wird dein aktuelles Profil gesichert, bevor es ersetzt wird.

Nutze Backup, um einmalig auf einen neuen Computer umzuziehen. Nutze Synchronisierung, um oft hin und her zu wechseln.

## Nur eine App

Die Details einer App auf der Startseite haben „App exportieren“ – das erstellt eine Sicherungsdatei nur dieser App. „App importieren“ holt eine solche Datei herein. Siehe [[apps]].

Siehe auch [[settings]].
