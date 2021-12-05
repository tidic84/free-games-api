const express = require('express');
const router = express.Router();
const ObjectID = require('mongoose').Types.ObjectId;
const { FreeGamesModel, DiscountedGamesModel } = require('../models/gamesModel');
const discountedSteamGames = require('../fetch/discountedGames');

async function getDiscountedGames(req, res) {
    const discountedGames = await discountedSteamGames();
    var newRecord = "";
    var gameList = [];
    discountedGames.forEach(async (game) => {
        newRecord = new DiscountedGamesModel({
            game: game.game,
            platform: game.platform,
            gameId: game.gameId,
            discount_expiration: game.discount_expiration,
            discount_percent: game.discount_percent,
            price: game.price
        })
        var dGame = "";
        await newRecord.save((err, games) => {
            if (err) return console.log("Error: creating new data: " + err);  
            else dGame = games;
            //console.log(gameList);
            console.log("1")
        })

        console.log(dGame);
        gameList.push(dGame);
        //console.log(gameList);
        console.log("2")

        return gameList;
    })
}

router.get('/', async (req, res) => {
    DiscountedGamesModel.deleteMany({}, (err) => {
        if (err) console.log(err);
    });
    
    gameList = await getDiscountedGames(req, res);
    console.log(gameList);
    res.send(gameList)
    //DiscountedGamesModel.find((err, games) => {
    //    if (err) return console.log("Error to get data !");
    //    res.send(games);
    //})
});
    
// router.post('/', (req, res) => {
//     const newRecord = new FreeGamesModel({
//         game: req.body.game,
//         platform: req.body.platform
//     });
//     newRecord.save((err, games) => {
//         if (!err) res.send(games)
//         else console.log("Error: creating new data: " + err)
//     })
// })

// router.put("/:id", (req, res) => {
//     if (!ObjectID.isValid(req.params.id))
//         return res.status(400).send("ID unknow : " + req.params.id)
    
//     const updateRecord = {
//         author: req.body.author,
//         message: req.body.message
//     };
  
//     FreeGamesModel.findByIdAndUpdate(
//         req.params.id,
//         { $set: updateRecord},
//         { new: true },
//         (err, docs) => {
//             if (!err) res.send(docs);
//             else console.log("Update error : " + err);
//         }
//     )
// });

// router.delete("/:id", (req, res) => {
//     if (!ObjectID.isValid(req.params.id))
//       return res.status(400).send("ID unknow : " + req.params.id)
    
//       FreeGamesModel.findByIdAndRemove(
//       req.params.id,
//       (err, docs) => {
//         if (!err) res.send(docs);
//         else console.log("Delete error : " + err);
//       })
//   });

module.exports = router;