// Système unifié pour récupérer tous les jeux avec structure de prix standardisée

const { EpicFreeGames } = require('epic-free-games');
const epicFreeGames = new EpicFreeGames({ country: 'FR', locale: 'fr', includeAll: true });
var egsCrawler = require('epic-games-store-crawler');
var crawler = egsCrawler.Crawler;
const STEAM_API_KEY = '79F267CAA9E32FC09113E65B6D76DD4A';
const cheerio = require('cheerio');

let fetch;
try {
  fetch = require('node-fetch');
  if (fetch.default) fetch = fetch.default;
} catch (e) {
  fetch = global.fetch;
}

/**
 * Structure unifiée pour tous les jeux :
 * {
 *   game: string,
 *   platform: 'epic'|'steam'|'gog',
 *   gameId: string,
 *   discountPrice: number (en euros),
 *   originalPrice: number (en euros),
 *   discountPercent: number (0-100),
 *   url: string,
 *   image: string
 * }
 */

async function fetchEpicGames(games, minDiscount = 0) {
    console.log(`🎮 Epic Games: recherche discount >= ${minDiscount}%`);
    
    try {
        // 1. D'abord récupérer les jeux gratuits via Epic Free Games
        console.log('📥 Tentative Epic Free Games API...');
        await epicFreeGames.getGames().then(res => {
            console.log('Epic Free Games réponse:', res);
            
            if (res && res.currentGames && Array.isArray(res.currentGames)) {
                console.log(`Epic Free Games: ${res.currentGames.length} jeux trouvés`);
                
                for (const g of res.currentGames) {
                    console.log(`Epic analyse: ${g.title}`);
                    console.log('Prix structure:', JSON.stringify(g.price, null, 2));
                    
                    const finalPrice = g.price?.totalPrice?.discountPrice || 0;
                    const originalPrice = g.price?.totalPrice?.originalPrice || 0;
                    
                    console.log(`Prix: final=${finalPrice}, original=${originalPrice}`);
                    
                    if (finalPrice === 0) {
                        const discount = 100;
                        const effectiveBasePrice = originalPrice > 0 ? originalPrice : 2999;
                        
                        if (discount >= minDiscount) {
                            games.push({
                                game: g.title,
                                platform: "epic",
                                gameId: g.id,
                                discountPrice: 0,
                                originalPrice: effectiveBasePrice / 100,
                                discountPercent: discount,
                                url: g.productSlug ? `https://store.epicgames.com/fr/p/${g.productSlug}` : undefined,
                                image: g.keyImages && g.keyImages.length > 0 ? g.keyImages[0].url : undefined
                            });
                            console.log(`✅ Epic gratuit ajouté: ${g.title} (${discount}%)`);
                        }
                    }
                }
            } else {
                console.log('❌ Epic Free Games: structure de réponse inattendue');
            }
        }).catch(error => {
            console.error('❌ Epic Free Games API erreur:', error.message);
        });

        // 2. CORRECTION MAJEURE : Récupérer TOUTES les promotions via le crawler
        console.log('📥 Tentative Epic Crawler pour toutes les promotions...');
        const gamesList = await crawler.getItems({
            allowCountries: 'FR',
            country: 'FR',
            locale: 'fr',
            count: 1000, // Augmenter pour capturer plus de jeux
            category: 'games/edition/base|bundle/games|editors',
        });

        console.log('Epic Crawler réponse:', gamesList ? 'OK' : 'ERREUR');

        if (gamesList && gamesList.Catalog && gamesList.Catalog.searchStore && Array.isArray(gamesList.Catalog.searchStore.elements)) {
            console.log(`Epic Crawler: ${gamesList.Catalog.searchStore.elements.length} éléments trouvés`);
            
            for (const el of gamesList.Catalog.searchStore.elements) {
                if (el.title === "Mystery Game") continue;
                
                console.log(`Epic Crawler analyse: ${el.title}`);
                console.log('Prix structure:', JSON.stringify(el.price, null, 2));
                
                const basePrice = el.price?.totalPrice?.originalPrice || 0;
                const currentPrice = el.price?.totalPrice?.discountPrice || 0;
                
                // CORRECTION : Ignorer les jeux avec prix originalPrice = 0 (jeux F2P ou sans prix valide)
                if (basePrice === 0) {
                    console.log(`⚠️ Epic ignoré (prix original = 0): ${el.title}`);
                    continue;
                }
                
                // CORRECTION : Calculer la réduction correctement
                let discountPercent = 0;
                if (basePrice > 0) {
                    if (currentPrice === 0) {
                        discountPercent = 100; // Gratuit
                    } else {
                        discountPercent = Math.round(100 - (currentPrice / basePrice) * 100);
                    }
                }
                
                console.log(`Prix: base=${basePrice}, current=${currentPrice}, discount=${discountPercent}%`);
                
                // CORRECTION : S'assurer qu'il y a vraiment une promotion
                if (discountPercent <= 0) {
                    console.log(`⚠️ Epic ignoré (pas de réduction): ${el.title}`);
                    continue;
                }
                
                // Éviter les doublons avec les jeux gratuits déjà ajoutés
                const isAlreadyAdded = games.some(g => g.platform === 'epic' && g.gameId === el.id);
                
                // CORRECTION : Inclure TOUTES les promotions >= minDiscount avec prix valides
                if (!isAlreadyAdded && discountPercent >= minDiscount && basePrice > 0) {
                    games.push({
                        game: el.title,
                        platform: "epic",
                        gameId: el.id,
                        discountPrice: currentPrice / 100,
                        originalPrice: basePrice / 100,
                        discountPercent: discountPercent,
                        url: el.productSlug ? `https://store.epicgames.com/fr/p/${el.productSlug}` : undefined,
                        image: el.keyImages && el.keyImages.length > 0 ? el.keyImages[0].url : undefined
                    });
                    console.log(`✅ Epic promo ajouté: ${el.title} (-${discountPercent}%) - ${(currentPrice/100).toFixed(2)}€ au lieu de ${(basePrice/100).toFixed(2)}€`);
                } else if (!isAlreadyAdded && discountPercent > 0) {
                    console.log(`⚠️ Epic promo ignoré (< ${minDiscount}%): ${el.title} (-${discountPercent}%)`);
                }
            }
        } else {
            console.log('❌ Epic Crawler: structure de réponse inattendue');
        }
        
        const epicGamesCount = games.filter(g => g.platform === 'epic').length;
        console.log(`📊 Epic Games total: ${epicGamesCount} jeux ajoutés`);
        
    } catch (e) {
        console.error('❌ Erreur Epic Games complète:', e.message);
        console.error('Stack:', e.stack);
    }
}

async function fetchSteamGames(games, minDiscount = 0) {
    console.log(`🎮 Steam: recherche discount >= ${minDiscount}%`);
    
    try {
        // 1. API officielle Steam pour les promotions
        const res = await fetch("https://store.steampowered.com/api/featuredcategories", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9'
            }
        });
        const steamData = await res.json();
        
        if (steamData["specials"] && steamData["specials"]["items"]) {
            for (const item of steamData["specials"]["items"]) {
                const discountPercent = item["discount_percent"] || 0;
                let currentPrice = item["final_price"] || 0;
                let basePrice = item["original_price"] || 0;
                if (currentPrice > 0 && basePrice > 0) {
                    currentPrice = currentPrice / 100;
                    basePrice = basePrice / 100;
                    if (currentPrice > 200 || basePrice > 200) {
                        currentPrice = currentPrice / 100;
                        basePrice = basePrice / 100;
                    }
                }
                if (discountPercent >= minDiscount) {
                    // Toujours fournir une image verticale de qualité
                    const appId = String(item["id"]);
                    games.push({
                        game: String(item["name"]),
                        platform: "steam",
                        gameId: appId,
                        discountPrice: currentPrice,
                        originalPrice: basePrice,
                        discountPercent: discountPercent,
                        url: `https://store.steampowered.com/app/${appId}`,
                        image: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
                    });
                    console.log(`✅ Steam: ${item["name"]} (-${discountPercent}%) - ${currentPrice.toFixed(2)}€ au lieu de ${basePrice.toFixed(2)}€`);
                }
            }
        }
        // 2. Les jeux F2P Steam sont exclus
        console.log('ℹ️  Les jeux F2P Steam sont exclus (gratuits de base, pas en promotion)');
        // 3. Recherche de promotions spéciales Steam via l'API officielle UNIQUEMENT (pas de .json() sur search/results)
        // (On ne traite plus les URLs search/results qui ne retournent pas du JSON)
    } catch (e) {
        console.error('❌ Erreur Steam:', e.message);
    }
}

async function fetchGOGGames(games, minDiscount = 0) {
    console.log(`🎮 GOG: recherche discount >= ${minDiscount}%`);
    
    try {
        const res = await fetch('https://catalog.gog.com/v1/catalog?limit=100&order=desc:trending&productType=in:game,pack', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (res.ok) {
            const json = await res.json();
            
            if (json.products && Array.isArray(json.products)) {
                console.log(`GOG Catalog: ${json.products.length} produits analysés`);
                
                let addedGames = 0;
                for (const product of json.products) {
                    if (addedGames >= 50) break; // Limite raisonnable
                    
                    if (product.price && product.price.finalMoney && product.price.baseMoney) {
                        // CORRECTION: Utiliser directement les valeurs en euros, pas en centimes
                        const originalPrice = parseFloat(product.price.baseMoney.amount);
                        const currentPrice = parseFloat(product.price.finalMoney.amount);
                        
                        if (originalPrice > 0 && currentPrice < originalPrice) {
                            const discountPercent = Math.round(100 - (currentPrice / originalPrice) * 100);
                            
                            if (discountPercent >= minDiscount && discountPercent > 0) {
                                const imageUrl = product.coverVertical || product.coverHorizontal || product.screenshots?.[0];
                                
                                games.push({
                                    game: product.title,
                                    platform: "gog",
                                    gameId: product.slug || product.id,
                                    // CORRECTION: Utiliser la nomenclature standard
                                    discountPrice: currentPrice, // Prix actuel en euros
                                    originalPrice: originalPrice, // Prix original en euros
                                    discountPercent: discountPercent,
                                    url: `https://www.gog.com/fr/game/${product.slug}`,
                                    image: imageUrl
                                });
                                
                                console.log(`✅ GOG: ${product.title} (-${discountPercent}%) - ${currentPrice.toFixed(2)}€ au lieu de ${originalPrice.toFixed(2)}€`);
                                addedGames++;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('❌ Erreur GOG:', e.message);
    }
}

/**
 * Fonction principale unifiée
 * @param {number} minDiscount - Pourcentage minimum de réduction (0-100)
 * @param {string[]} platforms - Plateformes à inclure ['epic', 'steam', 'gog']
 * @returns {Promise<Array>} Liste des jeux avec structure unifiée
 */
async function getGames(minDiscount = 0, platforms = ['epic', 'steam', 'gog']) {
    console.log(`🔍 Recherche jeux avec discount >= ${minDiscount}% sur: ${platforms.join(', ')}`);
    
    const games = [];
    
    // Récupération en parallèle pour optimiser les performances
    const promises = [];
    
    if (platforms.includes('epic')) {
        promises.push(fetchEpicGames(games, minDiscount));
    }
    
    if (platforms.includes('steam')) {
        promises.push(fetchSteamGames(games, minDiscount));
    }
    
    if (platforms.includes('gog')) {
        promises.push(fetchGOGGames(games, minDiscount));
    }
    
    await Promise.all(promises);
    
    // Tri par pourcentage de réduction décroissant
    games.sort((a, b) => b.discountPercent - a.discountPercent);
    
    console.log(`📊 Total: ${games.length} jeux trouvés`);
    return games;
}

/**
 * Fonction de compatibilité pour jeux gratuits (discount = 100%)
 */
async function getFreeGames() {
    return await getGames(100);
}

/**
 * Fonction de compatibilité pour jeux en promotion
 */
async function getDiscountedGames(discount = 0, mustSame = false) {
    if (mustSame) {
        // Mode exact : uniquement les jeux avec exactement ce pourcentage
        const allGames = await getGames(0);
        return allGames.filter(game => game.discountPercent === discount);
    } else {
        // Mode >= : jeux avec au moins ce pourcentage
        return await getGames(discount);
    }
}

module.exports = {
    getGames,
    getFreeGames,
    getDiscountedGames
};
