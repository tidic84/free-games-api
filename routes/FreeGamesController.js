const express = require('express');
const router = express.Router();
// Corriger les imports pour utiliser les bonnes fonctions
const getFreeGames = require('../fetch/getFreeGames');
const getDiscountedGames = require('../fetch/getDiscountedGames');

// Fonction unifiée qui choisit la bonne source selon le discount
async function getGames(discount = 0, platforms = ['epic', 'steam', 'gog']) {
    console.log(`🎯 getGames appelée: discount=${discount}, platforms=[${platforms.join(',')}]`);
    
    let games = [];
    
    // Utiliser la nouvelle API unifiée au lieu des anciennes méthodes
    try {
        const { getGames: getUnifiedGames } = require('../fetch/getGames');
        games = await getUnifiedGames(discount, platforms);
        console.log(`📦 API unifiée: ${games.length} jeux récupérés`);
    } catch (error) {
        console.error('❌ Erreur API unifiée:', error.message);
        
        // Fallback vers les anciennes méthodes
        if (discount >= 100) {
            console.log('📥 Fallback vers getFreeGames');
            const getFreeGames = require('../fetch/getFreeGames');
            games = await getFreeGames();
        } else {
            console.log(`📥 Fallback vers getDiscountedGames (${discount}%)`);
            const getDiscountedGames = require('../fetch/getDiscountedGames');
            games = await getDiscountedGames(discount);
        }
    }
    
    // Filtrer selon les plateformes demandées
    if (platforms && platforms.length > 0) {
        const filteredGames = games.filter(game => platforms.includes(game.platform));
        console.log(`🔍 Filtrage plateformes: ${games.length} -> ${filteredGames.length} jeux`);
        games = filteredGames;
    }
    
    console.log(`✅ Total final: ${games.length} jeux retournés`);
    return games;
}

// Fonction unifiée pour tous les jeux avec système de prix standardisé
async function displayGames(req, res) {
    try {
        let discount = req.query.discount;
        let mustSame = req.query.mustSame;
        let platforms = req.query.platforms;

        // Normalisation des paramètres
        if (discount === "free") discount = "100"; // free = 100% de réduction
        if (discount === undefined) discount = "0";
        
        const discountNum = parseInt(discount);
        if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
            return res.status(400).send({ 
                error: 'Paramètre discount invalide', 
                message: 'discount doit être un nombre entre 0 et 100, ou "free"' 
            });
        }

        const mustSameMode = (mustSame === "true");
        
        // Gestion des plateformes
        let platformList = ['epic', 'steam', 'gog']; // Par défaut toutes
        if (platforms) {
            platformList = platforms.split(',').map(p => p.trim().toLowerCase())
                .filter(p => ['epic', 'steam', 'gog'].includes(p));
        }

        console.log(`🎯 Requête: discount=${discountNum}%, mustSame=${mustSameMode}, platforms=[${platformList.join(',')}]`);
        
        let games;
        if (mustSameMode) {
            // Mode exact : uniquement les jeux avec exactement ce pourcentage
            const allGames = await getGames(0, platformList);
            games = allGames.filter(game => game.discountPercent === discountNum);
        } else {
            // Mode >= : jeux avec au moins ce pourcentage
            games = await getGames(discountNum, platformList);
        }

        // Filtrage spécial pour les jeux gratuits : exclure les F2P
        if (discountNum >= 100) {
            const beforeCount = games.length;
            games = games.filter(game => {
                // Exclure les jeux gratuits de base (F2P) mais garder les promotions GOG
                const isFreeToPlay = game.isFreeToPlay || 
                                   (game.originalPrice === 0 && game.platform === 'steam');
                // Ne pas exclure les jeux GOG même avec originalPrice === 0 car ils peuvent être en promotion temporaire
                // Ne pas exclure les jeux avec des prix valides non-null
                
                if (isFreeToPlay && game.platform !== 'gog') {
                    console.log(`F2P exclu: ${game.game} (${game.platform}) - gratuit de base`);
                    return false;
                }
                return true;
            });
            console.log(`🎮 Filtrage F2P: ${beforeCount} → ${games.length} jeux (${beforeCount - games.length} F2P exclus)`);
        }

        // Nettoyer les prix pour éviter les affichages N/A
        games = games.map(game => {
            if (game.platform === 'gog') {
                // S'assurer que les prix GOG sont correctement formatés
                if (game.discountPrice === null || game.discountPrice === undefined) {
                    game.discountPrice = 0;
                }
                if (game.originalPrice === null || game.originalPrice === undefined) {
                    game.originalPrice = game.discountPrice;
                }
            }
            return game;
        });

        console.log(`📋 Résultat: ${games.length} jeux trouvés`);
        res.json(games);
        
    } catch (e) {
        console.error('❌ Erreur contrôleur:', e);
        res.status(500).send({ 
            error: 'Erreur lors de la récupération des jeux', 
            details: e.message 
        });
    }
}

router.get('/', async (req, res) => {
    displayGames(req, res);
});
    
module.exports = router;