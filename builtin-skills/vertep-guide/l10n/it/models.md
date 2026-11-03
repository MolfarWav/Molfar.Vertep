<!-- source: 41cddad16b7f -->
# Modelli e connessioni

Molfar e le tue app hanno bisogno di un modello AI per rispondere. Questa pagina spiega come collegarne uno, scegliere quali modelli mostrare e impostare immagini e voce. Tutto vive in Impostazioni.

## Connessioni

Una connessione è un collegamento salvato a un provider o server. Apri Impostazioni, poi "Connessioni e modelli", quindi "Aggiungi connessione". L'elenco dei provider offre:

- Provider noti: scegline uno e incolla la sua chiave API.
- "Abbonamenti (OAuth)": accedi invece di incollare una chiave.
- "Modello locale": Ollama, LM Studio, llama.cpp e altri in esecuzione sul tuo computer.
- "Endpoint personalizzato": qualsiasi server che parli uno dei formati supportati, ad esempio compatibile OpenAI.

Una connessione legge "Connesso" una volta che ha una chiave (o non ne richiede nessuna) e "Serve la chiave" altrimenti. Non è un test che il modello funzioni. Le chiavi sono salvate solo su questo computer.

## Scegliere quali modelli mostrare

Una connessione può portare centinaia di modelli. Nell'elenco sotto le connessioni:

- Spunta i modelli che i selettori devono mostrare. Se nulla è spuntato, appaiono tutti.
- Metti la stella a quelli tra cui passi. Questi formano il "Cambio rapido" e vengono primi nei selettori di modello, nelle chat di Molfar e nelle app.
- Usa l'icona dei cursori per aprire le impostazioni di un modello.

## Impostazioni per modello

Le impostazioni di un modello includono la sua finestra di contesto, i token di output massimi, il ragionamento, i prezzi (in dollari per milione di token), un controllo della cache dei prompt e i parametri di campionamento come penalità e Min P. "Impostazioni consigliate" può riempire valori sensati, e Ripristina torna indietro. Blocchi separati possono applicarsi a Molfar, alle risposte di chat nelle app o a un singolo plugin. I campi che lasci vuoti non vengono inviati.

## Modello di visione

Le app inviano immagini a questo modello, ad esempio per descrivere un personaggio da un ritratto. "Auto" prende il modello più economico che sa leggere le immagini. Se nessuno dei tuoi può farlo, aggiungi una connessione che ne abbia uno.

## Immagini

"Immagini" in Impostazioni imposta la generazione di immagini per ogni app. Puoi aggiungere modelli di immagini dalle tue connessioni, o server di immagini: un ComfyUI, un server AUTOMATIC1111 o Forge avviato con la sua API attiva, o qualsiasi servizio con un endpoint per le immagini. I modelli di immagini con la stella diventano preferiti. Molfar sceglie tra loro in base all'uso di ciascuno, e Roleplay li elenca per primi nel suo selettore.

## Voce

"Voce" dà la sintesi vocale a ogni app. Le voci Edge gratuite funzionano subito; ognuna ha un pulsante "Prova". Puoi anche "Aggiungi endpoint" per un servizio vocale (OpenAI, Groq o un server locale) con un nome del modello, una voce predefinita e una chiave.

## Costi e modelli piccoli

- Molfar mostra una stima dei costi prima di compiti grandi e immagini a pagamento. Vedi "Controlli dei costi" in Impostazioni, Molfar.
- Un modello con una finestra di contesto piccola può annegare nelle istruzioni complete di Molfar. La "Modalità modello piccolo" invia un prompt più corto. Il suo valore predefinito, Auto, si attiva a 32k token o meno, o quando la dimensione è sconosciuta.

Vedi anche [[settings]] e [[first-steps]].
