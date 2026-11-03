<!-- source: c3880a3f342c -->
# Molfar, je agent

Molfar is de AI-agent die in Molfar Vertep is ingebouwd. Alles hier bestaat uit gewone bestanden en hij bewerkt die bestanden voor je. Lees deze pagina als je iets aan je apps wilt veranderen en het niet met de hand wilt doen.

## Waar hij woont

Open de rij "Molfar" op de startpagina. Hij krijgt een eigen tabblad, de agentpagina. Schrijf in het vak en druk op Enter om te verzenden (op een telefoon maakt Enter een nieuwe regel en verstuurt de pijlknop). Typ `/` voor commando's en sjablonen, of `@` om een bestand, personage, lorebook of voorinstelling te noemen zodat hij precies daarnaar kijkt.

Met een app open zet "Splitsen" Molfar links en de app live rechts, zodat je hem ziet veranderen terwijl je vraagt. Op een telefoon is hij gewoon een ander tabblad.

## Wat hij kan

- Een app veranderen: de schermen, het gedrag, de kleuren, de indeling.
- Een nieuwe app maken vanuit een startpunt en die dan met jou uitbouwen.
- Gegevens in apps bewerken, bijvoorbeeld personagekaarten en lorebooks, zelfs hele grote.
- Plug-ins toevoegen en thema's wijzigen.
- Afbeeldingen genereren met de beeldmodellen die je hebt ingesteld.
- Notities bijhouden en geheugenitems en vaardigheden voorstellen.
- Als je de beheerder bent, helpen met accounts en serverinstellingen. Elke zulke wijziging wacht op je goedkeuring.

Hij kijkt voordat hij verandert, werkt in kleine stappen, controleert zijn werk en eindigt met een kort verslag van wat er is veranderd en hoe je het ongedaan maakt.

## Wat hij eerst vraagt

- **Grote of onduidelijke verzoeken.** Voor een nieuwe app of een grote functie stelt hij eerst een paar vragen met opties.
- **Beschermde bestanden.** Standaard zijn de bronbestanden van een app en de hoofdpagina beschermd, en ook zijn eigen vaste instructies en het modelparametersbestand. Een kaart vraagt "Toestaan" of "Niet toestaan", en het antwoord geldt alleen voor dat ene verzoek. Je bewerkt de lijst in Instellingen, Molfar.
- **Kosten.** Voor een grote taak, een betaalde testgeneratie of een betaald beeld toont hij een schatting en wacht op je ja. Verander dit in Instellingen, Molfar, Kostencontroles.
- **Shell-commando's.** Afhankelijk van de modus, hieronder.

## Modus

De modusknop in de koptekst bepaalt wat hij zonder te vragen mag doen:

- **Volledig** plant grote wijzigingen eerst en bewerkt en voert daarna commando's uit.
- **Accepteren** slaat de planstap over en vraagt voor elk shell-commando.
- **Plannen** leest en plant alleen en verandert niets. Na een plan verlaat "Voorstel toepassen" de modus en voert het uit.

## Hoe je ongedaan maakt

Onder een antwoord dat een app veranderde zie je "Gewijzigd <app> · N bestanden · Ongedaan maken". Ongedaan maken vraagt eerst en zet de code van de app daarna terug zoals die vóór die uitvoering was. Je chats en uploads blijven. De projectpagina van een app heeft ook controlepunten: opgeslagen punten van de code van de app, die Molfar maakt voordat hij de app verandert. Je kunt zelf toevoegen met "Controlepunt opslaan", en Herstellen vraagt eerst. Elke herstelactie wordt zelf ook opgeslagen, dus die kan ongedaan worden gemaakt.

## Geheugen en vaardigheden

De hersenknop opent "Geheugen en vaardigheden". Geheugen bevat wat hij tussen chats bewaart; hij stelt items voor en slaat er een pas op als jij akkoord gaat. Vaardigheden zijn korte instructies voor een soort klus; "Nieuwe vaardigheid" schrijft er een en "Verbeteren met Molfar" verfijnt die. Zie [[projects-and-chats]] voor de projectspecifieke.

## Goed om te weten

- Kleine of gratis modellen: "Modus voor kleine modellen" in Instellingen, Molfar stuurt een kortere prompt.
- De oogknop, promptinspecteur, toont wat het model echt is gestuurd.
- Lange chats kunnen met "Gesprek comprimeren" of `/compact` in een samenvatting worden gevouwen.
- Woorden die hier worden gebruikt, staan uitgelegd in [[glossary]].
