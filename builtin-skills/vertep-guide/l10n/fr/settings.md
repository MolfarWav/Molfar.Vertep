<!-- source: 51d046c99c83 -->
# Plan des Paramètres

Paramètres est la fenêtre propre au shell, partagée par toutes les apps. Ouvrez-la avec l’engrenage dans la barre supérieure, ou sur un téléphone depuis le menu du compte en haut à droite. Cette page liste chaque section pour que vous sachiez où chercher.

## Sections

- **Général.** La langue de l’interface, le bloc « Guide » (désactiver les visites guidées, les rejouer, réafficher les Nouveautés) et votre compte : image, nom, mot de passe, « Se déconnecter ».
- **Sauvegarde.** Exportez tout votre profil pour déménager vers un autre ordinateur, et importez-en un. Voir [[devices]].
- **Stockage.** Les images utilisées par vos cartes, chats et sprites. « Trouver les images inutilisées » localise celles que rien n’utilise et les déplace dans la corbeille ; « Vider la corbeille » les supprime définitivement, après confirmation.
- **Synchro.** Transportez vos jeux entre appareils avec Google Drive ou un dossier. Voir [[devices]].
- **Connexions et modèles.** Les fournisseurs, la liste des modèles, les favoris, les réglages par modèle, le modèle de vision. Voir [[models]].
- **Voix.** Synthèse vocale : voix Edge et vos propres points de terminaison vocaux.
- **Images.** Génération d’images : modèles d’image et serveurs d’images.
- **Molfar.** Comment Molfar se comporte, dans toutes les apps :
  - son accès internet dans le bac à sable ;
  - « Compacter automatiquement les longues sessions » ;
  - « Mode petit modèle » ;
  - « Contrôles de coût » : Auto, Toujours demander ou Ne jamais demander ;
  - « Notifications » quand il pose une question, termine ou échoue ;
  - « Instructions de Molfar », vos préférences permanentes pour lui ;
  - la liste des fichiers protégés.
  Voir [[molfar]].
- **Mémoire.** Comment les apps retiennent et retrouvent les choses d’un chat à l’autre. Elle peut faire correspondre par le sens, pas seulement par mots exacts, avec un modèle d’embeddings économique. C’est facultatif. Par défaut, Molfar Vertep choisit le modèle lui-même : d’abord un modèle sur votre ordinateur (LM Studio, Ollama, sans clé), puis une connexion API avec une clé, puis OpenRouter. Si aucun n’est configuré, la mémoire le signale et ne fait correspondre que par mots. Vous pouvez aussi télécharger un modèle sur votre ordinateur en un clic : dans **Sur cet ordinateur (facultatif)**, choisissez **bge-m3** (recommandé, le meilleur en ukrainien, russe et anglais) ou **EmbeddingGemma 2** (plus petit), puis appuyez sur **Télécharger et connecter**. Le moteur installe d’abord le programme qui fait tourner le modèle (environ 85 Mo, une seule fois), puis télécharge le modèle (587 Mo ou 346 Mo) et le connecte. Le téléchargement continue si vous fermez la fenêtre, et un téléchargement interrompu reprend là où il s’était arrêté. Ensuite il est gratuit, rien ne part sur internet, et le modèle n’occupe de la mémoire (environ 1,1 Go ou 0,6 Go) que pendant qu’il travaille. **Supprimer** rend l’espace disque. Il faut un ordinateur qui fait tourner le moteur avec Bun, pas un lanceur de téléphone ; la connexion en ligne reste en secours, et si vous changez de modèle, la mémoire refait ses vecteurs d’elle-même.
- **Serveurs MCP.** Des serveurs d’outils que Molfar et vos apps peuvent appeler. Les apps démarrent avec chacun éteint et activent ce dont elles ont besoin.
- **Développeur.** Affiche l’état de compilation de chaque app et le rechargement à chaud, qui est toujours actif.

## Uniquement pour l’administrateur

- **Serveur.** Comment Molfar Vertep tourne sur cet ordinateur : le port, l’ouverture du navigateur au démarrage, l’autorisation des autres appareils sur votre réseau (avec un code QR pour votre téléphone), HTTPS, si les apps peuvent télécharger des paquets, la version et comment mettre à jour.
- **Utilisateurs.** Les personnes qui peuvent se connecter. Chacune reçoit son propre espace de travail, agent et apps.

## Pas ici

Il n’y a pas de section pour les apps individuelles. Les réglages propres d’une app sont dans l’app. Voir [[apps]].

> Sur un téléphone, Paramètres affiche d’abord une liste de sections ; touchez-en une pour entrer et utilisez Retour pour revenir.
