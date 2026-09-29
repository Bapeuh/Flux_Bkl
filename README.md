# Flux Backlight

Simulateur de flux accessible depuis un navigateur sur le réseau local et depuis une fenêtre desktop Windows. Un **poste hôte** exécute le serveur et conserve les scénarios partagés ; les autres postes utilisent leur navigateur. Le moteur de simulation, les vues Flux, les coûts et les exports viennent de la V2 locale.

## Démarrer sur le réseau

Installer Node.js 20 ou plus récent, puis sur le poste hôte :

```bash
npm start
```

Le terminal affiche un lien local et un ou plusieurs liens réseau. Ouvrir le lien réseau sur les autres postes connectés au même réseau. L'hôte doit rester allumé. Autoriser le port 4173 dans le pare-feu du poste hôte si nécessaire. `FLUX_PORT` et `FLUX_HOST` permettent de modifier le port et l'interface d'écoute.

Chaque installation crée un jeton d'accès et conserve les scénarios dans `~/.flux-bkl` (sur Windows, dans le dossier utilisateur). **Le lien contient le jeton : partager uniquement avec les personnes autorisées sur un réseau de confiance.** Le navigateur conserve le jeton pour sa session, puis le retire de l'adresse visible. Les exports JSON/XML continuent de fonctionner sans connexion au serveur.

## Fenêtre desktop

```bash
npm install
npm run desktop
```

Le menu **Fichier → Copier le lien réseau** permet de partager l'adresse du poste hôte. La fenêtre desktop lance le même serveur et utilise la même base de scénarios que les navigateurs du réseau. `npm run dist:win` prépare un installateur Windows NSIS dans `dist/` ; la compilation Windows doit être faite sur Windows ou dans un environnement de build Windows.

## Portée de cette première version

Le serveur partage les scénarios entre postes et sert l'interface existante. Les calculs sont exécutés dans chaque navigateur à partir du même scénario ; un changement enregistré par un poste est visible après rechargement de la liste sur les autres postes. Il n'y a pas encore d'édition simultanée ni de comptes utilisateurs individuels. Le jeton protège les écritures et lectures API, mais HTTP sur le réseau local ne chiffre pas les échanges. Ne pas exposer ce serveur directement sur Internet.
