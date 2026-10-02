# Riftline · V1 prototype

Application locale de suivi LoL pour `8YKS#DEPTH`. Elle ne lit pas la mémoire du jeu et n’injecte rien dans le client.

## Démarrer sur Windows

Prérequis : Node.js 24 ou plus récent.

```powershell
cd C:\Users\yanis\lol-coach-v1
$env:RIOT_API_KEY = Read-Host 'Clé API Riot'
npm start
```

Ouvrir ensuite `http://127.0.0.1:4173` et cliquer sur **Synchroniser mes parties**. La clé reste dans l’environnement du terminal ; elle n’est pas écrite dans les fichiers du projet. Pour changer de compte :

```powershell
$env:RIOT_GAME_NAME = '8YKS'
$env:RIOT_TAG_LINE = 'DEPTH'
```

Le cache des matchs est enregistré dans `data/matches.json`, ignoré par Git. L’app récupère au maximum 20 identifiants de solo queue par synchronisation, met en cache les matchs déjà téléchargés et respecte un intervalle entre appels. Les erreurs HTTP 429 utilisent l’en-tête `Retry-After`.

## Pages

- **Vue d’ensemble** : classement Riot, 20 dernières parties, champions et indicateurs simples.
- **Partie en cours** : données de l’API locale Riot (`127.0.0.1:2999`). Hors partie, elle reste vide. Les signaux d’achat sont des heuristiques exploratoires.
- **Vision Lab** : simulation interactive du dernier aperçu en temps de jeu, compteur dès disparition, SS rouge à partir de trois secondes, et minimap redimensionnable.
- **Plans de jeu** : trois pages Annie avec runes, objets illustrés et priorité heuristique selon la composition renseignée manuellement. Les choix doivent encore être validés contre des statistiques du patch.

## Limites de cette première étape

Vision Lab n’analyse pas encore les pixels du jeu : les disparitions sont simulées par des boutons. Le suivi automatique de la minimap est le prochain module technique. La Live Client Data API ne fournit pas les positions ni la visibilité des champions. Les conseils de macro, le parcours supposé du jungler et l’évaluation de la botlane ne sont pas encore actifs en partie. Leur qualité devra être testée sur des replays avant tout déploiement en direct.

## Vérifier

```powershell
npm test
```

Tests inclus : calcul de statistiques Riot, seuil SS et coordonnées proportionnelles de la minimap.

## Sources

- [Riot Developer Portal](https://developer.riotgames.com/docs/portal)
- [API et Live Client Data LoL](https://developer.riotgames.com/docs/lol)
- [Vanguard et accès mémoire des applications tierces](https://support.riotgames.com/en-us/riot/performance/game-memory-access-removed-for-third-party-apps)
