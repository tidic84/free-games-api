/**
 * Service Steam amélioré pour récupérer des images de jeux officielles
 * Utilise l'API Steam Store, SteamSpy et le CDN Steam pour obtenir des images HD
 */

// Charger la configuration des clés API
let apiKeys = {};
try {
    apiKeys = require('../config/api-keys.js');
} catch (error) {
    console.warn('⚠️  Fichier api-keys.js non trouvé, utilisation sans clés API externes');
    apiKeys = {
        steamGridDB: { apiKey: '', enabled: false },
        rawg: { apiKey: '', enabled: false },
        igdb: { clientId: '', clientSecret: '', enabled: false }
    };
}

class SteamImageService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 heures
        this.steamBaseUrl = 'https://store.steampowered.com/api';
        this.steamSpyUrl = 'https://steamspy.com/api.php';
        this.steamGridDBUrl = 'https://www.steamgriddb.com/api/v2';
        
        // Plusieurs options de proxy CORS (si l'une échoue, l'autre peut fonctionner)
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://cors-anywhere.herokuapp.com/'
        ];
        this.currentProxyIndex = 0; // Index du proxy actuel
        this.useCDNFallback = true; // Utiliser directement les URLs du CDN Steam si l'API échoue
        this.preferHighQuality = true; // Préférer les images haute qualité
        
        // ✨ CONFIGURATION DES API ALTERNATIVES
        this.useAlternativeAPI = true; // Active les API alternatives pour de meilleures images
        this.apiKeys = apiKeys;
        this.igdbUrl = 'https://api.igdb.com/v4'; // API IGDB alternative
        this.rawgUrl = 'https://api.rawg.io/api'; // API RAWG alternative
        
        // Afficher le statut des API configurées
        this.logAPIStatus();
    }

    /**
     * Affiche le statut des API configurées
     */
    logAPIStatus() {
        console.log('📡 Statut des API d\'images configurées:');
        console.log(`   SteamGridDB: ${this.apiKeys.steamGridDB?.enabled ? '✅ Activé' : '❌ Désactivé (clé manquante)'}`);
        console.log(`   RAWG API: ${this.apiKeys.rawg?.enabled ? '✅ Activé' : '❌ Désactivé (clé manquante)'}`);
        console.log(`   IGDB API: ${this.apiKeys.igdb?.enabled ? '✅ Activé' : '❌ Désactivé (clé manquante)'}`);
        console.log(`   Steam CDN: ✅ Toujours disponible`);
    }

    /**
     * Obtenir le proxy CORS actuel
     * @returns {string} URL du proxy CORS
     */
    get corsProxy() {
        return this.corsProxies[this.currentProxyIndex];
    }

    /**
     * Passer au proxy CORS suivant
     */
    switchProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
        console.log(`Changement de proxy CORS: ${this.corsProxy}`);
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

            // ✨ NOUVELLE APPROCHE : Essayer d'abord l'API alternative pour de meilleures images
            if (this.useAlternativeAPI) {
                console.log(`🎨 Tentative d'images haute qualité via API alternative pour: ${gameName}`);
                images = await this.getHighQualityImages(gameName, platform, steamId);
                
                if (images && images.isHighQuality) {
                    console.log(`✅ Images haute qualité trouvées via API alternative pour: ${gameName}`);
                    this.cache.set(cacheKey, {
                        data: images,
                        timestamp: Date.now()
                    });
                    return images;
                }
            }

            // Pour Steam, utiliser directement le CDN pour de meilleures performances et qualité
            if (platform === 'steam' || steamId) {
                // Priorité au CDN direct pour les images haute qualité et verticales
                images = steamId ? this.getDirectCDNImages(steamId) : null;
                // Fallback sur l'API Steam si pas d'ID fourni
                if (!images) {
                    images = await this.getSteamImages(gameName, steamId);
                }
            }

            // Fallback pour autres plateformes ou si Steam échoue
            if (!images) {
                images = await this.getGenericGameImage(gameName, platform);
            }
            
            // Mettre en cache
            if (images) {
                this.cache.set(cacheKey, {
                    data: images,
                    timestamp: Date.now()
                });
            }

            return images;

        } catch (error) {
            console.warn(`Erreur lors de la récupération des images pour ${gameName}:`, error.message);
            return this.getGenericGameImage(gameName, platform);
        }
    }/**
     * Récupère les images Steam officielles
     * @param {string} gameName - Nom du jeu
     * @param {string} steamId - ID Steam optionnel
     * @returns {Promise<Object|null>} Objet contenant les URLs des images
     */
    async getSteamImages(gameName, steamId = null) {
        let attempts = 0;
        const maxAttempts = this.corsProxies.length;

        while (attempts < maxAttempts) {
            try {
                let appId = steamId;
                
                // Si pas d'App ID fourni, le chercher
                if (!appId) {
                    appId = await this.findSteamGameByName(gameName);
                }
                
                if (!appId) {
                    console.log(`Aucun App ID trouvé pour ${gameName}`);
                    return null;
                }

                console.log(`App ID trouvé pour ${gameName}: ${appId}`);

                // Si on préfère utiliser directement le CDN pour de meilleures performances
                if (this.useCDNFallback) {
                    return this.getDirectCDNImages(appId);
                }

                // Récupérer les détails du jeu Steam via l'API
                const detailsUrl = `${this.steamBaseUrl}/appdetails?appids=${appId}&l=french`;
                
                // Utiliser un proxy CORS pour éviter les problèmes
                const proxyUrl = `${this.corsProxy}${encodeURIComponent(detailsUrl)}`;
                
                console.log(`Récupération des données via: ${this.corsProxy}`);
                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.ok) {
                    console.warn(`Réponse HTTP non OK: ${response.status} ${response.statusText}`);
                    throw new Error(`HTTP ${response.status}`);
                }

                const proxyData = await response.json();
                
                // Format différent selon le proxy
                let gameData;
                if (this.corsProxy.includes('allorigins')) {
                    // Pour api.allorigins.win
                    const data = JSON.parse(proxyData.contents);
                    if (!data[appId] || !data[appId].success || !data[appId].data) {
                        throw new Error("Données Steam invalides");
                    }
                    gameData = data[appId].data;
                } else {
                    // Pour les autres proxies
                    const data = proxyData;
                    if (!data[appId] || !data[appId].success || !data[appId].data) {
                        throw new Error("Données Steam invalides");
                    }
                    gameData = data[appId].data;
                }
                
                // Retourner les données formatées
                return {
                    cover: gameData.header_image || this.getSteamHeaderImage(appId),
                    library: this.getSteamLibraryImage(appId),
                    screenshots: gameData.screenshots 
                        ? gameData.screenshots.map(screenshot => screenshot.path_full || screenshot.path_thumbnail).slice(0, 5)
                        : [],
                    capsule: gameData.capsule_image || this.getSteamCapsuleImage(appId),
                    background: gameData.background || this.getSteamBackgroundImage(appId),
                    hero: gameData.hero_image || gameData.hero_capsule?.image || this.getSteamHeroImage(appId),
                    appId: appId,
                    isHighQuality: true
                };

            } catch (error) {
                console.warn(`Tentative ${attempts+1}/${maxAttempts} échouée:`, error.message);
                // Essayer le prochain proxy
                this.switchProxy();
                attempts++;
                
                // Si c'est la dernière tentative, utiliser l'approche directe CDN
                if (attempts === maxAttempts - 1) {
                    console.log("Utilisation de l'approche directe CDN...");
                    return this.getDirectCDNImages(steamId || await this.findSteamGameByName(gameName));
                }
            }
        }
        
        console.warn('Toutes les tentatives Steam API ont échoué');
        return null;
    }    /**
     * Obtient les images directement du CDN Steam (méthode alternative)
     * Utilise automatiquement les meilleures images verticales et haute qualité
     * @param {string} appId - ID Steam
     * @returns {Object} Objet contenant les URLs des images
     */
    getDirectCDNImages(appId) {
        if (!appId) return null;
        
        // Toujours utiliser la plus haute qualité disponible avec priorité aux images verticales
        return {
            // Image principale : priorité à l'image verticale de bibliothèque Steam
            cover: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
            // Format vertical officiel Steam (format carte de jeu)
            library: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
            // Image capsule horizontale en haute qualité
            capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
            // Header traditionnel en backup
            header: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
            // Screenshots en très haute résolution
            screenshots: [
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_1.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_2.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/ss_3.1920x1080.jpg`
            ],
            background: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/page_bg_generated_v6b.jpg`,
            hero: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
            appId: appId,
            isHighQuality: true,
            isCDNDirect: true,
            isVerticalFormat: true // Nouveau flag pour indiquer le format vertical
        };
    }

    /**
     * ✨ NOUVELLE MÉTHODE : Récupère des images haute qualité via APIs alternatives
     * Utilise SteamGridDB, RAWG ou IGDB pour des images de meilleure qualité
     * @param {string} gameName - Nom du jeu
     * @param {string} platform - Plateforme (steam, epic, gog)
     * @param {string} steamId - ID Steam optionnel
     * @returns {Promise<Object|null>} Objet contenant les URLs des images haute qualité
     */
    async getHighQualityImages(gameName, platform = null, steamId = null) {
        console.log(`🔍 Recherche d'images haute qualité pour: ${gameName} (${platform})`);
        
        try {
            // 1. Essayer SteamGridDB d'abord (meilleure qualité pour les jeux Steam)
            if (steamId || platform === 'steam') {
                const steamGridImages = await this.getSteamGridDBImages(gameName, steamId);
                if (steamGridImages && steamGridImages.isHighQuality) {
                    console.log(`✅ Images SteamGridDB trouvées pour: ${gameName}`);
                    return steamGridImages;
                }
            }

            // 2. Essayer RAWG API (excellente base de données avec images HD)
            const rawgImages = await this.getRAWGImages(gameName, platform);
            if (rawgImages && rawgImages.isHighQuality) {
                console.log(`✅ Images RAWG trouvées pour: ${gameName}`);
                return rawgImages;
            }

            // 3. Fallback sur les CDN améliorés
            if (steamId) {
                console.log(`📦 Utilisation des images Steam CDN améliorées pour: ${gameName}`);
                return this.getEnhancedSteamImages(steamId);
            }

            console.log(`❌ Aucune image haute qualité trouvée pour: ${gameName}`);
            return null;

        } catch (error) {
            console.warn(`Erreur API alternative pour ${gameName}:`, error.message);
            return null;
        }
    }    /**
     * Récupère les images depuis SteamGridDB (images communautaires haute qualité)
     * @param {string} gameName - Nom du jeu
     * @param {string} steamId - ID Steam optionnel
     * @returns {Promise<Object|null>} Images SteamGridDB
     */
    async getSteamGridDBImages(gameName, steamId = null) {
        // Vérifier si l'API est configurée
        if (!this.apiKeys.steamGridDB?.enabled || !this.apiKeys.steamGridDB?.apiKey) {
            console.log(`⚠️  SteamGridDB non configuré pour: ${gameName}`);
            return null;
        }

        try {
            let searchTerm = steamId;
            
            // Si pas d'ID Steam, chercher par nom
            if (!searchTerm) {
                searchTerm = await this.findSteamGameByName(gameName);
            }
            
            if (!searchTerm) {
                console.log(`❌ Aucun ID Steam trouvé pour SteamGridDB: ${gameName}`);
                return null;
            }

            // Construire l'URL avec les dimensions verticales préférées
            const dimensions = '600x900,342x482,460x215'; // Formats verticaux prioritaires
            const formats = 'png,jpg';
            const types = 'static';
            const gridUrl = `${this.steamGridDBUrl}/grids/steam/${searchTerm}?dimensions=${dimensions}&format=${formats}&types=${types}`;
            
            console.log(`🎨 Requête SteamGridDB: ${gridUrl}`);
            
            const response = await fetch(gridUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.steamGridDB.apiKey}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`SteamGridDB HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                // Privilégier les images verticales haute résolution
                const sortedImages = data.data.sort((a, b) => {
                    const aVertical = a.height > a.width;
                    const bVertical = b.height > b.width;
                    
                    if (aVertical && !bVertical) return -1;
                    if (!aVertical && bVertical) return 1;
                    
                    // Si même orientation, préférer la plus haute résolution
                    return (b.width * b.height) - (a.width * a.height);
                });

                const bestImage = sortedImages[0];
                const isVertical = bestImage.height > bestImage.width;
                const quality = this.calculateImageQuality(bestImage.width, bestImage.height, isVertical);

                return {
                    cover: bestImage.url,
                    library: bestImage.url,
                    capsule: bestImage.url,
                    screenshots: [bestImage.url],
                    source: 'SteamGridDB',
                    isHighQuality: quality === 'HAUTE',
                    isVertical: isVertical,
                    quality: quality,
                    metadata: {
                        width: bestImage.width,
                        height: bestImage.height,
                        format: bestImage.url.split('.').pop()?.toUpperCase(),
                        totalImages: data.data.length
                    }
                };
            }

            console.log(`❌ SteamGridDB n'a pas retourné d'images pour: ${gameName}`);
            return null;

        } catch (error) {
            console.warn(`❌ Erreur SteamGridDB pour ${gameName}:`, error.message);
            return null;
        }
    }
                console.log(`Pas d'ID Steam trouvé pour SteamGridDB: ${gameName}`);
                return null;
            }

            // Rechercher des grilles (images verticales) haute qualité
            const gridUrl = `${this.steamGridDBUrl}/grids/steam/${searchTerm}?dimensions=600x900,342x482,460x215&format=png,jpg&types=static`;
            
            console.log(`🎨 Requête SteamGridDB: ${gridUrl}`);
            
            const response = await fetch(gridUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`SteamGridDB HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.data && data.data.length > 0) {
                // Trier par qualité (résolution descendante)
                const sortedGrids = data.data.sort((a, b) => {
                    const aRes = a.width * a.height;
                    const bRes = b.width * b.height;
                    return bRes - aRes;
                });

                const bestGrid = sortedGrids[0];
                
                return {
                    cover: bestGrid.url,
                    library: bestGrid.url, // Format vertical principal
                    capsule: bestGrid.url,
                    header: bestGrid.url,
                    screenshots: [],
                    background: null,
                    hero: bestGrid.url,
                    appId: searchTerm,
                    isHighQuality: true,
                    isVerticalFormat: bestGrid.height > bestGrid.width,
                    source: 'SteamGridDB',
                    resolution: `${bestGrid.width}x${bestGrid.height}`,
                    quality: this.calculateImageQuality(bestGrid.width, bestGrid.height)
                };
            }

            console.log(`Aucune image SteamGridDB trouvée pour: ${gameName}`);
            return null;

        } catch (error) {
            console.warn(`Erreur SteamGridDB pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * Récupère les images depuis RAWG API (base de données complète avec images HD)
     * @param {string} gameName - Nom du jeu
     * @param {string} platform - Plateforme
     * @returns {Promise<Object|null>} Images RAWG
     */
    async getRAWGImages(gameName, platform = null) {
        try {
            const cleanName = encodeURIComponent(gameName.replace(/[^\w\s]/g, '').trim());
            const searchUrl = `${this.rawgUrl}/games?search=${cleanName}&search_precise=true&page_size=5`;
            
            console.log(`🎮 Requête RAWG: ${searchUrl}`);
            
            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`RAWG HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                // Chercher la meilleure correspondance
                let bestMatch = data.results[0];
                
                // Essayer de trouver une correspondance exacte par nom
                for (const game of data.results) {
                    if (game.name.toLowerCase().includes(gameName.toLowerCase()) || 
                        gameName.toLowerCase().includes(game.name.toLowerCase())) {
                        bestMatch = game;
                        break;
                    }
                }

                if (bestMatch.background_image) {
                    // Créer une version verticale à partir de l'image de fond
                    const verticalImage = this.createVerticalFromImage(bestMatch.background_image, gameName);
                    
                    return {
                        cover: bestMatch.background_image,
                        library: verticalImage,
                        capsule: bestMatch.background_image,
                        header: bestMatch.background_image,
                        screenshots: bestMatch.short_screenshots ? 
                            bestMatch.short_screenshots.slice(0, 5).map(shot => shot.image) : [],
                        background: bestMatch.background_image,
                        hero: bestMatch.background_image,
                        gameId: bestMatch.id,
                        isHighQuality: true,
                        isVerticalFormat: false,
                        source: 'RAWG',
                        rating: bestMatch.rating,
                        releaseDate: bestMatch.released
                    };
                }
            }

            console.log(`Aucune image RAWG trouvée pour: ${gameName}`);
            return null;

        } catch (error) {
            console.warn(`Erreur RAWG pour ${gameName}:`, error.message);
            return null;
        }
    }

    /**
     * Améliore les images Steam CDN avec des formats alternatifs haute qualité
     * @param {string} steamId - ID Steam
     * @returns {Object} Images Steam améliorées
     */
    getEnhancedSteamImages(steamId) {
        if (!steamId) return null;
        
        return {
            // Essayer plusieurs formats d'images Steam haute qualité
            cover: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900.jpg`,
            library: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900.jpg`,
            
            // Alternatives haute qualité
            capsule: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/capsule_616x353.jpg`,
            header: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/header.jpg`,
            
            // Images alternatives Steam moins connues mais haute qualité
            portrait: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/portrait.png`,
            logo: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/logo.png`,
            
            // Screenshots haute résolution
            screenshots: [
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_1.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_2.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_3.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_4.1920x1080.jpg`,
                `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/ss_5.1920x1080.jpg`
            ],
            
            background: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/page_bg_generated_v6b.jpg`,
            hero: `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_hero.jpg`,
            
            appId: steamId,
            isHighQuality: true,
            isCDNDirect: true,
            isVerticalFormat: true,
            source: 'Steam CDN Enhanced'
        };
    }

    /**
     * Crée une image verticale stylisée à partir d'une image horizontale
     * @param {string} originalImageUrl - URL de l'image originale
     * @param {string} gameName - Nom du jeu
     * @returns {string} Data URL de l'image verticale générée
     */
    createVerticalFromImage(originalImageUrl, gameName) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
                <defs>
                    <pattern id="bgImg" patternUnits="userSpaceOnUse" width="300" height="400">
                        <image href="${originalImageUrl}" x="0" y="0" width="300" height="400" preserveAspectRatio="xMidYMid slice"/>
                    </pattern>
                    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
                        <stop offset="100%" style="stop-color:rgba(0,0,0,0.7);stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="300" height="400" fill="url(#bgImg)"/>
                <rect width="300" height="400" fill="url(#overlay)"/>
                <rect x="20" y="320" width="260" height="60" fill="rgba(0,0,0,0.8)" rx="8"/>
                <text x="150" y="345" text-anchor="middle" fill="white" font-size="14" font-family="Arial, sans-serif" font-weight="bold">${this.truncateText(gameName, 25)}</text>
                <text x="150" y="365" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="10" font-family="Arial, sans-serif">HAUTE QUALITÉ</text>
            </svg>
        `;
        
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    /**
     * Calcule un score de qualité d'image basé sur la résolution
     * @param {number} width - Largeur de l'image
     * @param {number} height - Hauteur de l'image
     * @returns {string} Score de qualité (Low, Medium, High, Ultra)
     */
    calculateImageQuality(width, height) {
        const totalPixels = width * height;
        
        if (totalPixels >= 1920 * 1080) return 'Ultra';
        if (totalPixels >= 1280 * 720) return 'High';
        if (totalPixels >= 640 * 480) return 'Medium';
        return 'Low';
    }

    /**
     * Trouve l'App ID Steam d'un jeu par son nom
     * @param {string} gameName - Nom du jeu
     * @returns {Promise<string|null>} App ID Steam
     */
    async findSteamGameByName(gameName) {
        try {
            // D'abord chercher dans la base de données locale
            const localId = this.findInPopularGames(gameName);
            if (localId) {
                console.log(`App ID trouvé localement pour ${gameName}: ${localId}`);
                return localId;
            }
            
            // Essayer avec SteamSpy
            const searchUrl = `${this.steamSpyUrl}?request=search&q=${encodeURIComponent(gameName)}`;
            const proxyUrl = `${this.corsProxy}${encodeURIComponent(searchUrl)}`;
            
            console.log(`Recherche Steam via: ${searchUrl}`);
            const response = await fetch(proxyUrl);
            
            if (response.ok) {
                const proxyData = await response.json();
                
                // Format différent selon le proxy
                let data;
                if (this.corsProxy.includes('allorigins')) {
                    data = JSON.parse(proxyData.contents);
                } else {
                    data = proxyData;
                }
                
                if (data && Object.keys(data).length > 0) {
                    const firstKey = Object.keys(data)[0];
                    console.log(`App ID trouvé via SteamSpy pour ${gameName}: ${firstKey}`);
                    return firstKey;
                }
            } else {
                console.warn(`Réponse SteamSpy non OK: ${response.status}`);
            }

            return null;

        } catch (error) {
            console.warn('Erreur recherche Steam:', error.message);
            return this.findInPopularGames(gameName);
        }
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
    }    /**
     * Obtient les images de bibliothèque Steam (format vertical)
     * @param {string} appId - App ID Steam
     * @returns {string} URL de l'image
     */
    getSteamLibraryImage(appId) {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
    }

    /**
     * Obtient l'image de header Steam
     * @param {string} appId - App ID Steam
     * @returns {string} URL de l'image
     */
    getSteamHeaderImage(appId) {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    }
    
    /**
     * Obtient l'image capsule Steam (plus grande)
     * @param {string} appId - App ID Steam
     * @returns {string} URL de l'image
     */
    getSteamCapsuleImage(appId) {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
    }
    
    /**
     * Obtient l'image de fond Steam
     * @param {string} appId - App ID Steam
     * @returns {string} URL de l'image
     */
    getSteamBackgroundImage(appId) {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/page_bg_generated_v6b.jpg`;
    }
    
    /**
     * Obtient l'image hero Steam (pour bannières)
     * @param {string} appId - App ID Steam
     * @returns {string} URL de l'image
     */
    getSteamHeroImage(appId) {
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;
    }

    /**
     * Images génériques pour plateformes non-Steam
     * @param {string} gameName - Nom du jeu
     * @param {string} platform - Plateforme
     * @returns {Promise<Object>} Objet contenant les URLs des images
     */
    async getGenericGameImage(gameName, platform) {
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

module.exports = SteamImageService;