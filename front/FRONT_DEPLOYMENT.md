# Préparation au deploiement du front

1. Run la commande "cd front && npm run build"  -> Build du react
2. Run la commande "cd front && npm run proxy:build" -> build du serveur ts



# Structure du projet

```bash
dist/
├─ asset/
│  ├─ Vos fichiers .tsx compilés
│  └─ Vos fichiers .tsx compilés
├─ server/
│  └─ index.js
│  └─ .env -> Variables d'environnement pour la config du proxy front nodejs
|  └─ package.json
|  └─ package-lock.json
```



# Setup de nodejs App dans l'env Cpannel

-Version Node.js : 22.18
-Application root : nom du repertoire/dist/server
-Application url : url à définir
-Application startup file : index.js



# Une fois que les fichiers sont importé et l'app 

-Installer les dépendances via le setup Nodejs app dans Cpannel il suffit juste de cliquer sur run npm install
-> ! le fichier package.json doit bien être présent au même niveau que index.js, voir dans structure du projet.



# Remplir les variables d'environnement

BACKEND_URL: adresse du backend
PORT: port utilisé de l'instance nodejs
CAP_MAX_RESULTS: maximum de return par l'api LF

OAUTH_URL: https://oauth.piste.gouv.fr/api/oauth/token
LF_SEARCH_URL: https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/search
LF_CONSULT_JURI_URL: https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/consult/juri




⚠️En cas de modification des fichiers sur un serveur déjà lancé ne pas oublié de restart le serveur pour appliquer les mises à jours
