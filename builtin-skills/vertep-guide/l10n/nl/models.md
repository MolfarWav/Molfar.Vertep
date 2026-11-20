<!-- source: cb493ace9db7 -->
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

De instellingen van een model omvatten het contextvenster, maximale uitvoertokens, redeneren, prijzen (in dollars per miljoen tokens), een promptcachecontrole, een cachelevensduur en de samplingparameters zoals straffen en Min P. "Cache controleren" vertelt je of de aanbieder een herhaalde prompt uit zijn cache leest, wat goedkoper en sneller is. De cachelevensduur heeft drie keuzes: "Eigen van aanbieder" (meestal ongeveer 5 minuten, er wordt niets extra verzonden), "Lang" (vraagt om een uur bij Claude en tot een dag bij GPT; geen extra verzoeken, het schrijven van de cache kost meer; alleen aangeboden op verbindingen die het honoreren: Anthropic zelf, Claude via OpenRouter en OpenAI, en elders grijs gemaakt, omdat een gateway het kan negeren of het verzoek kan weigeren) en "Actief houden" (na een chatantwoord stuurt de engine ongeveer elke 5 minuten een klein verzoek, tot 40 minuten lang, zodat de cache niet vervalt; het kost elke keer ongeveer een tiende van de invoerprijs van de prompt, telt mee voor verzoeklimieten en abonnementen, vereist dat de prijzen van het model zijn ingesteld, en wordt niet gebruikt met tools, of met denken bij Claude (een verzoek met Claude's denken heeft een groter antwoord nodig dan de 16 tokens die een actief-houden-verzoek heeft); het schrijft niets naar de chat, het paneel telt de verzoeken, en wanneer het niet loopt zegt het paneel waarom). Begin met "Lang" voor Claude op Anthropic of OpenRouter: het vereist geen extra verzoeken. Claude via een gateway zoals NanoGPT negeert de lange levensduur, en Gemini-modellen cachen daar vanzelf een paar minuten: gebruik Actief houden voor die. In Roleplay toont de knop Requestgrootte in de chatkop hoe veel van het laatste verzoek uit de cache kwam en waar in de prompt de cache eindigt. Actief houden is voor aanbieders zonder lange optie, en niet voor gratis modellen met een dagelijkse verzoeklimiet. "Aanbevolen instellingen" kan verstandige waarden invullen en Terugdraaien gaat terug. Afzonderlijke blokken kunnen gelden voor Molfar, voor chatantwoorden in apps of voor een individuele plug-in. Velden die je uitzet, worden niet verzonden.

## Beeldmodel

Apps sturen afbeeldingen naar dit model, bijvoorbeeld om een personage te beschrijven vanaf een portret. "Auto" neemt het goedkoopste model dat afbeeldingen kan lezen. Kan geen van je modellen dat, voeg dan een verbinding toe met zo'n model.

## Afbeeldingen

"Afbeeldingen" in Instellingen stelt beeldgeneratie in voor elke app. Je kunt beeldmodellen uit je verbindingen toevoegen, of beeldservers: een ComfyUI-, AUTOMATIC1111- of Forge-server gestart met de API aan, of elke dienst met een afbeeldingen-endpoint. Een ComfyUI kan ook er een zijn op RunPod Serverless: kies ComfyUI, vul als adres `https://api.runpod.ai/v2/` in gevolgd door je endpoint-id, als sleutel je RunPod-API-sleutel, en onder "Modellen" de bestandsnamen van de checkpoints op je worker (RunPod kan die niet opvragen); "Controleren" laat zien of het endpoint-id en de sleutel kloppen. De eerste afbeelding kan tot een halve minuut duren terwijl de worker opstart. Beeldmodellen met een ster worden favorieten. Molfar kiest eruit op basis van waar elk voor dient en Roleplay toont ze bovenaan in zijn eigen keuzelijst.

## Spraak

"Spraak" geeft tekst-naar-spraak aan elke app. Gratis Edge-stemmen werken meteen; elke stem heeft een knop "Testen". Je kunt ook "Endpoint toevoegen" voor een spraakdienst (OpenAI, Groq of een lokale server) met een modelnaam, een standaardstem en een sleutel.

## Kosten en kleine modellen

- Molfar toont een kostenschatting voor grote taken en betaalde afbeeldingen. Zie "Kostencontroles" in Instellingen, Molfar.
- Een model met een klein contextvenster kan verdrinken in Molfars volledige instructies. "Modus voor kleine modellen" stuurt een kortere prompt. De standaard Auto schakelt in bij 32k tokens of minder, of wanneer de grootte onbekend is.

Zie ook [[settings]] en [[first-steps]].
