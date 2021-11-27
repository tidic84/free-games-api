const express = require('express');
const router = express.Router();

const { GamesModel } = require('../models/gamesModel');

router.get('/', (req, res) => {
    GamesModel.find((err, games) => {
        if (err) return console.log("Error to get data !");
        res.send(games);
    })
});
    
module.exports = router;