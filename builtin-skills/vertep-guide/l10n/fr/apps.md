<!-- source: 9d4c677df24e -->
# Apps

Comment trouver, ajouter, mettre à jour et supprimer des apps. Les apps sont ce que vous utilisez réellement : Roleplay est la principale.

## La page d’accueil

Un nouvel onglet (+) ouvre la page d’accueil, « Où aller ? ». Elle liste Molfar et vos apps installées. Sur un ordinateur, cliquez sur une app pour voir son contenu et appuyez sur « Ouvrir » ; les détails proposent aussi « Exporter l’app » et, pour les apps qui ont une source de mise à jour, « Rechercher des mises à jour ». Sur un téléphone, un appui l’ouvre immédiatement et le bouton (i) affiche les détails. L’icône corbeille supprime une app après confirmation, et cela efface ses données définitivement.

Chaque app ouverte a son propre onglet. Les onglets peuvent être glissés dans n’importe quel ordre et reviennent après un rafraîchissement.

## Quand une app est ouverte

La barre d’outils propose :

- « Scinder » : Molfar à gauche, l’app en direct à droite.
- « Plein écran » : l’app dans son propre onglet de navigateur, que vous pouvez installer comme une app.
- « Plugins » : les plugins de l’app et leurs permissions ; importez-en d’autres depuis git.
- « Recompiler » : recompile l’app immédiatement. Pendant une compilation, le bouton devient «Compilation… » avec une horloge (par exemple 1:23) et ne peut pas être pressé de nouveau ; une fine ligne au-dessus de l’app indique ce qui est en cours de compilation («Regroupement des paquets… » ou «Compilation du code de l'app… »), avec la même horloge. Une première compilation peut prendre quelques minutes, plus sur un téléphone : gardez la page ouverte.

Sur un téléphone, ces trois boutons se trouvent dans le menu du compte, et l’entrée «Recompiler » affiche la même horloge «Compilation… ».

Après la mise à jour d’une app, elle est recompilée à sa prochaine ouverture, mais seulement les fichiers modifiés (et les paquets seulement s’ils ont changé), donc c’est en général rapide. Paramètres > Développeur liste chaque app avec sa compilation : «Compilée et à jour », «Compilée auparavant. Elle se recompile à l'ouverture », «Pas encore compilée. Elle se compile à l'ouverture », «Échec de la compilation » ou «Compilation… » avec l’horloge pendant qu’une compilation tourne.

## Quand une app veut lire une autre app

Une app peut demander à lire les fichiers d’une autre app, par exemple Social lisant vos personnages Roleplay. La première fois que vous ouvrez une telle app, une question apparaît : « Autoriser <app> à lire vos données <other app> ? », avec son usage et les fichiers exacts. « Autoriser » ou « Ne pas autoriser » sont des réponses ; « Décider plus tard » redemande la prochaine fois. L’accès est en lecture seule : l’app ne peut rien modifier ni supprimer dans l’autre app, et elle ne voit que les fichiers listés. Vous pouvez changer votre réponse à tout moment : sur la page d’accueil, ouvrez les détails de l’app et regardez sous « Accès aux autres apps ». Si une mise à jour de l’app demande plus de fichiers, on vous redemande. Supprimer l’une ou l’autre app efface la réponse.

## Messages des apps

Une app officielle, comme Social, peut signaler à Molfar Vertep qu’il y a quelque chose qui vous attend. Un petit chiffre apparaît sur l’onglet de l’app et, quand quelque chose de nouveau arrive, vous voyez un bref message : une fenêtre contextuelle en bas à droite pendant que vous êtes dans Molfar Vertep et regardez autre chose, ou une notification système lorsque la fenêtre n’est pas au premier plan (le navigateur demande l’autorisation une seule fois ; l’interrupteur des notifications système se trouve dans les Paramètres). Rien ne s’affiche pendant que vous regardez l’app elle-même. Pour désactiver cela pour une app, ouvrez ses détails sur la page d’accueil et décochez « Notifications de cette application » ; le chiffre disparaît aussi. Un clic sur la fenêtre contextuelle ouvre l’app.

## Le Store

« Store » sur la page d’accueil liste les apps de Molfar Vertep (marquées « App officielle ») et de la communauté. Appuyez sur « Installer » : vous voyez d’abord ce que l’app contient et ce à quoi elle peut accéder, et rien ne s’exécute avant votre confirmation. N’installez que ce qui vous inspire confiance, car les apps exécutent du vrai code sur votre ordinateur. « Actualiser » demande les nouvelles apps, et un badge compte celles ajoutées depuis votre dernière visite.

## Apps nouvelles et importées

- « Nouvelle app » : donnez-lui un nom (un auteur est facultatif) et vous obtenez une base que Molfar développe avec vous.
- « Importer l’app » : depuis un dépôt git ou un fichier de sauvegarde créé par « Exporter l’app ». Il est d’abord inspecté, et rien ne s’exécute tant que vous n’avez pas lu son contenu et confirmé.

## Mises à jour

L’icône de téléchargement dans la barre supérieure reçoit un point quand quelque chose attend. Elle liste chaque app et propose « Vérifier maintenant ». Une app sans source de mise à jour affiche « Pas de source de mise à jour » et une courte raison. Une app installée depuis un fichier (un zip) ne peut pas être mise à jour ici : pour recevoir des mises à jour, installez-la depuis le Store ; cette copie est une app à part, donc exportez d’abord le fichier si elle contient des données à garder (l’icône corbeille supprime une app et ses données). Une app créée sur cet appareil (par Molfar, par exemple) ou copiée à la main n’a aucune source d’où se mettre à jour. Installer une app dont la plage `engine` désigne un contrat d’app que ce moteur n’a pas (un numéro de version de Molfar Vertep écrit là par erreur compte) est refusé avec un message qui le dit ; la ligne du moteur dans la boîte de dialogue des mises à jour nomme les apps installées qui ne conviennent déjà plus. « Tout mettre à jour » apparaît quand deux apps ou plus attendent, et n’inclut jamais Molfar Vertep lui-même.

Vos propres modifications sont fusionnées dans une mise à jour, et vos données sont conservées. Là où vos modifications chevauchent la nouvelle version, rien ne change encore : vous choisissez « Garder la mienne », « Prendre la mise à jour » ou « Demander à Molfar de fusionner ». Une mise à jour qui installe de nouveaux paquets ou demande de nouvelles permissions attend votre accord.

## Où sont les réglages d’une app

Les réglages propres à une app se trouvent dans l’app. Les Paramètres du shell contiennent ce que toutes les apps partagent : modèles, voix, images, mémoire, serveurs MCP. Voir [[settings]].

## Si une app échoue

Quand la compilation d’une app échoue, elle garde sa dernière version fonctionnelle et sa barre d’erreur propose « Demander à Molfar », qui lui envoie le problème dans un nouveau chat. Voir [[help-and-bugs]].
