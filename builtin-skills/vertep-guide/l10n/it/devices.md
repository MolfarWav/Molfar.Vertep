<!-- source: abe560e8cdbc -->
# Dispositivi, sincronizzazione e backup

Come usare Molfar Vertep su un telefono, portare le tue storie tra i dispositivi, installarlo come un'app e passare a un nuovo computer.

## Aprirlo da un telefono

In Impostazioni, Server, "Consenti altri dispositivi della mia rete" permette a un telefono o a un altro computer sulla stessa rete di aprire Molfar Vertep. Un codice QR mostra l'indirizzo; scansionalo con la fotocamera del telefono. Ogni account richiede comunque la sua password. I telefoni consentono il microfono e l'installazione come app solo tramite HTTPS, quindi per questi attivi "Usa HTTPS" nella stessa sezione. Queste sezioni sono visibili all'amministratore.

## Installalo come un'app

"Installa app" nel menu account mette Molfar Vertep nella schermata Home o nell'elenco delle app del computer. Si apre quindi in una finestra propria, senza la barra del browser. Su un iPhone mostra dove Safari lo conserva: Condividi, poi Aggiungi alla schermata Home. Un telefono che apre il tuo computer da un indirizzo http ha prima bisogno di https, e la finestra spiega come fare. Un'app aperta ha anche "Schermo intero", che la apre nella propria scheda del browser che puoi installare.

## Sincronizzazione

"Sincronizza dispositivi" nel menu account, o Impostazioni, Sincronizzazione. Accedi con Google una volta su ogni dispositivo. Quando smetti di giocare, premi "Invia"; sull'altro dispositivo premi "Ricevi" e continua. Dopo la prima volta viaggia solo ciò che è cambiato.

- Scegli tu cosa viaggia: app e i loro dati, chat e progetti di Molfar, immagini, audio e video, e chiavi API con impostazioni MCP. Le chiavi viaggiano solo se le attivi, protette da una passphrase che digiti su ogni dispositivo.
- Se la stessa chat è cambiata su entrambi i dispositivi, scegli quale versione tenere. L'altra viene salvata per 30 giorni.
- C'è anche un'opzione "Cartella" per una cartella sincronizzata (Syncthing, Google Drive per desktop) o una chiavetta USB.

## Backup

Impostazioni, Backup esporta il tuo intero profilo: app con i loro dati, memoria e chat di Molfar. Premi "Esporta profilo". Aggiungi una password per includere le tue chiavi API, cifrate; senza una, il backup non contiene chiavi e le inserisci di nuovo. L'importazione prima mostra cosa c'è dentro. Quando premi "Sostituisci il mio profilo", il tuo profilo attuale viene salvato prima di essere sostituito.

Usa Backup per passare a un nuovo computer una volta sola. Usa Sincronizzazione per spostarti avanti e indietro spesso.

## Una sola app

I dettagli di un'app nella pagina iniziale hanno "Esporta app", che crea un file di backup di solo quell'app. "Importa app" importa tale file. Vedi [[apps]].

Vedi anche [[settings]].
