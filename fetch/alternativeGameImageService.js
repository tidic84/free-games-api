/**
 * Service alternatif pour récupérer des images de jeux de qualité
 * Utilise plusieurs APIs gratuites et fiables comme alternatives à RAWG
 */

class AlternativeGameImageService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 heures
        
        // Configuration des APIs alternatives
        this.apis = {
            // IGDB (Internet Game Database) - Gratuit avec inscription
            igdb: {
                enabled: false, // À activer après configuration
                clientId: 'YOUR_TWITCH_CLIENT_ID',
                accessToken: 'YOUR_TWITCH_ACCESS_TOKEN',
                baseUrl: 'https://api.igdb.com/v4'
            },
            
            // SteamGridDB - Gratuit pour usage personnel
            steamgrid: {
                enabled: false, // À activer après configuration
                apiKey: 'YOUR_STEAMGRID_API_KEY',
                baseUrl: 'https://www.steamgriddb.com/api/v2'
            },
            
            // Recherche via moteurs de recherche (sans clé API)
            search: {
                enabled: true,
                engines: ['duck', 'bing'] // DuckDuckGo et Bing
            }
        };
    }

    /**
     * Recherche des images pour un jeu donné
     */
    async getGameImages(gameName, platform = null) {
        try {
            const cleanGameName = this.cleanGameName(gameName);
            const cacheKey = `${cleanGameName}-${platform}`;
            
            // Vérifier le cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }

            let images = null;

            // Essayer IGDB d'abord (meilleure qualité)
            if (this.apis.igdb.enabled) {
                images = await this.getImagesFromIGDB(cleanGameName);
            }

            // Fallback: SteamGridDB
            if (!images && this.apis.steamgrid.enabled) {
                images = await this.getImagesFromSteamGrid(cleanGameName);
            }

            // Fallback: Images générées procéduralement
            if (!images) {
                images = await this.generateProceduralImages(gameName, platform);
            }

            // Mettre en cache
            if (images) {
                this.cache.set(cacheKey, {
                    data: images,
                    timestamp: Date.now()
                });
            }

            return images || this.getDefaultImages(platform);

        } catch (error) {
            console.warn(`Erreur lors de la récupération des images pour ${gameName}:`, error);
            return this.getDefaultImages(platform);
        }
    }

    /**
     * Récupère des images depuis IGDB (Internet Game Database)
     * API gratuite de Twitch, très complète
     */
    async getImagesFromIGDB(gameName) {
        if (!this.apis.igdb.enabled) return null;

        try {
            const searchUrl = `${this.apis.igdb.baseUrl}/games`;
            const body = `search "${gameName}"; fields name, cover.image_id, screenshots.image_id; limit 5;`;

            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Client-ID': this.apis.igdb.clientId,
                    'Authorization': `Bearer ${this.apis.igdb.accessToken}`,
                    'Content-Type': 'text/plain'
                },
                body: body
            });

            if (!response.ok) return null;

            const games = await response.json();
            if (!games.length) return null;

            const game = games[0];
            const images = {
                cover: null,
                screenshots: []
            };

            // Image de couverture
            if (game.cover?.image_id) {
                images.cover = `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`;
            }

            // Screenshots
            if (game.screenshots?.length) {
                images.screenshots = game.screenshots
                    .slice(0, 4)
                    .map(screenshot => `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${screenshot.image_id}.jpg`);
            }

            return images.cover ? images : null;

        } catch (error) {
            console.warn('Erreur IGDB:', error);
            return null;
        }
    }

    /**
     * Récupère des images depuis SteamGridDB
     * Spécialisé dans les artworks de jeux
     */
    async getImagesFromSteamGrid(gameName) {
        if (!this.apis.steamgrid.enabled) return null;

        try {
            // Rechercher le jeu
            const searchUrl = `${this.apis.steamgrid.baseUrl}/search/autocomplete/${encodeURIComponent(gameName)}`;
            
            const response = await fetch(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apis.steamgrid.apiKey}`
                }
            });

            if (!response.ok) return null;

            const searchResults = await response.json();
            if (!searchResults.data?.length) return null;

            const gameId = searchResults.data[0].id;

            // Récupérer les grilles (covers)
            const gridsUrl = `${this.apis.steamgrid.baseUrl}/grids/game/${gameId}?dimensions=600x900`;
            
            const gridsResponse = await fetch(gridsUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apis.steamgrid.apiKey}`
                }
            });

            if (!gridsResponse.ok) return null;

            const gridsData = await gridsResponse.json();
            
            if (gridsData.data?.length) {
                return {
                    cover: gridsData.data[0].url,
                    screenshots: []
                };
            }

            return null;

        } catch (error) {
            console.warn('Erreur SteamGridDB:', error);
            return null;
        }
    }

    /**
     * Génère des images procédurales de haute qualité
     * Solution de fallback qui créé des visuels attractifs
     */
    async generateProceduralImages(gameName, platform) {
        const colors = this.generateGameColors(gameName);
        const style = this.determineGameStyle(gameName);
        
        return {
            cover: this.generateModernCover(gameName, platform, colors, style),
            screenshots: []
        };
    }

    /**
     * Génère des couleurs basées sur le nom du jeu
     */
    generateGameColors(gameName) {
        // Hash simple du nom pour générer des couleurs cohérentes
        let hash = 0;
        for (let i = 0; i < gameName.length; i++) {
            hash = ((hash << 5) - hash + gameName.charCodeAt(i)) & 0xffffffff;
        }

        const hue1 = Math.abs(hash) % 360;
        const hue2 = (hue1 + 30) % 360;
        
        return {
            primary: `hsl(${hue1}, 70%, 50%)`,
            secondary: `hsl(${hue2}, 80%, 60%)`,
            accent: `hsl(${(hue1 + 180) % 360}, 60%, 70%)`
        };
    }

    /**
     * Détermine le style visuel basé sur le nom du jeu
     */
    determineGameStyle(gameName) {
        const name = gameName.toLowerCase();
        
        if (name.includes('war') || name.includes('battle') || name.includes('combat')) {
            return 'action';
        } else if (name.includes('farm') || name.includes('sim') || name.includes('city')) {
            return 'simulation';
        } else if (name.includes('quest') || name.includes('adventure') || name.includes('legend')) {
            return 'adventure';
        } else if (name.includes('race') || name.includes('speed') || name.includes('car')) {
            return 'racing';
        } else if (name.includes('puzzle') || name.includes('match') || name.includes('brain')) {
            return 'puzzle';
        }
        
        return 'generic';
    }

    /**
     * Génère une image de couverture moderne et attractive
     */
    generateModernCover(gameName, platform, colors, style) {
        const width = 300;
        const height = 400;
        
        // Icônes et patterns selon le style
        const styleElements = {
            action: { icon: '⚔️', pattern: 'diagonal-lines' },
            simulation: { icon: '🏗️', pattern: 'grid' },
            adventure: { icon: '🗺️', pattern: 'circles' },
            racing: { icon: '🏎️', pattern: 'speed-lines' },
            puzzle: { icon: '🧩', pattern: 'hexagons' },
            generic: { icon: '🎮', pattern: 'dots' }
        };

        const element = styleElements[style] || styleElements.generic;
        
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <defs>
                    <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:0.9" />
                        <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.8" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    ${this.generatePatternDef(element.pattern, colors.accent)}
                </defs>
                
                <!-- Background -->
                <rect width="100%" height="100%" fill="url(#mainGrad)"/>
                
                <!-- Pattern overlay -->
                <rect width="100%" height="100%" fill="url(#pattern)" opacity="0.1"/>
                
                <!-- Main icon -->
                <circle cx="150" cy="150" r="60" fill="rgba(255,255,255,0.1)" filter="url(#glow)"/>
                <text x="150" y="165" text-anchor="middle" font-size="40" fill="white">${element.icon}</text>
                
                <!-- Game title area -->
                <rect x="20" y="250" width="260" height="120" fill="rgba(0,0,0,0.3)" rx="15"/>
                
                <!-- Game title -->
                <text x="150" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="16">
                    ${this.truncateTitle(gameName, 20)}
                </text>
                
                <!-- Platform badge -->
                <rect x="20" y="320" width="80" height="25" fill="rgba(255,255,255,0.2)" rx="12"/>
                <text x="60" y="337" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
                    ${(platform || 'PC').toUpperCase()}
                </text>
                
                <!-- Decorative elements -->
                <circle cx="250" cy="50" r="15" fill="rgba(255,255,255,0.1)"/>
                <circle cx="50" cy="350" r="10" fill="rgba(255,255,255,0.1)"/>
                <rect x="220" y="320" width="60" height="4" fill="${colors.accent}" rx="2" opacity="0.7"/>
            </svg>
        `;

        return 'data:image/svg+xml;base64,' + btoa(svg);
    }

    /**
     * Génère des définitions de motifs SVG
     */
    generatePatternDef(patternType, color) {
        const patterns = {
            'diagonal-lines': `
                <pattern id="pattern" patternUnits="userSpaceOnUse" width="20" height="20">
                    <path d="M0,20 L20,0" stroke="${color}" stroke-width="1"/>
                </pattern>
            `,
            'grid': `
                <pattern id="pattern" patternUnits="userSpaceOnUse" width="30" height="30">
                    <path d="M30,0 L0,0 L0,30" fill="none" stroke="${color}" stroke-width="1"/>
                </pattern>
            `,
            'circles': `
                <pattern id="pattern" patternUnits="userSpaceOnUse" width="40" height="40">
                    <circle cx="20" cy="20" r="8" fill="none" stroke="${color}" stroke-width="1"/>
                </pattern>
            `,
            'speed-lines': `
                <pattern id="pattern" patternUnits="userSpaceOnUse" width="60" height="20">
                    <path d="M0,10 L40,10" stroke="${color}" stroke-width="2"/>
                    <path d="M10,5 L50,5" stroke="${color}" stroke-width="1"/>
                    <path d="M5,15 L45,15" stroke="${color}" stroke-width="1"/>
                </pattern>
            `,
            'hexagons': `
                <pattern id="pattern" patternUnits="userSpaceOnUse" width="35" height="30">
                    <polygon points="17.5,5 26.25,12.5 26.25,22.5 17.5,30 8.75,22.5 8.75,12.5" 
                             fill="none" stroke="${color}" stroke-width="1"/>
                </pattern>
            `,
            'dots': `
                <pattern id="pattern" patternUnits="userSpaceOnUse" width="25" height="25">
                    <circle cx="12.5" cy="12.5" r="2" fill="${color}"/>
                </pattern>
            `
        };

        return patterns[patternType] || patterns.dots;
    }

    /**
     * Tronque le titre pour l'affichage
     */
    truncateTitle(title, maxLength) {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    }

    /**
     * Nettoie le nom du jeu pour la recherche
     */
    cleanGameName(gameName) {
        return gameName
            .toLowerCase()
            .replace(/[™®©]/g, '')
            .replace(/\s+(edition|remastered|enhanced|definitive|complete|deluxe|premium|gold|ultimate)$/i, '')
            .replace(/[:\-–—]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Images par défaut selon la plateforme
     */
    getDefaultImages(platform) {
        const defaultImage = this.generatePlatformImage(platform);
        return {
            cover: defaultImage,
            screenshots: []
        };
    }

    /**
     * Génère une image par défaut pour une plateforme
     */
    generatePlatformImage(platform) {
        const platformConfig = {
            epic: { 
                color: '#000000', 
                secondary: '#2563eb',
                name: 'EPIC GAMES',
                icon: '🛒'
            },
            steam: { 
                color: '#1b2838', 
                secondary: '#66c0f4',
                name: 'STEAM',
                icon: '🎮'
            },
            gog: { 
                color: '#86328a', 
                secondary: '#b91c8c',
                name: 'GOG',
                icon: '💿'
            }
        };

        const config = platformConfig[platform] || platformConfig.epic;
        
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
                <defs>
                    <linearGradient id="platformGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${config.color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${config.secondary};stop-opacity:0.8" />
                    </linearGradient>
                </defs>
                <rect width="300" height="400" fill="url(#platformGrad)"/>
                <circle cx="150" cy="150" r="50" fill="rgba(255,255,255,0.1)"/>
                <text x="150" y="165" text-anchor="middle" fill="white" font-size="30">${config.icon}</text>
                <rect x="50" y="250" width="200" height="60" fill="rgba(255,255,255,0.1)" rx="10"/>
                <text x="150" y="285" text-anchor="middle" fill="white" font-size="18" font-family="Arial, sans-serif" font-weight="bold">${config.name}</text>
            </svg>
        `;

        return 'data:image/svg+xml;base64,' + btoa(svg);
    }
}

module.exports = AlternativeGameImageService;
