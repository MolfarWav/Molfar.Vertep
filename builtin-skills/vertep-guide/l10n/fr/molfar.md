<!-- source: c3880a3f342c -->
# Molfar, votre agent

Molfar est l’agent IA intégré à Molfar Vertep. Tout ici est constitué de simples fichiers, et il modifie ces fichiers pour vous. Lisez cette page si vous voulez changer quelque chose dans vos apps et ne voulez pas le faire à la main.

## Où il vit

Ouvrez la ligne « Molfar » de la page d’accueil. Il a son propre onglet, la page de l’agent. Écrivez dans la zone et appuyez sur Entrée pour envoyer (sur un téléphone, Entrée crée une nouvelle ligne et le bouton fléché envoie). Tapez `/` pour les commandes et modèles, ou `@` pour nommer un fichier, un personnage, un livre de lore ou un préréglage afin qu’il examine exactement celui-là.

Avec une app ouverte, « Scinder » place Molfar à gauche et l’app en direct à droite, pour que vous la regardiez changer pendant que vous demandez. Sur un téléphone, il est simplement un autre onglet.

## Ce qu’il peut faire

- Modifier une app : ses écrans, son comportement, ses couleurs, sa disposition.
- Créer une nouvelle app à partir d’une base, puis la développer avec vous.
- Modifier des données dans les apps, par exemple les cartes de personnage et les livres de lore, même très grands.
- Ajouter des plugins et changer des thèmes.
- Générer des images avec les modèles d’image que vous avez configurés.
- Garder des notes, et proposer des entrées de mémoire et des compétences.
- Si vous êtes administrateur, aider avec les comptes et les réglages du serveur. Chaque changement de ce type attend votre approbation.

Il regarde avant de modifier, travaille par petites étapes, vérifie son travail et termine par un court rapport de ce qui a changé et comment l’annuler.

## Ce qu’il demande d’abord

- **Demandes importantes ou peu claires.** Pour une nouvelle app ou une grosse fonctionnalité, il pose d’abord quelques questions avec des options.
- **Fichiers protégés.** Par défaut, les fichiers source d’une app et sa page principale sont protégés, ainsi que ses propres instructions permanentes et le fichier des paramètres du modèle. Une carte demande « Autoriser » ou « Ne pas autoriser », et la réponse ne vaut que pour cette seule demande. Vous modifiez la liste dans Paramètres, Molfar.
- **Coût.** Avant une grosse tâche, une génération de test payante ou une image payante, il montre une estimation et attend votre accord. Modifiez ceci dans Paramètres, Molfar, Contrôles de coût.
- **Commandes shell.** Selon le mode, ci-dessous.

## Mode

Le sélecteur de mode dans l’en-tête décide ce qu’il peut faire sans demander :

- **Complet** planifie d’abord les gros changements, puis modifie et exécute des commandes.
- **Accepter** saute l’étape de plan et demande avant chaque commande shell.
- **Plan** ne fait que lire et planifier, et ne change rien. Après un plan, « Appliquer la proposition » quitte le mode et l’exécute.

## Comment annuler

Sous une réponse qui a modifié une app, vous voyez « Modifié <app> · N fichiers · Annuler ». Annuler demande d’abord confirmation, puis remet le code de l’app tel qu’il était avant ce passage. Vos chats et téléversements restent. La page de projet d’une app a aussi des Points de contrôle : des points enregistrés du code de l’app, que Molfar prend avant de modifier l’app. Vous pouvez ajouter les vôtres avec « Enregistrer un point de contrôle », et Restaurer demande d’abord confirmation. Chaque restauration est elle-même enregistrée, donc elle peut être annulée.

## Mémoire et compétences

Le bouton cerveau ouvre « Mémoire et compétences ». La mémoire contient ce qu’il garde entre les chats ; il propose des entrées et n’en enregistre une que lorsque vous êtes d’accord. Les compétences sont de courtes instructions pour un type de tâche ; « Nouvelle compétence » en écrit une et « Améliorer avec Molfar » la peaufine. Voir [[projects-and-chats]] pour celles propres à un projet.

## Bon à savoir

- Petits modèles ou modèles gratuits : le « Mode petit modèle » dans Paramètres, Molfar envoie un prompt plus court.
- Le bouton œil, l’inspecteur de prompt, montre ce qui a réellement été envoyé au modèle.
- Les longs chats peuvent être repliés en un résumé avec « Compacter la conversation » ou `/compact`.
- Les mots utilisés ici sont expliqués dans [[glossary]].
