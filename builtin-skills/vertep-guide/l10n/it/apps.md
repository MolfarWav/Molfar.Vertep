<!-- source: 9d4c677df24e -->
# App

Come trovare, aggiungere, aggiornare e rimuovere le app. Le app sono ciò che usi davvero: Roleplay è quella principale.

## La pagina iniziale

Una nuova scheda (+) apre la pagina iniziale, "Dove?". Elenca Molfar e le tue app installate. Su un computer, fai clic su un'app per vedere cosa contiene e premi "Apri"; i dettagli hanno anche "Esporta app" e, per le app che hanno una fonte di aggiornamento, "Controlla aggiornamenti". Su un telefono un tocco la apre subito e il pulsante (i) mostra i dettagli. L'icona del cestino elimina un'app dopo aver chiesto conferma, e questo rimuove i suoi dati in modo permanente.

Ogni app aperta ha la propria scheda. Le schede possono essere trascinate in qualsiasi ordine e ricompaiono dopo un aggiornamento.

## Mentre un'app è aperta

La barra degli strumenti offre:

- "Dividi": Molfar a sinistra, l'app dal vivo a destra.
- "Schermo intero": l'app nella propria scheda del browser, che puoi installare come un'app.
- "Plugin": i plugin dell'app e i loro permessi; importane altri da git.
- "Ricompila": ricompila l'app adesso. Mentre una compilazione è in corso, il pulsante diventa "Compilazione…" con un orologio (per esempio 1:23) e non si può premere di nuovo; sopra l'app compare una riga sottile che dice cosa si sta compilando ("Raggruppamento dei pacchetti…" o "Compilazione del codice dell'app…"), con lo stesso orologio. La prima compilazione può richiedere alcuni minuti, di più su un telefono: tieni aperta la pagina.

Su un telefono questi tre si trovano nel menu account, e la voce "Ricompila" mostra lo stesso orologio "Compilazione…".

Dopo l'aggiornamento di un'app, questa viene compilata di nuovo alla prossima apertura, ma solo i file cambiati (e i pacchetti solo se sono cambiati), quindi di solito è rapido. Impostazioni > Sviluppatore elenca ogni app con la sua compilazione: "Compilata e aggiornata", "Compilata in precedenza. Si ricompila quando la apri", "Non ancora compilata. Si compila quando la apri", "Compilazione non riuscita" oppure "Compilazione…" con l'orologio mentre una è in corso.

## Quando un'app vuole leggere un'altra app

Un'app può chiedere di leggere i file di un'altra app, per esempio Social che legge i tuoi personaggi di Roleplay. La prima volta che apri una di queste app compare una domanda: "Consentire a <app> di leggere i tuoi dati di <other app>?", con a cosa serve e i file esatti. "Consenti" o "Non consentire" sono risposte; "Decidi più tardi" chiede di nuovo la volta successiva. È sola lettura: l'app non può cambiare né cancellare nulla nell'altra app, e vede solo i file elencati. Puoi cambiare la risposta in qualsiasi momento: nella pagina iniziale apri i dettagli dell'app e guarda sotto "Accesso ad altre app". Se un aggiornamento dell'app chiede più file, ti viene chiesto di nuovo. Rimuovere una delle due app cancella la risposta.

## Messaggi dalle app

Un’app ufficiale, come Social, può dire a Molfar Vertep che qualcosa ti sta aspettando. Sulla scheda dell’app compare un piccolo numero e, quando arriva qualcosa di nuovo, vedi un breve messaggio: un popup in basso a destra mentre sei in Molfar Vertep e guardi altro, oppure una notifica di sistema quando la finestra non è in primo piano (il browser chiede il permesso una sola volta; l’interruttore delle notifiche di sistema è nelle Impostazioni). Non viene mostrato nulla mentre guardi l’app stessa. Per disattivarle per una singola app, apri i suoi dettagli nella pagina iniziale e deseleziona "Notifiche da questa app"; anche il numero scompare. Un clic sul popup apre l’app.

## Lo Store

"Store" nella pagina iniziale elenca le app di Molfar Vertep (contrassegnate "App ufficiale") e della community. Premi "Installa": prima vedi cosa contiene l'app e cosa può raggiungere, e nulla viene eseguito finché non confermi. Installa solo ciò di cui ti fidi, perché le app eseguono codice reale sul tuo computer. "Aggiorna" richiede nuove app, e un badge conta quelle aggiunte dall'ultima volta che hai guardato.

## App nuove e importate

- "Nuova app": dalle un nome (l'autore è facoltativo) e ottieni una base che Molfar sviluppa con te.
- "Importa app": da un repository git o da un file di backup creato con "Esporta app". Viene prima ispezionato, e nulla viene eseguito finché non hai letto cosa contiene e confermato.

## Aggiornamenti

L'icona di download nella barra superiore riceve un puntino quando c'è qualcosa in attesa. Elenca ogni app e ha "Controlla ora". Un'app senza fonte di aggiornamento mostra "Nessuna fonte di aggiornamento" e un breve motivo. Un'app installata da un file (uno zip) qui non può essere aggiornata: per ricevere aggiornamenti, installala dallo Store; quella copia è un'app separata, quindi esporta prima il file se contiene dati che vuoi conservare (l'icona del cestino elimina un'app e i suoi dati). Un'app creata su questo dispositivo (da Molfar, per esempio) o copiata a mano non ha alcuna fonte da cui aggiornarsi. L'installazione di un'app il cui intervallo `engine` indica un contratto app che questo motore non ha (un numero di versione di Molfar Vertep scritto lì per errore conta) viene rifiutata con un messaggio che lo dice; la riga del motore nella finestra degli aggiornamenti nomina le app installate che già non vanno bene. "Aggiorna tutto" appare quando due o più app sono in attesa, e non include mai Molfar Vertep stesso.

Le tue modifiche vengono unite in un aggiornamento, e i tuoi dati vengono conservati. Dove le tue modifiche si sovrappongono alla nuova versione, non cambia ancora nulla: scegli "Tieni la mia", "Accetta aggiornamento" o "Chiedi a Molfar di unire". Un aggiornamento che installa nuovi pacchetti o chiede nuovi permessi attende il tuo OK.

## Dove sono le impostazioni delle app

Le impostazioni di un'app si trovano dentro l'app. Le Impostazioni della shell contengono ciò che condividono tutte le app: modelli, voce, immagini, memoria, server MCP. Vedi [[settings]].

## Se un'app fallisce

Quando la compilazione di un'app fallisce, mantiene la sua ultima versione valida, e la sua barra degli errori offre "Chiedi a Molfar", che gli invia il problema in una nuova chat. Vedi [[help-and-bugs]].
