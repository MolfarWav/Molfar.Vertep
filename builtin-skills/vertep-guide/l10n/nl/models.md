<!-- source: 41cddad16b7f -->
# Modellen en verbindingen

Molfar en je apps hebben een AI-model nodig om te antwoorden. Deze pagina legt uit hoe je er een verbindt, kiest welke modellen verschijnen en afbeeldingen en spraak instelt. Het staat allemaal in Instellingen.

## Verbindingen

Een verbinding is een opgeslagen link naar een aanbieder of server. Open Instellingen, dan "Verbindingen en modellen" en dan "Verbinding toevoegen". De aanbiederslijst biedt:

- Bekende aanbieders: kies er een en plak de API-sleutel.
- "Abonnementen (OAuth)": je meldt je aan in plaats van een sleutel te plakken.
- "Lokaal model": Ollama, LM Studio, llama.cpp en andere die op je eigen computer draaien.
- "Aangepast endpoint": elke server die een van de ondersteunde formaten spreekt, zoals OpenAI-compatibel.

Een verbinding toont "Verbonden" zodra hij een sleutel heeft (of er geen nodig heeft) en anders "Sleutel nodig". Dat is geen test dat het model werkt. Sleutels worden alleen op deze computer opgeslagen.

## Kiezen welke modellen verschijnen

Eén verbinding kan honderden modellen meebrengen. In de lijst onder de verbindingen:

- Vink de modellen aan die de keuzelijsten moeten tonen. Is niets aangevinkt, dan tonen ze allemaal.
- Geef een ster aan de modellen waartussen je wisselt. Die vormen de "Snelle wissel" en komen eerst in modelkeuzelijsten, in Molfars chats en in apps.
- Gebruik het schuifjes-pictogram om de eigen instellingen van een model te openen.

## Instellingen per model

De instellingen van een model omvatten het contextvenster, maximale uitvoertokens, redeneren, prijzen (in dollars per miljoen tokens), een promptcachecontrole en de samplingparameters zoals straffen en Min P. "Aanbevolen instellingen" kan verstandige waarden invullen en Terugdraaien gaat terug. Afzonderlijke blokken kunnen gelden voor Molfar, voor chatantwoorden in apps of voor een individuele plug-in. Velden die je uitzet, worden niet verzonden.

## Beeldmodel

Apps sturen afbeeldingen naar dit model, bijvoorbeeld om een personage te beschrijven vanaf een portret. "Auto" neemt het goedkoopste model dat afbeeldingen kan lezen. Kan geen van je modellen dat, voeg dan een verbinding toe met zo'n model.

## Afbeeldingen

"Afbeeldingen" in Instellingen stelt beeldgeneratie in voor elke app. Je kunt beeldmodellen uit je verbindingen toevoegen, of beeldservers: een ComfyUI-, AUTOMATIC1111- of Forge-server gestart met de API aan, of elke dienst met een afbeeldingen-endpoint. Beeldmodellen met een ster worden favorieten. Molfar kiest eruit op basis van waar elk voor dient en Roleplay toont ze bovenaan in zijn eigen keuzelijst.

## Spraak

"Spraak" geeft tekst-naar-spraak aan elke app. Gratis Edge-stemmen werken meteen; elke stem heeft een knop "Testen". Je kunt ook "Endpoint toevoegen" voor een spraakdienst (OpenAI, Groq of een lokale server) met een modelnaam, een standaardstem en een sleutel.

## Kosten en kleine modellen

- Molfar toont een kostenschatting voor grote taken en betaalde afbeeldingen. Zie "Kostencontroles" in Instellingen, Molfar.
- Een model met een klein contextvenster kan verdrinken in Molfars volledige instructies. "Modus voor kleine modellen" stuurt een kortere prompt. De standaard Auto schakelt in bij 32k tokens of minder, of wanneer de grootte onbekend is.

Zie ook [[settings]] en [[first-steps]].
