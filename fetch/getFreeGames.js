const { EpicFreeGames } = require('epic-free-games');
const epicFreeGames = new EpicFreeGames({ country: 'FR', locale: 'fr', includeAll: true })
const STEAM_API_KEY = '79F267CAA9E32FC09113E65B6D76DD4A';
const cheerio = require('cheerio');
const GameImageService = require('./gameImageService');
let fetch;
try {
  fetch = require('node-fetch');
  if (fetch.default) fetch = fetch.default;
} catch (e) {
  fetch = global.fetch;
}

async function fetchEpicGames(games) {
    console.log('🎮 Epic Games: début récupération jeux gratuits');
    try {
        const result = await epicFreeGames.getGames();
        console.log('Epic Free Games réponse brute:', JSON.stringify(result, null, 2));
        
        if (!result) {
            console.log('❌ Epic Free Games: réponse null/undefined');
            return;
        }
        
        if (!result.currentGames) {
            console.log('❌ Epic Free Games: pas de currentGames dans la réponse');
            console.log('Clés disponibles:', Object.keys(result));
            return;
        }
        
        if (!Array.isArray(result.currentGames)) {
            console.log('❌ Epic Free Games: currentGames n\'est pas un tableau');
            console.log('Type de currentGames:', typeof result.currentGames);
            return;
        }
        
        console.log(`✅ Epic Free Games: ${result.currentGames.length} jeux trouvés`);
        
        for (let i = 0; i < result.currentGames.length; i++) {
            const g = result.currentGames[i];
            console.log(`\n--- Epic jeu ${i+1}: ${g.title} ---`);
            console.log('Structure complète:', JSON.stringify(g, null, 2));
            
            const finalPrice = g.price?.totalPrice?.discountPrice;
            const originalPrice = g.price?.totalPrice?.originalPrice;
            
            console.log(`Prix final: ${finalPrice} (type: ${typeof finalPrice})`);
            console.log(`Prix original: ${originalPrice} (type: ${typeof originalPrice})`);
            
            // Un jeu Epic est gratuit si le prix final est 0
            if (finalPrice === 0) {
                const gameData = {
                    game: g.title,
                    platform: "epic",
                    gameId: g.id,
                    discountPercent: 100,
                    discountPrice: 0,
                    originalPrice: (originalPrice || 0) / 100,
                    isFreeToPlay: originalPrice === 0,
                    url: g.productSlug ? `https://store.epicgames.com/fr/p/${g.productSlug}` : undefined,
                    image: g.keyImages && g.keyImages.length > 0 ? g.keyImages[0].url : undefined
                };
                
                games.push(gameData);
                console.log(`✅ Epic gratuit ajouté: ${g.title}`);
                console.log('Données ajoutées:', JSON.stringify(gameData, null, 2));
            } else {
                console.log(`❌ Epic non-gratuit ignoré: ${g.title} (prix final: ${finalPrice})`);
            }
        }
        
        const epicCount = games.filter(g => g.platform === 'epic').length;
        console.log(`📊 Epic Games: ${epicCount} jeux gratuits ajoutés au total`);
        
    } catch (e) {
        console.error('❌ Erreur Epic Games:', e.message);
        console.error('Stack trace:', e.stack);
    }
}

async function fetchSteamGames(games) {
    console.log('Début récupération Steam Games');
    try {
        // Essayons d'abord l'API officielle Steam
        let url = "https://store.steampowered.com/api/featuredcategories";
        const res = await fetch(url);
        const steamGamesList = await res.json();
        
        if (steamGamesList["specials"] && steamGamesList["specials"]["items"]) {
            for (let i = 0; i < steamGamesList["specials"]["items"].length; i++) {
                const item = steamGamesList["specials"]["items"][i];
                
                // Vérifier si c'est vraiment gratuit temporairement (promotion à 100%)
                // ET que ce n'est pas un jeu gratuit de base (originalPrice > 0)
                const originalPrice = parseInt(item["original_price"]);
                const finalPrice = parseInt(item["final_price"]);
                const discountPercent = parseInt(item["discount_percent"]);
                
                if (discountPercent == 100 && finalPrice == 0 && originalPrice > 0) {
                    games.push({
                        game: String(item["name"]),
                        platform: "steam",
                        gameId: String(item["id"]),
                        discountPercent: 100,
                        discountPrice: 0,
                        originalPrice: originalPrice / 100, // Convertir centimes en euros
                        isFreeToPlay: false, // Jeu payant temporairement gratuit
                        url: `https://store.steampowered.com/app/${item["id"]}`,
                        image: item["header_image"] || undefined
                    });
                    console.log(`Steam gratuit temporaire: ${item["name"]} (était ${(originalPrice/100).toFixed(2)}€)`);
                } else if (originalPrice === 0) {
                    console.log(`Steam F2P ignoré: ${item["name"]} (gratuit de base)`);
                }
            }
        }
        
        // Note: On ne récupère PAS les jeux free-to-play Steam car ils sont gratuits de base
        // L'application est destinée aux promotions temporaires, pas aux jeux gratuits permanents
        console.log('ℹ️  Les jeux Free-to-Play Steam sont exclus (gratuits de base, pas en promotion)');
        
        if (games.filter(g => g.platform === 'steam').length === 0) {
            console.log('Aucun jeu Steam gratuit temporaire trouvé');
        }
    } catch (e) {
        console.error('Erreur Steam:', e.message);
    }
}

async function fetchGOGGames(games) {
    console.log('Début récupération GOG Games');
    console.log('⚠️  Note: GOG n\'a pas de jeux gratuits, recherche de promotions >90%');
    
    try {
        // GOG n'a pas de vrais jeux gratuits, cherchons les meilleures promotions (>90%)
        const res = await fetch('https://catalog.gog.com/v1/catalog?limit=30&order=desc:trending&productType=in:game,pack', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (res.ok) {
            const json = await res.json();
            if (json.products && Array.isArray(json.products) && json.products.length > 0) {
                console.log(`GOG Catalog API: ${json.products.length} produits analysés`);
                
                // Chercher les jeux avec la plus forte réduction (>90%)
                let addedGames = 0;
                for (const product of json.products) {
                    if (addedGames >= 3) break; // Limite à 3 jeux
                    
                    if (product.price && product.price.finalMoney && product.price.baseMoney) {
                        // CORRECTION: Utiliser directement les valeurs en euros
                        const originalPrice = parseFloat(product.price.baseMoney.amount);
                        const discountPrice = parseFloat(product.price.finalMoney.amount);
                        
                        if (originalPrice > 0) {
                            const percent = Math.round(100 - (discountPrice / originalPrice) * 100);
                            
                            // Prendre seulement les jeux avec >90% de réduction
                            if (percent >= 90) {
                                const imageUrl = product.coverVertical || product.coverHorizontal || product.screenshots?.[0];
                                games.push({
                                    game: `${product.title} (${percent}% off)`, // Indiquer que c'est une promo
                                    platform: "gog",
                                    gameId: product.slug,
                                    discountPercent: percent,
                                    discountPrice: discountPrice, // Prix actuel en euros
                                    originalPrice: originalPrice, // Prix original en euros
                                    url: `https://www.gog.com/en/game/${product.slug}`,
                                    image: imageUrl
                                });
                                console.log(`GOG forte promo (-${percent}%): ${product.title} - ${discountPrice.toFixed(2)}€ au lieu de ${originalPrice.toFixed(2)}€`);
                                addedGames++;
                            }
                        }
                    }
                }
                
                if (addedGames > 0) {
                    console.log(`✅ ${addedGames} jeux GOG en forte promotion ajoutés`);
                    return;
                }
            }
        }
    } catch (e) {
        console.log('API GOG Catalog échouée:', e.message);
    }
    
    // Si aucune promotion intéressante trouvée, ne pas ajouter de jeux GOG
    console.log('ℹ️  Aucun jeu GOG avec réduction >90% trouvé. GOG est exclu des jeux "gratuits".');
}

module.exports = async function () {
    let games = [];
    
    // Initialiser le service d'images
    const imageService = new GameImageService();
    
    await fetchEpicGames(games);
    await fetchSteamGames(games);
    await fetchGOGGames(games);
    
    console.log('Total jeux trouvés:', games.length);
    
    // Optimiser les images de tous les jeux
    if (games.length > 0) {
        console.log('🎨 Optimisation des images en cours...');
        games = await imageService.optimizeGameImages(games);
        console.log('✅ Images optimisées pour tous les jeux gratuits');
    }
    
    return games;
}