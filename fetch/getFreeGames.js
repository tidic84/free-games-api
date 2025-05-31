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
    console.log('Début récupération Epic Games');
    try {
        await epicFreeGames.getGames().then(res => {
            if (!res || !res.currentGames) {
                console.log('Aucun jeu Epic Games trouvé');
                return;
            }
            
            for (let i = 0; i < res.currentGames.length; i++) {
                const g = res.currentGames[i];
                console.log(`Epic jeu analysé: ${g.title}`);
                console.log(`Prix details:`, g.price);
                
                // Vérification moins stricte : Epic Games offre vraiment des jeux gratuits
                // Si c'est dans currentGames, c'est probablement gratuit cette semaine
                const finalPrice = g.price?.totalPrice?.discountPrice;
                const originalPrice = g.price?.totalPrice?.originalPrice;
                
                console.log(`Prix final: ${finalPrice}, Prix original: ${originalPrice}`);
                
                // Un jeu Epic est gratuit si le prix final est 0
                if (finalPrice === 0) {
                    games.push({
                        game: g.title,
                        platform: "epic",
                        gameId: g.id,
                        discountPercent: 100,
                        discountPrice: 0,
                        originalPrice: (originalPrice || 0) / 100, // Convertir centimes en euros - CORRECTION ICI
                        isFreeToPlay: originalPrice === 0, // F2P si prix original = 0
                        url: g.productSlug ? `https://store.epicgames.com/fr/p/${g.productSlug}` : undefined,
                        image: g.keyImages && g.keyImages.length > 0 ? g.keyImages[0].url : undefined
                    })
                    console.log('Epic gratuit ajouté:', g.title)
                } else {
                    console.log(`Epic non-gratuit ignoré: ${g.title} (prix: ${finalPrice})`);
                }
            }
        })
    } catch (e) {
        console.error('Erreur Epic Games:', e.message);
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
                                    discountPrice: discountPrice || 0, // Assurer une valeur numérique
                                    originalPrice: originalPrice || discountPrice || 0, // Assurer une valeur numérique
                                    url: `https://www.gog.com/en/game/${product.slug}`,
                                    image: imageUrl
                                });
                                console.log(`GOG forte promo (-${percent}%): ${product.title} - ${discountPrice || 0}$ au lieu de ${originalPrice || 0}$`);
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