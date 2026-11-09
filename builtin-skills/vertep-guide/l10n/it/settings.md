<!-- source: 3e8eaf6fcf3f -->
# Mappa delle Impostazioni

Impostazioni è la finestra della shell stessa, condivisa da tutte le app. Aprila con l'ingranaggio nella barra superiore, o su un telefono dal menu account in alto a destra. Questa pagina elenca ogni sezione così sai dove guardare.

## Sezioni

- **Generale.** La lingua dell'interfaccia, il blocco "Guida" (spegni i tour, riproducili di nuovo, mostra di nuovo le Novità) e il tuo account: immagine, nome, password, "Esci".
- **Backup.** Esporta l'intero profilo per spostarti su un altro computer, e importane uno. Vedi [[devices]].
- **Archiviazione.** Le immagini usate da schede, chat e sprite. "Trova immagini inutilizzate" individua quelle che nessuno usa e le sposta nel cestino; "Svuota il cestino" le elimina per sempre, dopo aver chiesto.
- **Sincronizzazione.** Porta i tuoi giochi tra i dispositivi con Google Drive o una cartella. Vedi [[devices]].
- **Connessioni e modelli.** Provider, elenco modelli, preferiti, impostazioni per modello, modello di visione. Vedi [[models]].
- **Voce.** Sintesi vocale: voci Edge e i tuoi endpoint vocali.
- **Immagini.** Generazione di immagini: modelli di immagini e server di immagini.
- **Molfar.** Come si comporta Molfar, in ogni app:
  - il suo accesso a internet nella sandbox;
  - "Compatta automaticamente le sessioni lunghe";
  - "Modalità modello piccolo";
  - "Controlli dei costi": Auto, Chiedi sempre o Non chiedere mai;
  - "Notifiche" quando chiede qualcosa, finisce o fallisce;
  - "Istruzioni di Molfar", le tue preferenze permanenti per lui;
  - l'elenco dei file protetti.
  Vedi [[molfar]].
- **Memoria.** Come le app ricordano e ritrovano le cose tra le chat. Può trovare per significato, non solo per parole esatte, con un unico modello di embedding economico. È opzionale. Per impostazione predefinita Molfar Vertep sceglie lui il modello: prima uno sul tuo computer (LM Studio, Ollama, senza bisogno di chiave), poi una connessione API con una chiave, poi OpenRouter. Se non ne è configurato nessuno, la memoria lo dice e trova solo per parole. Puoi anche scaricare un modello sul tuo computer con un clic: in **Su questo computer (facoltativo)** scegli **bge-m3** (consigliato, il migliore per ucraino, russo e inglese) oppure **EmbeddingGemma 2** (più piccolo) e premi **Scarica e connetti**. Il motore installa prima il programma che fa girare il modello (circa 85 MB, una sola volta), poi scarica il modello (587 MB o 346 MB) e lo collega. Il download prosegue se chiudi la finestra, e uno interrotto riprende da dove si era fermato. Dopo, è gratuito, nulla va su internet, e il modello occupa memoria (circa 1,1 GB o 0,6 GB) solo mentre lavora. **Elimina** restituisce lo spazio su disco. Serve un computer che fa girare il motore con Bun, non un launcher da telefono; la connessione online resta come riserva, e se cambi modello la memoria ricrea da sola i suoi vettori.
- **Server MCP.** Server di strumenti che Molfar e le tue app possono chiamare. Le app partono con ognuno spento e attivano ciò che serve.
- **Sviluppatore.** Mostra lo stato di compilazione di ogni app e il ricaricamento a caldo, sempre attivo.

## Solo per l'amministratore

- **Server.** Come gira Molfar Vertep su questo computer: porta, aprire il browser all'avvio, consentire altri dispositivi sulla tua rete (con un codice QR per il tuo telefono), HTTPS, se le app possono scaricare pacchetti, la versione e come aggiornare.
- **Utenti.** Le persone che possono accedere. Ognuna riceve il proprio spazio di lavoro, agente e app.

## Impostazioni delle app

In cima all’elenco, un gruppo **Impostazioni delle app** indica ogni app installata che ha una propria pagina di impostazioni (Roleplay, mostrata lì come «Vertep», e Social). Tocca una voce: Impostazioni si chiude e l’app si apre sulla sua pagina di impostazioni. Per Roleplay sono l’aspetto della chat, «Chat Behavior» (controllo ortografico, correzione automatica), lo streaming, i temi e il resto delle impostazioni della chat. Un’app senza pagina di impostazioni non compare nell’elenco. La stessa pagina si trova anche dentro l’app: vedi [[apps]].

> Su un telefono, Impostazioni mostra prima un elenco di sezioni; toccane una per entrare e usa Indietro per tornare.
