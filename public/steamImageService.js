/**
 * Service Steam pour récupérer des images de jeux officielles - Version Front-end
 * Utilise l'API Steam Store et le CDN Steam pour obtenir des images HD
 */

class SteamImageService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 heures
        this.useCDNFallback = true; // Utiliser directement les URLs du CDN Steam
        this.preferHighQuality = true; // Préférer les images haute qualité
        
        // ✨ NOUVELLE API ALTERNATIVE pour images haute qualité (version frontend)
        this.useAlternativeAPI = true; // Active les APIs alternatives pour de meilleures images
        this.rawgUrl = 'https://api.rawg.io/api'; // API RAWG alternative
        this.steamGridDBUrl = 'https://www.steamgriddb.com/api/v2'; // SteamGridDB
    }

    /**
     * Récupère les images d'un jeu Steam
     * @param {string} gameName - Nom du jeu
     * @param {string} platform - Plateforme (steam, epic, gog)
     * @param {string} steamId - ID Steam optionnel
     * @returns {Promise<Object>} Objet contenant les URLs des images
     */    async getGameImages(gameName, platform = null, steamId = null) {
        try {
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

            // ✨ NOUVEAU : Essayer d'abord l'API alternative pour de meilleures images
            if (this.useAlternativeAPI && (platform === 'steam' || steamId)) {
                console.log(`🎨 Frontend: Tentative d'images haute qualité pour: ${gameName}`);
                images = await this.getHighQualityImages(gameName, steamId);
                
                if (images && images.isHighQuality) {
                    console.log(`✅ Frontend: Images haute qualité trouvées pour: ${gameName}`);
                    this.cache.set(cacheKey, {
                        data: images,
                        timestamp: Date.now()
                    });
                    return images;
                }
            }

            // Pour les plateformes non-Steam, utiliser des images génériques
            if (platform && platform !== 'steam') {
                return this.getGenericGameImage(gameName, platform);
            }

            // Si un ID Steam est fourni, l'utiliser directement
            if (steamId) {
                images = this.getDirectCDNImages(steamId);
                
                // Mettre en cache
                this.cache.set(cacheKey, {
                    data: images,
                    timestamp: Date.now()
                });
                
                return images;
            }
            
            // Sinon, essayer de trouver l'ID à partir du nom
            const appId = this.findInPopularGames(gameName);
            
            if (appId) {
                images = this.getDirectCDNImages(appId);
                
                // Mettre en cache
                this.cache.set(cacheKey, {
                    data: images,
                    timestamp: Date.now()
                });
                
                return images;
            }
            
            // Fallback: image générique
            return this.getGenericGameImage(gameName, platform || 'steam');

        } catch (error) {
            console.warn(`Erreur lors de la récupération des images pour ${gameName}:`, error);
            return this.getGenericGameImage(gameName, platform);
        }
    }
      /**
     * Obtient les images directement du CDN Steam
     * @param {string} appId - ID Steam
     * @returns {Object} Objet contenant les URLs des images
     */
    getDirectCDNImages(appId) {
        if (!appId) return null;
        
        const imageTypes = this.preferHighQuality ? 'jpg' : 'jpg_290x136';
        const headerExt = this.preferHighQuality ? 'jpg' : 'jpg';
          return {
            cover: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
            library: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
            capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
            screenshots: [
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_1.${imageTypes}`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_2.${imageTypes}`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_3.${imageTypes}`
            ],
            background: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/page_bg_generated_v6b.jpg`,
            hero: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
            appId: appId,
            isHighQuality: this.preferHighQuality,
            isCDNDirect: true,
            isVerticalFormat: true // Priorité au format vertical
        };
    }

    /**
     * ✨ NOUVELLE MÉTHODE FRONTEND : Récupère des images haute qualité via APIs alternatives
     * @param {string} gameName - Nom du jeu
     * @param {string} steamId - ID Steam optionnel
     * @returns {Promise<Object|null>} Images haute qualité
     */
    async getHighQualityImages(gameName, steamId = null) {
        console.log(`🎨 Frontend: Recherche d'images HQ pour: ${gameName}`);
        
        try {
            // Essayer RAWG API en premier (plus fiable côté frontend)
            const rawgImages = await this.getRAWGImagesFrontend(gameName);
            if (rawgImages && rawgImages.isHighQuality) {
                console.log(`✅ Frontend: Images RAWG trouvées pour: ${gameName}`);
                return rawgImages;
            }

            // Fallback sur les images Steam améliorées
            if (steamId) {
                console.log(`📦 Frontend: Images Steam CDN améliorées pour: ${gameName}`);
                return this.getEnhancedSteamImagesFrontend(steamId);
            }

            return null;

        } catch (error) {
            console.warn(`Erreur API alternative frontend pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * Récupère les images depuis RAWG API (version frontend optimisée)
     * @param {string} gameName - Nom du jeu
     * @returns {Promise<Object|null>} Images RAWG
     */
    async getRAWGImagesFrontend(gameName) {
        try {
            const cleanName = encodeURIComponent(gameName.replace(/[^\w\s]/g, '').trim());
            const searchUrl = `${this.rawgUrl}/games?search=${cleanName}&search_precise=true&page_size=3`;
            
            console.log(`🎮 Frontend RAWG: ${searchUrl}`);
            
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; GameDealsHub/1.0)'
                }
            });

            if (!response.ok) {
                throw new Error(`RAWG HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                let bestMatch = data.results[0];
                
                // Chercher la meilleure correspondance
                for (const game of data.results) {
                    const nameMatch = this.calculateNameSimilarity(gameName.toLowerCase(), game.name.toLowerCase());
                    const currentMatch = this.calculateNameSimilarity(gameName.toLowerCase(), bestMatch.name.toLowerCase());
                    
                    if (nameMatch > currentMatch) {
                        bestMatch = game;
                    }
                }

                if (bestMatch.background_image) {
                    return {
                        cover: bestMatch.background_image,
                        library: this.createVerticalImageFrontend(bestMatch.background_image, gameName),
                        capsule: bestMatch.background_image,
                        header: bestMatch.background_image,
                        screenshots: bestMatch.short_screenshots ? 
                            bestMatch.short_screenshots.slice(0, 5).map(shot => shot.image) : [],
                        background: bestMatch.background_image,
                        hero: bestMatch.background_image,
                        gameId: bestMatch.id,
                        isHighQuality: true,
                        isVerticalFormat: false,
                        source: 'RAWG API',
                        rating: bestMatch.rating,
                        releaseDate: bestMatch.released
                    };
                }
            }

            return null;

        } catch (error) {
            console.warn(`Erreur RAWG frontend pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * Améliore les images Steam CDN (version frontend)
     * @param {string} steamId - ID Steam
     * @returns {Object} Images Steam améliorées
     */
    getEnhancedSteamImagesFrontend(steamId) {
        if (!steamId) return null;
        
        return {
            cover: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900.jpg`,
            library: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900.jpg`,
            capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/capsule_616x353.jpg`,
            header: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/header.jpg`,
            
            // Essayer différents formats d'images Steam
            portrait: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/portrait.png`,
            logo: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/logo.png`,
            
            screenshots: [
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_1.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_2.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_3.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_4.1920x1080.jpg`
            ],
            
            background: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/page_bg_generated_v6b.jpg`,
            hero: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_hero.jpg`,
            
            appId: steamId,
            isHighQuality: true,
            isCDNDirect: true,
            isVerticalFormat: true,
            source: 'Steam CDN Enhanced Frontend'
        };
    }

    /**
     * Crée une image verticale stylisée (version frontend)
     * @param {string} originalImageUrl - URL de l'image originale
     * @param {string} gameName - Nom du jeu
     * @returns {string} Data URL de l'image verticale
     */
    createVerticalImageFrontend(originalImageUrl, gameName) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 400;
        
        // Créer un gradient de fond
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(20, 30, 50, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        // Fond dégradé
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 400);
        
        // Texte
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('HAUTE QUALITÉ', 150, 350);
        
        ctx.font = '14px Arial';
        ctx.fillText(this.truncateText(gameName, 20), 150, 375);
        
        return canvas.toDataURL('image/png', 0.8);
    }

    /**
     * Calcule la similarité entre deux noms de jeux
     * @param {string} name1 - Premier nom
     * @param {string} name2 - Second nom
     * @returns {number} Score de similarité (0-1)
     */
    calculateNameSimilarity(name1, name2) {
        const clean1 = name1.replace(/[^\w]/g, '');
        const clean2 = name2.replace(/[^\w]/g, '');
        
        if (clean1 === clean2) return 1;
        if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
        
        // Comparaison de mots
        const words1 = clean1.split(/\s+/);
        const words2 = clean2.split(/\s+/);
        
        let matchCount = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1.includes(word2) || word2.includes(word1)) {
                    matchCount++;
                    break;
                }
            }
        }
        
        return matchCount / Math.max(words1.length, words2.length);
    }
    
    /**
     * Recherche dans une base de jeux Steam populaires
     * @param {string} gameName - Nom du jeu
     * @returns {string|null} App ID Steam
     */
    findInPopularGames(gameName) {
        const popularGames = {
            'cyberpunk 2077': '1091500',
            'the witcher 3': '292030',
            'grand theft auto v': '271590',
            'counter-strike 2': '730',
            'dota 2': '570',
            'apex legends': '1172470',
            'destiny 2': '1085660',
            'rocket league': '252950',
            'fall guys': '1097150',
            'among us': '945360',
            'valheim': '892970',
            'hades': '1145360',
            'portal 2': '620',
            'half-life 2': '220',
            'left 4 dead 2': '550',
            'team fortress 2': '440',
            'garry\'s mod': '4000',
            'rust': '252490',
            'ark survival evolved': '346110',
            'cities skylines': '255710',
            'civilization vi': '289070',
            'europa universalis iv': '236850',
            'hearts of iron iv': '394360',
            'stellaris': '281990',
            'crusader kings iii': '1158310',
            'total war warhammer iii': '1142710',
            'american truck simulator': '270880',
            'euro truck simulator 2': '227300',
            'farming simulator 22': '1248130',
            'forza horizon 5': '1551360',
            'forza horizon 4': '1293830',
            'call of duty modern warfare ii': '1938090',
            'rainbow six siege': '359550',
            'pubg battlegrounds': '578080',
            'dead by daylight': '381210',
            'phasmophobia': '739630',
            'sea of thieves': '1172620',
            'no man\'s sky': '275850',
            'subnautica': '264710',
            'the forest': '242760',
            'green hell': '815370',
            'raft': '648800',
            'astroneer': '361420',
            'satisfactory': '526870',
            'factorio': '427520',
            'rimworld': '294100',
            'prison architect': '233450',
            'planet coaster': '493340',
            'planet zoo': '703080',
            'stardew valley': '413150',
            'terraria': '105600',
            'minecraft': '22350'
        };

        const cleanName = this.cleanGameName(gameName);

        // Recherche exacte
        if (popularGames[cleanName]) {
            return popularGames[cleanName];
        }

        // Recherche partielle
        for (const [name, appId] of Object.entries(popularGames)) {
            if (name.includes(cleanName) || cleanName.includes(name.split(' ')[0])) {
                return appId;
            }
        }

        return null;
    }

    /**
     * Images génériques pour plateformes non-Steam
     * @param {string} gameName - Nom du jeu
     * @param {string} platform - Plateforme
     * @returns {Object} Objet contenant les URLs des images
     */
    getGenericGameImage(gameName, platform) {
        const platformColors = {
            epic: { primary: '#0078f2', secondary: '#00d4ff' },
            gog: { primary: '#9f46ba', secondary: '#7c3aed' },
            steam: { primary: '#1b2838', secondary: '#2a475e' }
        };

        const colors = platformColors[platform] || platformColors.steam;
        
        // Image simple avec logo de plateforme
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="300" height="400" fill="url(#grad)"/>
                <rect x="50" y="150" width="200" height="100" fill="rgba(255,255,255,0.1)" rx="10"/>
                <text x="150" y="190" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif" font-weight="bold">${platform ? platform.toUpperCase() : 'GAME'}</text>
                <text x="150" y="220" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="12" font-family="Arial, sans-serif">${this.truncateText(gameName, 20)}</text>
            </svg>
        `;

        return {
            cover: 'data:image/svg+xml;base64,' + btoa(svg),
            library: 'data:image/svg+xml;base64,' + btoa(svg),
            platform: platform,
            isGeneric: true
        };
    }

    /**
     * Nettoie le nom du jeu pour la recherche
     * @param {string} gameName - Nom du jeu
     * @returns {string} Nom nettoyé
     */
    cleanGameName(gameName) {
        return gameName
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Tronque le texte à une longueur donnée
     * @param {string} text - Texte à tronquer
     * @param {number} maxLength - Longueur maximale
     * @returns {string} Texte tronqué
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength - 3) + '...';
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache Steam images vidé');
    }

    /**
     * Obtient les statistiques du cache
     * @returns {Object} Statistiques du cache
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Si exécuté dans un environnement Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SteamImageService;
}
