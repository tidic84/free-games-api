/**
 * Service unifié pour la gestion d'images de jeux
 * Intègre le SteamImageService et gère toutes les plateformes
 */

const SteamImageService = require('./steamImageService');
const { createCanvas } = require('canvas');

class GameImageService {
    constructor() {
        this.steamService = new SteamImageService();
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 heures
        console.log('🎨 Service d\'images de jeu initialisé avec SteamImageService avancé');
    }    /**
     * Récupère la meilleure image pour un jeu selon sa plateforme
     * @param {Object} gameData - Données du jeu (game, platform, gameId, etc.)
     * @returns {Promise<string>} - URL de l'image optimisée
     */
    async getOptimizedGameImage(gameData) {
        try {
            const { game, platform, gameId, image } = gameData;
            
            console.log(`🔍 Recherche d'image optimisée pour: ${game} (${platform})`);

            switch (platform) {
                case 'steam':
                    return await this.getSteamOptimizedImage(game, gameId, image);
                    
                case 'epic':
                    return await this.getEpicOptimizedImage(game, gameData);
                    
                case 'gog':
                    return await this.getGOGOptimizedImage(game, gameData);
                    
                default:
                    console.log(`⚠️  Plateforme inconnue: ${platform}, fallback vers image originale`);
                    return image || await this.getGenericImage(game, platform);
            }

        } catch (error) {
            console.warn(`❌ Erreur récupération image pour ${gameData.game}:`, error.message);
            return gameData.image || await this.getGenericImage(gameData.game, gameData.platform);
        }
    }

    /**
     * Récupère une image Steam optimisée via le SteamImageService
     */
    async getSteamOptimizedImage(gameName, gameId, fallbackImage) {
        try {
            // Utiliser le service Steam avancé
            const imageData = await this.steamService.getGameImages(gameName, 'steam', gameId);
            
            if (imageData && imageData.cover) {
                console.log(`✅ Image Steam HD trouvée: ${imageData.source} (${imageData.quality})`);
                return imageData.cover;
            }

            // Fallback vers l'image originale
            console.log(`🔄 Fallback vers image Steam standard pour: ${gameName}`);
            return fallbackImage || `https://cdn.akamai.steamstatic.com/steam/apps/${gameId}/library_600x900.jpg`;

        } catch (error) {
            console.warn(`Erreur Steam image service pour ${gameName}:`, error.message);
            return fallbackImage;
        }
    }

    /**
     * Optimise les images Epic Games (priorise les formats verticaux)
     */
    async getEpicOptimizedImage(gameName, gameData) {
        if (!gameData.image) {
            return await this.getGenericImage(gameName, 'epic');
        }

        // Epic utilise déjà de bonnes images, mais on peut les optimiser
        let imageUrl = gameData.image;

        // Essayer de convertir vers un format vertical si possible
        if (imageUrl.includes('Epic Games Store')) {
            // Tenter de remplacer par une version verticale
            imageUrl = imageUrl.replace(/\/\w+\.jpg/, '/Thumbnail.jpg');
        }

        console.log(`✅ Image Epic optimisée: ${gameName}`);
        return imageUrl;
    }

    /**
     * Optimise les images GOG
     */
    async getGOGOptimizedImage(gameName, gameData) {
        if (!gameData.image) {
            return await this.getGenericImage(gameName, 'gog');
        }

        // GOG a généralement de bonnes images, privilégier les couvertures verticales
        let imageUrl = gameData.image;
        
        // Si c'est une image horizontale, essayer de trouver la verticale
        if (imageUrl.includes('_glx_')) {
            imageUrl = imageUrl.replace('_glx_', '_392x500_');
        }

        console.log(`✅ Image GOG optimisée: ${gameName}`);
        return imageUrl;
    }

    /**
     * Génère une image générique pour les jeux sans image
     */
    async getGenericImage(gameName) {
        try {
            // Nettoyer le nom du jeu des caractères spéciaux
            const cleanGameName = gameName
                .replace(/[™®©]/g, '') // Supprimer les symboles de marque
                .replace(/[^\w\s-]/g, '') // Supprimer tous les caractères spéciaux sauf lettres, chiffres, espaces et tirets
                .trim(); // Supprimer les espaces en début/fin
            
            const canvas = createCanvas(460, 215);
            const ctx = canvas.getContext('2d');
            
            // Dégradé de couleur en fonction de la plateforme
            const gradient = ctx.createLinearGradient(0, 0, 0, 215);
            gradient.addColorStop(0, '#1b2838');
            gradient.addColorStop(1, '#748b9a');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 460, 215);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Utiliser le nom nettoyé pour l'affichage
            const lines = this.wrapText(ctx, cleanGameName, 420);
            
            // Dessiner le texte en plusieurs lignes si nécessaire
            lines.forEach((line, index) => {
                ctx.fillText(line, 230, 107 + index * 30);
            });
            
            return canvas.toDataURL().replace(/^data:image\/png;base64,/, '');
        } catch (error) {
            console.error('Erreur génération image générique:', error.message);
            throw error;
        }
    }

    /**
     * Découpe le texte en plusieurs lignes selon la largeur
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    /**
     * Crée un SVG de fallback simple
     */
    createFallbackSVG(gameName, platform) {
        const colors = {
            epic: '#0078f2',
            gog: '#9f46ba', 
            steam: '#1b2838'
        };
        
        const color = colors[platform] || '#666666';
        
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
                <rect width="600" height="900" fill="${color}"/>
                <text x="300" y="450" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">
                    ${gameName || 'Jeu'}
                </text>
                <text x="300" y="500" text-anchor="middle" fill="white" font-family="Arial" font-size="16" opacity="0.8">
                    ${(platform || 'GAME').toUpperCase()}
                </text>
            </svg>
        `;
    }

    /**
     * Traite un batch de jeux pour optimiser leurs images
     * @param {Array} games - Tableau de jeux
     * @returns {Promise<Array>} - Jeux avec images optimisées
     */
    async optimizeGameImages(games) {
        if (!Array.isArray(games) || games.length === 0) {
            return games;
        }

        console.log(`🎨 Optimisation des images pour ${games.length} jeux...`);
        const startTime = Date.now();

        // Traiter les jeux par batch pour éviter la surcharge
        const batchSize = 5;
        const optimizedGames = [];

        for (let i = 0; i < games.length; i += batchSize) {
            const batch = games.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (game) => {
                const optimizedImage = await this.getOptimizedGameImage(game);
                return {
                    ...game,
                    image: optimizedImage,
                    imageOptimized: true
                };
            });

            const batchResults = await Promise.all(batchPromises);
            optimizedGames.push(...batchResults);

            // Petite pause entre les batches
            if (i + batchSize < games.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const endTime = Date.now();
        console.log(`✅ Images optimisées en ${endTime - startTime}ms pour ${optimizedGames.length} jeux`);        return optimizedGames;
    }

    /**
     * Nettoie le cache du service Steam
     */
    clearCache() {
        this.steamService.clearCache();
        this.cache.clear();
        console.log('🧹 Cache des images nettoyé');
    }

    /**
     * Statistiques du service
     */
    getStats() {
        return {
            steamCacheStats: this.steamService.getCacheStats(),
            localCacheSize: this.cache.size,
            serviceStatus: 'Actif'
        };
    }

    /**
     * Méthode de compatibilité avec l'ancienne API
     * @deprecated Utiliser optimizeGameImages() à la place
     */
    async getGameImages(gameName, platform = null) {
        console.warn('⚠️  getGameImages() est déprécié, utilisez optimizeGameImages() pour traiter un batch');
        const gameData = { game: gameName, platform, gameId: null, image: null };
        const optimizedImage = await this.getOptimizedGameImage(gameData);
        
        return {
            cover: optimizedImage,
            verticalCover: optimizedImage,
            screenshots: [optimizedImage],
            background: optimizedImage
        };
    }
}

module.exports = GameImageService;
