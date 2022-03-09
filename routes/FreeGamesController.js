const express = require('express');
const router = express.Router();
const getDiscountedGames = require('../fetch/getDiscountedGames');

function displayDiscountedGames(req, res) {
    discount = req.query.discount;
    mustSame = req.query.mustSame;
    if (isNaN(discount)) discount = 0;
    if (mustSame == "true") mustSame = true;
    if (mustSame == "false") mustSame = false;
    if (mustSame != true && mustSame != false || mustSame == undefined || discount == 0) mustSame = false;

    getDiscountedGames(discount, mustSame).then(async games => {
        res.send(games);
    })
}

router.get('/', async (req, res) => {
    displayDiscountedGames(req, res);
});
    
module.exports = router;