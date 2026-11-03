<!-- source: abe560e8cdbc -->
# Appareils, synchronisation et sauvegardes

Comment utiliser Molfar Vertep sur un téléphone, transporter vos histoires entre appareils, l’installer comme une app et déménager vers un nouvel ordinateur.

## L’ouvrir depuis un téléphone

Dans Paramètres, Serveur, « Autoriser les autres appareils de mon réseau » permet à un téléphone ou un autre ordinateur du même réseau d’ouvrir Molfar Vertep. Un code QR affiche l’adresse ; scannez-le avec l’appareil photo du téléphone. Chaque compte garde son mot de passe. Les téléphones n’autorisent le micro et l’installation en app qu’en HTTPS, donc pour cela activez « Utiliser HTTPS » dans la même section. Ces sections sont visibles par l’administrateur.

## L’installer comme une app

« Installer l’app » dans le menu du compte place Molfar Vertep sur votre écran d’accueil ou dans la liste d’apps de votre ordinateur. Il s’ouvre alors dans sa propre fenêtre, sans la barre du navigateur. Sur un iPhone, il indique où Safari le garde : Partager, puis Sur l’écran d’accueil. Un téléphone qui ouvre votre ordinateur à une adresse http a d’abord besoin de https, et la boîte de dialogue explique comment. Une app ouverte propose aussi « Plein écran », qui l’ouvre dans son propre onglet de navigateur que vous pouvez installer.

## Synchro

« Synchroniser les appareils » dans le menu du compte, ou Paramètres, Synchro. Connectez-vous avec Google une fois sur chaque appareil. Quand vous arrêtez de jouer, appuyez sur « Envoyer » ; sur l’autre appareil appuyez sur « Récupérer » et continuez. Après la première fois, seuls les changements circulent.

- Vous choisissez ce qui circule : les apps et leurs données, les chats et projets de Molfar, les images, le son et la vidéo, ainsi que les clés API et les paramètres MCP. Les clés ne circulent que si vous les activez, verrouillées par une phrase secrète que vous saisissez sur chaque appareil.
- Si le même chat a changé sur les deux appareils, vous choisissez la version à garder. L’autre est conservée pendant 30 jours.
- Il existe aussi une option « Dossier » pour un dossier synchronisé (Syncthing, Google Drive pour ordinateur) ou une clé USB.

## Sauvegarde

Paramètres, Sauvegarde exporte tout votre profil : les apps avec leurs données, la mémoire et les chats de Molfar. Appuyez sur « Exporter le profil ». Ajoutez un mot de passe pour inclure vos clés API, chiffrées ; sans mot de passe, la sauvegarde ne contient aucune clé et vous les saisissez de nouveau. L’import affiche d’abord son contenu. Quand vous appuyez sur « Remplacer mon profil », votre profil actuel est enregistré avant d’être remplacé.

Utilisez la Sauvegarde pour déménager une fois vers un nouvel ordinateur. Utilisez la Synchro pour faire des allers-retours souvent.

## Une seule app

Les détails d’une app sur la page d’accueil proposent « Exporter l’app », qui crée un fichier de sauvegarde de cette seule app. « Importer l’app » importe un tel fichier. Voir [[apps]].

Voir aussi [[settings]].
