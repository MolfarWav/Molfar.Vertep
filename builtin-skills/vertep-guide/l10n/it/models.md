<!-- source: cb493ace9db7 -->
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

Le impostazioni di un modello includono la sua finestra di contesto, i token di output massimi, il ragionamento, i prezzi (in dollari per milione di token), un controllo della cache dei prompt, una durata della cache e i parametri di campionamento come penalità e Min P. "Controlla la cache" ti dice se il provider legge un prompt ripetuto dalla sua cache, il che è più economico e più veloce. La durata della cache ha tre scelte: "Del provider" (di solito circa 5 minuti, non viene inviato nulla in più), "Lunga" (chiede un'ora con Claude e fino a un giorno con GPT; nessuna richiesta extra, scrivere la cache costa di più; offerta solo sulle connessioni che la rispettano: Anthropic stessa, Claude tramite OpenRouter e OpenAI, e disattivata altrove, perché un gateway può ignorarla o rifiutare la richiesta) e "Mantieni attiva" (dopo una risposta in chat il motore invia una piccola richiesta circa ogni 5 minuti per un massimo di 40 minuti, così la cache non scade; costa circa un decimo del prezzo di input del prompt ogni volta, conta contro i limiti di richieste e gli abbonamenti, richiede che i prezzi del modello siano impostati, e non viene usata con gli strumenti, né con il thinking su Claude (una richiesta con il thinking di Claude ha bisogno di una risposta più grande dei 16 token di una richiesta di keep-alive); non scrive nulla nella chat, il pannello conta le richieste, e quando non è in esecuzione il pannello dice perché). Inizia con "Lunga" per Claude su Anthropic o OpenRouter: non richiede richieste extra. Claude tramite un gateway come NanoGPT ignora la durata lunga, e i modelli Gemini lì fanno cache da soli per qualche minuto: usa Mantieni attiva per quelli. In Roleplay, il pulsante Request size nell'intestazione della chat mostra quanto dell'ultima richiesta è venuto dalla cache e dove nel prompt finisce la cache. Mantieni attiva è per i provider senza opzione lunga, e non per i modelli gratuiti con un limite giornaliero di richieste. "Impostazioni consigliate" può riempire valori sensati, e Ripristina torna indietro. Blocchi separati possono applicarsi a Molfar, alle risposte di chat nelle app o a un singolo plugin. I campi che lasci vuoti non vengono inviati.

## Modello di visione

Le app inviano immagini a questo modello, ad esempio per descrivere un personaggio da un ritratto. "Auto" prende il modello più economico che sa leggere le immagini. Se nessuno dei tuoi può farlo, aggiungi una connessione che ne abbia uno.

## Immagini

"Immagini" in Impostazioni imposta la generazione di immagini per ogni app. Puoi aggiungere modelli di immagini dalle tue connessioni, o server di immagini: un ComfyUI, un server AUTOMATIC1111 o Forge avviato con la sua API attiva, o qualsiasi servizio con un endpoint per le immagini. Un ComfyUI può essere anche uno su RunPod Serverless: scegli ComfyUI, inserisci come indirizzo `https://api.runpod.ai/v2/` seguito dal tuo id endpoint, come chiave la tua chiave API RunPod, e in "Modelli" i nomi dei file checkpoint sul tuo worker (RunPod non può elencarli); "Controlla" ti dice se id endpoint e chiave sono corretti. La prima immagine può richiedere fino a mezzo minuto mentre il worker si avvia. I modelli di immagini con la stella diventano preferiti. Molfar sceglie tra loro in base all'uso di ciascuno, e Roleplay li elenca per primi nel suo selettore.

## Voce

"Voce" dà la sintesi vocale a ogni app. Le voci Edge gratuite funzionano subito; ognuna ha un pulsante "Prova". Puoi anche "Aggiungi endpoint" per un servizio vocale (OpenAI, Groq o un server locale) con un nome del modello, una voce predefinita e una chiave.

## Costi e modelli piccoli

- Molfar mostra una stima dei costi prima di compiti grandi e immagini a pagamento. Vedi "Controlli dei costi" in Impostazioni, Molfar.
- Un modello con una finestra di contesto piccola può annegare nelle istruzioni complete di Molfar. La "Modalità modello piccolo" invia un prompt più corto. Il suo valore predefinito, Auto, si attiva a 32k token o meno, o quando la dimensione è sconosciuta.

Vedi anche [[settings]] e [[first-steps]].
