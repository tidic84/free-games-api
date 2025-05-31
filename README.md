# 🎮 Free Games API

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue?style=for-the-badge&logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![API Status](https://img.shields.io/badge/API-Live-success?style=for-the-badge)](http://localhost:3000)

**API moderne et interface web pour découvrir les meilleures promotions gaming** sur Epic Games, Steam et GOG.

## ⚡ Démarrage Rapide

```bash
# Installation
git clone https://github.com/tidic84/free-games-api
cd free-games-api
npm install

# Lancement
npm start
```

🌐 **Interface Web** : http://localhost:3000  
🔗 **API Endpoint** : http://localhost:3000/api/free-games

## 🎯 Fonctionnalités Principales

### 🏪 Plateformes Supportées

![Epic](https://img.shields.io/badge/Epic%20Games-0078D4?style=flat&logo=epicgames&logoColor=white)
![Steam](https://img.shields.io/badge/Steam-000000?style=flat&logo=steam&logoColor=white)
![GOG](https://img.shields.io/badge/GOG-86328A?style=flat&logo=gog.com&logoColor=white)

### 🎨 Interface Moderne
- 🌙 **Design sombre** avec thème violet/bleu
- 📱 **Responsive** - optimisé mobile
- ⚡ **Filtrage temps réel** par plateforme et réduction
- 💎 **Cartes élégantes** avec prix et économies

## 📊 API Endpoints

### Récupérer toutes les promotions
```http
GET /api/free-games
```

### Filtrer par réduction minimale
```http
GET /api/free-games?discount=50    # Au moins -50%
GET /api/free-games?discount=100   # Gratuits seulement
```

### Filtrer par plateformes
```http
GET /api/free-games?platforms=steam,epic
GET /api/free-games?platforms=gog&discount=70
```

### Réponse JSON
```json
{
  "game": "Cyberpunk 2077",
  "platform": "steam", 
  "discountPrice": 15.99,
  "originalPrice": 59.99,
  "discountPercent": 73,
  "url": "https://store.steampowered.com/app/1091500",
  "image": "https://cdn.akamai.steamstatic.com/..."
}
```

## 🏗️ Structure Technique

```
free-games-api/
├── 🚀 index.js                     # Serveur Express
├── 📁 routes/
│   └── FreeGamesController.js       # API Controller
├── 📁 fetch/
│   └── getGames.js                  # Récupération données
└── 📁 public/
    ├── index.html                   # Interface principale
    ├── modern-app.js               # JavaScript app
    └── modern-styles.css           # Styles modernes
```

## 🔧 Technologies

![Tech Stack](https://skillicons.dev/icons?i=nodejs,express,html,css,js)

- **Backend** : Node.js + Express
- **Frontend** : HTML5 + CSS3 + JavaScript
- **APIs** : Epic Games, Steam, GOG
- **Design** : CSS Grid + Flexbox + Animations

## 🚀 Déploiement

### Local
```bash
npm start
# → http://localhost:3000
```

### Production
```bash
# Variables d'environnement
PORT=3000
NODE_ENV=production

# PM2 (recommandé)
npm install -g pm2
pm2 start index.js --name "free-games-api"
```

## 📈 Performance

- ⚡ **Cache intelligent** des requêtes API
- 🔄 **Requêtes parallèles** multi-plateformes  
- 📱 **Images optimisées** avec fallbacks
- 🎯 **Filtrage côté client** pour réactivité

## 📄 License

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

<div align="center">

**[🌟 Star ce projet](../../stargazers)** • **[🐛 Report Bug](../../issues)** • **[💡 Request Feature](../../issues)**

Made with ❤️

</div>
