<!-- source: 6d6849f7892f -->
# Instellingenkaart

Instellingen is het eigen venster van de shell, gedeeld door alle apps. Open het met het tandwiel in de bovenste balk, of op een telefoon vanuit het accountmenu rechtsboven. Deze pagina noemt elk gedeelte zodat je weet waar je moet kijken.

## Gedeelten

- **Algemeen.** De interfacetaal, het blok "Gids" (rondleidingen uitzetten, opnieuw afspelen, Wat is er nieuw opnieuw tonen) en je account: afbeelding, naam, wachtwoord, "Afmelden".
- **Back-up.** Exporteer je hele profiel om naar een andere computer te verhuizen en importeer er een. Zie [[devices]].
- **Opslag.** De afbeeldingen die je kaarten, chats en sprites gebruiken. "Ongebruikte afbeeldingen zoeken" vindt afbeeldingen die niets gebruikt en verplaatst ze naar de prullenbak; "Prullenbak legen" verwijdert ze definitief, na een bevestiging.
- **Sync.** Neem je spellen mee tussen apparaten met Google Drive of een map. Zie [[devices]].
- **Verbindingen en modellen.** Aanbieders, de modellenlijst, favorieten, instellingen per model, het beeldmodel. Zie [[models]].
- **Spraak.** Tekst-naar-spraak: Edge-stemmen en je eigen spraak-endpoints.
- **Afbeeldingen.** Beeldgeneratie: beeldmodellen en beeldservers.
- **Molfar.** Hoe Molfar zich gedraagt, in elke app:
  - zijn internettoegang in de sandbox;
  - "Lange sessies automatisch comprimeren";
  - "Modus voor kleine modellen";
  - "Kostencontroles": Auto, Altijd vragen of Nooit vragen;
  - "Meldingen" wanneer hij iets vraagt, klaar is of faalt;
  - "Instructies van Molfar", je vaste voorkeuren voor hem;
  - de lijst met beschermde bestanden.
  Zie [[molfar]].
- **Geheugen.** Hoe apps dingen over chats heen onthouden en terugvinden. Het kan op betekenis matchen, niet alleen op exacte woorden, met één goedkoop embeddingmodel. Dit is optioneel. Standaard kiest Molfar Vertep het model zelf: eerst één op je eigen computer (LM Studio, Ollama, geen sleutel nodig), dan een API-verbinding met een sleutel, en dan OpenRouter. Is er niets ingesteld, dan zegt het geheugen dat en matcht het alleen op woorden. Je kunt ook met één klik een model op je eigen computer downloaden: kies bij **Op deze computer (optioneel)** **bge-m3** (aanbevolen, het beste voor Oekraïens, Russisch en Engels) of **EmbeddingGemma 2** (kleiner) en druk op **Downloaden en verbinden**. De engine installeert eerst het programma dat het model draait (ongeveer 85 MB, eenmalig), downloadt dan het model (587 MB of 346 MB) en verbindt het. Het downloaden gaat door als je het venster sluit, en een onderbroken download gaat verder waar hij stopte. Daarna is het gratis, gaat er niets naar het internet, en neemt het model geheugen in (ongeveer 1.1 GB of 0.6 GB) alleen terwijl het werkt. **Verwijderen** geeft de schijfruimte terug. Het heeft een computer nodig die de engine met Bun draait, geen telefoon-launcher; de online verbinding blijft als reserve, en als je van model wisselt, maakt het geheugen zijn vectoren vanzelf opnieuw. De vectoren blijven op het apparaat dat ze heeft gemaakt en worden niet gesynchroniseerd, dus een computer en een telefoon die één werkruimte delen kunnen verschillende modellen gebruiken, en elk maakt zijn eigen vectoren. Een model dat onder twee namen hetzelfde is (bge-m3 op deze computer en via OpenRouter) behoudt zijn vectoren wanneer je tussen ze wisselt.
- **MCP-servers.** Toolservers die Molfar en je apps kunnen aanroepen. Apps beginnen met alles uit en zetten aan wat ze nodig hebben.
- **Ontwikkelaar.** Toont de buildstatus van elke app en live hot reload, die altijd aan staat.

## Alleen voor de beheerder

- **Server.** Hoe Molfar Vertep op deze computer draait: poort, de browser openen bij het starten, andere apparaten in je netwerk toestaan (met een QR-code voor je telefoon), HTTPS, of apps pakketten mogen downloaden, de versie en hoe je bijwerkt.
- **Gebruikers.** Mensen die kunnen inloggen. Elk krijgt een eigen werkruimte, agent en apps.

## App-instellingen

Bovenaan de lijst noemt een groep **App-instellingen** elke geïnstalleerde app die een eigen instellingenpagina heeft (Roleplay, daar getoond als „Vertep“, en Social). Tik je erop, dan sluit Instellingen en opent de app op zijn instellingenpagina: bij Roleplay de chatlook, „Chat Behavior“ (spellingcontrole, automatisch corrigeren), streaming, thema’s en de rest van de chatinstellingen. Een app zonder instellingenpagina staat er niet in. Dezelfde pagina staat ook in de app zelf: zie [[apps]].

> Op een telefoon toont Instellingen eerst een lijst met gedeelten; tik er een aan om naar binnen te gaan en gebruik Terug om terug te keren.
