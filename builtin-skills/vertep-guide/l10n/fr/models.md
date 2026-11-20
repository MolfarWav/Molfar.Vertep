<!-- source: cb493ace9db7 -->
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

Les réglages d’un modèle incluent sa fenêtre de contexte, les tokens de sortie max, le raisonnement, les prix (en dollars par million de tokens), une vérification du cache de prompt, une durée de vie du cache et les paramètres d’échantillonnage comme les pénalités et Min P. « Vérifier le cache » vous indique si le fournisseur lit un prompt répété depuis son cache, ce qui est moins cher et plus rapide. La durée de vie du cache a trois choix : « Propre au fournisseur » (généralement environ 5 minutes, rien de plus n’est envoyé), « Long » (demande une heure avec Claude et jusqu’à un jour avec GPT ; aucune requête supplémentaire, l’écriture du cache coûte plus cher ; proposé uniquement sur les connexions qui l’honorent : Anthropic lui-même, Claude via OpenRouter et OpenAI, et grisé ailleurs, car une passerelle peut l’ignorer ou refuser la requête) et « Maintien en vie » (après une réponse de chat, le moteur envoie une petite requête environ toutes les 5 minutes pendant jusqu’à 40 minutes pour que le cache ne s’interrompe pas ; cela coûte environ un dixième du prix d’entrée du prompt à chaque fois, compte dans les limites de requêtes et les abonnements, nécessite que les prix du modèle soient définis, et n’est pas utilisé avec les outils, ni avec la réflexion sur Claude (une requête avec la réflexion de Claude nécessite une réponse plus grande que les 16 tokens d’une requête de maintien en vie) ; il n’écrit rien dans le chat, le panneau compte les requêtes, et lorsqu’il ne tourne pas, le panneau en explique la raison). Commencez par « Long » pour Claude sur Anthropic ou OpenRouter : il ne nécessite aucune requête supplémentaire. Claude via une passerelle telle que NanoGPT ignore la durée de vie longue, et les modèles Gemini y mettent en cache d’eux-mêmes pendant quelques minutes : utilisez le Maintien en vie pour ceux-là. Dans Roleplay, le bouton Request size dans l’en-tête du chat montre quelle part de la dernière requête provenait du cache et où le cache se termine dans le prompt. Le Maintien en vie est destiné aux fournisseurs sans option longue, et non aux modèles gratuits avec une limite quotidienne de requêtes. « Réglages recommandés » peut remplir des valeurs raisonnables, et Rétablir revient en arrière. Des blocs séparés peuvent s’appliquer à Molfar, aux réponses de chat dans les apps, ou à un plugin individuel. Les champs que vous laissez désactivés ne sont pas envoyés.

## Modèle de vision

Les apps envoient des images à ce modèle, par exemple pour décrire un personnage d’après son portrait. « Auto » prend le modèle le moins cher qui lit les images. Si aucun des vôtres ne le peut, ajoutez une connexion qui en propose un.

## Images

« Images » dans Paramètres configure la génération d’images pour toutes les apps. Vous pouvez ajouter des modèles d’image depuis vos connexions, ou des serveurs d’images : un ComfyUI, un serveur AUTOMATIC1111 ou Forge démarré avec son API activée, ou n’importe quel service avec un point de terminaison d’images. Un ComfyUI peut aussi être un serveur RunPod Serverless : choisissez ComfyUI, saisissez `https://api.runpod.ai/v2/` suivi de votre identifiant d’endpoint comme adresse, votre clé d’API RunPod comme clé, et sous « Modèles » les noms de fichiers des checkpoints sur votre worker (RunPod ne peut pas les lister) ; « Vérifier » indique si l’identifiant d’endpoint et la clé sont bons. La première image peut prendre jusqu’à une demi-minute, le temps que le worker démarre. Les modèles d’image étoilés deviennent des favoris. Molfar choisit parmi eux selon l’usage de chacun, et Roleplay les place en premier dans son sélecteur.

## Voix

« Voix » fournit la synthèse vocale à toutes les apps. Les voix Edge gratuites fonctionnent immédiatement ; chacune a un bouton « Tester ». Vous pouvez aussi « Ajouter un point de terminaison » pour un service vocal (OpenAI, Groq ou un serveur local) avec un nom de modèle, une voix par défaut et une clé.

## Coût et petits modèles

- Molfar affiche une estimation de coût avant les grosses tâches et les images payantes. Voir « Contrôles de coût » dans Paramètres, Molfar.
- Un modèle avec une petite fenêtre de contexte peut se noyer dans les instructions complètes de Molfar. Le « Mode petit modèle » envoie un prompt plus court. Sa valeur par défaut, Auto, s’active à 32k tokens ou moins, ou quand la taille est inconnue.

Voir aussi [[settings]] et [[first-steps]].
