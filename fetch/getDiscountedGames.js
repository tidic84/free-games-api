let fetch;
try {
  fetch = require('node-fetch');
  if (fetch.default) fetch = fetch.default;
} catch (e) {
  fetch = global.fetch;
}

var egsCrawler = require('epic-games-store-crawler');
var crawler = egsCrawler.Crawler;
const STEAM_API_KEY = '79F267CAA9E32FC09113E65B6D76DD4A';
const cheerio = require('cheerio');
const GameImageService = require('./gameImageService');

async function fetchEpicGames(games, discount = 0, mustSame = false) {
    try {
        console.log(`🎮 Epic Games: recherche promotions ${mustSame ? 'exactement' : 'au moins'} ${discount}%`);
        
        let gamesList = await crawler.getItems({
            allowCountries: 'FR',
            country: 'FR',
            locale: 'fr',
            count: 1000, // Augmenter pour capturer plus de promotions
            category: 'games/edition/base|bundle/games|editors',
        });
        
        if (gamesList && gamesList.Catalog && gamesList.Catalog.searchStore && Array.isArray(gamesList.Catalog.searchStore.elements)) {
            console.log(`Epic Crawler: ${gamesList.Catalog.searchStore.elements.length} éléments analysés`);
            
            let addedCount = 0;
            for (let i = 0; i < gamesList.Catalog.searchStore.elements.length; i++) {
                const el = gamesList.Catalog.searchStore.elements[i];
                if (el.title === "Mystery Game") continue;

                const original = el.price?.totalPrice?.originalPrice || 0;
                const discountPrice = el.price?.totalPrice?.discountPrice || 0;
                
                // CORRECTION : Calculer le pourcentage correctement
                let percent = 0;
                if (original > 0) {
                    if (discountPrice === 0) {
                        percent = 100;
                    } else {
                        percent = Math.round(100 - (discountPrice / original) * 100);
                    }
                }
                
                // Correction stricte : on filtre selon les critères exacts
                let shouldInclude = false;
                if (mustSame) {
                    // Mode strict : exactement le pourcentage demandé
                    shouldInclude = (percent === discount);
                } else {
                    // Mode >= : pourcentage supérieur ou égal, mais on exclut les gratuits (100%) si on demande autre chose
                    if (discount === 100) {
                        shouldInclude = (percent === 100);
                    } else {
                        shouldInclude = (percent >= discount && percent < 100);
                    }
                }
                
                if (shouldInclude && original > 0) {
                    games.push({
                        game: el.title,
                        platform: "epic",
                        gameId: el.id,
                        discountPercent: percent,
                        discountPrice: discountPrice / 100,
                        originalPrice: original / 100,
                        url: el.productSlug ? `https://store.epicgames.com/fr/p/${el.productSlug}` : undefined,
                        image: el.keyImages && el.keyImages.length > 0 ? el.keyImages[0].url : undefined
                    });
                    addedCount++;
                    console.log(`✅ Epic promo: ${el.title} (-${percent}%) - ${(discountPrice/100).toFixed(2)}€ au lieu de ${(original/100).toFixed(2)}€`);
                }
            }
            
            console.log(`📊 Epic Games: ${addedCount} promotions ajoutées`);
        }
    } catch (e) {
        console.error('❌ Erreur Epic Games:', e.message);
    }
}

async function fetchSteamGames(games, discount = 0, mustSame = false) {
    try {
        console.log(`🔍 Recherche promotions Steam >= ${discount}%`);
        
        // Utiliser l'API Steam officielle pour les promotions
        const response = await fetch('https://store.steampowered.com/api/featuredcategories');
        const data = await response.json();
        
        if (data.specials && data.specials.items) {
            data.specials.items.forEach(item => {
                // Vérifier que c'est bien un jeu en promotion (pas F2P)
                const percent = parseInt(item.discount_percent);
                const originalPrice = parseInt(item.original_price);
                const finalPrice = parseInt(item.final_price);
                
                // Exclure les jeux gratuits de base (F2P) - ils ont un prix original de 0
                if (originalPrice === 0) {
                    console.log(`Steam F2P ignoré: ${item.name} (gratuit de base)`);
                    return; // Ignorer les F2P
                }
                
                // Appliquer la logique de filtrage
                let shouldInclude = false;
                if (mustSame) {
                    shouldInclude = (percent === discount);
                } else {
                    if (discount === 100) {
                        shouldInclude = (percent === 100);
                    } else {
                        shouldInclude = (percent >= discount && percent < 100);
                    }
                }
                
                if (shouldInclude && percent > 0) {
                    games.push({
                        game: item.name,
                        platform: "steam",
                        gameId: String(item.id),
                        discountPercent: percent,
                        discountPrice: finalPrice / 100, // Convertir centimes en euros
                        originalPrice: originalPrice / 100, // Convertir centimes en euros
                        isFreeToPlay: false, // Jeu payant en promotion
                        url: `https://store.steampowered.com/app/${item.id}`,
                        image: item.header_image
                    });
                    console.log(`Steam promo: ${item.name} (-${percent}%) - ${(finalPrice/100).toFixed(2)}€ au lieu de ${(originalPrice/100).toFixed(2)}€`);
                }
            });
        }
        
        console.log(`✅ ${games.filter(g => g.platform === 'steam').length} promotions Steam ajoutées`);
    } catch (e) {
        console.error('Erreur Steam:', e.message);
    }
}

async function fetchGOGGames(games, discount = 0, mustSame = false) {
    try {
        console.log(`🔍 Recherche promotions GOG >= ${discount}%`);
        
        // Utiliser l'API Catalog GOG sans paramètre de discount (il ne fonctionne pas bien)
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
                    if (addedGames >= 20) break; // Limite pour éviter trop d'appels API
                    
                    try {
                        // Récupérer les prix depuis l'API catalog
                        if (product.price && product.price.finalMoney && product.price.baseMoney) {
                            // CORRECTION: Utiliser directement les valeurs en euros
                            const originalPrice = parseFloat(product.price.baseMoney.amount);
                            const discountPrice = parseFloat(product.price.finalMoney.amount);
                            
                            if (originalPrice > 0 && discountPrice < originalPrice) {
                                const percent = Math.round(100 - (discountPrice / originalPrice) * 100);
                                
                                // Filtrage selon les critères
                                let shouldInclude = false;
                                if (mustSame) {
                                    shouldInclude = (percent === discount);
                                } else {
                                    if (discount === 100) {
                                        shouldInclude = (percent === 100);
                                    } else {
                                        shouldInclude = (percent >= discount && percent < 100);
                                    }
                                }
                                
                                // Ajouter le jeu si critères remplis
                                if (shouldInclude && percent > 0) {
                                    const imageUrl = product.coverVertical || product.coverHorizontal || product.screenshots?.[0];
                                    games.push({
                                        game: product.title,
                                        platform: "gog",
                                        gameId: product.slug || product.id,
                                        discountPercent: percent,
                                        discountPrice: discountPrice, // Prix actuel en euros
                                        originalPrice: originalPrice, // Prix original en euros
                                        url: `https://www.gog.com/en/game/${product.slug || product.id}`,
                                        image: imageUrl
                                    });
                                    console.log(`GOG promotion: ${product.title} (-${percent}%) - ${discountPrice.toFixed(2)}€ au lieu de ${originalPrice.toFixed(2)}€`);
                                    addedGames++;
                                }
                            }
                        }
                    } catch (detailError) {
                        console.log(`Erreur détails GOG pour ${product.title}:`, detailError.message);
                    }
                }
                
                console.log(`✅ ${addedGames} promotions GOG ajoutées`);
            }
        }
    } catch (e) {
        console.error('Erreur GOG promotions:', e.message);
    }
}

module.exports = async function (discount, mustSame = false) {
    let games = [];
    
    // Initialiser le service d'images
    const imageService = new GameImageService();
    
    await fetchEpicGames(games, discount, mustSame);
    await fetchSteamGames(games, discount, mustSame);
    await fetchGOGGames(games, discount, mustSame);
    
    console.log(`Total promotions trouvées: ${games.length}`);
    
    // Optimiser les images de tous les jeux
    if (games.length > 0) {
        console.log('🎨 Optimisation des images en cours...');
        games = await imageService.optimizeGameImages(games);
        console.log('✅ Images optimisées pour tous les jeux');
    }
    
    return games;
}