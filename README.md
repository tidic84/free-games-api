# Free Games API - Version Améliorée

API moderne pour récupérer les jeux gratuits et en promotion sur Epic Games, Steam et GOG avec interface web élégante.

## 🚀 Fonctionnalités

### ✅ Corrections Appliquées
- **Tri strict des promotions** : Les jeux à -75%/-89% n'apparaissent plus dans les gratuits
- **Amélioration Steam** : Récupération multi-sources (API + scraping de secours)
- **GOG enrichi** : Images et prix disponibles pour les jeux GOG
- **Squelettes de chargement** : Remplacement du spinner par des skeleton cards modernes
- **Filtrage précis** : Séparation stricte entre jeux gratuits (100%) et promotions

### 🎮 Plateformes Supportées
- **Epic Games Store** : Jeux gratuits hebdomadaires + promotions
- **Steam** : Jeux gratuits + promotions (API + scraping)
- **GOG** : Jeux gratuits + promotions avec images et prix

### 🎨 Interface Moderne
- Design sombre élégant avec thème violet/bleu
- Cartes de jeux avec images, prix et réductions
- Squelettes de chargement fluides
- Interface responsive (mobile-friendly)
- Animations et effets hover

## 📊 API Endpoints

### Jeux Gratuits
```
GET /games?discount=free
GET /games?discount=100
```
Retourne uniquement les jeux avec 100% de réduction (gratuits).

### Promotions
```
GET /games?discount=50
GET /games?discount=70
```
Retourne les jeux avec au moins X% de réduction (excluant les gratuits).

### Promotions Exactes
```
GET /games?discount=50&mustSame=true
```
Retourne uniquement les jeux avec exactement X% de réduction.

## 🛠️ Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd free-games-api
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Démarrer le serveur**
```bash
npm start
# ou
node index.js
```

4. **Accéder à l'interface**
- Interface web : http://localhost:3000
- API : http://localhost:3000/games

## 🔧 Structure du Projet

```
free-games-api/
├── index.js                 # Serveur Express principal
├── routes/
│   └── FreeGamesController.js # Contrôleur avec filtrage strict
├── fetch/
│   ├── getFreeGames.js      # Récupération jeux gratuits (100%)
│   └── getDiscountedGames.js # Récupération promotions
├── public/
│   ├── index.html           # Page d'accueil moderne
│   ├── games.html           # Page liste des jeux
│   ├── games-script.js      # JavaScript avec squelettes
│   ├── games.css           # Styles modernes
│   ├── skeleton.css        # Styles squelettes de chargement
│   └── index.css           # Styles page d'accueil
└── test-corrections.js      # Script de test des corrections
```

## 🐛 Corrections Techniques

### Problème 1 : Jeux en promotion dans les gratuits
**Avant** : Les jeux à -75% apparaissaient dans la section gratuits
**Après** : Filtrage strict avec vérification du prix final = 0

### Problème 2 : Steam ne retournait aucun jeu
**Avant** : Une seule source API parfois indisponible
**Après** : Multi-sources avec fallback + meilleure gestion d'erreurs

### Problème 3 : GOG sans images ni prix
**Avant** : Données basiques uniquement
**Après** : Appels API détaillés pour récupérer images et prix

### Problème 4 : Spinner de chargement basique
**Avant** : Simple spinner
**Après** : Squelettes de chargement réalistes avec animations

## 🎯 Logique de Filtrage

### Jeux Gratuits (discount=free ou discount=100)
```javascript
// Critères stricts
discountPercent === 100 ||
discountPrice === 0 ||
price === 0
```

### Promotions (discount=X, X < 100)
```javascript
// Si mustSame=true
discountPercent === X

// Si mustSame=false (défaut)
discountPercent >= X && discountPercent < 100
```

## 🚀 Améliorations UI/UX

### Squelettes de Chargement
- 8 cartes skeleton pendant le chargement
- Animation de shimmer réaliste
- Même structure que les vraies cartes

### Cartes de Jeux Enrichies
- Images haute qualité
- Prix actuel et prix barré
- Badge de réduction coloré
- Économies calculées
- Liens vers les stores

### Design Responsive
- Grille adaptive (350px minimum par carte)
- Mobile-first approach
- Animations fluides

## 🔍 Tests et Validation

Exécuter le script de test :
```bash
node test-corrections.js
```

Ce script vérifie :
- Aucun jeu en promotion dans les gratuits
- Aucun jeu gratuit dans les promotions
- Cohérence des pourcentages de réduction

## 📱 Utilisation

1. **Page d'accueil** : Navigation claire vers chaque section
2. **Jeux gratuits** : Cliquer sur "Jeux Gratuits"
3. **Promotions** : Choisir le pourcentage souhaité (-100%, -70%, -50%)
4. **Chargement** : Squelettes animés pendant la récupération
5. **Navigation** : Liens directs vers les stores

## 🔮 Prochaines Améliorations

- [ ] Cache Redis pour optimiser les performances
- [ ] Notifications push pour nouveaux jeux gratuits
- [ ] Filtres par genre/plateforme
- [ ] Historique des prix
- [ ] API key pour limiter l'usage

## 📄 License

MIT License - Voir le fichier LICENSE pour plus de détails.
