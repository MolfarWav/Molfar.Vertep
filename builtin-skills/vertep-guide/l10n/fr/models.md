<!-- source: 41cddad16b7f -->
# Modèles et connexions

Molfar et vos apps ont besoin d’un modèle IA pour répondre. Cette page explique comment connecter un modèle, choisir quels modèles s’affichent et configurer les images et la voix. Tout se trouve dans Paramètres.

## Connexions

Une connexion est un lien enregistré vers un fournisseur ou un serveur. Ouvrez Paramètres, puis « Connexions et modèles », puis « Ajouter une connexion ». La liste des fournisseurs propose :

- Des fournisseurs connus : choisissez-en un et collez sa clé API.
- « Abonnements (OAuth) » : vous vous connectez au lieu de coller une clé.
- « Modèle local » : Ollama, LM Studio, llama.cpp et d’autres qui tournent sur votre propre ordinateur.
- « Point de terminaison personnalisé » : n’importe quel serveur qui parle l’un des formats pris en charge, par exemple compatible OpenAI.

Une connexion affiche « Connecté » dès qu’elle a une clé (ou n’en a pas besoin) et « Clé requise » sinon. Ce n’est pas un test que le modèle fonctionne. Les clés sont stockées uniquement sur cet ordinateur.

## Choisir quels modèles s’affichent

Une connexion peut apporter des centaines de modèles. Dans la liste sous les connexions :

- Cochez les modèles que les sélecteurs doivent afficher. Si rien n’est coché, tous s’affichent.
- Étoilez ceux entre lesquels vous basculez. Ils forment le « Changement rapide » et arrivent en premier dans les sélecteurs de modèles, dans les chats de Molfar et dans les apps.
- Utilisez l’icône curseurs pour ouvrir les réglages propres d’un modèle.

## Réglages par modèle

Les réglages d’un modèle incluent sa fenêtre de contexte, les tokens de sortie max, le raisonnement, les prix (en dollars par million de tokens), une vérification du cache de prompt et les paramètres d’échantillonnage comme les pénalités et Min P. « Réglages recommandés » peut remplir des valeurs raisonnables, et Rétablir revient en arrière. Des blocs séparés peuvent s’appliquer à Molfar, aux réponses de chat dans les apps, ou à un plugin individuel. Les champs que vous laissez désactivés ne sont pas envoyés.

## Modèle de vision

Les apps envoient des images à ce modèle, par exemple pour décrire un personnage d’après son portrait. « Auto » prend le modèle le moins cher qui lit les images. Si aucun des vôtres ne le peut, ajoutez une connexion qui en propose un.

## Images

« Images » dans Paramètres configure la génération d’images pour toutes les apps. Vous pouvez ajouter des modèles d’image depuis vos connexions, ou des serveurs d’images : un ComfyUI, un serveur AUTOMATIC1111 ou Forge démarré avec son API activée, ou n’importe quel service avec un point de terminaison d’images. Les modèles d’image étoilés deviennent des favoris. Molfar choisit parmi eux selon l’usage de chacun, et Roleplay les place en premier dans son sélecteur.

## Voix

« Voix » fournit la synthèse vocale à toutes les apps. Les voix Edge gratuites fonctionnent immédiatement ; chacune a un bouton « Tester ». Vous pouvez aussi « Ajouter un point de terminaison » pour un service vocal (OpenAI, Groq ou un serveur local) avec un nom de modèle, une voix par défaut et une clé.

## Coût et petits modèles

- Molfar affiche une estimation de coût avant les grosses tâches et les images payantes. Voir « Contrôles de coût » dans Paramètres, Molfar.
- Un modèle avec une petite fenêtre de contexte peut se noyer dans les instructions complètes de Molfar. Le « Mode petit modèle » envoie un prompt plus court. Sa valeur par défaut, Auto, s’active à 32k tokens ou moins, ou quand la taille est inconnue.

Voir aussi [[settings]] et [[first-steps]].
