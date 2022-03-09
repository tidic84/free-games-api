const express = require('express');
const router = express.Router();
const discountedSteamGames = require('../fetch/discountedGames');

function getDiscountedGames(req, res) {
    discountedSteamGames().then(async game => {
        discounted_games = [];
        for (let i = 0; i < game.length; i++) {
            discounted_games.push({
                game: game[i].game,
                platform: game[i].platform,
                gameId: game[i].gameId,
                discount_expiration: game[i].discount_expiration,
                discount_percent: game[i].discount_percent,
                price: game[i].price
            })
            console.log(discounted_games);
            res.send(discounted_games);


        }
    })
}

router.get('/', async (req, res) => {
    getDiscountedGames(req, res);
});
    
module.exports = router;