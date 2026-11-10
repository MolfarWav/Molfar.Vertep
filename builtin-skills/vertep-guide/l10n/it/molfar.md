<!-- source: 6b5436de93e1 -->
# Molfar, il tuo agente

Molfar è l'agente AI integrato in Molfar Vertep. Qui tutto è file semplici, e lui modifica quei file per te. Leggi questa pagina se vuoi cambiare qualcosa delle tue app e non vuoi farlo a mano.

## Dove vive

Apri la riga "Molfar" nella pagina iniziale. Ha la propria scheda, la pagina dell'agente. Scrivi nella casella e premi Invio per inviare (su un telefono, Invio va a capo e il pulsante freccia invia). Digita `/` per comandi e modelli, o `@` per nominare un file, personaggio, lorebook o preset così lui guarda esattamente quello.

Con un'app aperta, "Dividi" mette Molfar a sinistra e l'app dal vivo a destra, così la guardi cambiare mentre chiedi. Su un telefono è solo un'altra scheda.

## Cosa può fare

- Modificare un'app: le sue schermate, il comportamento, i colori, il layout.
- Creare una nuova app da una base, poi svilupparla con te.
- Modificare dati dentro le app, ad esempio schede di personaggi e lorebook, anche molto grandi.
- Aggiungere plugin e cambiare temi.
- Generare immagini con i modelli di immagini che hai impostato.
- Tenere note, e proporre voci di memoria e competenze.
- Se sei l'amministratore, aiutare con account e impostazioni del server. Ogni modifica di questo tipo attende la tua approvazione.

Guarda prima di cambiare, lavora a piccoli passi, controlla il suo lavoro, e finisce con un breve rapporto di cosa è cambiato e come annullarlo.

## Cosa chiede prima

- **Richieste grandi o poco chiare.** Per una nuova app o una grande funzionalità fa prima alcune domande con opzioni.
- **File protetti.** Per impostazione predefinita i file sorgente di un'app e la sua pagina principale sono protetti, e lo sono anche le sue istruzioni permanenti e il file dei parametri del modello. Una scheda chiede "Consenti" o "Non consentire", e la risposta copre solo quella richiesta. Modifichi l'elenco in Impostazioni, Molfar.
- **Costi.** Prima di un compito grande, di una generazione di prova a pagamento o di un'immagine a pagamento, mostra una stima e attende il tuo sì. Cambia questo in Impostazioni, Molfar, Controlli dei costi.
- **Comandi della shell.** A seconda della modalità, sotto.

## Modalità

Il selettore di modalità nell'intestazione decide cosa può fare senza chiedere:

- **Completa** prima pianifica i grandi cambiamenti, poi modifica ed esegue i comandi.
- **Accetta** salta il passaggio di pianificazione e chiede prima di ogni comando della shell.
- **Pianifica** solo legge e pianifica, e non cambia nulla. Dopo un piano, "Applica proposta" esce dalla modalità e lo realizza.

## Come annullare

Sotto una risposta che ha modificato un'app vedi "Modificata <app> · N file · Annulla". Annulla chiede prima, poi rimette il codice dell'app com'era prima di quella esecuzione. Le tue chat e i caricamenti restano. La pagina del progetto di un'app ha anche i Checkpoint: punti salvati del codice dell'app, che Molfar prende prima di modificare l'app. Puoi aggiungerne di tuoi con "Salva checkpoint", e Ripristina chiede prima. Ogni ripristino è a sua volta salvato, quindi può essere annullato.

## Memoria e competenze

Il pulsante del cervello apre "Memoria e competenze". La memoria contiene ciò che conserva tra le chat; propone le voci e ne salva una solo quando sei d'accordo. Le competenze sono brevi istruzioni per un tipo di lavoro; "Nuova competenza" ne scrive una e "Migliora con Molfar" la rifinisce. Vedi [[projects-and-chats]] per quelle specifiche del progetto.

### La casella

Una scheda che propone una voce di memoria o una competenza ha tre risposte: "Save", "Later" e "Skip". "Later" lascia la proposta nella scheda "Mailbox" di "Memoria e competenze", e lo stesso vale per una scheda a cui nessuno ha risposto e per un suggerimento che Molfar fa dopo un compito lungo. Un numero sul pulsante del cervello indica quante ne aspettano; quando qualcosa aspetta, il pulsante si apre sulla scheda "Mailbox".

- Una voce di memoria si può modificare prima di salvarla. Una competenza viene mostrata per intero, o come diff quando modifica una competenza che hai già, e viene salvata così come è mostrata. Per cambiarla, saltala e di' a Molfar cosa correggere.
- "Skip" viene ricordato, così Molfar non riporta la stessa proposta. "Skip all" svuota l'elenco.
- Una chat terminata mentre eri in un'altra chat aspetta anche nella scheda "Mailbox", con "Open" e "Dismiss". L'elenco delle chat la segna allo stesso modo.

## Buono a sapersi

- Modelli piccoli o gratuiti: la "Modalità modello piccolo" in Impostazioni, Molfar invia un prompt più corto.
- Il pulsante dell'occhio, l'ispettore del prompt, mostra cosa è stato davvero inviato al modello.
- Le chat lunghe possono essere ripiegate in un riassunto con "Compatta conversazione" o `/compact`.
- Le parole usate qui sono spiegate nel [[glossary]].
