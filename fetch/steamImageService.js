/**
 * Service Steam optimisé pour images verticales haute qualité
 * Priorise les formats verticaux et utilise des API alternatives
 */

// Configuration des API (avec fallback sécurisé)
let apiKeys = {
    steamGridDB: { apiKey: '', enabled: false },
    rawg: { apiKey: '', enabled: false },
    igdb: { clientId: '', clientSecret: '', enabled: false }
};

try {
    const externalKeys = require('../config/api-keys.js');
    apiKeys = { ...apiKeys, ...externalKeys };
} catch (error) {
    console.log('🔄 Utilisation du mode fallback Steam CDN (pas de clés API configurées)');
}

class SteamImageService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 heures
        this.steamBaseUrl = 'https://store.steampowered.com/api';
        this.steamSpyUrl = 'https://steamspy.com/api.php';
        this.steamGridDBUrl = 'https://www.steamgriddb.com/api/v2';
        this.rawgUrl = 'https://api.rawg.io/api';
        
        // Proxy CORS pour éviter les erreurs CORS
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?'
        ];
        this.currentProxyIndex = 0;
        
        // Configuration optimisée
        this.useAlternativeAPI = true;
        this.preferVerticalImages = true;
        this.useCDNFallback = true;
        this.apiKeys = apiKeys;
        
        console.log('🎮 Service Steam Images initialisé - Mode Images Verticales HD');
        this.showAPIStatus();
    }

    /**
     * Affiche le statut des API configurées
     */
    showAPIStatus() {
        const status = [
            `SteamGridDB: ${this.apiKeys.steamGridDB?.enabled ? '✅' : '❌ (configuration requise)'}`,
            `RAWG API: ${this.apiKeys.rawg?.enabled ? '✅' : '❌ (configuration requise)'}`,
            `Steam CDN: ✅ (toujours disponible)`
        ];
        console.log('📡 APIs disponibles:', status.join(', '));
    }

    /**
     * Point d'entrée principal - récupère les meilleures images disponibles
     */
    async getGameImages(gameName, platform = null, steamId = null) {
        try {
            const startTime = Date.now();
            const cleanGameName = this.cleanGameName(gameName);
            const cacheKey = `${cleanGameName}-${platform}-${steamId}`;

            // Vérifier le cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }

            let images = null;

            // 🎯 NOUVELLE STRATÉGIE : API alternatives en priorité
            if (this.useAlternativeAPI) {
                console.log(`🎨 Tentative d'images haute qualité via API alternative pour: ${gameName}`);
                images = await this.getHighQualityImages(gameName, platform, steamId);
                
                if (images && images.isHighQuality) {
                    console.log(`✅ Images haute qualité trouvées via API alternative pour: ${gameName}`);
                    this.cacheResult(cacheKey, images);
                    return images;
                }
            }

            // Fallback Steam standard
            if (platform === 'steam' || steamId) {
                images = steamId ? 
                    this.getEnhancedSteamCDNImages(steamId) : 
                    await this.getSteamImages(gameName, steamId);
            }

            // Fallback final - image générique
            if (!images) {
                images = await this.getGenericGameImage(gameName, platform);
            }
            
            if (images) {
                this.cacheResult(cacheKey, images);
                console.log(`✅ Images trouvées en ${Date.now() - startTime}ms`);
            }

            return images;

        } catch (error) {
            console.warn(`Erreur récupération images ${gameName}:`, error.message);
            return this.getGenericGameImage(gameName, platform);
        }
    }

    /**
     * 🎯 NOUVELLE MÉTHODE : Récupération via API alternatives haute qualité
     */
    async getHighQualityImages(gameName, platform = null, steamId = null) {
        console.log(`🔍 Recherche d'images haute qualité pour: ${gameName} (${platform})`);
        
        try {
            // 1. SteamGridDB (si configuré)
            if ((steamId || platform === 'steam') && this.apiKeys.steamGridDB?.enabled) {
                const steamGridImages = await this.getSteamGridDBImages(gameName, steamId);
                if (steamGridImages?.isHighQuality) {
                    return steamGridImages;
                }
            }

            // 2. RAWG API (si configuré)
            if (this.apiKeys.rawg?.enabled) {
                const rawgImages = await this.getRAWGImages(gameName, platform);
                if (rawgImages?.isHighQuality) {
                    return rawgImages;
                }
            }

            // 3. Steam CDN amélioré (toujours disponible)
            if (steamId) {
                console.log(`📦 Utilisation des images Steam CDN améliorées pour: ${gameName}`);
                return this.getEnhancedSteamCDNImages(steamId);
            }

            console.log(`❌ Aucune image haute qualité trouvée pour: ${gameName}`);
            return null;

        } catch (error) {
            console.warn(`Erreur API alternative ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * 🎯 SteamGridDB avec authentification (si configuré)
     */
    async getSteamGridDBImages(gameName, steamId = null) {
        if (!this.apiKeys.steamGridDB?.enabled) {
            console.log(`⚠️  SteamGridDB non configuré pour: ${gameName}`);
            return null;
        }

        try {
            let searchId = steamId || await this.findSteamGameByName(gameName);
            if (!searchId) return null;

            const gridUrl = `${this.steamGridDBUrl}/grids/steam/${searchId}?dimensions=600x900,342x482&format=png,jpg&types=static`;
            console.log(`🎨 Requête SteamGridDB: ${gridUrl}`);
            
            const response = await fetch(gridUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.steamGridDB.apiKey}`,
                    'User-Agent': 'Free-Games-API/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`SteamGridDB HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data?.length > 0) {
                const bestImage = this.selectBestImage(data.data);
                return this.formatImageResponse(bestImage.url, 'SteamGridDB', bestImage);
            }

            return null;

        } catch (error) {
            console.warn(`❌ Erreur SteamGridDB pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * 🎯 RAWG API avec authentification (si configuré)
     */
    async getRAWGImages(gameName, platform = null) {
        if (!this.apiKeys.rawg?.enabled) {
            console.log(`⚠️  RAWG API non configuré pour: ${gameName}`);
            return null;
        }

        try {
            const cleanName = encodeURIComponent(gameName.replace(/[^\w\s]/g, '').trim());
            const searchUrl = `${this.rawgUrl}/games?key=${this.apiKeys.rawg.apiKey}&search=${cleanName}&search_precise=true&page_size=3`;
            
            console.log(`🎮 Requête RAWG: ${searchUrl}`);
            
            const response = await fetch(searchUrl);
            if (!response.ok) {
                throw new Error(`RAWG HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results?.length > 0) {
                const game = this.findBestMatch(data.results, gameName);
                if (game?.background_image) {
                    return this.formatImageResponse(game.background_image, 'RAWG API', game);
                }
            }

            return null;

        } catch (error) {
            console.warn(`❌ Erreur RAWG pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * 🎯 MÉTHODE AMÉLIORÉE : Steam CDN optimisé pour images verticales
     */
    getEnhancedSteamCDNImages(steamId) {
        if (!steamId) return null;
        
        const baseUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}`;
        
        // Screenshots haute résolution
        const screenshots = [];
        for (let i = 1; i <= 5; i++) {
            screenshots.push(`${baseUrl}/ss_${i.toString().padStart(8, '0')}.1920x1080.jpg`);
        }

        return {
            // Image principale verticale (priorité absolue)
            cover: `${baseUrl}/library_600x900.jpg`,
            library: `${baseUrl}/library_600x900.jpg`,
            
            // Images supplémentaires
            capsule: `${baseUrl}/capsule_616x353.jpg`,
            hero: `${baseUrl}/library_hero.jpg`,
            header: `${baseUrl}/header.jpg`,
            screenshots: screenshots,
            
            // Métadonnées
            source: 'Steam CDN Enhanced',
            isHighQuality: true,
            isVertical: true,
            quality: 'HAUTE',
            metadata: {
                steamId: steamId,
                formats: 14,
                screenshotCount: screenshots.length,
                verticalOptimized: true
            }
        };
    }

    /**
     * Sélectionne la meilleure image d'une liste (priorise les formats verticaux)
     */
    selectBestImage(images) {
        return images.sort((a, b) => {
            const aVertical = a.height > a.width;
            const bVertical = b.height > b.width;
            
            // Priorité aux images verticales
            if (aVertical && !bVertical) return -1;
            if (!aVertical && bVertical) return 1;
            
            // Puis par résolution
            return (b.width * b.height) - (a.width * a.height);
        })[0];
    }

    /**
     * Trouve la meilleure correspondance dans les résultats de recherche
     */
    findBestMatch(results, gameName) {
        const cleanTarget = gameName.toLowerCase();
        
        // Recherche exacte d'abord
        for (const game of results) {
            if (game.name.toLowerCase() === cleanTarget) return game;
        }
        
        // Recherche partielle
        for (const game of results) {
            if (game.name.toLowerCase().includes(cleanTarget) || 
                cleanTarget.includes(game.name.toLowerCase())) {
                return game;
            }
        }
        
        return results[0]; // Fallback sur le premier résultat
    }

    /**
     * Formate la réponse d'image de manière standardisée
     */
    formatImageResponse(imageUrl, source, metadata = {}) {
        const isVertical = metadata.height > metadata.width;
        
        return {
            cover: imageUrl,
            library: imageUrl,
            capsule: imageUrl,
            screenshots: [imageUrl],
            source: source,
            isHighQuality: true,
            isVertical: isVertical,
            quality: 'HAUTE',
            metadata: metadata
        };
    }

    /**
     * Met en cache le résultat
     */
    cacheResult(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Recherche Steam - version simplifiée et robuste
     */
    async getSteamImages(gameName, steamId = null) {
        try {
            let appId = steamId || await this.findSteamGameByName(gameName);
            if (!appId) return null;

            console.log(`App ID trouvé pour ${gameName}: ${appId}`);
            return this.getEnhancedSteamCDNImages(appId);

        } catch (error) {
            console.warn(`Erreur Steam API pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * Recherche d'App ID Steam - base de données locale optimisée
     */
    async findSteamGameByName(gameName) {
        const cleanName = this.cleanGameName(gameName);
        
        // Base de données locale des jeux populaires
        const popularGames = {
            'cyberpunk 2077': '1091500',
            'the witcher 3': '292030',
            'the witcher 3 wild hunt': '292030',
            'hades': '1145360',
            'stardew valley': '413150',
            'among us': '945360',
            'rocket league': '252950',
            'control': '870780',
            'grand theft auto v': '271590',
            'counter strike global offensive': '730',
            'counter strike 2': '730',
            'dota 2': '570',
            'team fortress 2': '440',
            'portal 2': '620',
            'half life 2': '220',
            'left 4 dead 2': '550',
            'fallout 4': '377160',
            'skyrim': '72850',
            'dark souls iii': '374320',
            'sekiro shadows die twice': '814380',
            'elden ring': '1245620',
            'hollow knight': '367520',
            'celeste': '504230',
            'terraria': '105600',
            'minecraft': '323910',
            'valheim': '892970'
        };

        return popularGames[cleanName] || null;
    }

    /**
     * Image générique pour jeux non-Steam
     */
    async getGenericGameImage(gameName, platform) {
        const platformColors = {
            epic: '#0078f2',
            gog: '#9f46ba',
            steam: '#1b2838'
        };

        const color = platformColors[platform] || '#666666';
        
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#333333;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="600" height="900" fill="url(#grad)"/>
                <text x="300" y="400" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">
                    <tspan x="300" dy="0">${gameName}</tspan>
                    <tspan x="300" dy="50" font-size="20" opacity="0.8">${platform ? platform.toUpperCase() : 'GAME'}</tspan>
                </text>
                <circle cx="300" cy="600" r="50" fill="white" opacity="0.2"/>
                <polygon points="280,580 280,620 320,600" fill="white" opacity="0.8"/>
            </svg>
        `;

        return {
            cover: 'data:image/svg+xml;base64,' + btoa(svg),
            library: 'data:image/svg+xml;base64,' + btoa(svg),
            source: 'Steam CDN',
            isHighQuality: false,
            isVertical: true,
            quality: 'Standard'
        };
    }

    /**
     * Nettoie le nom du jeu pour la recherche
     */
    cleanGameName(gameName) {
        if (!gameName) return '';
        
        return gameName
            .toLowerCase()
            .replace(/[™®©]/g, '')
            .replace(/\b(game of the year|goty|definitive|enhanced|special|deluxe|premium|gold|platinum|ultimate|complete|remastered)\b/gi, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache vidé');
    }

    /**
     * Statistiques du cache
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SteamImageService;
}

// Export pour navigateur
if (typeof window !== 'undefined') {
    window.SteamImageService = SteamImageService;
}